// scripts/generateGoldenDataset.js
const fs = require('fs');
const path = require('path');
const { hashPhone, hashAccount, hashInput } = require('../utils/crypto');

function generate() {
  console.log('📦 Compiling Golden Dataset (600 entries)...');
  const dataset = {
    phones: [],
    bankAccounts: [],
    urls: [],
    scanPayloads: []
  };

  // 1. Generate 300 Phones (100 valid, 100 spam, 100 fraud)
  // Valid (081111111000 to 081111111099) -> SAFE
  for (let i = 0; i < 100; i++) {
    const raw = `081111111${String(i).padStart(3, '0')}`;
    const normalized = '628111111' + String(i).padStart(3, '0');
    const hash = hashPhone(normalized);
    dataset.phones.push({
      id: `phone-valid-${i}`,
      raw,
      normalized,
      hash,
      type: 'valid',
      expected: {
        httpStatus: 200,
        riskScore: 0,
        status: 'SAFE',
        reportsCount: 0,
        category: null,
        signals: []
      }
    });
  }

  // Spam (081222222000 to 081222222099) -> WARNING
  for (let i = 0; i < 100; i++) {
    const raw = `081222222${String(i).padStart(3, '0')}`;
    const normalized = '628122222' + String(i).padStart(3, '0');
    const hash = hashPhone(normalized);
    dataset.phones.push({
      id: `phone-spam-${i}`,
      raw,
      normalized,
      hash,
      type: 'spam',
      expected: {
        httpStatus: 200,
        riskScore: 45,
        status: 'WARNING',
        reportsCount: 3,
        category: 'illegal_loan',
        signals: ['Pinjol ilegal', 'Spam call']
      }
    });
  }

  // Fraud (081333333000 to 081333333099) -> HIGH_RISK
  for (let i = 0; i < 100; i++) {
    const raw = `081333333${String(i).padStart(3, '0')}`;
    const normalized = '628133333' + String(i).padStart(3, '0');
    const hash = hashPhone(normalized);
    dataset.phones.push({
      id: `phone-fraud-${i}`,
      raw,
      normalized,
      hash,
      type: 'fraud',
      expected: {
        httpStatus: 200,
        riskScore: 85,
        status: 'HIGH_RISK',
        reportsCount: 12,
        category: 'marketplace_scam',
        signals: ['Penipuan jual beli', 'Laporan kepolisian']
      }
    });
  }

  // 2. Generate 100 Bank Accounts
  for (let i = 0; i < 100; i++) {
    const account = `1000000${String(i).padStart(3, '0')}`;
    const bank = 'BCA';
    const hash = hashAccount(account, bank);
    dataset.bankAccounts.push({
      id: `bank-account-${i}`,
      bank,
      account,
      hash,
      expected: {
        httpStatus: 200,
        riskScore: 0,
        status: 'SAFE',
        reportsCount: 0,
        categories: []
      }
    });
  }

  // 3. Generate 100 URLs
  for (let i = 0; i < 100; i++) {
    const domain = `safe-domain-${String(i).padStart(2, '0')}.id`;
    const url = `https://${domain}/index.html`;
    const hash = hashInput(`url:${domain}`);
    dataset.urls.push({
      id: `url-${i}`,
      url,
      domain,
      hash,
      expected: {
        httpStatus: 200,
        riskScore: 0,
        status: 'SAFE',
        isPhishing: false,
        isMalware: false,
        reportsCount: 0
      }
    });
  }

  // 4. Generate 100 Mixed Scan Payloads
  for (let i = 0; i < 100; i++) {
    dataset.scanPayloads.push({
      id: `scan-message-${i}`,
      payload: {
        message: `Baseline message payload ${i} for verification.`,
        user_hash: 'testphonehash'
      },
      expected: {
        httpStatus: 200,
        riskScore: 15,
        status: 'SAFE',
        category: null,
        confidence: 85
      }
    });
  }

  const testDir = path.join(__dirname, '../test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  const outputPath = path.join(testDir, 'golden_dataset.json');
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
  console.log(`✅ Golden Dataset compiled successfully at: ${outputPath}`);
}

generate();
