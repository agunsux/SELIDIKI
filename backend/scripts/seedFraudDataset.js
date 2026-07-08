// backend/scripts/seedFraudDataset.js
/**
 * Verified Fraud Dataset v1 — Seeding & Generation Framework
 * Generates and seeds:
 * - 10,000 Phone Numbers
 * - 5,000 Bank Accounts & E-wallets
 * - 1,000 Scam Domains
 * 
 * Writes the dataset to backend/data/verified_fraud_dataset_v1.json
 * And attempts to write directly to PostgreSQL if DATABASE_URL is set.
 */

const fs = require('fs');
const path = require('path');
const { hashPhone, hashAccount, hashInput } = require('../utils/crypto');
const db = require('../utils/db');

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Configuration Lists
const BANKS = ['BCA', 'MANDIRI', 'BRI', 'BNI', 'CIMB', 'DANAMON'];
const EWALLETS = ['DANA', 'OVO', 'GOPAY', 'SHOPEEPAY'];
const CATEGORIES = [
  'marketplace_scam',
  'fake_investment',
  'illegal_loan',
  'phishing',
  'fake_cs',
  'apk_malware',
  'romance_scam',
  'social_engineering'
];

// Generative helpers
function generateRandomPhone() {
  const prefixes = ['0811', '0812', '0813', '0819', '0821', '0857', '0877', '0896', '0882', '0895'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  let digits = '';
  for (let i = 0; i < 8; i++) {
    digits += Math.floor(Math.random() * 10);
  }
  return '62' + prefix.slice(1) + digits;
}

function generateRandomAccount() {
  let digits = '';
  for (let i = 0; i < 10; i++) {
    digits += Math.floor(Math.random() * 10);
  }
  return digits;
}

function generateRandomDomain() {
  const brands = ['shopee', 'tokopedia', 'lazada', 'blibli', 'dana', 'gopay', 'ovo', 'bi', 'whatsapp', 'telkomsel'];
  const keywords = ['promo', 'sale', 'hadiah', 'undian', 'kupon', 'login', 'verify', 'cs', 'helps', 'rewards'];
  const tlds = ['.xyz', '.com', '.net', '.info', '.site', '.online', '-id.com', '-reward.xyz'];
  const brand = brands[Math.floor(Math.random() * brands.length)];
  const kw = keywords[Math.floor(Math.random() * keywords.length)];
  const tld = tlds[Math.floor(Math.random() * tlds.length)];
  return `${brand}-${kw}${tld}`;
}

async function run() {
  console.log('🏁 Starting SELIDIKI Verified Fraud Dataset v1 Generator...');
  console.log('-----------------------------------------------------------');

  const dataset = {
    phones: [],
    accounts: [],
    domains: []
  };

  // ── 1. GENERATE PHONE SEEDS (10,000) ───────────────────────────────
  console.log('📱 Generating 10,000 Phone Numbers with Risk Signals...');
  const knownPhones = [
    { number: '6281234567890', score: 92, cat: 'marketplace_scam', reports: 27 },
    { number: '6287898765432', score: 85, cat: 'fake_investment', reports: 14 },
    { number: '6285711223344', score: 78, cat: 'illegal_loan', reports: 9 },
    { number: '6281900112233', score: 95, cat: 'apk_malware', reports: 31 },
    { number: '6289655443322', score: 45, cat: 'fake_cs', reports: 4 }
  ];

  for (let i = 0; i < 10000; i++) {
    let number, score, cat, reports;
    if (i < knownPhones.length) {
      number = knownPhones[i].number;
      score = knownPhones[i].score;
      cat = knownPhones[i].cat;
      reports = knownPhones[i].reports;
    } else {
      number = generateRandomPhone();
      score = Math.floor(Math.random() * 85) + 15; // 15 to 99
      cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      reports = Math.floor(Math.random() * 25) + 1;
    }

    const phoneHash = hashPhone(number);
    dataset.phones.push({
      phone_masked: `+62 ${number.slice(2, 6)}-xxxx-${number.slice(-4)}`,
      phone_hash: phoneHash,
      risk_score: score,
      reports_count: reports,
      primary_category: cat,
      signals: [
        { label: 'Total Laporan Komunitas', value: `${reports}x`, level: score >= 70 ? 'HIGH' : 'WARNING' },
        { label: 'Kategori Kejahatan', value: cat.replace('_', ' '), level: 'WARNING' },
        { label: 'Koneksi Rekening Terkait', value: `${Math.floor(Math.random() * 4)} rekening`, level: score >= 80 ? 'HIGH' : 'SAFE' }
      ]
    });
  }

  // ── 2. GENERATE BANK & EWALLET SEEDS (5,000) ────────────────────────
  console.log('🏦 Generating 5,000 Bank Accounts & E-wallets...');
  const knownAccounts = [
    { account: '1234567890', bank: 'BCA', score: 92, reports: 27 },
    { account: '9876543210', bank: 'MANDIRI', score: 85, reports: 12 },
    { account: '5566778899', bank: 'BRI', score: 76, reports: 8 },
    { account: '081299998888', bank: 'DANA', score: 95, reports: 42 }
  ];

  for (let i = 0; i < 5000; i++) {
    let account, bank, score, reports;
    if (i < knownAccounts.length) {
      account = knownAccounts[i].account;
      bank = knownAccounts[i].bank;
      score = knownAccounts[i].score;
      reports = knownAccounts[i].reports;
    } else {
      account = generateRandomAccount();
      bank = Math.random() > 0.4 
        ? BANKS[Math.floor(Math.random() * BANKS.length)]
        : EWALLETS[Math.floor(Math.random() * EWALLETS.length)];
      score = Math.floor(Math.random() * 85) + 15;
      reports = Math.floor(Math.random() * 20) + 1;
    }

    const accountHash = hashAccount(account, bank);
    dataset.accounts.push({
      account_masked: '*'.repeat(account.length - 4) + account.slice(-4),
      account_hash: accountHash,
      bank_code: bank,
      risk_score: score,
      reports_count: reports,
      categories: [CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]]
    });
  }

  // ── 3. GENERATE DOMAIN SEEDS (1,000) ────────────────────────────────
  console.log('🌐 Generating 1,000 Scam Domains...');
  const knownDomains = [
    { domain: 'tokopedia-sale.xyz', score: 95, phishing: true, malware: false },
    { domain: 'shopee-promo-id.com', score: 98, phishing: true, malware: true },
    { domain: 'dana-kaget-reward.xyz', score: 90, phishing: true, malware: false }
  ];

  for (let i = 0; i < 1000; i++) {
    let domain, score, phishing, malware;
    if (i < knownDomains.length) {
      domain = knownDomains[i].domain;
      score = knownDomains[i].score;
      phishing = knownDomains[i].phishing;
      malware = knownDomains[i].malware;
    } else {
      domain = generateRandomDomain();
      score = Math.floor(Math.random() * 60) + 40; // 40 to 100
      phishing = Math.random() > 0.3;
      malware = Math.random() > 0.8;
    }

    const urlHash = hashInput(domain);
    dataset.domains.push({
      domain,
      url_hash: urlHash,
      risk_score: score,
      is_phishing: phishing,
      is_malware: malware,
      reports_count: Math.floor(Math.random() * 15) + 1
    });
  }

  // ── 4. WRITE SEED DATA TO JSON FILE ────────────────────────────────
  const jsonPath = path.join(DATA_DIR, 'verified_fraud_dataset_v1.json');
  fs.writeFileSync(jsonPath, JSON.stringify(dataset, null, 2));
  console.log(`💾 Local seed data written to: ${jsonPath}`);

  // ── 5. ATTEMPT POSTGRES INGESTION ──────────────────────────────────
  if (process.env.DATABASE_URL) {
    console.log('🔌 Connecting to PostgreSQL to perform data seeding...');
    try {
      // Clean tables first for fresh seed
      await db.query('TRUNCATE phone_profiles, bank_account_profiles, url_profiles CASCADE');
      console.log('   - Cleared existing tables.');

      // Ingest Phone Profiles
      console.log('   - Seeding phone_profiles in PostgreSQL...');
      for (const p of dataset.phones.slice(0, 1000)) { // Limit staging inserts to first 1,000 for speed
        await db.query(`
          INSERT INTO phone_profiles (phone_hash, risk_score, primary_category, reports_count, signals, last_activity)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `, [p.phone_hash, p.risk_score, p.primary_category, p.reports_count, JSON.stringify(p.signals)]);
      }

      // Ingest Bank Profiles
      console.log('   - Seeding bank_account_profiles in PostgreSQL...');
      for (const a of dataset.accounts.slice(0, 1000)) {
        await db.query(`
          INSERT INTO bank_account_profiles (account_hash, bank_code, risk_score, reports_count, categories, last_activity)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `, [a.account_hash, a.bank_code, a.risk_score, a.reports_count, a.categories]);
      }

      // Ingest Domains
      console.log('   - Seeding url_profiles in PostgreSQL...');
      for (const d of dataset.domains.slice(0, 500)) {
        await db.query(`
          INSERT INTO url_profiles (domain, url_hash, risk_score, is_phishing, is_malware, reports_count)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [d.domain, d.url_hash, d.risk_score, d.is_phishing, d.is_malware, d.reports_count]);
      }

      console.log('🟢 Seeding completed successfully on PostgreSQL.');
    } catch (err) {
      console.error('⚠️ Could not complete PostgreSQL database seeding:', err.message);
    }
  } else {
    console.log('ℹ️ DATABASE_URL environment variable is not defined. Skipping PostgreSQL write.');
  }

  console.log('-----------------------------------------------------------');
  console.log('✅ Seed process finished.');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Ingest/Seed script crashed:', err);
  process.exit(1);
});
