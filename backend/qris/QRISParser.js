// qris/QRISParser.js
/**
 * QRISParser — ARGUS v1.4
 *
 * Parses and resolves QRIS identifiers to extract merchant, issuer, acquirer, wallet.
 */

class QRISParser {
  static parse(qrisId) {
    const cleaned = qrisId.replace(/[^0-9]/g, '');
    const merchantId = cleaned.length >= 12 ? cleaned.substring(0, 12) : cleaned;
    const issuerCode = cleaned.length >= 8 ? cleaned.substring(0, 8) : null;
    const walletCode = cleaned.length >= 4 ? cleaned.substring(0, 4) : null;

    return {
      raw: cleaned,
      merchantId,
      formatted: merchantId.replace(/(\d{4})(?=\d)/g, '$1 ').trim(),
      issuerCode,
      walletCode,
      length: cleaned.length,
      isQRIS: cleaned.length >= 12 && cleaned.length <= 20,
      detectedWallet: QRISParser._detectWallet(walletCode),
    };
  }

  static _detectWallet(code) {
    if (!code) return null;
    const wallets = {
      '9361': 'GoPay', '9362': 'GoPay', '9363': 'GoPay',
      '9371': 'Dana', '9372': 'Dana', '9373': 'Dana',
      '9381': 'OVO', '9382': 'OVO', '9383': 'OVO',
      '9391': 'ShopeePay', '9392': 'ShopeePay',
      '9351': 'LinkAja', '9352': 'LinkAja',
      '9341': 'iSaku', '9342': 'iSaku',
      '9331': 'MNC Play',
      '9321': 'Maxima',
      '9311': 'SPay',
    };
    return wallets[code] || null;
  }
}

class MerchantResolver {
  static async resolve(merchantId) {
    const db = require('../utils/db');
    try {
      const result = await db.query(
        'SELECT * FROM merchants WHERE merchant_id = $1', [merchantId]
      );
      if (result.rows.length > 0) {
        const m = result.rows[0];
        return {
          merchantId: m.merchant_id,
          name: m.name,
          category: m.category,
          city: m.city,
          registered: true,
        };
      }
    } catch {}
    return { merchantId, name: 'Unknown', registered: false };
  }
}

class QRISRiskEngine {
  static async assess(merchantId, entityHash) {
    const db = require('../utils/db');
    let reports = 0;
    try {
      const r = await db.query(
        'SELECT COUNT(*) as cnt FROM fraud_events WHERE hash = $1 AND event_type = $2',
        [entityHash, 'report']
      );
      reports = parseInt(r.rows[0]?.cnt || 0);
    } catch {}
    return { riskLevel: reports > 2 ? 'high' : reports > 0 ? 'medium' : 'low', totalReports: reports };
  }
}

module.exports = { QRISParser, MerchantResolver, QRISRiskEngine };