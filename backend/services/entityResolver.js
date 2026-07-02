// services/entityResolver.js

const PhoneNormalizer = require('../normalizers/phoneNormalizer');
const BankNormalizer = require('../normalizers/bankNormalizer');
const EwalletNormalizer = require('../normalizers/ewalletNormalizer');
const UrlNormalizer = require('../normalizers/urlNormalizer');

/**
 * Resolves an entity type to its corresponding normalizer instance.
 * Extensible – just add to the map for new types.
 */
class EntityResolver {
  static resolve(entityType) {
    const map = {
      PHONE: new PhoneNormalizer(),
      BANK_ACCOUNT: new BankNormalizer(),
      EWALLET: new EwalletNormalizer(),
      URL: new UrlNormalizer(),
    };
    const normalizer = map[entityType];
    if (!normalizer) {
      const err = new Error(`Unsupported entity type: ${entityType}`);
      err.code = 'UNSUPPORTED_ENTITY';
      err.status = 400;
      throw err;
    }
    return normalizer;
  }
}

module.exports = EntityResolver;
