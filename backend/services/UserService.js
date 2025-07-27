const DatabaseService = require('./DatabaseService');
const { AppError } = require('../utils/ErrorHandler');
const bcrypt = require('bcrypt');

class UserService {
  static async getBasicUserInfo(userId, fields = '*') {
    if (typeof fields === 'array') {
      fields = fields.join(', ');
    }
    
    // If requesting all fields or specific fields, include admin name
    let query;
    if (fields === '*' || fields.includes('approved_by_admin')) {
      query = `
        SELECT u.*, 
               admin.Aname as approved_by_admin_name
        FROM users u
        LEFT JOIN users admin ON u.approved_by_admin_id = admin.user_id
        WHERE u.user_id = ? 
        LIMIT 1
      `;
    } else {
      query = `SELECT ${fields} FROM users WHERE user_id = ? LIMIT 1`;
    }
    
    const results = await DatabaseService.executeQuery(query, [userId]);
    
    if (results.length === 0) {
      throw new AppError('المستخدم غير موجود', 404);
    }
    
    return results[0];
  }

  static async getUserWithBalance(userId) {
    return await this.getBasicUserInfo(userId, 'user_id, Aname, user_type, balance, registration_date, joining_fee_approved, is_blocked, approved_by_admin_id');
  }

  static async getUserForAuth(userId) {
    return await this.getBasicUserInfo(userId, 'user_id, password, user_type, Aname, balance, is_blocked');
  }

  static async validateUserAccess(userId, requestingUserId, requestingUserType) {
    if (requestingUserType === 'admin') {
      return true;
    }
    
    if (parseInt(userId) !== parseInt(requestingUserId)) {
      throw new AppError('غير مصرح لك بالوصول لهذه البيانات', 403);
    }
    
    return true;
  }

  static async checkUserExists(userId) {
    return await DatabaseService.exists('users', { user_id: userId });
  }

  static async updateUserBalance(userId, amount, operation = 'add') {
    const user = await this.getUserWithBalance(userId);
    const currentBalance = parseFloat(user.balance || 0);
    
    let newBalance;
    if (operation === 'add') {
      newBalance = currentBalance + parseFloat(amount);
    } else if (operation === 'subtract') {
      newBalance = currentBalance - parseFloat(amount);
    } else {
      newBalance = parseFloat(amount);
    }

    await DatabaseService.update('users', 
      { balance: newBalance }, 
      { user_id: userId }
    );

    return newBalance;
  }

  static async getUsersByType(userType = null, limit = null) {
    let query = `
      SELECT u.*, 
             admin.Aname as approved_by_admin_name
      FROM users u
      LEFT JOIN users admin ON u.approved_by_admin_id = admin.user_id
    `;
    
    const params = [];
    
    if (userType) {
      query += ' WHERE u.user_type = ?';
      params.push(userType);
    }
    
    query += ' ORDER BY u.registration_date DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }
    
    return await DatabaseService.executeQuery(query, params);
  }

  static async getUsersByApprovingAdmin(adminId, userType = null, limit = null) {
    let query = `
      SELECT u.*, 
             admin.Aname as approved_by_admin_name
      FROM users u
      LEFT JOIN users admin ON u.approved_by_admin_id = admin.user_id
      WHERE u.approved_by_admin_id = ?
    `;
    
    const params = [adminId];
    
    if (userType) {
      query += ' AND u.user_type = ?';
      params.push(userType);
    }
    
    query += ' ORDER BY u.registration_date DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }
    
    return await DatabaseService.executeQuery(query, params);
  }

  static async getAdminUsers() {
    return await this.getUsersByType('admin');
  }

  static async getFirstAdmin() {
    const admins = await this.getAdminUsers();
    if (admins.length === 0) {
      throw new AppError('لا يوجد مدير متاح', 500);
    }
    return admins[0];
  }

  static async blockUser(userId, isBlocked = true) {
    const affectedRows = await DatabaseService.update('users',
      { is_blocked: isBlocked ? 1 : 0 },
      { user_id: userId }
    );

    if (affectedRows === 0) {
      throw new AppError('المستخدم غير موجود', 404);
    }

    return true;
  }

  static async updateJoiningFeeStatus(userId, status, adminId = null) {
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new AppError('حالة رسوم الانضمام غير صحيحة', 400);
    }

    const updateData = { joining_fee_approved: status };
    
    // Set approving admin when status is approved
    if (status === 'approved' && adminId) {
      updateData.approved_by_admin_id = adminId;
    }

    const affectedRows = await DatabaseService.update('users',
      updateData,
      { user_id: userId }
    );

    if (affectedRows === 0) {
      throw new AppError('المستخدم غير موجود', 404);
    }

    return true;
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const user = await this.getUserForAuth(userId);
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AppError('كلمة المرور الحالية غير صحيحة', 400);
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await DatabaseService.update('users',
      { password: hashedNewPassword },
      { user_id: userId }
    );

    return true;
  }

  static async resetPassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const affectedRows = await DatabaseService.update('users',
      { password: hashedPassword },
      { user_id: userId }
    );

    if (affectedRows === 0) {
      throw new AppError('المستخدم غير موجود', 404);
    }

    return true;
  }

  static async createUser(userData) {
    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 12);
    }

    // Set default values
    userData.balance = userData.balance || 0;
    userData.joining_fee_approved = userData.joining_fee_approved || 'pending';
    userData.user_type = userData.user_type || 'employee';
    userData.registration_date = new Date();

    const result = await DatabaseService.create('users', userData);
    return result.insertId;
  }

  static async updateUserProfile(userId, profileData) {
    // Remove sensitive fields that shouldn't be updated through profile
    const { password, user_type, balance, joining_fee_approved, is_blocked, ...safeData } = profileData;

    if (Object.keys(safeData).length === 0) {
      throw new AppError('لا توجد بيانات للتحديث', 400);
    }

    const affectedRows = await DatabaseService.update('users', safeData, { user_id: userId });
    
    if (affectedRows === 0) {
      throw new AppError('المستخدم غير موجود', 404);
    }

    return true;
  }

  static async isEmailTaken(email, excludeUserId = null) {
    const conditions = { email };
    if (excludeUserId) {
      // For updates, we need to exclude the current user
      const query = 'SELECT user_id FROM users WHERE email = ? AND user_id != ?';
      const results = await DatabaseService.executeQuery(query, [email, excludeUserId]);
      return results.length > 0;
    }
    
    return await DatabaseService.exists('users', conditions);
  }

  static calculateMaxLoanAmount(balance) {
    return Math.min((balance || 0) * 3, 10000);
  }

  static async getUserStats() {
    const [totalUsers, activeUsers, adminUsers] = await Promise.all([
      DatabaseService.count('users'),
      DatabaseService.count('users', { is_blocked: 0 }),
      DatabaseService.count('users', { user_type: 'admin' })
    ]);

    return {
      total: totalUsers,
      active: activeUsers,
      blocked: totalUsers - activeUsers,
      admins: adminUsers,
      regular: totalUsers - adminUsers
    };
  }

  static async updateUser(userId, updateData) {
    // Prepare the update data with proper field mappings
    const allowedFields = {
      fullName: 'Aname',
      name: 'Aname', 
      email: 'email',
      phone: 'phone',
      whatsapp: 'whatsapp',
      workplace: 'workplace',
      balance: 'balance',
      registration_date: 'registration_date',
      joining_fee_approved: 'joining_fee_approved',
      is_blocked: 'is_blocked',
      user_type: 'user_type'
    };

    const updateFields = {};
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields[key] && value !== undefined && value !== '') {
        updateFields[allowedFields[key]] = value;
      }
    }

    // If no valid fields to update
    if (Object.keys(updateFields).length === 0) {
      throw new AppError('لا توجد بيانات صحيحة للتحديث', 400);
    }

    // Add update timestamp
    updateFields.updated_at = new Date();

    console.log(`📝 UserService: Updating user ${userId} with fields:`, updateFields);
    
    return await DatabaseService.update('users', updateFields, { user_id: userId });
  }
}

module.exports = UserService;