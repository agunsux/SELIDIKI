import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:selidiki/core/router/app_routes.dart';
import 'package:selidiki/core/theme/app_theme.dart';

class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      body: child,
      bottomNavigationBar: _SelidikiBottomNav(),
    );
  }
}

class _SelidikiBottomNav extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;

    int selectedIndex = 0;
    if (location.startsWith(AppRoutes.home)) selectedIndex = 0;
    if (location.startsWith(AppRoutes.scamAnalyzer)) selectedIndex = 1;
    if (location.startsWith('/check')) selectedIndex = 2;
    if (location.startsWith(AppRoutes.reportFraud)) selectedIndex = 3;
    if (location.startsWith(AppRoutes.history)) selectedIndex = 4;

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surfaceDark,
        border: Border(top: BorderSide(color: AppTheme.border, width: 1)),
      ),
      child: SafeArea(
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              _NavItem(
                icon: Icons.shield_outlined,
                activeIcon: Icons.shield,
                label: 'Beranda',
                isActive: selectedIndex == 0,
                onTap: () => context.go(AppRoutes.home),
              ),
              _NavItem(
                icon: Icons.document_scanner_outlined,
                activeIcon: Icons.document_scanner,
                label: 'Scan',
                isActive: selectedIndex == 1,
                onTap: () => context.go(AppRoutes.scamAnalyzer),
              ),
              _NavItem(
                icon: Icons.search_outlined,
                activeIcon: Icons.search,
                label: 'Cek',
                isActive: selectedIndex == 2,
                onTap: () => context.go(AppRoutes.phoneChecker),
              ),
              _NavItem(
                icon: Icons.flag_outlined,
                activeIcon: Icons.flag,
                label: 'Lapor',
                isActive: selectedIndex == 3,
                onTap: () => context.go(AppRoutes.reportFraud),
              ),
              _NavItem(
                icon: Icons.history_outlined,
                activeIcon: Icons.history,
                label: 'Riwayat',
                isActive: selectedIndex == 4,
                onTap: () => context.go(AppRoutes.history),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isActive ? activeIcon : icon,
                color: isActive ? AppTheme.primaryBlue : AppTheme.textMuted,
                size: 22,
              ),
              const SizedBox(height: 3),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                  color: isActive ? AppTheme.primaryBlue : AppTheme.textMuted,
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
