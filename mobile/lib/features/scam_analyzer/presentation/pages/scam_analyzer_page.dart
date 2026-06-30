import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:selidiki/core/theme/app_theme.dart';
import 'package:selidiki/features/scam_analyzer/presentation/providers/scan_provider.dart';

class ScamAnalyzerPage extends ConsumerStatefulWidget {
  const ScamAnalyzerPage({super.key});

  @override
  ConsumerState<ScamAnalyzerPage> createState() => _ScamAnalyzerPageState();
}

class _ScamAnalyzerPageState extends ConsumerState<ScamAnalyzerPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _textController = TextEditingController();
  final TextEditingController _urlController = TextEditingController();
  bool _isAnalyzing = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

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
                _buildHeaderCard(),
                const SizedBox(height: 20),
                _buildTabBar(),
                const SizedBox(height: 16),
                _buildTabContent(),
                const SizedBox(height: 20),
                _buildAnalyzeButton(),
                const SizedBox(height: 24),
                _buildHowItWorks(),
                const SizedBox(height: 100),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  SliverAppBar _buildAppBar() {
    return const SliverAppBar(
      backgroundColor: AppTheme.backgroundDark,
      floating: true,
      snap: true,
      title: Text('AI Scam Analyzer'),
      centerTitle: true,
    );
  }

  Widget _buildHeaderCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1A1040), Color(0xFF0D1526)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.accentPurple.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)],
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.psychology_rounded, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 16),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Powered by AI',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.accentPurple,
                    letterSpacing: 1.2,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Deteksi scam, phishing,\ndan manipulasi dalam detik',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.1);
  }

  Widget _buildTabBar() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppTheme.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          gradient: AppTheme.primaryGradient,
          borderRadius: BorderRadius.circular(9),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelColor: Colors.white,
        unselectedLabelColor: AppTheme.textMuted,
        labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        unselectedLabelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
        tabs: const [
          Tab(text: 'Pesan'),
          Tab(text: 'Link/URL'),
          Tab(text: 'Foto'),
        ],
      ),
    );
  }

  Widget _buildTabContent() {
    return AnimatedBuilder(
      animation: _tabController,
      builder: (context, _) {
        switch (_tabController.index) {
          case 0:
            return _buildMessageInput();
          case 1:
            return _buildUrlInput();
          case 2:
            return _buildScreenshotInput();
          default:
            return _buildMessageInput();
        }
      },
    );
  }

  Widget _buildMessageInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Paste SMS atau pesan WhatsApp',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _textController,
          maxLines: 6,
          style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, height: 1.5),
          decoration: InputDecoration(
            hintText: 'Contoh: "Selamat! Anda memenangkan hadiah 50 juta dari BRI. Klik link berikut untuk klaim..."',
            hintStyle: const TextStyle(color: AppTheme.textDisabled, fontSize: 13),
            alignLabelWithHint: true,
            filled: true,
            fillColor: AppTheme.cardDark,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppTheme.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppTheme.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppTheme.primaryBlue, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            onPressed: () => _textController.clear(),
            icon: const Icon(Icons.clear, size: 14, color: AppTheme.textMuted),
            label: const Text('Hapus', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
          ),
        ),
      ],
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildUrlInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Masukkan URL atau link mencurigakan',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _urlController,
          keyboardType: TextInputType.url,
          style: const TextStyle(color: AppTheme.primaryBlue, fontSize: 14),
          decoration: InputDecoration(
            hintText: 'https://contoh-link-mencurigakan.xyz',
            hintStyle: const TextStyle(color: AppTheme.textDisabled, fontSize: 13),
            prefixIcon: const Icon(Icons.link, color: AppTheme.textMuted, size: 20),
            filled: true,
            fillColor: AppTheme.cardDark,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppTheme.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppTheme.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppTheme.primaryBlue, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.warningAmber.withOpacity(0.06),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppTheme.warningAmber.withOpacity(0.2)),
          ),
          child: const Row(
            children: [
              Icon(Icons.info_outline, color: AppTheme.warningAmber, size: 15),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Jangan klik link sebelum dianalisis. AI kami menganalisis link tanpa membukanya.',
                  style: TextStyle(fontSize: 11.5, color: AppTheme.warningAmber, height: 1.4),
                ),
              ),
            ],
          ),
        ),
      ],
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildScreenshotInput() {
    return Column(
      children: [
        GestureDetector(
          onTap: _pickImage,
          child: Container(
            width: double.infinity,
            height: 160,
            decoration: BoxDecoration(
              color: AppTheme.cardDark,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: AppTheme.primaryBlue.withOpacity(0.4),
                style: BorderStyle.solid,
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryBlue.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.add_photo_alternate_outlined, color: AppTheme.primaryBlue, size: 32),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Upload Screenshot',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Screenshot SMS, WA, atau website mencurigakan',
                  style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildImageOption(Icons.photo_library_outlined, 'Galeri', () => _pickImage(fromCamera: false)),
            const SizedBox(width: 16),
            _buildImageOption(Icons.camera_alt_outlined, 'Kamera', () => _pickImage(fromCamera: true)),
          ],
        ),
      ],
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildImageOption(IconData icon, String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.cardDark,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: AppTheme.textSecondary),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
          ],
        ),
      ),
    );
  }

  Widget _buildAnalyzeButton() {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: AppTheme.primaryGradient,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primaryBlue.withOpacity(0.35),
              blurRadius: 24,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: _isAnalyzing ? null : _analyze,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: _isAnalyzing
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'AI sedang menganalisis...',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
                    ),
                  ],
                )
              : const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.psychology_rounded, color: Colors.white, size: 22),
                    SizedBox(width: 10),
                    Text(
                      'Analisis Sekarang',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                  ],
                ),
        ),
      ),
    ).animate().fadeIn(duration: 500.ms, delay: 200.ms);
  }

  Widget _buildHowItWorks() {
    final steps = [
      ('AI Pattern Recognition', 'Mendeteksi pola scam dari jutaan laporan', Icons.auto_awesome),
      ('NLP Analysis', 'Menganalisis bahasa manipulasi dan urgensi palsu', Icons.language),
      ('URL Intelligence', 'Memeriksa domain, SSL, dan reputasi link', Icons.link),
      ('Community Signal', 'Mencocokkan dengan database laporan komunitas', Icons.people),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Cara Kerja AI Kami',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 12),
        ...steps.asMap().entries.map(
              (e) => Container(
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
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryBlue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(e.value.$3, color: AppTheme.primaryBlue, size: 16),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            e.value.$1,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                          ),
                          Text(
                            e.value.$2,
                            style: const TextStyle(fontSize: 11.5, color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(duration: 400.ms, delay: (e.key * 80).ms),
            ),
      ],
    );
  }

  Future<void> _pickImage({bool fromCamera = false}) async {
    final picker = ImagePicker();
    await picker.pickImage(
      source: fromCamera ? ImageSource.camera : ImageSource.gallery,
    );
    // TODO: Process image with OCR + AI
  }

  Future<void> _analyze() async {
    final tab = _tabController.index;
    String input = '';

    switch (tab) {
      case 0:
        input = _textController.text.trim();
        break;
      case 1:
        input = _urlController.text.trim();
        break;
      case 2:
        input = 'screenshot';
        break;
    }

    if (input.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Masukkan pesan, link, atau foto terlebih dahulu'),
          backgroundColor: AppTheme.warningAmber,
        ),
      );
      return;
    }

    setState(() => _isAnalyzing = true);

    try {
      // Call AI scam analyzer service
      final result = await ref.read(scanProvider.notifier).analyzeScan(
            input: input,
            type: ['message', 'url', 'screenshot'][tab],
          );

      if (mounted) {
        context.go('/scan/result', extra: result);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.dangerRed),
        );
      }
    } finally {
      if (mounted) setState(() => _isAnalyzing = false);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _textController.dispose();
    _urlController.dispose();
    super.dispose();
  }
}
