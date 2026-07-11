// explain/ConfidenceExplainer.js
class ConfidenceExplainer {
  static explain(entityHash, signals = {}) {
    const c = signals.confidence || 0;
    const parts = [];
    if (c >= 80) parts.push('Confidence tinggi: banyak sumber data yang konsisten');
    else if (c >= 50) parts.push('Confidence menengah: data cukup namun perlu verifikasi');
    else parts.push('Confidence rendah: data terbatas, diperlukan informasi tambahan');
    return { confidence: c, explanation: parts.join('. '), level: c >= 80 ? 'high' : c >= 50 ? 'medium' : 'low' };
  }
}
module.exports = ConfidenceExplainer;