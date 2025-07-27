class ResponseHelper {
  static success(res, data = null, message = 'تم بنجاح', statusCode = 200) {
    const response = {
      success: true,
      message
    };

    if (data !== null) {
      if (typeof data === 'object' && !Array.isArray(data)) {
        Object.assign(response, data);
      } else {
        response.data = data;
      }
    }

    return res.status(statusCode).json(response);
  }

  static error(res, message = 'حدث خطأ', statusCode = 500, details = null) {
    const response = {
      success: false,
      message
    };

    if (details && process.env.NODE_ENV === 'development') {
      response.details = details;
    }

    return res.status(statusCode).json(response);
  }

  static validationError(res, errors) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في البيانات المدخلة',
      errors
    });
  }

  static notFound(res, message = 'العنصر غير موجود') {
    return res.status(404).json({
      success: false,
      message
    });
  }

  static unauthorized(res, message = 'غير مصرح لك بالدخول') {
    return res.status(401).json({
      success: false,
      message
    });
  }

  static forbidden(res, message = 'غير مصرح لك بهذا الإجراء') {
    return res.status(403).json({
      success: false,
      message
    });
  }

  static created(res, data = null, message = 'تم الإنشاء بنجاح') {
    return this.success(res, data, message, 201);
  }

  static updated(res, data = null, message = 'تم التحديث بنجاح') {
    return this.success(res, data, message);
  }

  static deleted(res, message = 'تم الحذف بنجاح') {
    return this.success(res, null, message);
  }

  // Pagination helper
  static paginated(res, data, page, limit, total, message = 'تم جلب البيانات بنجاح') {
    const totalPages = Math.ceil(total / limit);
    
    return res.json({
      success: true,
      message,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  }
}

module.exports = ResponseHelper;