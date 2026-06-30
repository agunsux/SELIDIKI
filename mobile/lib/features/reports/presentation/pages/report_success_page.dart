import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:selidiki/core/router/app_routes.dart';
import 'package:selidiki/core/theme/app_theme.dart';

class ReportSuccessPage extends StatelessWidget {
  const ReportSuccessPage({super.key, this.trackingId});

  final String? trackingId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Success animation
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.safeGreen.withOpacity(0.12),
                  border: Border.all(color: AppTheme.safeGreen.withOpacity(0.3), width: 2),
                ),
                child: const Icon(Icons.check_circle_rounded, color: AppTheme.safeGreen, size: 64),
              ).animate().scale(duration: 600.ms, curve: Curves.elasticOut),

              const SizedBox(height: 32),

              const Text(
                'Laporan Terkirim!',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                textAlign: TextAlign.center,
              ).animate().fadeIn(duration: 500.ms, delay: 200.ms),

              const SizedBox(height: 12),

              const Text(
                'Terima kasih telah melindungi komunitas Indonesia dari penipuan digital.',
                style: TextStyle(fontSize: 15, color: AppTheme.textSecondary, height: 1.5),
                textAlign: TextAlign.center,
              ).animate().fadeIn(duration: 500.ms, delay: 300.ms),

              const SizedBox(height: 24),

              if (trackingId != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppTheme.cardDark,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Column(
                    children: [
                      const Text('ID Laporan', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                      const SizedBox(height: 4),
                      Text(
                        trackingId!,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.primaryBlue,
                          letterSpacing: 1,
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(duration: 500.ms, delay: 400.ms),

              const SizedBox(height: 40),

              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primaryBlue.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.15)),
                ),
                child: const Text(
                  '✅  Laporan akan diverifikasi oleh tim moderasi.\n'
                  '✅  Data akan ditambahkan ke database komunitas.\n'
                  '✅  Ribuan pengguna akan terlindungi.',
                  style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.7),
                ),
              ).animate().fadeIn(duration: 500.ms, delay: 500.ms),

              const SizedBox(height: 40),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: ElevatedButton(
                    onPressed: () => context.go(AppRoutes.home),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text(
                      'Kembali ke Beranda',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                  ),
                ),
              ).animate().fadeIn(duration: 500.ms, delay: 600.ms),
            ],
          ),
        ),
      ),
    );
  }
}
