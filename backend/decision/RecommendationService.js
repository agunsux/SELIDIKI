// decision/RecommendationService.js
// Generates actionable recommendations from decisions.

class RecommendationService {
  static generate(decision, signals = {}) {
    const map = {
      SAFE: { action: 'allow', message: 'Tidak ada indikasi risiko. Proses dilanjutkan.', urgency: 'none' },
      LOW_RISK: { action: 'allow_with_monitor', message: 'Risiko rendah. Pantau secara berkala.', urgency: 'low' },
      MEDIUM_RISK: { action: 'review', message: 'Risiko sedang. Verifikasi sebelum melanjutkan.', urgency: 'medium' },
      HIGH_RISK: { action: 'investigate', message: 'Risiko tinggi. Investigasi segera diperlukan.', urgency: 'high' },
      BLOCK: { action: 'block', message: 'Transaksi diblokir. Hubungi tim keamanan.', urgency: 'critical' },
      MANUAL_REVIEW: { action: 'escalate', message: 'Memerlukan review manual oleh moderator senior.', urgency: 'high' },
    };
    const base = map[decision] || { action: 'unknown', message: 'Evaluasi standar.', urgency: 'low' };
    return {
      ...base,
      risk_level: decision,
      score: signals.score || 0,
      confidence: signals.confidence || 0,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = RecommendationService;