const errorHandler = (error, req, res, next) => {
  console.error('Error occurred:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = 500;
  let message = 'خطأ في الخادم';

  // Handle specific error types
  if (error.code === 'ER_NO_SUCH_TABLE') {
    statusCode = 500;
    message = 'خطأ في قاعدة البيانات - جدول غير موجود';
  } else if (error.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'البيانات موجودة مسبقاً';
  } else if (error.code === 'ER_BAD_FIELD_ERROR') {
    statusCode = 500;
    message = 'خطأ في بنية قاعدة البيانات';
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'رمز الدخول غير صحيح';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'انتهت صلاحية رمز الدخول';
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  AppError
};