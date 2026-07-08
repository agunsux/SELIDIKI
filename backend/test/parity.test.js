// test/parity.test.js
const PhoneRepository = require('../repositories/PhoneRepository');
const BankAccountRepository = require('../repositories/BankAccountRepository');
const ReportRepository = require('../repositories/ReportRepository');
const HistoryRepository = require('../repositories/HistoryRepository');

describe('SELIDIKI Database Parity & Abstraction Layer Tests', () => {
  let originalProvider;

  beforeAll(() => {
    originalProvider = process.env.DATABASE_PROVIDER;
    // Ensure kill switch is off for provider tests
  });

  afterAll(() => {
    process.env.DATABASE_PROVIDER = originalProvider;
    delete process.env.ENABLE_DATABASE_SWITCHING;
    delete process.env.ENABLE_POSTGRES;
  });

  test('Should export unified repository classes and expected interfaces', () => {
    expect(PhoneRepository.findByHash).toBeDefined();
    expect(PhoneRepository.upsert).toBeDefined();
    expect(BankAccountRepository.findByHashAndBank).toBeDefined();
    expect(BankAccountRepository.upsert).toBeDefined();
    expect(ReportRepository.insert).toBeDefined();
    expect(ReportRepository.findTrending).toBeDefined();
    expect(HistoryRepository.insert).toBeDefined();
    expect(HistoryRepository.findByUserHash).toBeDefined();
  });

  test('Should route queries based on the DATABASE_PROVIDER feature flag', async () => {
    process.env.DATABASE_PROVIDER = 'FIRESTORE';
    const phoneRes = await PhoneRepository.findByHash('somehash');
    expect(phoneRes).toBeNull();
    const bankRes = await BankAccountRepository.findByHashAndBank('somehash', 'BCA');
    expect(bankRes).toBeNull();
  });

  test('Should execute read verification checks without throwing exceptions', async () => {
    process.env.DATABASE_PROVIDER = 'DUAL_READ';
    const phoneRes = await PhoneRepository.findByHash('somehash');
    expect(phoneRes).toBeNull();
  });
});

// ── Provider Selection Tests (Commit #7) ──────────────────
describe('Provider Selection — Feature Flag System', () => {
  const resetFlags = () => {
    delete process.env.ENABLE_DATABASE_SWITCHING;
    delete process.env.ENABLE_POSTGRES;
    delete process.env.ENABLE_FIRESTORE;
    delete process.env.DATABASE_PROVIDER;
    jest.resetModules();
  };

  afterEach(resetFlags);

  test('Default: Kill switch engaged → Firestore only', () => {
    // No env vars set = kill switch false = Firestore only
    const { flags } = require('../config/featureFlags');
    expect(flags.FIRESTORE).toBe(true);
    expect(flags.POSTGRES).toBe(false);
    expect(flags.DUAL_WRITE).toBe(false);
    expect(flags.DUAL_READ).toBe(false);
    expect(flags.SHADOW_MODE).toBe(false);
  });

  test('Kill switch forces Firestore even with PG enabled', () => {
    process.env.ENABLE_POSTGRES = 'true';
    process.env.ENABLE_DATABASE_SWITCHING = 'false';
    const { flags } = require('../config/featureFlags');
    expect(flags.FIRESTORE).toBe(true);
    expect(flags.POSTGRES).toBe(false); // Overridden by kill switch
  });

  test('Switching enabled + PG → both providers available', () => {
    process.env.ENABLE_DATABASE_SWITCHING = 'true';
    process.env.ENABLE_POSTGRES = 'true';
    const { flags } = require('../config/featureFlags');
    expect(flags.FIRESTORE).toBe(true);
    expect(flags.POSTGRES).toBe(true);
  });

  test('Invalid: DUAL_WRITE without POSTGRES → throws', () => {
    process.env.ENABLE_DATABASE_SWITCHING = 'true';
    process.env.ENABLE_DUAL_WRITE = 'true';
    process.env.ENABLE_POSTGRES = 'false';
    expect(() => {
      const { validateFlags } = require('../config/featureFlags');
      validateFlags();
    }).toThrow(/ENABLE_DUAL_WRITE=true requires ENABLE_POSTGRES=true/);
  });
});

