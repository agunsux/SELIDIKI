import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  AppTheme._();

  // ─── Color Palette ─────────────────────────────────────────────
  static const Color backgroundDark = Color(0xFF080C18);
  static const Color surfaceDark = Color(0xFF0F1526);
  static const Color cardDark = Color(0xFF151C32);
  static const Color cardDark2 = Color(0xFF1A2240);

  static const Color primaryBlue = Color(0xFF3B82F6);
  static const Color primaryBlueDark = Color(0xFF2563EB);
  static const Color primaryBlueLight = Color(0xFF60A5FA);
  static const Color primaryGlow = Color(0x263B82F6);

  static const Color accentCyan = Color(0xFF06B6D4);
  static const Color accentPurple = Color(0xFF8B5CF6);

  static const Color safeGreen = Color(0xFF10B981);
  static const Color safeGreenDark = Color(0xFF059669);
  static const Color safeGlow = Color(0x2210B981);

  static const Color warningAmber = Color(0xFFF59E0B);
  static const Color warningAmberDark = Color(0xFFD97706);
  static const Color warningGlow = Color(0x22F59E0B);

  static const Color dangerRed = Color(0xFFEF4444);
  static const Color dangerRedDark = Color(0xFFDC2626);
  static const Color dangerGlow = Color(0x22EF4444);

  static const Color textPrimary = Color(0xFFF1F5F9);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF475569);
  static const Color textDisabled = Color(0xFF334155);

  static const Color divider = Color(0xFF1E293B);
  static const Color border = Color(0xFF1E2D4A);

  // ─── Gradients ─────────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient dangerGradient = LinearGradient(
    colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient safeGradient = LinearGradient(
    colors: [Color(0xFF10B981), Color(0xFF059669)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient warningGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    colors: [Color(0xFF080C18), Color(0xFF0D1628)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // ─── Theme ─────────────────────────────────────────────────────
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: backgroundDark,
      colorScheme: const ColorScheme.dark(
        primary: primaryBlue,
        secondary: accentCyan,
        tertiary: accentPurple,
        surface: surfaceDark,
        error: dangerRed,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: textPrimary,
        onError: Colors.white,
      ),
      textTheme: _buildTextTheme(),
      appBarTheme: const AppBarTheme(
        backgroundColor: backgroundDark,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        foregroundColor: textPrimary,
        iconTheme: IconThemeData(color: textPrimary),
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.3,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: surfaceDark,
        selectedItemColor: primaryBlue,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: cardDark,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryBlue, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: dangerRed),
        ),
        hintStyle: const TextStyle(color: textMuted, fontSize: 14),
        labelStyle: const TextStyle(color: textSecondary, fontSize: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, letterSpacing: 0.2),
        ),
      ),
      cardTheme: CardTheme(
        color: cardDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: border),
        ),
        margin: EdgeInsets.zero,
      ),
      dividerTheme: const DividerThemeData(
        color: divider,
        thickness: 1,
        space: 1,
      ),
      extensions: const [],
    );
  }

  static TextTheme _buildTextTheme() {
    return TextTheme(
      displayLarge: _text(32, FontWeight.w800, textPrimary, -1.0),
      displayMedium: _text(28, FontWeight.w700, textPrimary, -0.8),
      displaySmall: _text(24, FontWeight.w700, textPrimary, -0.5),
      headlineLarge: _text(22, FontWeight.w700, textPrimary, -0.5),
      headlineMedium: _text(20, FontWeight.w600, textPrimary, -0.3),
      headlineSmall: _text(18, FontWeight.w600, textPrimary, -0.3),
      titleLarge: _text(16, FontWeight.w600, textPrimary, -0.2),
      titleMedium: _text(15, FontWeight.w500, textPrimary, -0.1),
      titleSmall: _text(14, FontWeight.w500, textSecondary, 0),
      bodyLarge: _text(16, FontWeight.w400, textPrimary, 0),
      bodyMedium: _text(14, FontWeight.w400, textSecondary, 0),
      bodySmall: _text(12, FontWeight.w400, textSecondary, 0),
      labelLarge: _text(14, FontWeight.w600, textPrimary, 0.3),
      labelMedium: _text(12, FontWeight.w600, textSecondary, 0.3),
      labelSmall: _text(11, FontWeight.w500, textMuted, 0.5),
    );
  }

  static TextStyle _text(double size, FontWeight weight, Color color, double letterSpacing) {
    return TextStyle(
      fontFamily: 'Inter',
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: letterSpacing,
      height: 1.4,
    );
  }
}
