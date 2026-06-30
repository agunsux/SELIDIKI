import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:selidiki/core/router/app_routes.dart';
import 'package:selidiki/core/theme/app_theme.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          _buildAppBar(),
          SliverPadding(
            padding: const EdgeInsets.all(20),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _buildSafetyStatus(),
                const SizedBox(height: 24),
                _buildQuickActions(context),
                const SizedBox(height: 24),
                _buildThreatAlert(),
                const SizedBox(height: 24),
                _buildCommunityStats(),
                const SizedBox(height: 24),
                _buildRecentScams(),
                const SizedBox(height: 100),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  SliverAppBar _buildAppBar() {
    return SliverAppBar(
      backgroundColor: AppTheme.backgroundDark,
      floating: true,
      snap: true,
      pinned: false,
      elevation: 0,
      expandedHeight: 80,
      flexibleSpace: FlexibleSpaceBar(
        background: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                // Logo
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.shield_moon_rounded, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 10),
                const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'SELIDIKI',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textPrimary,
                        letterSpacing: 1.2,
                      ),
                    ),
                    Text(
                      'Digital Trust Platform',
                      style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                    ),
                  ],
                ),
                const Spacer(),
                // Notification
                IconButton(
                  onPressed: () {},
                  icon: Stack(
                    children: [
                      const Icon(Icons.notifications_outlined, color: AppTheme.textSecondary),
                      Positioned(
                        top: 0,
                        right: 0,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppTheme.dangerRed,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Profile
                CircleAvatar(
                  radius: 16,
                  backgroundColor: AppTheme.cardDark2,
                  child: const Icon(Icons.person_outline, size: 18, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSafetyStatus() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0D1F3C), Color(0xFF0F2444)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.2)),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryBlue.withOpacity(0.08),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Safety pulse animation
              Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.safeGreen.withOpacity(0.12),
                    ),
                  ).animate(onPlay: (c) => c.repeat()).scale(
                    begin: const Offset(1, 1),
                    end: const Offset(1.3, 1.3),
                    duration: 2.seconds,
                    curve: Curves.easeInOut,
                  ).then().scale(
                    begin: const Offset(1.3, 1.3),
                    end: const Offset(1, 1),
                    duration: 2.seconds,
                    curve: Curves.easeInOut,
                  ),
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.safeGreen.withOpacity(0.2),
                    ),
                    child: const Icon(
                      Icons.verified_user_rounded,
                      color: AppTheme.safeGreen,
                      size: 26,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Hari Ini Kamu Aman',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tidak ada ancaman terdeteksi\npada perangkat kamu.',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppTheme.textSecondary,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Divider(color: AppTheme.border),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildMiniStat('3', 'Scan\nHari Ini', AppTheme.primaryBlue),
              _buildVertDivider(),
              _buildMiniStat('0', 'Ancaman\nTerdeteksi', AppTheme.safeGreen),
              _buildVertDivider(),
              _buildMiniStat('12', 'Hari\nAman', AppTheme.accentCyan),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.2, curve: Curves.easeOut);
  }

  Widget _buildMiniStat(String value, String label, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11, color: AppTheme.textMuted, height: 1.3),
          ),
        ],
      ),
    );
  }

  Widget _buildVertDivider() {
    return Container(width: 1, height: 36, color: AppTheme.border);
  }

  Widget _buildQuickActions(BuildContext context) {
    final actions = [
      _QuickAction(
        icon: Icons.document_scanner_rounded,
        label: 'Scan\nPesan',
        sublabel: 'SMS & WA',
        gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)]),
        glow: AppTheme.primaryBlue,
        onTap: () => context.go(AppRoutes.scamAnalyzer),
      ),
      _QuickAction(
        icon: Icons.phone_in_talk_rounded,
        label: 'Cek\nNomor HP',
        sublabel: 'Reputasi',
        gradient: const LinearGradient(colors: [Color(0xFF06B6D4), Color(0xFF3B82F6)]),
        glow: AppTheme.accentCyan,
        onTap: () => context.go(AppRoutes.phoneChecker),
      ),
      _QuickAction(
        icon: Icons.account_balance_rounded,
        label: 'Cek\nRekening',
        sublabel: 'Risiko',
        gradient: const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF06B6D4)]),
        glow: AppTheme.safeGreen,
        onTap: () => context.go(AppRoutes.accountChecker),
      ),
      _QuickAction(
        icon: Icons.flag_rounded,
        label: 'Lapor\nFraud',
        sublabel: 'Komunitas',
        gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFEF4444)]),
        glow: AppTheme.warningAmber,
        onTap: () => context.go(AppRoutes.reportFraud),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Aksi Cepat',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 14),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.6,
          children: actions
              .asMap()
              .entries
              .map((e) => _QuickActionCard(action: e.value)
                  .animate()
                  .fadeIn(duration: 400.ms, delay: (e.key * 80).ms)
                  .slideY(begin: 0.2, curve: Curves.easeOut))
              .toList(),
        ),
      ],
    );
  }

  Widget _buildThreatAlert() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.dangerRed.withOpacity(0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.dangerRed.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.dangerRed.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.warning_amber_rounded, color: AppTheme.dangerRed, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '🔴 Alert: Scam Bank BRI Meningkat',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '1.2K laporan dalam 24 jam terakhir. Waspada SMS palsu.',
                  style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppTheme.textMuted, size: 20),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms, delay: 400.ms);
  }

  Widget _buildCommunityStats() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Statistik Komunitas',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: _CommunityStatCard(
                value: '2.4 Jt',
                label: 'Total Laporan',
                icon: Icons.flag_rounded,
                color: AppTheme.primaryBlue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _CommunityStatCard(
                value: '847K',
                label: 'Nomor Berbahaya',
                icon: Icons.phone_disabled_rounded,
                color: AppTheme.dangerRed,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _CommunityStatCard(
                value: 'Rp 892 M',
                label: 'Uang Diselamatkan',
                icon: Icons.savings_rounded,
                color: AppTheme.safeGreen,
              ),
            ),
          ],
        ),
      ],
    ).animate().fadeIn(duration: 500.ms, delay: 500.ms);
  }

  Widget _buildRecentScams() {
    final scams = [
      _ScamItem(
        category: 'Phishing Bank',
        target: '0812-xxxx-3847',
        reports: '2.3K laporan',
        riskLevel: RiskLevel.high,
        timeAgo: '2 jam lalu',
      ),
      _ScamItem(
        category: 'Investasi Palsu',
        target: 'BCA 1234xxx',
        reports: '891 laporan',
        riskLevel: RiskLevel.high,
        timeAgo: '5 jam lalu',
      ),
      _ScamItem(
        category: 'Pinjol Ilegal',
        target: '0878-xxxx-2910',
        reports: '445 laporan',
        riskLevel: RiskLevel.medium,
        timeAgo: '8 jam lalu',
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Scam Terbaru',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
            ),
            TextButton(
              onPressed: () => context.go(AppRoutes.history),
              child: const Text('Lihat Semua', style: TextStyle(fontSize: 13, color: AppTheme.primaryBlue)),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ...scams.asMap().entries.map(
              (e) => _ScamItemCard(item: e.value)
                  .animate()
                  .fadeIn(duration: 400.ms, delay: (600 + e.key * 100).ms)
                  .slideX(begin: 0.05, curve: Curves.easeOut),
            ),
      ],
    );
  }
}

// ─── Sub-widgets ────────────────────────────────────────────────

class _QuickAction {
  final IconData icon;
  final String label;
  final String sublabel;
  final LinearGradient gradient;
  final Color glow;
  final VoidCallback onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.sublabel,
    required this.gradient,
    required this.glow,
    required this.onTap,
  });
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({required this.action});

  final _QuickAction action;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: action.onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: AppTheme.cardDark,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
          boxShadow: [
            BoxShadow(
              color: action.glow.withOpacity(0.08),
              blurRadius: 20,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                gradient: action.gradient,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(action.icon, color: Colors.white, size: 18),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  action.label,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  action.sublabel,
                  style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CommunityStatCard extends StatelessWidget {
  const _CommunityStatCard({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
  });

  final String value;
  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: const TextStyle(fontSize: 10, color: AppTheme.textMuted, height: 1.3),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

enum RiskLevel { low, medium, high }

class _ScamItem {
  final String category;
  final String target;
  final String reports;
  final RiskLevel riskLevel;
  final String timeAgo;

  const _ScamItem({
    required this.category,
    required this.target,
    required this.reports,
    required this.riskLevel,
    required this.timeAgo,
  });
}

class _ScamItemCard extends StatelessWidget {
  const _ScamItemCard({required this.item});

  final _ScamItem item;

  Color get riskColor {
    switch (item.riskLevel) {
      case RiskLevel.high:
        return AppTheme.dangerRed;
      case RiskLevel.medium:
        return AppTheme.warningAmber;
      case RiskLevel.low:
        return AppTheme.safeGreen;
    }
  }

  String get riskLabel {
    switch (item.riskLevel) {
      case RiskLevel.high:
        return 'BERBAHAYA';
      case RiskLevel.medium:
        return 'WASPADA';
      case RiskLevel.low:
        return 'RENDAH';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: riskColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.dangerous_outlined, color: riskColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        item.category,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: riskColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        riskLabel,
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: riskColor),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  '${item.target} • ${item.reports}',
                  style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            item.timeAgo,
            style: const TextStyle(fontSize: 10, color: AppTheme.textDisabled),
          ),
        ],
      ),
    );
  }
}
