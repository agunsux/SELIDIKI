// bank/BankDetector.js
/**
 * BankDetector — ARGUS v1.4
 *
 * Detects bank from account number prefixes and bank code strings.
 * Supports major Indonesian banks and virtual accounts.
 */

const BANKS = {
  BCA: { name: 'Bank Central Asia', code: '014', prefixes: ['008'], vaPrefixes: ['88008', '10008'] },
  MANDIRI: { name: 'Bank Mandiri', code: '008', prefixes: ['070'], vaPrefixes: ['88070', '10070'] },
  BNI: { name: 'Bank Negara Indonesia', code: '009', prefixes: ['011'], vaPrefixes: ['88011', '10011'] },
  BRI: { name: 'Bank Rakyat Indonesia', code: '002', prefixes: ['012'], vaPrefixes: ['88012', '10012'] },
  CIMB: { name: 'CIMB Niaga', code: '022', prefixes: ['022'], vaPrefixes: ['88022', '10022'] },
  PERMATA: { name: 'Bank Permata', code: '013', prefixes: ['013'], vaPrefixes: ['88013', '10013'] },
  BTN: { name: 'Bank Tabungan Negara', code: '200', prefixes: ['020'], vaPrefixes: ['88020', '10020'] },
  BSI: { name: 'Bank Syariah Indonesia', code: '451', prefixes: ['451'], vaPrefixes: ['88451', '10451'] },
  SEABANK: { name: 'SeaBank Indonesia', code: '526', prefixes: ['526'], vaPrefixes: ['88526', '10526'] },
  JAGO: { name: 'Bank Jago', code: '542', prefixes: ['542'], vaPrefixes: ['88542', '10542'] },
  NEO: { name: 'Neo Commerce Bank', code: '490', prefixes: ['490'], vaPrefixes: ['88490', '10490'] },
  BLU: { name: 'Bank BLU', code: '501', prefixes: ['501'], vaPrefixes: ['88501', '10501'] },
};

class BankDetector {
  static detect(accountNumber, bankCode = null) {
    // If bank code provided, look up directly
    if (bankCode) {
      const upper = bankCode.toUpperCase();
      if (BANKS[upper]) return { bank: upper, ...BANKS[upper], certainty: 'explicit' };
    }

    const digits = accountNumber.replace(/[^0-9]/g, '');
    if (digits.length < 5) return { bank: 'UNKNOWN', certainty: 'none' };

    // Try to match by prefix
    for (const [key, bank] of Object.entries(BANKS)) {
      for (const prefix of bank.prefixes) {
        if (digits.startsWith(prefix)) {
          return { bank: key, ...bank, certainty: 'prefix' };
        }
      }
    }

    // Check if it looks like a virtual account
    for (const [key, bank] of Object.entries(BANKS)) {
      for (const vaPrefix of bank.vaPrefixes) {
        if (digits.startsWith(vaPrefix) || digits.length >= 12) {
          return { bank: key, ...bank, certainty: 'va_pattern', isVirtualAccount: true };
        }
      }
    }

    return { bank: 'UNKNOWN', certainty: 'unknown' };
  }

  static getAllBanks() {
    return Object.entries(BANKS).map(([key, val]) => ({ code: key, name: val.name, bankCode: val.code }));
  }
}

module.exports = BankDetector;