import 'package:flutter/material.dart';
import 'package:selidiki/core/theme/app_theme.dart';

class CheckerResultPage extends StatelessWidget {
  const CheckerResultPage({super.key, this.result});
  final Map<String, dynamic>? result;

  @override
  Widget build(BuildContext context) {
    // Delegates to inline result display in checker pages
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      appBar: AppBar(
        title: const Text('Hasil Pengecekan'),
        backgroundColor: AppTheme.backgroundDark,
      ),
      body: const Center(
        child: Text('Result displayed inline', style: TextStyle(color: AppTheme.textMuted)),
      ),
    );
  }
}
