const configLoader = require('./ConfigLoader');

// Helper
function parseBool(val, defaultVal) {
  if (val === undefined || val === null) return defaultVal;
  const str = String(val).toLowerCase().trim();
  if (str === 'true' || str === '1' || str === 'yes') return true;
  if (str === 'false' || str === '0' || str === 'no') return false;
  return defaultVal;
}

// Database Provider Feature Flags
const DATABASE_SWITCHING = parseBool(process.env.ENABLE_DATABASE_SWITCHING, false);
const LEGACY_PROVIDER = (process.env.DATABASE_PROVIDER || 'FIRESTORE').toUpperCase();

const ENABLE_FIRESTORE       = parseBool(process.env.ENABLE_FIRESTORE, true);
const ENABLE_POSTGRES        = parseBool(process.env.ENABLE_POSTGRES, false);
const ENABLE_DUAL_WRITE      = parseBool(process.env.ENABLE_DUAL_WRITE, false);
const ENABLE_DUAL_READ       = parseBool(process.env.ENABLE_DUAL_READ, false);
const ENABLE_SHADOW_MODE     = parseBool(process.env.ENABLE_SHADOW_MODE, false);
const ENABLE_PARITY_LOGGING  = parseBool(process.env.ENABLE_PARITY_LOGGING, false);
const ENABLE_WRITE_VERIFY    = parseBool(process.env.ENABLE_WRITE_VERIFY, false);
const ENABLE_READ_VERIFY     = parseBool(process.env.ENABLE_READ_VERIFY, false);

function applyLegacyProvider() {
  if (!DATABASE_SWITCHING) return;
  const mapping = {
    FIRESTORE:  {},
    POSTGRES:   { ENABLE_FIRESTORE: false },
    DUAL_WRITE: { ENABLE_DUAL_WRITE: true },
    DUAL_READ:  { ENABLE_DUAL_READ: true, ENABLE_DUAL_WRITE: true },
    SHADOW:     { ENABLE_SHADOW_MODE: true },
  };
  return mapping[LEGACY_PROVIDER] || {};
}

const legacyOverrides = applyLegacyProvider() || {};

const flags = {
  DATABASE_SWITCHING,
  FIRESTORE:  DATABASE_SWITCHING ? (legacyOverrides.ENABLE_FIRESTORE !== false && ENABLE_FIRESTORE) : true,
  POSTGRES:   DATABASE_SWITCHING ? (ENABLE_POSTGRES || legacyOverrides.ENABLE_POSTGRES) : false,
  DUAL_WRITE:      DATABASE_SWITCHING && (ENABLE_DUAL_WRITE || legacyOverrides.ENABLE_DUAL_WRITE || false),
  DUAL_READ:       DATABASE_SWITCHING && (ENABLE_DUAL_READ || legacyOverrides.ENABLE_DUAL_READ || false),
  SHADOW_MODE:     DATABASE_SWITCHING && (ENABLE_SHADOW_MODE || legacyOverrides.ENABLE_SHADOW_MODE || false),
  PARITY_LOGGING:  ENABLE_PARITY_LOGGING,
  WRITE_VERIFY:    ENABLE_WRITE_VERIFY,
  READ_VERIFY:     ENABLE_READ_VERIFY,
};

function validateFlags() {
  const errors = [];
  if (flags.DUAL_WRITE && !flags.POSTGRES) {
    errors.push('ENABLE_DUAL_WRITE=true requires ENABLE_POSTGRES=true');
  }
  if (flags.DUAL_READ && !flags.DUAL_WRITE) {
    errors.push('ENABLE_DUAL_READ=true requires ENABLE_DUAL_WRITE=true');
  }
  if (flags.SHADOW_MODE && !flags.POSTGRES) {
    errors.push('ENABLE_SHADOW_MODE=true requires ENABLE_POSTGRES=true');
  }
  if (!flags.FIRESTORE && !flags.POSTGRES) {
    errors.push('At least one provider must be enabled (FIRESTORE or POSTGRES)');
  }
  if (errors.length > 0) {
    const msg = 'Feature flag validation FAILED:\n  - ' + errors.join('\n  - ');
    console.error('⛔ ' + msg);
    throw new Error(msg);
  }
}

function startupSnapshot() {
  console.log('┌─────────────────────────────────────────┐');
  console.log('│  SELIDIKI — Runtime Configuration       │');
  console.log('├─────────────────────────────────────────┤');
  console.log(`│  Provider        : ${flags.FIRESTORE && flags.POSTGRES ? 'DUAL' : flags.FIRESTORE ? 'FIRESTORE' : 'POSTGRES'}`);
  console.log(`│  Kill Switch     : ${DATABASE_SWITCHING ? 'ARMED (switching enabled)' : 'ENGAGED (Firestore only)'}`);
  console.log(`│  Shadow Mode     : ${flags.SHADOW_MODE ? 'ON' : 'OFF'}`);
  console.log(`│  Dual Write      : ${flags.DUAL_WRITE ? 'ON' : 'OFF'}`);
  console.log(`│  Dual Read       : ${flags.DUAL_READ ? 'ON' : 'OFF'}`);
  console.log(`│  Parity Logging  : ${flags.PARITY_LOGGING ? 'ON' : 'OFF'}`);
  console.log(`│  Write Verify    : ${flags.WRITE_VERIFY ? 'ON' : 'OFF'}`);
  console.log(`│  Read Verify     : ${flags.READ_VERIFY ? 'ON' : 'OFF'}`);
  console.log(`│  Sprint          : 2A`);
  console.log('└─────────────────────────────────────────┘');
}

// Platform-Level Feature Flags
class FeatureFlags {
  constructor() {
    this._flags = new Map();
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    this._flags.set('audit.enabled', true);
    this._flags.set('audit.exportJson', true);
    this._flags.set('audit.exportCsv', true);
    this._flags.set('cache.negativeCache', true);
    this._flags.set('cache.warmOnStartup', process.env.NODE_ENV === 'production');
    this._flags.set('dashboard.enabled', true);
    this._flags.set('provider.abstraction', true);
    this._flags.set('provider.googleSafeBrowsing', !!process.env.GOOGLE_SAFE_BROWSING_KEY);
    this._flags.set('provider.virusTotal', !!process.env.VIRUSTOTAL_API_KEY);
    this._flags.set('provider.komdigi', !!process.env.KOMDIGI_API_KEY);
    this._flags.set('provider.cekRekening', !!process.env.CEKREKENING_API_KEY);
    this._flags.set('provider.twilio', !!process.env.TWILIO_ACCOUNT_SID);
    this._flags.set('backgroundJobs.datasetImport', true);
    this._flags.set('backgroundJobs.providerSync', true);
    this._flags.set('backgroundJobs.reportProcessing', true);
    this._flags.set('backgroundJobs.cacheWarming', process.env.NODE_ENV === 'production');
    this._flags.set('backgroundJobs.cleanup', true);
    this._initialized = true;
  }

  isEnabled(flag) {
    if (!this._initialized) this.init();
    return this._flags.get(flag) === true;
  }

  set(flag, value) {
    this._flags.set(flag, value);
  }

  getAll() {
    if (!this._initialized) this.init();
    const result = {};
    for (const [key, value] of this._flags) {
      result[key] = value;
    }
    return result;
  }

  getFlag(flag) {
    if (!this._initialized) this.init();
    return {
      flag,
      enabled: this._flags.get(flag) === true,
    };
  }
}

const platformFlags = new FeatureFlags();

module.exports = {
  flags,
  raw: {
    DATABASE_SWITCHING,
    ENABLE_FIRESTORE,
    ENABLE_POSTGRES,
    ENABLE_DUAL_WRITE,
    ENABLE_DUAL_READ,
    ENABLE_SHADOW_MODE,
    ENABLE_PARITY_LOGGING,
    ENABLE_WRITE_VERIFY,
    ENABLE_READ_VERIFY,
    LEGACY_PROVIDER,
  },
  validateFlags,
  startupSnapshot,
  
  // Platform-level delegators
  isEnabled: (flag) => platformFlags.isEnabled(flag),
  set: (flag, value) => platformFlags.set(flag, value),
  getAll: () => platformFlags.getAll(),
  getFlag: (flag) => platformFlags.getFlag(flag),
};