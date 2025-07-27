const express = require('express');
const UserService = require('../services/UserService');
const ResponseHelper = require('../utils/ResponseHelper');
const { asyncHandler } = require('../utils/ErrorHandler');
const { verifyToken, requireOwnershipOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/:userId', verifyToken, requireOwnershipOrAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const user = await UserService.getBasicUserInfo(userId);

  // Remove sensitive data
  delete user.password;

  ResponseHelper.success(res, { user }, 'تم جلب الملف الشخصي بنجاح');
}));

// Update user profile
router.put('/:userId', verifyToken, requireOwnershipOrAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const {
    mobile1,
    mobile2,
    email,
    HomeAddress,
    WorkAddress,
    BankName,
    AccountNo,
    IBAN,
    BankName2,
    AccountNo2,
    IBAN2
  } = req.body;

  // Validate required fields
  if (!mobile1 || !email) {
    return ResponseHelper.error(res, 'رقم الهاتف والبريد الإلكتروني مطلوبان', 400);
  }

  // Check if email already exists for another user
  if (await UserService.isEmailTaken(email, userId)) {
    return ResponseHelper.error(res, 'البريد الإلكتروني مستخدم من قبل مستخدم آخر', 400);
  }

  const profileData = {
    mobile1, mobile2, email,
    HomeAddress, WorkAddress,
    BankName, AccountNo, IBAN,
    BankName2, AccountNo2, IBAN2
  };

  await UserService.updateUserProfile(userId, profileData);
  ResponseHelper.updated(res, null, 'تم تحديث الملف الشخصي بنجاح');
}));

// Update user profile (PUT /profile) - for current user
router.put('/', verifyToken, asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const { name, email, phone, workplace } = req.body;

  // Validate required fields
  if (!name || !email || !phone) {
    return ResponseHelper.error(res, 'الاسم والبريد الإلكتروني ورقم الهاتف مطلوبان', 400);
  }

  // Check if email already exists for another user
  if (await UserService.isEmailTaken(email, userId)) {
    return ResponseHelper.error(res, 'البريد الإلكتروني مستخدم من قبل مستخدم آخر', 400);
  }

  const profileData = {
    Aname: name,
    email,
    phone,
    workplace: workplace || ''
  };

  await UserService.updateUserProfile(userId, profileData);
  ResponseHelper.updated(res, null, 'تم تحديث الملف الشخصي بنجاح');
}));

module.exports = router;