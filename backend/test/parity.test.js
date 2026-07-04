// test/parity.test.js
const PhoneRepository = require('../repositories/PhoneRepository');
const BankAccountRepository = require('../repositories/BankAccountRepository');
const ReportRepository = require('../repositories/ReportRepository');
const HistoryRepository = require('../repositories/HistoryRepository');

describe('SELIDIKI Database Parity & Abstraction Layer Tests', () => {
  let originalProvider;

  beforeAll(() => {
    originalProvider = process.env.DATABASE_PROVIDER;
  });

  afterAll(() => {
    process.env.DATABASE_PROVIDER = originalProvider;
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
    
    // In dev mode without Firestore, these return null or default values safely
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
