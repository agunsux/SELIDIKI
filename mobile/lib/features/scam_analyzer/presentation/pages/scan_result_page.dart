import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:selidiki/core/theme/app_theme.dart';

class ScanResultPage extends StatelessWidget {
  const ScanResultPage({super.key, this.result});

  final Map<String, dynamic>? result;

  @override
  Widget build(BuildContext context) {
    // Use mock data if no result provided
    final data = result ?? _mockResult;
    final riskScore = (data['risk_score'] as num?)?.toInt() ?? 75;
    final status = data['status'] as String? ?? 'WARNING';
    final reasons = (data['reasons'] as List?)?.cast<String>() ?? [];
    final recommendation = data['recommendation'] as String? ?? '';
    final category = data['category'] as String? ?? 'Scam Terdeteksi';

    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      appBar: AppBar(
        title: const Text('Hasil Analisis'),
        backgroundColor: AppTheme.backgroundDark,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
        ),
        actions: [
          IconButton(
            onPressed: () => _share(data),
            icon: const Icon(Icons.share_outlined, size: 20),
          ),
        ],
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildRiskGauge(riskScore, status),
            const SizedBox(height: 24),
            _buildStatusCard(status, category),
            const SizedBox(height: 20),
            _buildReasons(reasons),
            const SizedBox(height: 20),
            _buildRecommendation(recommendation, status),
            const SizedBox(height: 20),
            _buildActions(context, status),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _buildRiskGauge(int score, String status) {
    final color = _statusColor(status);

    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withOpacity(0.08), color.withOpacity(0.03)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Column(
        children: [
          // Animated score circle
          Stack(
            alignment: Alignment.center,
            children: [
              SizedBox(
                width: 160,
                height: 160,
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: score / 100),
                  duration: const Duration(milliseconds: 1500),
                  curve: Curves.easeOut,
                  builder: (context, value, _) {
                    return CircularProgressIndicator(
                      value: value,
                      strokeWidth: 10,
                      strokeCap: StrokeCap.round,
                      backgroundColor: AppTheme.cardDark2,
                      valueColor: AlwaysStoppedAnimation<Color>(color),
                    );
                  },
                ),
              ),
              Column(
                children: [
                  TweenAnimationBuilder<int>(
                    tween: IntTween(begin: 0, end: score),
                    duration: const Duration(milliseconds: 1500),
                    curve: Curves.easeOut,
                    builder: (context, value, _) => Text(
                      '$value',
                      style: TextStyle(
                        fontSize: 48,
                        fontWeight: FontWeight.w800,
                        color: color,
                        height: 1,
                      ),
                    ),
                  ),
                  Text(
                    'dari 100',
                    style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                  ),
                ],
              ),
            ],
          ).animate().scale(duration: 600.ms, curve: Curves.elasticOut),

          const SizedBox(height: 20),

          Text(
            _statusLabel(status),
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: color,
              letterSpacing: 1,
            ),
          ).animate().fadeIn(duration: 500.ms, delay: 300.ms),

          const SizedBox(height: 6),

          Text(
            _statusDesc(status),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4),
          ).animate().fadeIn(duration: 500.ms, delay: 400.ms),
        ],
      ),
    );
  }

  Widget _buildStatusCard(String status, String category) {
    final color = _statusColor(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(_categoryIcon(category), color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Kategori Terdeteksi',
                  style: const TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w500),
                ),
                Text(
                  category,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              status,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms, delay: 200.ms);
  }

  Widget _buildReasons(List<String> reasons) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Alasan Deteksi',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 10),
        ...reasons.asMap().entries.map(
              (e) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.dangerRed.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.dangerRed.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_rounded, color: AppTheme.dangerRed, size: 16),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        e.value,
                        style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.4),
                      ),
                    ),
                  ],
                ),
              )
                  .animate()
                  .fadeIn(duration: 400.ms, delay: (300 + e.key * 80).ms)
                  .slideX(begin: 0.1, curve: Curves.easeOut),
            ),
      ],
    );
  }

  Widget _buildRecommendation(String recommendation, String status) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.primaryBlue.withOpacity(0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.lightbulb_outline, color: AppTheme.primaryBlue, size: 18),
              SizedBox(width: 8),
              Text(
                'Rekomendasi SELIDIKI',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.primaryBlue),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            recommendation,
            style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.6),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms, delay: 600.ms);
  }

  Widget _buildActions(BuildContext context, String status) {
    return Column(
      children: [
        if (status == 'DANGEROUS' || status == 'WARNING')
          SizedBox(
            width: double.infinity,
            height: 52,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: AppTheme.dangerGradient,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.dangerRed.withOpacity(0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: ElevatedButton.icon(
                onPressed: () => context.go('/report'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: const Icon(Icons.flag_rounded, color: Colors.white),
                label: const Text(
                  'Laporkan ke Komunitas',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
            ),
          ),

        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => context.go('/scan'),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                icon: const Icon(Icons.refresh, size: 18, color: AppTheme.textSecondary),
                label: const Text('Scan Lagi', style: TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => context.go('/history'),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                icon: const Icon(Icons.history, size: 18, color: AppTheme.textSecondary),
                label: const Text('Riwayat', style: TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
              ),
            ),
          ],
        ),
      ],
    ).animate().fadeIn(duration: 400.ms, delay: 700.ms);
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'DANGEROUS':
        return AppTheme.dangerRed;
      case 'WARNING':
        return AppTheme.warningAmber;
      case 'SAFE':
        return AppTheme.safeGreen;
      default:
        return AppTheme.primaryBlue;
    }
  }

  String _statusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'DANGEROUS':
        return '🔴 BERBAHAYA';
      case 'WARNING':
        return '🟡 WASPADA';
      case 'SAFE':
        return '🟢 AMAN';
      default:
        return '⚪ TIDAK DIKENAL';
    }
  }

  String _statusDesc(String status) {
    switch (status.toUpperCase()) {
      case 'DANGEROUS':
        return 'Pesan ini sangat berbahaya.\nJangan klik link atau ikuti instruksi apapun.';
      case 'WARNING':
        return 'Pesan ini mencurigakan.\nVerifikasi melalui channel resmi sebelum bertindak.';
      case 'SAFE':
        return 'Tidak ada indikasi scam terdeteksi.\nTetap waspada dan jaga data pribadimu.';
      default:
        return 'Analisis tidak dapat disimpulkan.\nGunakan penilaian kamu sendiri.';
    }
  }

  IconData _categoryIcon(String category) {
    if (category.toLowerCase().contains('phishing')) return Icons.phishing;
    if (category.toLowerCase().contains('investasi')) return Icons.trending_up;
    if (category.toLowerCase().contains('bank')) return Icons.account_balance;
    if (category.toLowerCase().contains('pinjol')) return Icons.money_off;
    return Icons.warning_rounded;
  }

  void _share(Map<String, dynamic> data) {
    final score = data['risk_score'];
    final status = data['status'];
    Share.share(
      '⚠️ SELIDIKI Alert!\n\nRisk Score: $score/100\nStatus: $status\n\nDownload SELIDIKI untuk melindungi diri dari penipuan digital.',
    );
  }

  static final Map<String, dynamic> _mockResult = {
    'risk_score': 92,
    'status': 'DANGEROUS',
    'category': 'Phishing Bank',
    'reasons': [
      'Mengklaim sebagai bank resmi tanpa verifikasi',
      'Meminta transfer uang dengan alasan mendesak',
      'Menggunakan link yang tidak resmi dan mencurigakan',
      'Pola bahasa manipulatif: urgency & fear',
      'Domain link tidak cocok dengan website bank asli',
    ],
    'recommendation':
        'Jangan klik link apapun dalam pesan ini. Jangan transfer uang. '
        'Hubungi bank kamu melalui nomor resmi di kartu ATM atau website resmi. '
        'Laporkan nomor ini ke komunitas SELIDIKI untuk melindungi pengguna lain.',
  };
}
