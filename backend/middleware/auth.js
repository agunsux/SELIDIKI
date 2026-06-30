const { getAuth } = require('firebase-admin/auth');

/**
 * Firebase ID token verification middleware
 */
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token autentikasi diperlukan' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error('Auth error:', err.code);
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token kadaluarsa. Silakan login ulang.' });
    }
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}

/**
 * Optional auth — continues even without token
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const idToken = authHeader.split('Bearer ')[1];
    req.user = await getAuth().verifyIdToken(idToken);
  } catch {
    req.user = null;
  }

  next();
}

module.exports = { verifyFirebaseToken, optionalAuth };
