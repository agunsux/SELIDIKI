import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:selidiki/core/network/api_client.dart';
import 'package:selidiki/core/theme/app_theme.dart';

// List of Indonesian banks
const List<Map<String, String>> _banks = [
  {'code': 'BCA', 'name': 'Bank Central Asia (BCA)'},
  {'code': 'BRI', 'name': 'Bank Rakyat Indonesia (BRI)'},
  {'code': 'MANDIRI', 'name': 'Bank Mandiri'},
  {'code': 'BNI', 'name': 'Bank Negara Indonesia (BNI)'},
  {'code': 'CIMB', 'name': 'CIMB Niaga'},
  {'code': 'DANAMON', 'name': 'Bank Danamon'},
  {'code': 'PERMATA', 'name': 'Bank Permata'},
  {'code': 'BTN', 'name': 'Bank Tabungan Negara (BTN)'},
  {'code': 'PANIN', 'name': 'Bank Panin'},
  {'code': 'MAYBANK', 'name': 'Maybank Indonesia'},
  {'code': 'OCBC', 'name': 'OCBC NISP'},
  {'code': 'HSBC', 'name': 'HSBC Indonesia'},
  {'code': 'BSI', 'name': 'Bank Syariah Indonesia (BSI)'},
  {'code': 'JAGO', 'name': 'Bank Jago'},
  {'code': 'NEO', 'name': 'Bank Neo Commerce'},
  {'code': 'SEABANK', 'name': 'SeaBank'},
  {'code': 'JENIUS', 'name': 'BTPN/Jenius'},
  {'code': 'OVO', 'name': 'OVO (Finansial)'},
  {'code': 'GOPAY', 'name': 'GoPay'},
  {'code': 'DANA', 'name': 'DANA'},
  {'code': 'SHOPEEPAY', 'name': 'ShopeePay'},
];

class AccountCheckerPage extends ConsumerStatefulWidget {
  const AccountCheckerPage({super.key});

  @override
  ConsumerState<AccountCheckerPage> createState() => _AccountCheckerPageState();
}

class _AccountCheckerPageState extends ConsumerState<AccountCheckerPage> {
  final _accountController = TextEditingController();
  Map<String, String>? _selectedBank;
  bool _isLoading = false;
  Map<String, dynamic>? _result;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      appBar: AppBar(
        title: const Text('Cek Rekening'),
        backgroundColor: AppTheme.backgroundDark,
        actions: [
          TextButton(
            onPressed: () => context.go('/check/phone'),
            child: const Text('Cek Nomor HP', style: TextStyle(color: AppTheme.primaryBlue, fontSize: 13)),
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
            if (_result != null) _buildResultCard(_result!),
            if (_result == null) _buildSafetyNote(),
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
            'Verifikasi Rekening Bank',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 4),
          const Text(
            'Cek sebelum transfer untuk keamanan transaksi kamu.',
            style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 20),

          // Bank Selector
          const Text('Pilih Bank', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: _showBankSelector,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: AppTheme.cardDark2,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
              ),
              child: Row(
                children: [
                  const Icon(Icons.account_balance_outlined, color: AppTheme.textMuted, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _selectedBank?['name'] ?? 'Pilih bank...',
                      style: TextStyle(
                        fontSize: 14,
                        color: _selectedBank != null ? AppTheme.textPrimary : AppTheme.textMuted,
                      ),
                    ),
                  ),
                  const Icon(Icons.keyboard_arrow_down, color: AppTheme.textMuted, size: 20),
                ],
              ),
            ),
          ),

          const SizedBox(height: 14),

          // Account Number
          const Text('Nomor Rekening', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
          const SizedBox(height: 8),
          TextField(
            controller: _accountController,
            keyboardType: TextInputType.number,
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, letterSpacing: 1),
            decoration: InputDecoration(
              hintText: '1234567890',
              prefixIcon: const Icon(Icons.credit_card, color: AppTheme.textMuted, size: 20),
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

          const SizedBox(height: 16),

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
                onPressed: _isLoading ? null : _checkAccount,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Verifikasi Rekening', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms);
  }

  Widget _buildResultCard(Map<String, dynamic> result) {
    final status = result['status'] as String;
    final reports = result['reports'] as int;
    final accountNum = result['account'] as String;
    final bankName = result['bank'] as String;

    final color = _riskColor(status);

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [color.withOpacity(0.08), color.withOpacity(0.02)],
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withOpacity(0.3)),
          ),
          child: Column(
            children: [
              // Bank info
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(_riskIcon(status), color: color, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          bankName,
                          style: const TextStyle(fontSize: 13, color: AppTheme.textMuted, fontWeight: FontWeight.w500),
                        ),
                        Text(
                          _maskAccount(accountNum),
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary, letterSpacing: 1),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  children: [
                    Text(
                      _statusLabel(status),
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color, letterSpacing: 0.5),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$reports laporan fraud dari komunitas',
                      style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              if (status == 'HIGH_RISK') ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.dangerRed.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.dangerRed.withOpacity(0.2)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.block, color: AppTheme.dangerRed, size: 18),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'JANGAN transfer ke rekening ini. Rekening ini telah dilaporkan terkait penipuan.',
                          style: TextStyle(fontSize: 12, color: AppTheme.dangerRed, height: 1.4),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ).animate().fadeIn(duration: 500.ms).scale(begin: const Offset(0.95, 0.95)),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () => context.go('/report'),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppTheme.dangerRed),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(vertical: 12),
            minimumSize: const Size(double.infinity, 0),
          ),
          icon: const Icon(Icons.flag_rounded, color: AppTheme.dangerRed, size: 18),
          label: const Text('Laporkan Rekening Ini', style: TextStyle(color: AppTheme.dangerRed, fontSize: 14, fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }

  Widget _buildSafetyNote() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryBlue.withOpacity(0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.15)),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.info_outline, color: AppTheme.primaryBlue, size: 16),
              SizedBox(width: 8),
              Text('Tentang Fitur Ini', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.primaryBlue)),
            ],
          ),
          SizedBox(height: 10),
          Text(
            'SELIDIKI menggunakan database laporan komunitas untuk menilai risiko rekening. '
            'Kami tidak memiliki akses ke data transaksi bank.\n\n'
            'Nomor rekening disimpan dalam bentuk terenkripsi (hash) untuk menjaga privasi semua pihak.',
            style: TextStyle(fontSize: 12.5, color: AppTheme.textSecondary, height: 1.6),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms, delay: 200.ms);
  }

  void _showBankSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surfaceDark,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      isScrollControlled: true,
      builder: (context) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          builder: (context, scroll) => Column(
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12, bottom: 16),
                decoration: BoxDecoration(color: AppTheme.textDisabled, borderRadius: BorderRadius.circular(2)),
              ),
              const Text('Pilih Bank', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
              const SizedBox(height: 8),
              Expanded(
                child: ListView.builder(
                  controller: scroll,
                  itemCount: _banks.length,
                  itemBuilder: (context, i) {
                    final bank = _banks[i];
                    return ListTile(
                      title: Text(bank['name']!, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14)),
                      leading: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppTheme.cardDark2,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Center(
                          child: Text(
                            bank['code']!.substring(0, 2),
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.primaryBlue),
                          ),
                        ),
                      ),
                      onTap: () {
                        setState(() => _selectedBank = bank);
                        Navigator.pop(context);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _checkAccount() async {
    if (_selectedBank == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih bank terlebih dahulu'), backgroundColor: AppTheme.warningAmber),
      );
      return;
    }

    final account = _accountController.text.trim().replaceAll(RegExp(r'[^0-9]'), '');
    if (account.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Masukkan nomor rekening yang valid'), backgroundColor: AppTheme.warningAmber),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final bankCode = _selectedBank!['code']!;
      final response = await apiClient.get('/check/account', queryParameters: {
        'bank': bankCode,
        'account': account,
      });

      if (response.statusCode == 200) {
        final resData = response.data['data'] as Map<String, dynamic>;
        setState(() {
          _isLoading = false;
          _result = {
            'bank': _selectedBank!['name']!,
            'account': account,
            'status': resData['status'] ?? 'SAFE',
            'reports': resData['reports_count'] ?? 0,
            'risk_score': resData['risk_score'] ?? 0,
          };
        });
      } else {
        throw Exception(response.data['error'] ?? 'Gagal memeriksa rekening');
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

  String _maskAccount(String account) {
    if (account.length <= 4) return account;
    return '${'*' * (account.length - 4)}${account.substring(account.length - 4)}';
  }

  Color _riskColor(String status) {
    final s = status.toUpperCase();
    if (s.contains('HIGH') || s.contains('DANGER')) {
      return AppTheme.dangerRed;
    }
    if (s.contains('WARNING') || s.contains('WARN') || s.contains('MEDIUM')) {
      return AppTheme.warningAmber;
    }
    return AppTheme.safeGreen;
  }

  IconData _riskIcon(String status) {
    final s = status.toUpperCase();
    if (s.contains('HIGH') || s.contains('DANGER')) {
      return Icons.dangerous_rounded;
    }
    if (s.contains('WARNING') || s.contains('WARN') || s.contains('MEDIUM')) {
      return Icons.warning_rounded;
    }
    return Icons.verified_rounded;
  }

  String _statusLabel(String status) {
    final s = status.toUpperCase();
    if (s.contains('HIGH') || s.contains('DANGER')) {
      return '🔴 RISIKO TINGGI';
    }
    if (s.contains('WARNING') || s.contains('WARN') || s.contains('MEDIUM')) {
      return '🟡 PERLU WASPADA';
    }
    return '🟢 AMAN';
  }

  @override
  void dispose() {
    _accountController.dispose();
    super.dispose();
  }
}
