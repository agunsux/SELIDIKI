// replay/ScenarioLibrary.js
// Defines known fraud scenarios with realistic event sequences for replay testing.

const FRAUD_SCENARIOS = {
  marketplace_scam: {
    name: 'Marketplace Scam',
    description: 'Fake seller on marketplace platform, demands advance payment',
    indicators: ['new_account', 'below_market_price', 'advance_payment', 'no_physical_store'],
    typical_risk_range: [60, 95],
    events: [
      { type: 'account_created', days_before: -14 },
      { type: 'listing_posted', days_before: -7 },
      { type: 'first_lookup', days_before: -1 },
      { type: 'first_report', days_before: 0 },
      { type: 'reports_accelerating', days_before: 1 },
    ],
  },
  investment_scam: {
    name: 'Investment Scam',
    description: 'Fake investment scheme promising unrealistic returns',
    indicators: ['unrealistic_returns', 'high_pressure', 'referral_bonus', 'no_license'],
    typical_risk_range: [70, 100],
    events: [
      { type: 'website_created', days_before: -30 },
      { type: 'social_media_campaign', days_before: -14 },
      { type: 'first_lookup', days_before: -3 },
      { type: 'first_report', days_before: 0 },
      { type: 'mass_reports', days_before: 2 },
    ],
  },
  otp_theft: {
    name: 'OTP Theft',
    description: 'Social engineering to steal OTP codes for financial transactions',
    indicators: ['spoofed_caller_id', 'urgent_request', 'impersonates_official'],
    typical_risk_range: [75, 100],
    events: [
      { type: 'phone_activated', days_before: -90 },
      { type: 'spam_reports', days_before: -7 },
      { type: 'first_theft_report', days_before: 0 },
      { type: 'multiple_victims', days_before: 1 },
    ],
  },
  courier_scam: {
    name: 'Courier Scam',
    description: 'Fake courier delivery notification with malicious link or payment request',
    indicators: ['fake_tracking', 'urgent_delivery', 'small_payment_request', 'phishing_link'],
    typical_risk_range: [50, 85],
    events: [
      { type: 'sms_campaign', days_before: -2 },
      { type: 'domain_registered', days_before: -7 },
      { type: 'first_report', days_before: 0 },
      { type: 'reports_peak', days_before: 1 },
    ],
  },
  fake_bank: {
    name: 'Fake Bank',
    description: 'Impersonates a legitimate bank to steal credentials and funds',
    indicators: ['fake_website', 'spoofed_app', 'requests_credentials', 'urgent_account_action'],
    typical_risk_range: [80, 100],
    events: [
      { type: 'domain_registered', days_before: -60 },
      { type: 'fake_app_published', days_before: -14 },
      { type: 'sms_campaign', days_before: -3 },
      { type: 'first_report', days_before: 0 },
      { type: 'mass_complaints', days_before: 2 },
    ],
  },
  apk_malware: {
    name: 'APK Malware',
    description: 'Malicious Android APK distributed via social media or messaging apps',
    indicators: ['apk_download', 'outside_playstore', 'request_permissions', 'sms_forwarding'],
    typical_risk_range: [70, 100],
    events: [
      { type: 'apk_uploaded', days_before: -5 },
      { type: 'link_shared', days_before: -2 },
      { type: 'first_report', days_before: 0 },
      { type: 'reports_surge', days_before: 1 },
    ],
  },
  qr_scam: {
    name: 'QR Scam',
    description: 'Fake QR codes placed in public locations redirecting to phishing sites',
    indicators: ['qr_code', 'public_place', 'phishing_redirect', 'payment_request'],
    typical_risk_range: [55, 80],
    events: [
      { type: 'qr_placed', days_before: -3 },
      { type: 'first_victim', days_before: -1 },
      { type: 'first_report', days_before: 0 },
      { type: 'reports_spread', days_before: 1 },
    ],
  },
  romance_scam: {
    name: 'Romance Scam',
    description: 'Fake online relationship to defraud victim of money',
    indicators: ['fake_profile', 'long_term_grooming', 'emergency_request', 'never_meet'],
    typical_risk_range: [65, 95],
    events: [
      { type: 'profile_created', days_before: -60 },
      { type: 'grooming_period', days_before: -30 },
      { type: 'first_money_request', days_before: -7 },
      { type: 'first_report', days_before: 0 },
    ],
  },
  loan_scam: {
    name: 'Loan Scam',
    description: 'Fake loan offering with advance fee requirement',
    indicators: ['no_verification', 'advance_fee', 'instant_approval', 'unregistered'],
    typical_risk_range: [60, 90],
    events: [
      { type: 'ads_placed', days_before: -14 },
      { type: 'first_victim', days_before: -5 },
      { type: 'first_report', days_before: 0 },
      { type: 'reports_rising', days_before: 3 },
    ],
  },
  impersonation: {
    name: 'Government Impersonation',
    description: 'Impersonates government officials to demand payment or personal data',
    indicators: ['spoofed_number', 'official_title', 'threat_of_legal', 'payment_demand'],
    typical_risk_range: [75, 100],
    events: [
      { type: 'phone_activated', days_before: -30 },
      { type: 'first_victim', days_before: -2 },
      { type: 'first_report', days_before: 0 },
      { type: 'reports_escalation', days_before: 1 },
      { type: 'mass_reports', days_before: 3 },
    ],
  },
};

class ScenarioLibrary {
  static getAll() {
    return Object.entries(FRAUD_SCENARIOS).map(([key, val]) => ({ id: key, ...val }));
  }

  static get(id) {
    return FRAUD_SCENARIOS[id] ? { id, ...FRAUD_SCENARIOS[id] } : null;
  }

  static getIds() {
    return Object.keys(FRAUD_SCENARIOS);
  }

  static getCount() {
    return Object.keys(FRAUD_SCENARIOS).length;
  }
}

module.exports = ScenarioLibrary;