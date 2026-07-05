const { getAuth } = require('firebase-admin/auth');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/postgres/UserRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'selidiki_secret_key_change_in_production';
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

/**
 * Verify token and attach user to request.
 * Supports Firebase ID Token, Supabase JWT, and Custom JWT.
 */
async function decodeAndVerifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1];
  
  // Try Custom JWT first
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded) return decoded;
  } catch (err) {
    // Continue
  }

  // Try Supabase JWT
  if (SUPABASE_JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
      if (decoded) {
        return {
          uid: decoded.sub,
          phoneHash: decoded.phone_hash || decoded.email_hash || '',
          role: decoded.role || 'user',
          isSupabase: true
        };
      }
    } catch (err) {
      // Continue
    }
  }

  // Try Firebase
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken;
  } catch (err) {
    // Continue
  }

  return null;
}

/**
 * Unified verification middleware.
 */
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token autentikasi diperlukan' });
  }

  try {
    const decoded = await decodeAndVerifyToken(authHeader);
    if (!decoded) {
      return res.status(401).json({ error: 'Token tidak valid' });
    }

    req.user = decoded;

    // Attach role from database if user exists
    try {
      const dbUser = req.user.phoneHash
        ? await UserRepository.findByHash(req.user.phoneHash)
        : (req.user.uid ? await UserRepository.findByFirebaseUid(req.user.uid) : null);
      
      if (dbUser) {
        req.user.role = dbUser.role || dbUser.metadata?.role || 'user';
        req.user.dbId = dbUser.id;
      } else {
        req.user.role = req.user.role || 'user';
      }
    } catch (dbErr) {
      req.user.role = req.user.role || 'user';
    }

    next();
  } catch (err) {
    console.error('Auth middleware verification error:', err);
    return res.status(401).json({ error: 'Proses autentikasi gagal' });
  }
}

/**
 * Optional verification middleware.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const decoded = await decodeAndVerifyToken(authHeader);
    if (decoded) {
      req.user = decoded;
      try {
        const dbUser = req.user.phoneHash
          ? await UserRepository.findByHash(req.user.phoneHash)
          : (req.user.uid ? await UserRepository.findByFirebaseUid(req.user.uid) : null);
        
        if (dbUser) {
          req.user.role = dbUser.role || dbUser.metadata?.role || 'user';
          req.user.dbId = dbUser.id;
        } else {
          req.user.role = req.user.role || 'user';
        }
      } catch (dbErr) {
        req.user.role = req.user.role || 'user';
      }
    } else {
      req.user = null;
    }
  } catch (err) {
    req.user = null;
  }
  next();
}

/**
 * Middleware to restrict route to specific roles.
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autentikasi diperlukan' });
    }
    const role = req.user.role || 'user';
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Hak akses tidak cukup' });
    }
    next();
  };
}

module.exports = { verifyFirebaseToken, optionalAuth, requireRole };
