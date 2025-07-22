const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const AuthValidator = require('../validators/AuthValidator');
const { handleAsyncError } = require('../utils/ResponseHelper');
const { verifyToken } = require('../middleware/auth');

const authController = new AuthController();

// Login endpoint
router.post('/login', 
  AuthValidator.validateLoginInput,
  handleAsyncError((req, res) => authController.login(req, res))
);

// Token validation endpoint
router.get('/me', 
  verifyToken,
  handleAsyncError((req, res) => authController.validateToken(req, res))
);

// Self-service password reset
router.post('/reset-password',
  AuthValidator.validatePasswordResetInput,
  handleAsyncError((req, res) => authController.resetPassword(req, res))
);

// Change password (authenticated user)
router.put('/change-password',
  verifyToken,
  AuthValidator.validatePasswordChangeInput,
  handleAsyncError((req, res) => authController.changePassword(req, res))
);

module.exports = router;