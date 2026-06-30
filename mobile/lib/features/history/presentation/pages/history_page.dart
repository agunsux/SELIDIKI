import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:selidiki/core/theme/app_theme.dart';

class HistoryPage extends StatefulWidget {
  const HistoryPage({super.key});

  @override
  State<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends State<HistoryPage> {
  String _filter = 'all';

  final List<Map<String, dynamic>> _history = [
    {
      'type': 'message',
      'input': 'Selamat! Anda memenangkan hadiah 50 juta...',
      'risk_score': 92,
      'status': 'DANGEROUS',
      'timestamp': '2 jam lalu',
      'icon': Icons.message_outlined,
    },
    {
      'type': 'phone',
      'input': '+62 812-3456-7890',
      'risk_score': 78,
      'status': 'HIGH',
      'timestamp': '5 jam lalu',
      'icon': Icons.phone_outlined,
    },
    {
      'type': 'url',
      'input': 'https://bri-promo-hadiah.xyz/klaim',
      'risk_score': 96,
      'status': 'DANGEROUS',
      'timestamp': 'Kemarin',
      'icon': Icons.link,
    },
    {
      'type': 'account',
      'input': 'BCA ****7890',
      'risk_score': 15,
      'status': 'SAFE',
      'timestamp': '2 hari lalu',
      'icon': Icons.account_balance_outlined,
    },
    {
      'type': 'message',
      'input': 'Halo kak, ini adalah CS Tokopedia...',
      'risk_score': 67,
      'status': 'WARNING',
      'timestamp': '3 hari lalu',
      'icon': Icons.message_outlined,
    },
    {
      'type': 'phone',
      'input': '+62 21-500-500',
      'risk_score': 5,
      'status': 'SAFE',
      'timestamp': '5 hari lalu',
      'icon': Icons.phone_outlined,
    },
  ];

  List<Map<String, dynamic>> get _filtered {
    if (_filter == 'all') return _history;
    if (_filter == 'dangerous') return _history.where((h) => h['status'] == 'DANGEROUS').toList();
    if (_filter == 'safe') return _history.where((h) => h['status'] == 'SAFE').toList();
    return _history;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      appBar: AppBar(
        title: const Text('Riwayat Scan'),
        backgroundColor: AppTheme.backgroundDark,
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.delete_outline, color: AppTheme.textSecondary),
          ),
        ],
      ),
      body: Column(
        children: [
          _buildFilterBar(),
          Expanded(
            child: _filtered.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    itemCount: _filtered.length,
                    itemBuilder: (context, i) {
                      return _buildHistoryItem(_filtered[i], i).animate().fadeIn(duration: 300.ms, delay: (i * 60).ms);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar() {
    final filters = [
      ('all', 'Semua'),
      ('dangerous', '🔴 Berbahaya'),
      ('safe', '🟢 Aman'),
    ];

    return SizedBox(
      height: 50,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: filters.map((f) {
          final isActive = _filter == f.$1;
          return GestureDetector(
            onTap: () => setState(() => _filter = f.$1),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: isActive ? AppTheme.primaryBlue : AppTheme.cardDark,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: isActive ? AppTheme.primaryBlue : AppTheme.border),
              ),
              child: Text(
                f.$2,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                  color: isActive ? Colors.white : AppTheme.textSecondary,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildHistoryItem(Map<String, dynamic> item, int index) {
    final riskScore = item['risk_score'] as int;
    final status = item['status'] as String;
    final color = _statusColor(status);

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
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(item['icon'] as IconData, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item['input'] as String,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Text(
                  item['timestamp'] as String,
                  style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$riskScore',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  _statusLabel(status),
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.history, size: 48, color: AppTheme.textDisabled),
          const SizedBox(height: 12),
          const Text('Belum ada riwayat', style: TextStyle(fontSize: 16, color: AppTheme.textMuted)),
          const SizedBox(height: 6),
          const Text('Scan pesan atau cek nomor untuk mulai', style: TextStyle(fontSize: 13, color: AppTheme.textDisabled)),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'DANGEROUS':
      case 'HIGH':
        return AppTheme.dangerRed;
      case 'WARNING':
      case 'MEDIUM':
        return AppTheme.warningAmber;
      default:
        return AppTheme.safeGreen;
    }
  }

  String _statusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'DANGEROUS':
        return 'BAHAYA';
      case 'HIGH':
        return 'RISIKO';
      case 'WARNING':
        return 'WASPADA';
      default:
        return 'AMAN';
    }
  }
}
