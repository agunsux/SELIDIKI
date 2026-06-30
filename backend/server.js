const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { initializeApp, cert } = require('firebase-admin/app');

// ── Routes ────────────────────────────────────────────────
const scanRoutes = require('./routes/scan');
const checkRoutes = require('./routes/check');
const reportRoutes = require('./routes/report');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Firebase Admin Init ───────────────────────────────────
try {
  initializeApp({
    credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : undefined, // Uses ADC in Cloud Run
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
} catch (err) {
  console.warn('Firebase init skipped (dev mode):', err.message);
}

// ── Middleware ────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    'https://selidiki.id',
    'https://admin.selidiki.id',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' })); // For image uploads
app.use(morgan('combined'));

// ── Rate Limiting ─────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Terlalu banyak permintaan. Coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 scans per minute
  message: { error: 'Rate limit scan tercapai. Tunggu 1 menit.' },
});

app.use('/api/', apiLimiter);
app.use('/api/v1/scan', strictLimiter);
app.use('/api/v1/report', strictLimiter);

// ── Routes ────────────────────────────────────────────────
app.use('/api/v1/scan', scanRoutes);
app.use('/api/v1/check', checkRoutes);
app.use('/api/v1/report', reportRoutes);
app.use('/api/v1/user', userRoutes);

// ── Health Check ──────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SELIDIKI API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// ── Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🛡️  SELIDIKI API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
