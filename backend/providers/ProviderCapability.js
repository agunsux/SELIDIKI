// providers/ProviderCapability.js
/**
 * ProviderCapability — ARGUS v1.2
 *
 * Defines standard capability identifiers for all provider categories.
 * Every provider declares its capabilities using these constants.
 */

const CAPABILITIES = {
  // Threat Intelligence
  URL_CHECK: 'url_check',
  DOMAIN_CHECK: 'domain_check',
  IP_CHECK: 'ip_check',
  FILE_HASH_CHECK: 'file_hash_check',
  THREAT_INTEL: 'threat_intel',

  // Phone
  PHONE_LOOKUP: 'phone_lookup',
  PHONE_VALIDATION: 'phone_validation',
  PHONE_REPUTATION: 'phone_reputation',

  // Bank
  BANK_ACCOUNT_CHECK: 'bank_account_check',
  BANK_ACCOUNT_VALIDATION: 'bank_account_validation',
  VIRTUAL_ACCOUNT_CHECK: 'virtual_account_check',

  // Identity
  NIK_VALIDATION: 'nik_validation',
  NPWP_VALIDATION: 'npwp_validation',
  IDENTITY_CHECK: 'identity_check',

  // Communication
  SMS_SEND: 'sms_send',
  WHATSAPP_SEND: 'whatsapp_send',
  EMAIL_SEND: 'email_send',
  OTP_SEND: 'otp_send',

  // Payment / E-Wallet
  EWALLET_CHECK: 'ewallet_check',
  MERCHANT_CHECK: 'merchant_check',
  PAYMENT_ACCOUNT_CHECK: 'payment_account_check',

  // Social Media
  SOCIAL_MEDIA_CHECK: 'social_media_check',
  TELEGRAM_CHECK: 'telegram_check',

  // Data Enrichment
  GEO_LOCATION: 'geo_location',
  DEVICE_FINGERPRINT: 'device_fingerprint',
  EMAIL_REPUTATION: 'email_reputation',
};

const CATEGORIES = {
  THREAT_INTEL: 'threat_intel',
  PHONE: 'phone',
  BANK: 'bank',
  IDENTITY: 'identity',
  COMMUNICATION: 'communication',
  PAYMENT: 'payment',
  SOCIAL: 'social',
  ENRICHMENT: 'enrichment',
};

class ProviderCapability {
  /**
   * Check if a capability is valid.
   */
  static isValid(capability) {
    return Object.values(CAPABILITIES).includes(capability);
  }

  /**
   * Get all capabilities for a category.
   */
  static getByCategory(category) {
    const mapping = {
      [CATEGORIES.THREAT_INTEL]: [
        CAPABILITIES.URL_CHECK, CAPABILITIES.DOMAIN_CHECK,
        CAPABILITIES.IP_CHECK, CAPABILITIES.FILE_HASH_CHECK,
        CAPABILITIES.THREAT_INTEL,
      ],
      [CATEGORIES.PHONE]: [
        CAPABILITIES.PHONE_LOOKUP, CAPABILITIES.PHONE_VALIDATION,
        CAPABILITIES.PHONE_REPUTATION,
      ],
      [CATEGORIES.BANK]: [
        CAPABILITIES.BANK_ACCOUNT_CHECK, CAPABILITIES.BANK_ACCOUNT_VALIDATION,
        CAPABILITIES.VIRTUAL_ACCOUNT_CHECK,
      ],
      [CATEGORIES.IDENTITY]: [
        CAPABILITIES.NIK_VALIDATION, CAPABILITIES.NPWP_VALIDATION,
        CAPABILITIES.IDENTITY_CHECK,
      ],
      [CATEGORIES.COMMUNICATION]: [
        CAPABILITIES.SMS_SEND, CAPABILITIES.WHATSAPP_SEND,
        CAPABILITIES.EMAIL_SEND, CAPABILITIES.OTP_SEND,
      ],
      [CATEGORIES.PAYMENT]: [
        CAPABILITIES.EWALLET_CHECK, CAPABILITIES.MERCHANT_CHECK,
        CAPABILITIES.PAYMENT_ACCOUNT_CHECK,
      ],
      [CATEGORIES.SOCIAL]: [
        CAPABILITIES.SOCIAL_MEDIA_CHECK, CAPABILITIES.TELEGRAM_CHECK,
      ],
      [CATEGORIES.ENRICHMENT]: [
        CAPABILITIES.GEO_LOCATION, CAPABILITIES.DEVICE_FINGERPRINT,
        CAPABILITIES.EMAIL_REPUTATION,
      ],
    };
    return mapping[category] || [];
  }
}

ProviderCapability.CAPABILITIES = CAPABILITIES;
ProviderCapability.CATEGORIES = CATEGORIES;

module.exports = ProviderCapability;