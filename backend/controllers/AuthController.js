const AuthService = require('../services/AuthService');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/ResponseHelper');

class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  async login(req, res) {
    try {
      const { userId, password } = req.body;

      if (!userId || !password) {
        return sendErrorResponse(res, 'رقم المستخدم وكلمة المرور مطلوبان', 400);
      }

      const result = await this.authService.login(userId, password);
      sendSuccessResponse(res, 'تم تسجيل الدخول بنجاح', result);

    } catch (error) {
      sendErrorResponse(res, error.message, 401);
    }
  }

  async validateToken(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return sendErrorResponse(res, 'رمز التوثيق مطلوب', 401);
      }

      const user = await this.authService.validateToken(token);
      sendSuccessResponse(res, 'رمز التوثيق صحيح', { user });

    } catch (error) {
      sendErrorResponse(res, error.message, 401);
    }
  }

  async resetPassword(req, res) {
    try {
      const { email, phone, newPassword } = req.body;

      if (!email || !phone) {
        return sendErrorResponse(res, 'البريد الإلكتروني ورقم الهاتف مطلوبان', 400);
      }

      const result = await this.authService.resetPassword(email, phone, newPassword);
      sendSuccessResponse(res, result.message, {
        newPassword: result.newPassword,
        userName: result.userName
      });

    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      if (!currentPassword || !newPassword) {
        return sendErrorResponse(res, 'كلمة المرور الحالية والجديدة مطلوبتان', 400);
      }

      const result = await this.authService.changePassword(userId, currentPassword, newPassword);
      sendSuccessResponse(res, result.message);

    } catch (error) {
      sendErrorResponse(res, error.message, 400);
    }
  }
}

module.exports = AuthController;