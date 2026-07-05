const request = require('supertest');
const app = require('../server');
const jwt = require('jsonwebtoken');

describe('SELIDIKI API Integration & Standardization Tests', () => {
  let mockToken;
  
  beforeAll(() => {
    mockToken = jwt.sign(
      { uid: 'test-user-id', phoneHash: 'testphonehash', role: 'user' },
      process.env.JWT_SECRET || 'selidiki_secret_key_change_in_production'
    );
  });

  test('POST /api/v1/user/auth/send-otp with invalid payload should return standardized error', async () => {
    const res = await request(app)
      .post('/api/v1/user/auth/send-otp')
      .send({ phone: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Input tidak valid');
    expect(res.body.errors).toContain('Nomor HP wajib diisi');
    expect(res.body.requestId).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  test('POST /api/v1/user/auth/send-otp with valid phone should succeed', async () => {
    const res = await request(app)
      .post('/api/v1/user/auth/send-otp')
      .send({ phone: '081234567890' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Kode OTP berhasil dikirim.');
    expect(res.body.data.otp).toBeDefined();
  });

  test('Protected endpoint without token should return 401 standardized error', async () => {
    const res = await request(app)
      .delete('/api/v1/user/data')
      .send({ user_hash: 'somehash' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toContain('Token autentikasi diperlukan');
  });

  test('Protected endpoint with valid token should return 400 when user_hash is missing', async () => {
    const res = await request(app)
      .delete('/api/v1/user/data')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ user_hash: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toContain('user_hash wajib diisi');
  });
});
