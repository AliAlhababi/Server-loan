const { sendErrorResponse } = require('./ResponseHelper');

/**
 * Centralized error handling utility
 */
class ErrorHandler {
  static handle(error, req, res, next) {
    console.error('خطأ في الخادم:', error);

    // Handle specific error types
    if (error.name === 'ValidationError') {
      return sendErrorResponse(res, 'خطأ في التحقق من البيانات', 422, error.errors);
    }

    if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
      return sendErrorResponse(res, 'غير مخول للوصول', 401);
    }

    if (error.name === 'ForbiddenError' || error.message.includes('forbidden')) {
      return sendErrorResponse(res, 'محظور الوصول', 403);
    }

    if (error.name === 'NotFoundError' || error.message.includes('not found')) {
      return sendErrorResponse(res, 'المورد غير موجود', 404);
    }

    // Database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return sendErrorResponse(res, 'البيانات موجودة مسبقاً', 409);
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return sendErrorResponse(res, 'مرجع البيانات غير صحيح', 400);
    }

    if (error.code === 'ECONNREFUSED') {
      return sendErrorResponse(res, 'خطأ في الاتصال بقاعدة البيانات', 503);
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return sendErrorResponse(res, 'رمز التوثيق غير صحيح', 401);
    }

    if (error.name === 'TokenExpiredError') {
      return sendErrorResponse(res, 'انتهت صلاحية رمز التوثيق', 401);
    }

    // Default server error
    const isDevelopment = process.env.NODE_ENV === 'development';
    const message = isDevelopment ? error.message : 'خطأ داخلي في الخادم';
    
    return sendErrorResponse(res, message, 500);
  }

  static notFound(req, res) {
    return sendErrorResponse(res, 'الصفحة المطلوبة غير موجودة', 404);
  }

  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  static createError(message, statusCode = 500, name = 'Error') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.name = name;
    return error;
  }

  static throwValidationError(message, errors = []) {
    const error = this.createError(message, 422, 'ValidationError');
    error.errors = errors;
    throw error;
  }

  static throwUnauthorizedError(message = 'غير مخول للوصول') {
    throw this.createError(message, 401, 'UnauthorizedError');
  }

  static throwForbiddenError(message = 'محظور الوصول') {
    throw this.createError(message, 403, 'ForbiddenError');
  }

  static throwNotFoundError(message = 'المورد غير موجود') {
    throw this.createError(message, 404, 'NotFoundError');
  }
}

module.exports = ErrorHandler;