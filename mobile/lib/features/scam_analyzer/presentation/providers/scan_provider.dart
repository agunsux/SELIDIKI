import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

// Scan state
class ScanState {
  final bool isLoading;
  final Map<String, dynamic>? result;
  final String? error;

  const ScanState({this.isLoading = false, this.result, this.error});

  ScanState copyWith({bool? isLoading, Map<String, dynamic>? result, String? error}) {
    return ScanState(
      isLoading: isLoading ?? this.isLoading,
      result: result ?? this.result,
      error: error ?? this.error,
    );
  }
}

class ScanNotifier extends StateNotifier<ScanState> {
  ScanNotifier() : super(const ScanState());

  Future<Map<String, dynamic>> analyzeScan({
    required String input,
    required String type,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final apiKey = dotenv.env['GEMINI_API_KEY'] ?? '';

      if (apiKey.isEmpty || apiKey == 'your_gemini_api_key_here') {
        // Return mock result for development
        await Future.delayed(const Duration(seconds: 2));
        final mock = _generateMockResult(input, type);
        state = state.copyWith(isLoading: false, result: mock);
        return mock;
      }

      // Real Gemini API call
      final prompt = _buildPrompt(input, type);
      final response = await http.post(
        Uri.parse(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'contents': [
            {
              'parts': [
                {'text': prompt}
              ]
            }
          ],
          'generationConfig': {
            'responseMimeType': 'application/json',
            'temperature': 0.1,
          },
        }),
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        final text = body['candidates'][0]['content']['parts'][0]['text'] as String;
        final result = jsonDecode(text) as Map<String, dynamic>;
        state = state.copyWith(isLoading: false, result: result);
        return result;
      } else {
        throw Exception('API Error: ${response.statusCode}');
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      // Fallback to mock
      final mock = _generateMockResult(input, type);
      return mock;
    }
  }

  String _buildPrompt(String input, String type) {
    return '''
Kamu adalah AI fraud detection expert untuk platform SELIDIKI Indonesia.
Analisis input berikut dan deteksi apakah ini scam/phishing/penipuan.

INPUT TYPE: $type
INPUT: "$input"

Analisis berdasarkan:
1. Pola scam yang umum di Indonesia (BRI/BCA phishing, investasi bodong, pinjol ilegal)
2. Bahasa manipulatif: urgency, fear, greed
3. Request data sensitif atau transfer uang
4. Link/domain mencurigakan
5. Impersonasi institusi resmi (bank, OJK, pemerintah)

Kembalikan JSON dengan format PERSIS ini:
{
  "risk_score": <0-100>,
  "status": <"SAFE"|"WARNING"|"DANGEROUS">,
  "category": "<kategori dalam Bahasa Indonesia>",
  "reasons": ["<alasan 1>", "<alasan 2>", ...],
  "recommendation": "<rekomendasi tindakan dalam Bahasa Indonesia>"
}

risk_score: 0=aman, 100=sangat berbahaya
Kembalikan HANYA JSON, tidak ada teks lain.
''';
  }

  Map<String, dynamic> _generateMockResult(String input, String type) {
    final lowerInput = input.toLowerCase();

    // Simple heuristic mock
    int riskScore = 20;
    String status = 'SAFE';
    String category = 'Tidak Terdeteksi';
    List<String> reasons = ['Tidak ada pola scam yang terdeteksi'];

    // Check for scam keywords
    final scamKeywords = ['klik link', 'transfer', 'menang', 'hadiah', 'otp', 'password', 'rekening', 'darurat', 'segera'];
    final phishingKeywords = ['bri', 'bca', 'mandiri', 'ojk', 'pemerintah', 'bank indonesia'];
    final urgencyKeywords = ['segera', 'darurat', 'batas waktu', 'jam lagi', 'menit lagi'];

    int hits = 0;
    for (final kw in scamKeywords) {
      if (lowerInput.contains(kw)) hits++;
    }
    bool hasPhishing = phishingKeywords.any((kw) => lowerInput.contains(kw));
    bool hasUrgency = urgencyKeywords.any((kw) => lowerInput.contains(kw));

    if (hits >= 3 || (hits >= 2 && hasPhishing)) {
      riskScore = 85 + (hits * 2).clamp(0, 15);
      status = 'DANGEROUS';
      category = hasPhishing ? 'Phishing Bank' : 'Scam Umum';
      reasons = [
        if (hasPhishing) 'Mengklaim sebagai institusi keuangan resmi',
        if (hasUrgency) 'Menggunakan bahasa mendesak untuk memaksa tindakan cepat',
        if (lowerInput.contains('klik link')) 'Meminta korban mengklik link tidak terverifikasi',
        if (lowerInput.contains('transfer')) 'Meminta transfer uang ke rekening tidak dikenal',
        if (lowerInput.contains('otp') || lowerInput.contains('password')) 'Meminta kode OTP atau password (bank tidak pernah meminta ini)',
      ];
    } else if (hits >= 1 || hasUrgency) {
      riskScore = 45 + (hits * 10);
      status = 'WARNING';
      category = 'Mencurigakan';
      reasons = [
        'Beberapa kata kunci mencurigakan terdeteksi',
        if (hasUrgency) 'Menggunakan bahasa yang mendesak',
        'Verifikasi keaslian pesan melalui channel resmi',
      ];
    }

    return {
      'risk_score': riskScore,
      'status': status,
      'category': category,
      'reasons': reasons,
      'recommendation': status == 'DANGEROUS'
          ? 'JANGAN klik link apapun. JANGAN transfer uang. JANGAN berikan OTP atau password. Hubungi bank melalui nomor resmi di kartu ATM kamu. Laporkan nomor ini ke SELIDIKI.'
          : status == 'WARNING'
              ? 'Berhati-hati. Verifikasi pesan ini melalui channel resmi sebelum mengambil tindakan apapun. Jangan berikan data pribadi.'
              : 'Pesan ini tampak aman. Tetap waspada dan jangan bagikan data pribadi kepada siapapun.',
    };
  }
}

final scanProvider = StateNotifierProvider<ScanNotifier, ScanState>(
  (ref) => ScanNotifier(),
);
