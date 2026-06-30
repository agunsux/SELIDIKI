import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:selidiki/core/theme/app_theme.dart';

const List<Map<String, dynamic>> _fraudCategories = [
  {'id': 'marketplace_scam', 'label': 'Scam Marketplace', 'icon': Icons.shopping_bag_outlined, 'color': Color(0xFF3B82F6)},
  {'id': 'fake_investment', 'label': 'Investasi Palsu', 'icon': Icons.trending_up, 'color': Color(0xFF8B5CF6)},
  {'id': 'illegal_loan', 'label': 'Pinjol Ilegal', 'icon': Icons.money_off, 'color': Color(0xFFEF4444)},
  {'id': 'phishing', 'label': 'Phishing', 'icon': Icons.phishing, 'color': Color(0xFFF59E0B)},
  {'id': 'fake_cs', 'label': 'CS Palsu Bank/E-wallet', 'icon': Icons.support_agent, 'color': Color(0xFF06B6D4)},
  {'id': 'apk_malware', 'label': 'APK Malware', 'icon': Icons.android, 'color': Color(0xFF10B981)},
  {'id': 'romance_scam', 'label': 'Romance Scam', 'icon': Icons.favorite_border, 'color': Color(0xFFEC4899)},
  {'id': 'other', 'label': 'Lainnya', 'icon': Icons.more_horiz, 'color': Color(0xFF94A3B8)},
];

const List<Map<String, dynamic>> _targetTypes = [
  {'id': 'phone', 'label': 'Nomor HP', 'icon': Icons.phone},
  {'id': 'account', 'label': 'No. Rekening', 'icon': Icons.account_balance},
  {'id': 'link', 'label': 'Link/URL', 'icon': Icons.link},
  {'id': 'whatsapp', 'label': 'WhatsApp', 'icon': Icons.chat},
];

class ReportFraudPage extends ConsumerStatefulWidget {
  const ReportFraudPage({super.key});

  @override
  ConsumerState<ReportFraudPage> createState() => _ReportFraudPageState();
}

class _ReportFraudPageState extends ConsumerState<ReportFraudPage> {
  int _currentStep = 0;
  String? _selectedTargetType;
  String? _selectedCategory;
  final _targetController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _evidencePath;
  bool _isSubmitting = false;
  bool _consentGiven = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      appBar: AppBar(
        title: const Text('Lapor Fraud'),
        backgroundColor: AppTheme.backgroundDark,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: (_currentStep + 1) / 3,
            backgroundColor: AppTheme.cardDark,
            valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryBlue),
          ),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          child: [
            _buildStep1(),
            _buildStep2(),
            _buildStep3(),
          ][_currentStep],
        ),
      ),
      bottomNavigationBar: _buildNavButtons(),
    );
  }

  Widget _buildStep1() {
    return Column(
      key: const ValueKey(1),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildStepHeader('Langkah 1 dari 3', 'Apa yang ingin kamu laporkan?', Icons.flag_rounded),
        const SizedBox(height: 20),

        // Target type selection
        const Text('Jenis Target', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
        const SizedBox(height: 10),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 2.8,
          children: _targetTypes.map((type) {
            final isSelected = _selectedTargetType == type['id'];
            return GestureDetector(
              onTap: () => setState(() => _selectedTargetType = type['id']),
              child: Container(
                decoration: BoxDecoration(
                  color: isSelected ? AppTheme.primaryBlue.withOpacity(0.12) : AppTheme.cardDark,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isSelected ? AppTheme.primaryBlue : AppTheme.border,
                    width: isSelected ? 1.5 : 1,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(type['icon'] as IconData, size: 16, color: isSelected ? AppTheme.primaryBlue : AppTheme.textSecondary),
                    const SizedBox(width: 6),
                    Text(
                      type['label'] as String,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? AppTheme.primaryBlue : AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),

        const SizedBox(height: 20),

        // Target value
        if (_selectedTargetType != null) ...[
          Text(
            _targetLabel(_selectedTargetType!),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _targetController,
            keyboardType: _selectedTargetType == 'phone' || _selectedTargetType == 'account'
                ? TextInputType.phone
                : TextInputType.url,
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: _targetHint(_selectedTargetType!),
              filled: true,
              fillColor: AppTheme.cardDark,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primaryBlue, width: 1.5)),
            ),
          ),
        ],
      ],
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildStep2() {
    return Column(
      key: const ValueKey(2),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildStepHeader('Langkah 2 dari 3', 'Kategori dan Detail Laporan', Icons.category_outlined),
        const SizedBox(height: 20),

        const Text('Kategori Penipuan', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
        const SizedBox(height: 10),

        ...List.generate(_fraudCategories.length, (i) {
          final cat = _fraudCategories[i];
          final isSelected = _selectedCategory == cat['id'];
          return GestureDetector(
            onTap: () => setState(() => _selectedCategory = cat['id']),
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isSelected ? (cat['color'] as Color).withOpacity(0.1) : AppTheme.cardDark,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? cat['color'] as Color : AppTheme.border,
                  width: isSelected ? 1.5 : 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(cat['icon'] as IconData, size: 18, color: isSelected ? cat['color'] as Color : AppTheme.textMuted),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      cat['label'] as String,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? cat['color'] as Color : AppTheme.textSecondary,
                      ),
                    ),
                  ),
                  if (isSelected) Icon(Icons.check_circle, color: cat['color'] as Color, size: 18),
                ],
              ),
            ).animate().fadeIn(duration: 200.ms, delay: (i * 30).ms),
          );
        }),

        const SizedBox(height: 20),

        const Text('Deskripsi (Opsional)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
        const SizedBox(height: 8),
        TextField(
          controller: _descriptionController,
          maxLines: 3,
          style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, height: 1.5),
          decoration: InputDecoration(
            hintText: 'Ceritakan kronologi penipuan...',
            hintStyle: const TextStyle(color: AppTheme.textDisabled, fontSize: 13),
            filled: true,
            fillColor: AppTheme.cardDark,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primaryBlue, width: 1.5)),
          ),
        ),
      ],
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildStep3() {
    return Column(
      key: const ValueKey(3),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildStepHeader('Langkah 3 dari 3', 'Bukti dan Konfirmasi', Icons.verified_outlined),
        const SizedBox(height: 20),

        // Evidence upload
        const Text('Upload Bukti (Opsional)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: _pickEvidence,
          child: Container(
            width: double.infinity,
            height: 100,
            decoration: BoxDecoration(
              color: AppTheme.cardDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            child: _evidencePath != null
                ? Center(child: Text('✅ Bukti ditambahkan', style: TextStyle(color: AppTheme.safeGreen, fontWeight: FontWeight.w600)))
                : const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add_photo_alternate_outlined, color: AppTheme.textMuted, size: 28),
                      SizedBox(height: 6),
                      Text('Upload screenshot atau foto bukti', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                    ],
                  ),
          ),
        ),

        const SizedBox(height: 20),

        // Summary
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.cardDark,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Ringkasan Laporan', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
              const SizedBox(height: 12),
              _summaryRow('Target', _targetController.text.isEmpty ? '-' : _targetController.text),
              _summaryRow('Tipe', _selectedTargetType ?? '-'),
              _summaryRow('Kategori', _selectedCategory ?? '-'),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Consent
        GestureDetector(
          onTap: () => setState(() => _consentGiven = !_consentGiven),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Checkbox(
                value: _consentGiven,
                onChanged: (v) => setState(() => _consentGiven = v ?? false),
                activeColor: AppTheme.primaryBlue,
                side: const BorderSide(color: AppTheme.border),
              ),
              const Expanded(
                child: Padding(
                  padding: EdgeInsets.only(top: 10),
                  child: Text(
                    'Saya menyatakan bahwa laporan ini benar dan bukan laporan palsu. Data yang dilaporkan akan diproses sesuai Kebijakan Privasi SELIDIKI.',
                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.5),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildStepHeader(String step, String title, IconData icon) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            gradient: AppTheme.primaryGradient,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: Colors.white, size: 22),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(step, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w500)),
              Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _summaryRow(String key, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          SizedBox(
            width: 70,
            child: Text(key, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
          ),
          const Text(':', style: TextStyle(color: AppTheme.textMuted)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _buildNavButtons() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Row(
          children: [
            if (_currentStep > 0)
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _currentStep--),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppTheme.border),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('Kembali', style: TextStyle(color: AppTheme.textSecondary)),
                ),
              ),
            if (_currentStep > 0) const SizedBox(width: 12),
            Expanded(
              flex: 2,
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
                  onPressed: _isSubmitting ? null : _handleNext,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(
                          _currentStep == 2 ? 'Kirim Laporan' : 'Lanjut',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickEvidence() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    if (image != null) setState(() => _evidencePath = image.path);
  }

  void _handleNext() {
    if (_currentStep == 0) {
      if (_selectedTargetType == null || _targetController.text.isEmpty) {
        _showError('Pilih jenis target dan isi data target');
        return;
      }
      setState(() => _currentStep++);
    } else if (_currentStep == 1) {
      if (_selectedCategory == null) {
        _showError('Pilih kategori penipuan');
        return;
      }
      setState(() => _currentStep++);
    } else {
      if (!_consentGiven) {
        _showError('Centang persetujuan terlebih dahulu');
        return;
      }
      _submit();
    }
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      setState(() => _isSubmitting = false);
      context.go('/report/success', extra: {'tracking_id': 'SLD-${DateTime.now().millisecondsSinceEpoch}'});
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppTheme.warningAmber),
    );
  }

  String _targetLabel(String type) {
    switch (type) {
      case 'phone':
        return 'Nomor HP Penipu';
      case 'account':
        return 'Nomor Rekening Penipu';
      case 'link':
        return 'Link/URL Mencurigakan';
      case 'whatsapp':
        return 'Nomor WhatsApp Penipu';
      default:
        return 'Target';
    }
  }

  String _targetHint(String type) {
    switch (type) {
      case 'phone':
        return '0812 3456 7890';
      case 'account':
        return '1234567890';
      case 'link':
        return 'https://link-mencurigakan.xyz';
      case 'whatsapp':
        return '0812 3456 7890';
      default:
        return '';
    }
  }

  @override
  void dispose() {
    _targetController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }
}
