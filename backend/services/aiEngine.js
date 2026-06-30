const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Analyze content with Gemini AI for scam/fraud detection
 * @param {Object} params
 * @param {string} params.input - Text/URL/base64 image
 * @param {'message'|'url'|'screenshot'} params.type
 * @param {boolean} [params.isImage]
 * @param {string} [params.domain]
 */
async function analyzeWithGemini({ input, type, isImage = false, domain }) {
  // If no API key, return heuristic result
  if (!process.env.GEMINI_API_KEY) {
    return heuristicAnalysis(input, type);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    });

    const prompt = buildPrompt(input, type, domain);

    let result;
    if (isImage) {
      result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: input,
          },
        },
        prompt,
      ]);
    } else {
      result = await model.generateContent(prompt);
    }

    const text = result.response.text();
    const parsed = JSON.parse(text);

    return validateAndNormalize(parsed);
  } catch (err) {
    console.error('Gemini API error:', err);
    return heuristicAnalysis(input, type);
  }
}

function buildPrompt(input, type, domain) {
  const typeDescriptions = {
    message: 'pesan SMS atau WhatsApp',
    url: `URL/link${domain ? ` (domain: ${domain})` : ''}`,
    screenshot: 'screenshot dari pesan atau website',
  };

  return `Kamu adalah AI fraud detection expert untuk platform SELIDIKI Indonesia.
Analisis ${typeDescriptions[type]} berikut untuk mendeteksi scam/phishing/penipuan.

INPUT: "${input.slice(0, 2000)}"

Analisis berdasarkan faktor-faktor berikut:
1. Pola scam yang umum di Indonesia (BRI/BCA/Mandiri phishing, investasi bodong, pinjol ilegal)
2. Bahasa manipulatif: urgency (segera/darurat/batas waktu), fear, greed (menang/hadiah)
3. Permintaan data sensitif (OTP, password, data KTP, nomor rekening)
4. Permintaan transfer uang atau instalasi APK
5. Impersonasi institusi resmi (bank, OJK, Kominfo, marketplace)
6. URL/domain mencurigakan (non-HTTPS, typosquatting, domain baru)
7. Tawaran tidak realistis (return investasi tinggi, hadiah tanpa alasan)

PENTING:
- Bank Indonesia dan bank manapun TIDAK PERNAH meminta OTP via telepon/SMS
- OJK TIDAK menghubungi nasabah langsung untuk kasus
- Investasi legal tidak menjanjikan return pasti sangat tinggi

Kembalikan JSON dengan format PERSIS ini (tidak ada teks lain):
{
  "risk_score": <integer 0-100>,
  "status": "<SAFE|WARNING|DANGEROUS>",
  "category": "<kategori dalam Bahasa Indonesia, contoh: Phishing Bank BRI>",
  "reasons": ["<alasan spesifik 1>", "<alasan spesifik 2>", ...],
  "recommendation": "<rekomendasi tindakan konkret dalam Bahasa Indonesia>",
  "confidence": <integer 0-100>
}

risk_score: 0=sangat aman, 100=sangat berbahaya
SAFE: 0-35, WARNING: 36-65, DANGEROUS: 66-100`;
}

function validateAndNormalize(parsed) {
  return {
    risk_score: Math.max(0, Math.min(100, parseInt(parsed.risk_score) || 0)),
    status: ['SAFE', 'WARNING', 'DANGEROUS'].includes(parsed.status) ? parsed.status : 'WARNING',
    category: parsed.category || 'Tidak Diketahui',
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 8) : [],
    recommendation: parsed.recommendation || 'Berhati-hati dan verifikasi melalui channel resmi.',
    confidence: Math.max(0, Math.min(100, parseInt(parsed.confidence) || 70)),
  };
}

function heuristicAnalysis(input, type) {
  const lower = input.toLowerCase();
  let score = 10;
  const reasons = [];

  const signals = [
    { keywords: ['otp', 'one time password'], reason: 'Meminta kode OTP', score: 30 },
    { keywords: ['password', 'pin atm'], reason: 'Meminta password/PIN', score: 30 },
    { keywords: ['transfer', 'kirim uang'], reason: 'Meminta transfer uang', score: 25 },
    { keywords: ['menang', 'hadiah', 'pemenang'], reason: 'Klaim hadiah tidak jelas', score: 20 },
    { keywords: ['segera', 'darurat', 'batas waktu', 'hari ini juga'], reason: 'Bahasa urgensi palsu', score: 15 },
    { keywords: ['bri', 'bca', 'mandiri', 'ojk', 'kominfo'], reason: 'Mengklaim sebagai institusi resmi', score: 20 },
    { keywords: ['klik link', 'click here', 'download apk'], reason: 'Meminta klik link/download', score: 20 },
    { keywords: ['investasi', 'profit', 'return', 'passive income'], reason: 'Penawaran investasi mencurigakan', score: 15 },
    { keywords: ['pinjaman', 'kredit', 'langsung cair'], reason: 'Penawaran pinjaman tidak jelas', score: 10 },
  ];

  for (const signal of signals) {
    if (signal.keywords.some((kw) => lower.includes(kw))) {
      score += signal.score;
      reasons.push(signal.reason);
    }
  }

  score = Math.min(100, score);

  let status = 'SAFE';
  if (score >= 66) status = 'DANGEROUS';
  else if (score >= 36) status = 'WARNING';

  return {
    risk_score: score,
    status,
    category: status === 'DANGEROUS' ? 'Scam Terdeteksi' : status === 'WARNING' ? 'Mencurigakan' : 'Aman',
    reasons: reasons.length > 0 ? reasons : ['Tidak ada pola scam yang terdeteksi'],
    recommendation:
      status === 'DANGEROUS'
        ? 'JANGAN klik link atau ikuti instruksi. Hubungi pihak terkait melalui channel resmi.'
        : status === 'WARNING'
        ? 'Verifikasi keaslian melalui website atau nomor resmi sebelum mengambil tindakan.'
        : 'Tidak ada ancaman yang terdeteksi. Tetap waspada.',
    confidence: 65,
  };
}

module.exports = { analyzeWithGemini };
