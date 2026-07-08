// repositories/interfaces/index.js
/**
 * Repository Interface Registry — SELIDIKI Architecture v1.0
 *
 * Central export point for all repository contracts.
 * Every implementation MUST satisfy the corresponding interface.
 */
module.exports = {
  IRepository:           require('./IRepository'),
  IPhoneRepository:      require('./IPhoneRepository'),
  IBankAccountRepository: require('./IBankAccountRepository'),
  IReportRepository:     require('./IReportRepository'),
  IHistoryRepository:    require('./IHistoryRepository'),
  IUserRepository:       require('./IUserRepository'),
  IFraudEntityRepository: require('./IFraudEntityRepository'),
  IFraudReportRepository: require('./IFraudReportRepository'),
  ILookupLogRepository:  require('./ILookupLogRepository'),
  IUrlRepository:        require('./IUrlRepository'),
};
