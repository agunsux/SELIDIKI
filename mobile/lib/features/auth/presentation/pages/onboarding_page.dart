import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:selidiki/core/router/app_routes.dart';
import 'package:selidiki/core/theme/app_theme.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<_OnboardingData> _pages = [
    _OnboardingData(
      icon: Icons.shield_moon_rounded,
      iconColor: AppTheme.primaryBlue,
      glowColor: AppTheme.primaryGlow,
      badge: 'SELIDIKI',
      title: 'Indonesia Digital\nTrust Layer',
      subtitle:
          'Platform AI pertama di Indonesia yang membantu kamu mendeteksi, memahami, dan mencegah fraud sebelum terjadi kerugian.',
      gradient: [Color(0xFF3B82F6), Color(0xFF8B5CF6)],
    ),
    _OnboardingData(
      icon: Icons.psychology_alt_rounded,
      iconColor: AppTheme.accentCyan,
      glowColor: Color(0x2206B6D4),
      badge: 'AI SCAM ANALYZER',
      title: 'Deteksi Scam\nDalam Detik',
      subtitle:
          'Paste SMS, pesan WhatsApp, atau link mencurigakan. AI kami langsung memberi Risk Score 0-100 dengan penjelasan mengapa berbahaya.',
      gradient: [Color(0xFF06B6D4), Color(0xFF3B82F6)],
    ),
    _OnboardingData(
      icon: Icons.account_balance_rounded,
      iconColor: AppTheme.safeGreen,
      glowColor: AppTheme.safeGlow,
      badge: 'BANK CHECKER',
      title: 'Cek Rekening\nSebelum Transfer',
      subtitle:
          'Verifikasi reputasi nomor rekening dan nomor HP dari database komunitas fraud Indonesia sebelum melakukan transaksi.',
      gradient: [Color(0xFF10B981), Color(0xFF06B6D4)],
    ),
    _OnboardingData(
      icon: Icons.groups_rounded,
      iconColor: AppTheme.warningAmber,
      glowColor: AppTheme.warningGlow,
      badge: 'KOMUNITAS',
      title: 'Bersama Lebih\nAman',
      subtitle:
          'Laporkan nomor penipu, bagikan bukti, dan lindungi sesama. Setiap laporan membantu jutaan pengguna Indonesia.',
      gradient: [Color(0xFFF59E0B), Color(0xFFEF4444)],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      body: Stack(
        children: [
          // Background gradient blobs
          _buildBackgroundBlobs(),

          // Main content
          SafeArea(
            child: Column(
              children: [
                // Skip button
                Align(
                  alignment: Alignment.topRight,
                  child: Padding(
                    padding: const EdgeInsets.only(top: 16, right: 20),
                    child: TextButton(
                      onPressed: () => context.go(AppRoutes.auth),
                      child: const Text(
                        'Lewati',
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ).animate().fadeIn(duration: 600.ms, delay: 300.ms),

                // Page content
                Expanded(
                  child: PageView.builder(
                    controller: _pageController,
                    itemCount: _pages.length,
                    onPageChanged: (index) => setState(() => _currentPage = index),
                    itemBuilder: (context, index) {
                      return _OnboardingPageContent(data: _pages[index]);
                    },
                  ),
                ),

                // Bottom section: dots + button
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                  child: Column(
                    children: [
                      // Page dots
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          _pages.length,
                          (i) => _buildDot(i),
                        ),
                      ),
                      const SizedBox(height: 28),

                      // CTA Button
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: _pages[_currentPage].gradient,
                            ),
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [
                              BoxShadow(
                                color: _pages[_currentPage].gradient.first.withOpacity(0.3),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: ElevatedButton(
                            onPressed: () {
                              if (_currentPage < _pages.length - 1) {
                                _pageController.nextPage(
                                  duration: const Duration(milliseconds: 350),
                                  curve: Curves.easeInOut,
                                );
                              } else {
                                context.go(AppRoutes.auth);
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            child: Text(
                              _currentPage < _pages.length - 1 ? 'Lanjut' : 'Mulai Sekarang',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                letterSpacing: 0.3,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDot(int index) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      margin: const EdgeInsets.symmetric(horizontal: 3),
      width: _currentPage == index ? 24 : 6,
      height: 6,
      decoration: BoxDecoration(
        color: _currentPage == index ? AppTheme.primaryBlue : AppTheme.textDisabled,
        borderRadius: BorderRadius.circular(3),
      ),
    );
  }

  Widget _buildBackgroundBlobs() {
    return Stack(
      children: [
        Positioned(
          top: -100,
          right: -80,
          child: Container(
            width: 300,
            height: 300,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.primaryBlue.withOpacity(0.05),
            ),
          ),
        ),
        Positioned(
          bottom: 100,
          left: -80,
          child: Container(
            width: 250,
            height: 250,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.accentPurple.withOpacity(0.04),
            ),
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }
}

class _OnboardingPageContent extends StatelessWidget {
  const _OnboardingPageContent({required this.data});

  final _OnboardingData data;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Icon with glow
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: data.glowColor,
              shape: BoxShape.circle,
              border: Border.all(
                color: data.iconColor.withOpacity(0.2),
                width: 1,
              ),
            ),
            child: Icon(
              data.icon,
              size: 56,
              color: data.iconColor,
            ),
          )
              .animate()
              .scale(duration: 500.ms, curve: Curves.elasticOut)
              .fadeIn(duration: 400.ms),

          const SizedBox(height: 28),

          // Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              border: Border.all(color: data.iconColor.withOpacity(0.4)),
              borderRadius: BorderRadius.circular(20),
              color: data.iconColor.withOpacity(0.08),
            ),
            child: Text(
              data.badge,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: data.iconColor,
                letterSpacing: 1.5,
              ),
            ),
          ).animate().fadeIn(duration: 500.ms, delay: 100.ms),

          const SizedBox(height: 16),

          // Title
          Text(
            data.title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 30,
              fontWeight: FontWeight.w800,
              color: AppTheme.textPrimary,
              height: 1.2,
              letterSpacing: -0.8,
            ),
          ).animate().slideY(begin: 0.3, duration: 500.ms, delay: 150.ms, curve: Curves.easeOut).fadeIn(),

          const SizedBox(height: 16),

          // Subtitle
          Text(
            data.subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 15,
              color: AppTheme.textSecondary,
              height: 1.6,
            ),
          ).animate().fadeIn(duration: 500.ms, delay: 250.ms),
        ],
      ),
    );
  }
}

class _OnboardingData {
  final IconData icon;
  final Color iconColor;
  final Color glowColor;
  final String badge;
  final String title;
  final String subtitle;
  final List<Color> gradient;

  const _OnboardingData({
    required this.icon,
    required this.iconColor,
    required this.glowColor,
    required this.badge,
    required this.title,
    required this.subtitle,
    required this.gradient,
  });
}
