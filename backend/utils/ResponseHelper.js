/**
 * Standardized API response helper
 */
class ResponseHelper {
  static sendSuccessResponse(res, message, data = null, statusCode = 200) {
    const response = {
      success: true,
      message,
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  static sendErrorResponse(res, message, statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
    };

    if (errors !== null) {
      response.errors = Array.isArray(errors) ? errors : [errors];
    }

    return res.status(statusCode).json(response);
  }

  static sendValidationError(res, errors) {
    const errorMessages = Array.isArray(errors) ? errors : [errors];
    
    return this.sendErrorResponse(
      res, 
      'خطأ في البيانات المدخلة', 
      422, 
      errorMessages
    );
  }

  static sendUnauthorizedError(res, message = 'غير مخول للوصول') {
    return this.sendErrorResponse(res, message, 401);
  }

  static sendForbiddenError(res, message = 'محظور الوصول') {
    return this.sendErrorResponse(res, message, 403);
  }

  static sendNotFoundError(res, message = 'المورد غير موجود') {
    return this.sendErrorResponse(res, message, 404);
  }

  static sendInternalServerError(res, message = 'خطأ داخلي في الخادم') {
    return this.sendErrorResponse(res, message, 500);
  }

  static handleAsyncError(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

module.exports = ResponseHelper;

// Export commonly used methods directly
module.exports.sendSuccessResponse = ResponseHelper.sendSuccessResponse;
module.exports.sendErrorResponse = ResponseHelper.sendErrorResponse;
module.exports.sendValidationError = ResponseHelper.sendValidationError;
module.exports.sendUnauthorizedError = ResponseHelper.sendUnauthorizedError;
module.exports.sendForbiddenError = ResponseHelper.sendForbiddenError;
module.exports.sendNotFoundError = ResponseHelper.sendNotFoundError;
module.exports.sendInternalServerError = ResponseHelper.sendInternalServerError;
module.exports.handleAsyncError = ResponseHelper.handleAsyncError;