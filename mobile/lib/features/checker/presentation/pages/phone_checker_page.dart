import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:selidiki/core/theme/app_theme.dart';

class PhoneCheckerPage extends ConsumerStatefulWidget {
  const PhoneCheckerPage({super.key});

  @override
  ConsumerState<PhoneCheckerPage> createState() => _PhoneCheckerPageState();
}

class _PhoneCheckerPageState extends ConsumerState<PhoneCheckerPage> {
  final _phoneController = TextEditingController();
  bool _isLoading = false;
  Map<String, dynamic>? _result;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      appBar: AppBar(
        title: const Text('Cek Nomor HP'),
        backgroundColor: AppTheme.backgroundDark,
        actions: [
          TextButton(
            onPressed: () => context.go('/check/account'),
            child: const Text('Cek Rekening', style: TextStyle(color: AppTheme.primaryBlue, fontSize: 13)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildInputCard(),
            const SizedBox(height: 20),
            if (_result != null) ...[
              _buildResultCard(_result!),
              const SizedBox(height: 20),
              _buildSignalBreakdown(_result!),
              const SizedBox(height: 20),
              _buildReportCTA(),
            ],
            if (_result == null) ...[
              _buildTips(),
            ],
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _buildInputCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.cardDark,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Nomor HP yang Ingin Dicek',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16),
                  decoration: InputDecoration(
                    hintText: '0812 3456 7890',
                    prefixText: '+62 ',
                    prefixStyle: const TextStyle(color: AppTheme.textSecondary, fontSize: 16),
                    filled: true,
                    fillColor: AppTheme.cardDark2,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.primaryBlue, width: 1.5),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryBlue.withOpacity(0.3),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: ElevatedButton(
                onPressed: _isLoading ? null : _checkPhone,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Periksa Sekarang', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms);
  }

  Widget _buildResultCard(Map<String, dynamic> result) {
    final score = result['risk_score'] as int;
    final status = result['status'] as String;
    final phone = result['phone'] as String;
    final reports = result['reports'] as int;
    final color = _riskColor(status);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withOpacity(0.08), color.withOpacity(0.02)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(_riskIcon(status), color: color, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '+62 $phone',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$reports laporan komunitas',
                      style: TextStyle(fontSize: 12, color: color),
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  Text(
                    '$score',
                    style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: color),
                  ),
                  Text('Risk Score', style: const TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              _statusLabel(status),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: color, letterSpacing: 1),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms).scale(begin: const Offset(0.95, 0.95));
  }

  Widget _buildSignalBreakdown(Map<String, dynamic> result) {
    final signals = result['signals'] as List<Map<String, dynamic>>? ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Sinyal Terdeteksi',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 10),
        ...signals.asMap().entries.map(
              (e) {
                final signal = e.value;
                final color = _riskColor(signal['level'] as String? ?? 'LOW');
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.cardDark,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          signal['label'] as String? ?? '',
                          style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary),
                        ),
                      ),
                      Text(
                        signal['value'] as String? ?? '',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color),
                      ),
                    ],
                  ),
                ).animate().fadeIn(duration: 300.ms, delay: (e.key * 60).ms);
              },
            ),
      ],
    );
  }

  Widget _buildReportCTA() {
    return OutlinedButton.icon(
      onPressed: () => context.go('/report'),
      style: OutlinedButton.styleFrom(
        side: const BorderSide(color: AppTheme.dangerRed),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(vertical: 14),
        minimumSize: const Size(double.infinity, 0),
      ),
      icon: const Icon(Icons.flag_rounded, color: AppTheme.dangerRed, size: 18),
      label: const Text('Laporkan Nomor Ini', style: TextStyle(color: AppTheme.dangerRed, fontSize: 14, fontWeight: FontWeight.w600)),
    );
  }

  Widget _buildTips() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Tips Keamanan',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 12),
        ...[
          ('Selalu cek nomor asing sebelum transfer', Icons.phone_callback_rounded, AppTheme.primaryBlue),
          ('Waspada penelepon yang mengaku bank/OJK', Icons.account_balance, AppTheme.warningAmber),
          ('Bank tidak pernah meminta OTP melalui telepon', Icons.lock_outline, AppTheme.safeGreen),
          ('Scam sering menggunakan nomor mirip nomor resmi', Icons.content_copy, AppTheme.dangerRed),
        ].asMap().entries.map(
              (e) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: e.value.$3.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: e.value.$3.withOpacity(0.15)),
                ),
                child: Row(
                  children: [
                    Icon(e.value.$2, color: e.value.$3, size: 18),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(e.value.$1, style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.4)),
                    ),
                  ],
                ),
              ).animate().fadeIn(duration: 400.ms, delay: (e.key * 80).ms),
            ),
      ],
    );
  }

  Future<void> _checkPhone() async {
    final phone = _phoneController.text.trim().replaceAll(RegExp(r'[^0-9]'), '');
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Masukkan nomor HP'), backgroundColor: AppTheme.warningAmber),
      );
      return;
    }

    setState(() => _isLoading = true);

    await Future.delayed(const Duration(seconds: 1));

    // Mock result
    setState(() {
      _isLoading = false;
      _result = {
        'phone': phone,
        'risk_score': 78,
        'status': 'HIGH',
        'reports': 523,
        'signals': [
          {'label': 'Dilaporkan sebagai penipu', 'value': '523x', 'level': 'HIGH'},
          {'label': 'Aktivitas meningkat 7 hari terakhir', 'value': '+340%', 'level': 'HIGH'},
          {'label': 'Kategori dominan', 'value': 'Phishing Bank', 'level': 'HIGH'},
          {'label': 'Pertama dilaporkan', 'value': '3 bulan lalu', 'level': 'LOW'},
          {'label': 'Provider', 'value': 'Telkomsel', 'level': 'LOW'},
        ],
      };
    });
  }

  Color _riskColor(String status) {
    switch (status.toUpperCase()) {
      case 'HIGH':
      case 'DANGEROUS':
        return AppTheme.dangerRed;
      case 'MEDIUM':
      case 'WARNING':
        return AppTheme.warningAmber;
      default:
        return AppTheme.safeGreen;
    }
  }

  IconData _riskIcon(String status) {
    switch (status.toUpperCase()) {
      case 'HIGH':
        return Icons.dangerous_rounded;
      case 'MEDIUM':
        return Icons.warning_rounded;
      default:
        return Icons.verified_rounded;
    }
  }

  String _statusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'HIGH':
        return '🔴 RISIKO TINGGI';
      case 'MEDIUM':
        return '🟡 PERLU WASPADA';
      default:
        return '🟢 AMAN';
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }
}
