const crypto = require('crypto');

module.exports = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', requestId);

  res.apiSuccess = (data = null, message = '', meta = {}) => {
    return res.status(200).json({
      success: true,
      message,
      data,
      meta: {
        ...meta,
        apiVersion: '1.0.0'
      },
      errors: null,
      requestId,
      timestamp: new Date().toISOString()
    });
  };

  res.apiError = (errors = null, message = 'Gagal memproses permintaan', status = 400, meta = {}) => {
    const formattedErrors = typeof errors === 'string' ? [errors] : errors;
    return res.status(status).json({
      success: false,
      message,
      data: null,
      meta: {
        ...meta,
        apiVersion: '1.0.0'
      },
      errors: formattedErrors,
      requestId,
      timestamp: new Date().toISOString()
    });
  };

  next();
};
