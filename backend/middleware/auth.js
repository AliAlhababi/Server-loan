const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'غير مصرح لك بالدخول - الرمز المميز مطلوب' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data - support both userId formats
    const userId = decoded.userId || decoded.user_id;
    const [users] = await pool.execute(
      'SELECT user_id, user_type, Aname, is_blocked FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    const user = users[0];
    
    // Check if user is blocked
    if (user.is_blocked == 1 && user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'تم حظر حسابك من قبل الإدارة. يرجى التواصل مع الدعم الفني.'
      });
    }
    
    user.userId = user.user_id; // Add userId for backward compatibility

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'رمز الدخول غير صحيح'
    });
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.user_type !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول - صلاحيات المدير مطلوبة'
    });
  }
  next();
};

// Check if user can access their own data or admin
const requireOwnershipOrAdmin = (req, res, next) => {
  const targetUserId = parseInt(req.params.userId || req.body.user_id);
  
  if (req.user.user_type === 'admin' || req.user.user_id === targetUserId) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول لهذه البيانات'
    });
  }
};

// Optional token verification (doesn't fail if no token)
const verifyTokenOptional = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data - support both userId formats
    const userId = decoded.userId || decoded.user_id;
    const [users] = await pool.execute(
      'SELECT user_id, user_type, Aname, is_blocked FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      req.user = null;
      return next();
    }

    const user = users[0];
    
    // Check if user is blocked
    if (user.is_blocked == 1 && user.user_type !== 'admin') {
      req.user = null;
      return next();
    }
    
    user.userId = user.user_id; // Add userId for backward compatibility
    req.user = user;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Verify admin privileges
const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.user_type !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول - صلاحيات المدير مطلوبة'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  verifyTokenOptional,
  verifyAdmin,
  requireAdmin,
  requireOwnershipOrAdmin
};