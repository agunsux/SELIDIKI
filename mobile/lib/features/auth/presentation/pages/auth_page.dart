import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:selidiki/core/network/api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:selidiki/core/router/app_routes.dart';
import 'package:selidiki/core/theme/app_theme.dart';
import 'package:selidiki/features/auth/presentation/providers/auth_provider.dart';

class AuthPage extends ConsumerStatefulWidget {
  const AuthPage({super.key});

  @override
  ConsumerState<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends ConsumerState<AuthPage> {
  bool _isLogin = true;
  bool _obscurePassword = true;
  bool _isLoading = false;

  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _otpSent = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      body: Stack(
        children: [
          _buildBackground(),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 48),
                  _buildHeader(),
                  const SizedBox(height: 40),
                  _buildForm(),
                  const SizedBox(height: 24),
                  _buildCTA(),
                  const SizedBox(height: 40),
                  _buildPrivacyNote(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBackground() {
    return Positioned(
      top: -150,
      left: -100,
      child: Container(
        width: 400,
        height: 400,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              AppTheme.primaryBlue.withOpacity(0.08),
              Colors.transparent,
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Logo
        Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.shield_moon_rounded, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 10),
            const Text(
              'SELIDIKI',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary,
                letterSpacing: 1.5,
              ),
            ),
          ],
        ).animate().fadeIn(duration: 500.ms),

        const SizedBox(height: 32),

        Text(
          _otpSent ? 'Masukkan Kode OTP' : 'Masuk atau Daftar',
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            color: AppTheme.textPrimary,
            letterSpacing: -0.5,
          ),
        ).animate().fadeIn(duration: 500.ms, delay: 100.ms),

        const SizedBox(height: 8),

        Text(
          _otpSent
              ? 'Kode OTP telah dikirim ke +62 ${_phoneController.text}'
              : 'Masukkan nomor HP Indonesia kamu untuk melanjutkan.',
          style: const TextStyle(
            fontSize: 14,
            color: AppTheme.textSecondary,
            height: 1.5,
          ),
        ).animate().fadeIn(duration: 500.ms, delay: 200.ms),
      ],
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        child: _otpSent ? _buildOtpInput() : _buildPhoneInput(),
      ),
    ).animate().slideY(begin: 0.2, duration: 500.ms, delay: 200.ms, curve: Curves.easeOut).fadeIn();
  }

  Widget _buildPhoneInput() {
    return Column(
      key: const ValueKey('phone'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Nomor HP',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w500),
          decoration: InputDecoration(
            hintText: '812 3456 7890',
            prefixIcon: Container(
              width: 56,
              margin: const EdgeInsets.all(8),
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                color: AppTheme.cardDark2,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('🇮🇩', style: TextStyle(fontSize: 16)),
                  SizedBox(width: 2),
                  Text('+62', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
            prefixIconConstraints: const BoxConstraints(minWidth: 72, maxWidth: 80),
          ),
          validator: (v) {
            if (v == null || v.isEmpty) return 'Nomor HP wajib diisi';
            if (v.length < 9) return 'Nomor HP tidak valid';
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildOtpInput() {
    return Column(
      key: const ValueKey('otp'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Kode OTP (6 digit)',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _otpController,
          keyboardType: TextInputType.number,
          maxLength: 6,
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 24,
            fontWeight: FontWeight.w700,
            letterSpacing: 8,
          ),
          textAlign: TextAlign.center,
          decoration: const InputDecoration(
            hintText: '• • • • • •',
            counterText: '',
            hintStyle: TextStyle(fontSize: 24, letterSpacing: 8, color: AppTheme.textDisabled),
          ),
          validator: (v) {
            if (v == null || v.length < 6) return 'Masukkan kode 6 digit';
            return null;
          },
        ),
        const SizedBox(height: 16),
        Center(
          child: TextButton.icon(
            onPressed: () => setState(() => _otpSent = false),
            icon: const Icon(Icons.arrow_back, size: 16, color: AppTheme.textSecondary),
            label: const Text(
              'Ganti nomor HP',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCTA() {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 52,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primaryBlue.withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleAuth,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : Text(
                      _otpSent ? 'Verifikasi OTP' : 'Kirim Kode OTP',
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

        const SizedBox(height: 16),

        // Guest mode
        TextButton(
          onPressed: () => context.go(AppRoutes.home),
          child: const Text(
            'Lanjut tanpa akun (mode terbatas)',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
          ),
        ),
      ],
    ).animate().fadeIn(duration: 500.ms, delay: 300.ms);
  }

  Widget _buildPrivacyNote() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryBlue.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.15)),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.verified_user_outlined, size: 16, color: AppTheme.primaryBlue),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Kami tidak menyimpan nomor HP kamu dalam bentuk asli. Data di-hash untuk menjaga privasi kamu sesuai UU PDP Indonesia.',
              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.5),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms, delay: 400.ms);
  }

  Future<void> _handleAuth() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final phone = _phoneController.text.trim().replaceAll(RegExp(r'[^0-9]'), '');
      if (!_otpSent) {
        // Send OTP
        final response = await apiClient.post('/user/auth/send-otp', data: {'phone': phone});
        if (response.statusCode == 200) {
          final resData = response.data as Map<String, dynamic>;
          setState(() {
            _otpSent = true;
            _isLoading = false;
          });
          if (resData['otp'] != null && mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Dev Mode OTP: ${resData['otp']} (Salin kode ini)'),
                backgroundColor: AppTheme.primaryBlue,
                duration: const Duration(seconds: 8),
              ),
            );
          }
        } else {
          throw Exception(response.data['error'] ?? 'Gagal mengirim OTP');
        }
      } else {
        // Verify OTP
        final otp = _otpController.text.trim();
        final response = await apiClient.post('/user/auth/verify-otp', data: {'phone': phone, 'otp': otp});
        if (response.statusCode == 200) {
          final resData = response.data as Map<String, dynamic>;
          final token = resData['token'] as String;
          final userHash = resData['user_hash'] as String;
          final userId = resData['user']?['id'] as String? ?? '';

          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('auth_token', token);
          await prefs.setString('user_hash', userHash);

          ref.read(authStateProvider.notifier).state = AuthState(
            userId: userId,
            phoneHash: userHash,
            isPremium: false,
          );

          if (mounted) {
            context.go(AppRoutes.home);
          }
        } else {
          throw Exception(response.data['error'] ?? 'Kode OTP salah');
        }
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: AppTheme.dangerRed,
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }
}
