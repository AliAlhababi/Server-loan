const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByUserId(userId) {
    try {
      const [users] = await this.pool.execute(`
        SELECT u.*, 
               COALESCE(u.balance, 0) as current_balance,
               LEAST((COALESCE(u.balance, 0) * 3), 10000) as max_loan_amount
        FROM users u 
        WHERE u.user_id = ?
      `, [userId]);
      
      return users[0] || null;
    } catch (error) {
      throw new Error('خطأ في جلب بيانات المستخدم: ' + error.message);
    }
  }

  async findByEmailOrPhone(email, phone) {
    try {
      const [users] = await this.pool.execute(`
        SELECT user_id, email, phone, Aname 
        FROM users 
        WHERE email = ? OR phone = ?
      `, [email, phone]);
      
      return users[0] || null;
    } catch (error) {
      throw new Error('خطأ في البحث عن المستخدم: ' + error.message);
    }
  }

  async findAllUsers(limit = 100) {
    try {
      const [users] = await this.pool.execute(`
        SELECT user_id, Aname, user_type, balance, email, phone, 
               registration_date, joining_fee_approved, is_blocked
        FROM users 
        WHERE user_type != 'admin'
        ORDER BY user_id ASC 
        LIMIT ?
      `, [limit]);
      
      return users;
    } catch (error) {
      throw new Error('خطأ في جلب قائمة المستخدمين: ' + error.message);
    }
  }

  async findAdminUsers() {
    try {
      const [admins] = await this.pool.execute(`
        SELECT user_id, Aname as name 
        FROM users 
        WHERE user_type = 'admin' 
        ORDER BY user_id LIMIT 10
      `);
      
      return admins;
    } catch (error) {
      throw new Error('خطأ في جلب قائمة الإداريين: ' + error.message);
    }
  }

  async getFirstAdmin() {
    try {
      const [admin] = await this.pool.execute(`
        SELECT user_id 
        FROM users 
        WHERE user_type = 'admin' 
        ORDER BY user_id LIMIT 1
      `);
      
      return admin[0] || null;
    } catch (error) {
      throw new Error('خطأ في جلب المدير: ' + error.message);
    }
  }

  async updateBalance(userId, amount, operation = 'add') {
    try {
      const sql = operation === 'add' 
        ? 'UPDATE users SET balance = balance + ? WHERE user_id = ?'
        : 'UPDATE users SET balance = ? WHERE user_id = ?';
        
      const [result] = await this.pool.execute(sql, [amount, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('خطأ في تحديث الرصيد: ' + error.message);
    }
  }

  async updatePassword(userId, hashedPassword) {
    try {
      const [result] = await this.pool.execute(
        'UPDATE users SET password = ? WHERE user_id = ?',
        [hashedPassword, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('خطأ في تحديث كلمة المرور: ' + error.message);
    }
  }

  async updateProfile(userId, profileData) {
    try {
      const { Aname, email, phone, whatsapp, workplace } = profileData;
      const [result] = await this.pool.execute(`
        UPDATE users 
        SET Aname = ?, email = ?, phone = ?, whatsapp = ?, workplace = ?
        WHERE user_id = ?
      `, [Aname, email, phone, whatsapp, workplace, userId]);
      
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('خطأ في تحديث الملف الشخصي: ' + error.message);
    }
  }

  async updateJoiningFeeStatus(userId, status) {
    try {
      const [result] = await this.pool.execute(
        'UPDATE users SET joining_fee_approved = ? WHERE user_id = ?',
        [status, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('خطأ في تحديث حالة رسوم الانضمام: ' + error.message);
    }
  }

  async updateBlockStatus(userId, isBlocked) {
    try {
      const [result] = await this.pool.execute(
        'UPDATE users SET is_blocked = ? WHERE user_id = ?',
        [isBlocked ? 1 : 0, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('خطأ في تحديث حالة الحظر: ' + error.message);
    }
  }

  async updateRegistrationDate(userId, registrationDate) {
    try {
      const [result] = await this.pool.execute(
        'UPDATE users SET registration_date = ? WHERE user_id = ?',
        [registrationDate, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('خطأ في تحديث تاريخ التسجيل: ' + error.message);
    }
  }

  async createUser(userData) {
    try {
      const {
        Aname, civilId, phone, email, userType, workplace, 
        balance, hashedPassword, whatsapp, joiningFeeStatus
      } = userData;

      const [result] = await this.pool.execute(`
        INSERT INTO users (
          Aname, civil_id, phone, email, user_type, workplace, 
          balance, password, whatsapp, joining_fee_approved, 
          registration_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        Aname, civilId, phone, email, userType, workplace, 
        balance, hashedPassword, whatsapp, joiningFeeStatus
      ]);

      return {
        userId: result.insertId,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      throw new Error('خطأ في إنشاء المستخدم: ' + error.message);
    }
  }

  async getUserStats() {
    try {
      const [stats] = await this.pool.execute(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN user_type = 'employee' THEN 1 ELSE 0 END) as employees,
          SUM(CASE WHEN user_type = 'student' THEN 1 ELSE 0 END) as students,
          SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END) as blocked_users,
          SUM(CASE WHEN joining_fee_approved = 'approved' THEN 1 ELSE 0 END) as approved_fees
        FROM users 
        WHERE user_type != 'admin'
      `);
      
      return stats[0];
    } catch (error) {
      throw new Error('خطأ في جلب إحصائيات المستخدمين: ' + error.message);
    }
  }
}

module.exports = UserRepository;