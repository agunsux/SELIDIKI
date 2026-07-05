import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:selidiki/core/network/api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:selidiki/core/router/app_routes.dart';
import 'package:selidiki/core/theme/app_theme.dart';

class PrivacyCenterPage extends StatefulWidget {
  const PrivacyCenterPage({super.key});

  @override
  State<PrivacyCenterPage> createState() => _PrivacyCenterPageState();
}

class _PrivacyCenterPageState extends State<PrivacyCenterPage> {
  final Map<String, bool> _consents = {
    'scan_history': true,
    'community_reports': true,
    'analytics': false,
    'notifications': true,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      appBar: AppBar(
        title: const Text('Pusat Privasi'),
        backgroundColor: AppTheme.backgroundDark,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildPrivacyHeader(),
            const SizedBox(height: 24),
            _buildDataMinimization(),
            const SizedBox(height: 24),
            _buildConsentManagement(),
            const SizedBox(height: 24),
            _buildDataRights(),
            const SizedBox(height: 24),
            _buildLegalCompliance(),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _buildPrivacyHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0D2040), Color(0xFF0A1628)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.primaryBlue.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.shield_rounded, color: AppTheme.primaryBlue, size: 28),
          ),
          const SizedBox(width: 16),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Privacy First',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                ),
                SizedBox(height: 4),
                Text(
                  'SELIDIKI tidak pernah menjual data kamu. '
                  'Privasi adalah hak kamu, bukan fitur.',
                  style: TextStyle(fontSize: 12.5, color: AppTheme.textSecondary, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms);
  }

  Widget _buildDataMinimization() {
    final items = [
      ('Nomor HP', 'Disimpan dalam format hash SHA-256. Tidak dapat dipulihkan ke angka asli.', Icons.phone_locked_outlined, true),
      ('Nomor Rekening', 'Hash + bank code saja. Tidak ada nama atau data pemilik rekening.', Icons.lock_outlined, true),
      ('Riwayat Scan', 'Disimpan lokal di perangkat kamu. Tidak dikirim ke server tanpa izin.', Icons.history, true),
      ('Lokasi', 'TIDAK dikumpulkan. Sama sekali tidak.', Icons.location_off_outlined, true),
      ('Kontak HP', 'TIDAK diakses. TIDAK diunggah ke server.', Icons.contacts_outlined, true),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Data yang Kami Kumpulkan', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
        const SizedBox(height: 12),
        ...items.asMap().entries.map(
              (e) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.cardDark,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(e.value.$3, color: AppTheme.safeGreen, size: 18),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(e.value.$1, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                          const SizedBox(height: 2),
                          Text(e.value.$2, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.4)),
                        ],
                      ),
                    ),
                    Icon(Icons.check_circle, color: AppTheme.safeGreen, size: 16),
                  ],
                ),
              ).animate().fadeIn(duration: 300.ms, delay: (e.key * 60).ms),
            ),
      ],
    );
  }

  Widget _buildConsentManagement() {
    final consentLabels = {
      'scan_history': ('Simpan Riwayat Scan', 'Riwayat tersimpan lokal untuk referensi kamu'),
      'community_reports': ('Kontribusi ke Database', 'Laporanmu membantu komunitas lain'),
      'analytics': ('Analytics Anonim', 'Membantu kami meningkatkan layanan'),
      'notifications': ('Notifikasi Keamanan', 'Alert scam baru di area kamu'),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Pengaturan Persetujuan', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: AppTheme.cardDark,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            children: _consents.keys.map((key) {
              final label = consentLabels[key]!;
              final isLast = key == _consents.keys.last;
              return Column(
                children: [
                  SwitchListTile(
                    title: Text(label.$1, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                    subtitle: Text(label.$2, style: const TextStyle(fontSize: 11.5, color: AppTheme.textMuted)),
                    value: _consents[key]!,
                    activeColor: AppTheme.primaryBlue,
                    inactiveThumbColor: AppTheme.textDisabled,
                    inactiveTrackColor: AppTheme.cardDark2,
                    onChanged: (v) => setState(() => _consents[key] = v),
                  ),
                  if (!isLast) const Divider(color: AppTheme.border, height: 1, indent: 16, endIndent: 16),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    ).animate().fadeIn(duration: 500.ms, delay: 200.ms);
  }

  Widget _buildDataRights() {
    final rights = [
      ('Lihat Data Saya', 'Ekspor semua data yang kami miliki tentang kamu', Icons.download_outlined, AppTheme.primaryBlue, _exportData),
      ('Hapus Data Saya', 'Hapus permanen semua data dari sistem kami', Icons.delete_forever_outlined, AppTheme.dangerRed, _deleteData),
      ('Lapor Pelanggaran', 'Laporkan dugaan pelanggaran privasi', Icons.report_outlined, AppTheme.warningAmber, _reportViolation),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Hak Kamu (UU PDP)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
        const SizedBox(height: 4),
        const Text('Sesuai Undang-Undang Perlindungan Data Pribadi Indonesia', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
        const SizedBox(height: 12),
        ...rights.map(
          (r) => GestureDetector(
            onTap: r.$5,
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: r.$4.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: r.$4.withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  Icon(r.$3, color: r.$4, size: 22),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(r.$1, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: r.$4)),
                        Text(r.$2, style: const TextStyle(fontSize: 11.5, color: AppTheme.textMuted)),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right, color: r.$4.withOpacity(0.5), size: 18),
                ],
              ),
            ),
          ),
        ),
      ],
    ).animate().fadeIn(duration: 500.ms, delay: 300.ms);
  }

  Widget _buildLegalCompliance() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.gavel_outlined, color: AppTheme.primaryBlue, size: 18),
              SizedBox(width: 8),
              Text('Kepatuhan Regulasi', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
            ],
          ),
          const SizedBox(height: 14),
          ...[
            ('UU PDP Indonesia No. 27/2022', 'Perlindungan Data Pribadi', true),
            ('Google Play Data Safety', 'App store compliance', true),
            ('OJK POJK 11/2022', 'Keamanan siber layanan keuangan', true),
            ('ISO/IEC 27001', 'Manajemen keamanan informasi', false),
          ].map(
            (r) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Icon(
                    r.$3 ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: r.$3 ? AppTheme.safeGreen : AppTheme.textDisabled,
                    size: 16,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(r.$1, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                        Text(r.$2, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                      ],
                    ),
                  ),
                  Text(
                    r.$3 ? 'Aktif' : 'Soon',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: r.$3 ? AppTheme.safeGreen : AppTheme.textDisabled,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms, delay: 400.ms);
  }

  void _exportData() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surfaceDark,
        title: const Text('Export Data', style: TextStyle(color: AppTheme.textPrimary)),
        content: const Text('Data kamu akan dikirim ke email yang terdaftar dalam 24 jam.', style: TextStyle(color: AppTheme.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Konfirmasi', style: TextStyle(color: AppTheme.primaryBlue))),
        ],
      ),
    );
  }

  void _deleteData() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surfaceDark,
        title: const Text('Hapus Data', style: TextStyle(color: AppTheme.dangerRed)),
        content: const Text(
          'Tindakan ini akan menghapus SEMUA data kamu dari sistem kami secara permanen. Tindakan ini tidak bisa dibatalkan.',
          style: TextStyle(color: AppTheme.textSecondary),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
          TextButton(
            onPressed: () async {
              Navigator.pop(context); // close confirm dialog
              
              // Show progress indicator
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (context) => const Center(child: CircularProgressIndicator(color: AppTheme.primaryBlue)),
              );

              try {
                final prefs = await SharedPreferences.getInstance();
                final userHash = prefs.getString('user_hash');
                
                if (userHash != null) {
                  final response = await apiClient.delete('/user/data', data: {'user_hash': userHash});
                  if (response.statusCode != 200) {
                    throw Exception(response.data['error'] ?? 'Gagal menghapus data di server');
                  }
                }
                
                // Clear preferences and log out
                await prefs.remove('auth_token');
                await prefs.remove('user_hash');
                
                if (mounted) {
                  Navigator.pop(context); // close progress dialog
                  context.go(AppRoutes.auth); // navigate to login
                }
              } catch (e) {
                if (mounted) {
                  Navigator.pop(context); // close progress dialog
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Gagal menghapus data: ${e.toString().replaceAll('Exception: ', '')}'),
                      backgroundColor: AppTheme.dangerRed,
                    ),
                  );
                }
              }
            },
            child: const Text('Hapus Permanen', style: TextStyle(color: AppTheme.dangerRed, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  void _reportViolation() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Fitur segera hadir. Email privacy@selidiki.id'), backgroundColor: AppTheme.primaryBlue),
    );
  }
}
