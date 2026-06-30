import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:selidiki/core/router/app_routes.dart';
import 'package:selidiki/features/auth/presentation/pages/onboarding_page.dart';
import 'package:selidiki/features/auth/presentation/pages/auth_page.dart';
import 'package:selidiki/features/dashboard/presentation/pages/home_page.dart';
import 'package:selidiki/features/scam_analyzer/presentation/pages/scam_analyzer_page.dart';
import 'package:selidiki/features/scam_analyzer/presentation/pages/scan_result_page.dart';
import 'package:selidiki/features/checker/presentation/pages/phone_checker_page.dart';
import 'package:selidiki/features/checker/presentation/pages/account_checker_page.dart';
import 'package:selidiki/features/checker/presentation/pages/checker_result_page.dart';
import 'package:selidiki/features/reports/presentation/pages/report_fraud_page.dart';
import 'package:selidiki/features/reports/presentation/pages/report_success_page.dart';
import 'package:selidiki/features/history/presentation/pages/history_page.dart';
import 'package:selidiki/features/privacy/presentation/pages/privacy_center_page.dart';
import 'package:selidiki/shared/widgets/main_shell.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: AppRoutes.onboarding,
    debugLogDiagnostics: true,
    routes: [
      // ─ Onboarding & Auth (no shell)
      GoRoute(
        path: AppRoutes.onboarding,
        name: 'onboarding',
        builder: (context, state) => const OnboardingPage(),
      ),
      GoRoute(
        path: AppRoutes.auth,
        name: 'auth',
        builder: (context, state) => const AuthPage(),
      ),

      // ─ Main App Shell (bottom navigation)
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.home,
            name: 'home',
            builder: (context, state) => const HomePage(),
          ),
          GoRoute(
            path: AppRoutes.scamAnalyzer,
            name: 'scam_analyzer',
            builder: (context, state) => const ScamAnalyzerPage(),
            routes: [
              GoRoute(
                path: 'result',
                name: 'scan_result',
                builder: (context, state) {
                  final extra = state.extra as Map<String, dynamic>?;
                  return ScanResultPage(result: extra);
                },
              ),
            ],
          ),
          GoRoute(
            path: AppRoutes.phoneChecker,
            name: 'phone_checker',
            builder: (context, state) => const PhoneCheckerPage(),
            routes: [
              GoRoute(
                path: 'result',
                name: 'checker_result',
                builder: (context, state) {
                  final extra = state.extra as Map<String, dynamic>?;
                  return CheckerResultPage(result: extra);
                },
              ),
            ],
          ),
          GoRoute(
            path: AppRoutes.accountChecker,
            name: 'account_checker',
            builder: (context, state) => const AccountCheckerPage(),
          ),
          GoRoute(
            path: AppRoutes.reportFraud,
            name: 'report_fraud',
            builder: (context, state) => const ReportFraudPage(),
            routes: [
              GoRoute(
                path: 'success',
                name: 'report_success',
                builder: (context, state) {
                  final extra = state.extra as Map<String, dynamic>?;
                  return ReportSuccessPage(trackingId: extra?['tracking_id']);
                },
              ),
            ],
          ),
          GoRoute(
            path: AppRoutes.history,
            name: 'history',
            builder: (context, state) => const HistoryPage(),
          ),
          GoRoute(
            path: AppRoutes.privacyCenter,
            name: 'privacy_center',
            builder: (context, state) => const PrivacyCenterPage(),
          ),
        ],
      ),
    ],
  );
});
