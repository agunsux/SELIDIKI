// scripts/captureBaseline.js
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// 1. Mock DB queries before requiring app to avoid ECONNREFUSED errors
const db = require('../utils/db');
db.query = async (text, params) => {
  if (text.includes('SELECT * FROM users') || text.includes('phone_hash = $1')) {
    return {
      rows: [{
        id: '123',
        phone_hash: 'testphonehash',
        firebase_uid: null,
        role: 'user',
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
        metadata: '{}'
      }]
    };
  }
  if (text.includes('INSERT INTO users')) {
    return {
      rows: [{
        id: '123',
        phone_hash: 'testphonehash',
        firebase_uid: null,
        role: 'user',
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
        metadata: '{}'
      }]
    };
  }
  if (text.includes('phone_profiles')) {
    return {
      rows: [{
        id: 1,
        phone_hash: 'testphonehash',
        risk_score: 10,
        updated_at: new Date().toISOString()
      }]
    };
  }
  if (text.includes('bank_account_profiles')) {
    return { rows: [] };
  }
  if (text.includes('fraud_reports')) {
    return { rows: [] };
  }
  if (text.includes('audit_log')) {
    return { rows: [] };
  }
  return { rows: [] };
};

// Also mock Gemini AI engine to return deterministic response
const aiEngine = require('../services/aiEngine');
aiEngine.analyzeWithGemini = async ({ input, type }) => {
  return {
    risk_score: 15,
    status: 'SAFE',
    category: null,
    explanation: 'Analisis AI baseline: Pesan aman.',
    evidence: [],
    confidence: 85
  };
};

// 2. Set environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_PROVIDER = 'FIRESTORE';

const request = require('supertest');
const app = require('../server');

const JWT_SECRET = process.env.JWT_SECRET || 'selidiki_secret_key_change_in_production';
const mockToken = jwt.sign(
  { uid: 'test-user-id', phoneHash: 'testphonehash', role: 'user' },
  JWT_SECRET
);

async function run() {
  console.log('🏁 Starting Baseline Capture...');
  const baseline = {};

  const endpoints = [
    {
      name: 'health',
      method: 'GET',
      path: '/health',
      body: null,
      headers: {}
    },
    {
      name: 'send-otp',
      method: 'POST',
      path: '/api/v1/user/auth/send-otp',
      body: { phone: '081234567890' },
      headers: {}
    },
    {
      name: 'verify-otp',
      method: 'POST',
      path: '/api/v1/user/auth/verify-otp',
      body: { phone: '081234567890', otp: '123456' },
      headers: {}
    },
    {
      name: 'check-phone',
      method: 'GET',
      path: '/api/v1/check/phone/081234567890',
      body: null,
      headers: {}
    },
    {
      name: 'check-account',
      method: 'GET',
      path: '/api/v1/check/account?bank=BCA&account=1234567890',
      body: null,
      headers: {}
    },
    {
      name: 'report-trending',
      method: 'GET',
      path: '/api/v1/report/trending',
      body: null,
      headers: {}
    },
    {
      name: 'scan-message',
      method: 'POST',
      path: '/api/v1/scan/message',
      body: { message: 'Halo ini penipuan', user_hash: 'testphonehash' },
      headers: {}
    },
    {
      name: 'scan-url',
      method: 'POST',
      path: '/api/v1/scan/url',
      body: { url: 'http://phishing-scam-site.com', user_hash: 'testphonehash' },
      headers: {}
    },
    {
      name: 'scan-screenshot',
      method: 'POST',
      path: '/api/v1/scan/screenshot',
      body: { image_base64: 'dGVzdA==', user_hash: 'testphonehash' },
      headers: {}
    },
    {
      name: 'reputation-health',
      method: 'GET',
      path: '/api/v1/reputation/health',
      body: null,
      headers: {}
    },
    {
      name: 'reputation-check',
      method: 'POST',
      path: '/api/v1/reputation/check',
      body: { entityType: 'PHONE', value: '081234567890' },
      headers: {}
    },
    {
      name: 'user-history',
      method: 'GET',
      path: '/api/v1/user/history?user_hash=testphonehash',
      body: null,
      headers: { Authorization: `Bearer ${mockToken}` }
    },
    {
      name: 'user-delete-data',
      method: 'DELETE',
      path: '/api/v1/user/data',
      body: { user_hash: 'testphonehash' },
      headers: { Authorization: `Bearer ${mockToken}` }
    },
    {
      name: 'submit-report',
      method: 'POST',
      path: '/api/v1/report',
      body: {
        target_type: 'phone',
        target: '081234567890',
        category: 'marketplace_scam',
        description: 'Test scam report'
      },
      headers: { Authorization: `Bearer ${mockToken}` }
    }
  ];

  for (const ep of endpoints) {
    console.log(`📸 Capturing: ${ep.method} ${ep.path}`);
    const start = Date.now();
    let res;

    let reqBuilder;
    if (ep.method === 'GET') {
      reqBuilder = request(app).get(ep.path);
    } else if (ep.method === 'POST') {
      reqBuilder = request(app).post(ep.path).send(ep.body);
    } else if (ep.method === 'DELETE') {
      reqBuilder = request(app).delete(ep.path).send(ep.body);
    }

    if (ep.headers) {
      for (const [k, v] of Object.entries(ep.headers)) {
        reqBuilder.set(k, v);
      }
    }

    res = await reqBuilder;
    const latency = Date.now() - start;

    baseline[ep.name] = {
      endpoint: ep.path,
      method: ep.method,
      requestPayload: ep.body,
      httpStatus: res.status,
      responseBody: res.body,
      latencyMs: latency,
      capturedAt: new Date().toISOString()
    };
  }

  const testDir = path.join(__dirname, '../test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  const outputPath = path.join(testDir, 'baseline_snapshot.json');
  fs.writeFileSync(outputPath, JSON.stringify(baseline, null, 2));
  console.log(`✅ Baseline Captured. Saved to: ${outputPath}`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Baseline capture failed:', err);
  process.exit(1);
});
