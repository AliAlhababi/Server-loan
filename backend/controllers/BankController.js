const { pool } = require('../config/database');

class BankController {
  // Get all banks
  static async getAllBanks(req, res) {
    try {
      const [banks] = await pool.execute(`
        SELECT 
          b.bank_id,
          b.bank_name,
          b.balance,
          b.description,
          b.is_active,
          b.created_at,
          b.updated_at,
          u.Aname as created_by_admin_name
        FROM banks b
        LEFT JOIN users u ON b.created_by_admin_id = u.user_id
        WHERE b.is_active = 1
        ORDER BY b.created_at DESC
      `);

      res.json({
        success: true,
        banks: banks
      });
    } catch (error) {
      console.error('خطأ في جلب البنوك:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب البنوك'
      });
    }
  }

  // Create a new bank
  static async createBank(req, res) {
    try {
      const { bank_name, balance, description } = req.body;
      const adminId = req.user.user_id;

      // Validate input
      if (!bank_name || balance === undefined || balance === null) {
        return res.status(400).json({
          success: false,
          message: 'اسم البنك والرصيد مطلوبان'
        });
      }

      // Check if bank name already exists
      const [existingBank] = await pool.execute(`
        SELECT bank_id FROM banks WHERE bank_name = ? AND is_active = 1
      `, [bank_name]);

      if (existingBank.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'اسم البنك موجود بالفعل'
        });
      }

      // Create the bank
      const [result] = await pool.execute(`
        INSERT INTO banks (bank_name, balance, description, created_by_admin_id)
        VALUES (?, ?, ?, ?)
      `, [bank_name, parseFloat(balance), description || null, adminId]);

      // Get the created bank with admin info
      const [newBank] = await pool.execute(`
        SELECT 
          b.bank_id,
          b.bank_name,
          b.balance,
          b.description,
          b.is_active,
          b.created_at,
          b.updated_at,
          u.Aname as created_by_admin_name
        FROM banks b
        LEFT JOIN users u ON b.created_by_admin_id = u.user_id
        WHERE b.bank_id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء البنك بنجاح',
        bank: newBank[0]
      });
    } catch (error) {
      console.error('خطأ في إنشاء البنك:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء البنك'
      });
    }
  }

  // Update a bank
  static async updateBank(req, res) {
    try {
      const { bankId } = req.params;
      const { bank_name, balance, description } = req.body;

      // Validate input
      if (!bank_name || balance === undefined || balance === null) {
        return res.status(400).json({
          success: false,
          message: 'اسم البنك والرصيد مطلوبان'
        });
      }

      // Check if bank exists
      const [existingBank] = await pool.execute(`
        SELECT bank_id FROM banks WHERE bank_id = ? AND is_active = 1
      `, [bankId]);

      if (existingBank.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'البنك غير موجود'
        });
      }

      // Check if bank name already exists (excluding current bank)
      const [duplicateName] = await pool.execute(`
        SELECT bank_id FROM banks WHERE bank_name = ? AND bank_id != ? AND is_active = 1
      `, [bank_name, bankId]);

      if (duplicateName.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'اسم البنك موجود بالفعل'
        });
      }

      // Update the bank
      await pool.execute(`
        UPDATE banks 
        SET bank_name = ?, balance = ?, description = ?
        WHERE bank_id = ?
      `, [bank_name, parseFloat(balance), description || null, bankId]);

      // Get the updated bank with admin info
      const [updatedBank] = await pool.execute(`
        SELECT 
          b.bank_id,
          b.bank_name,
          b.balance,
          b.description,
          b.is_active,
          b.created_at,
          b.updated_at,
          u.Aname as created_by_admin_name
        FROM banks b
        LEFT JOIN users u ON b.created_by_admin_id = u.user_id
        WHERE b.bank_id = ?
      `, [bankId]);

      res.json({
        success: true,
        message: 'تم تحديث البنك بنجاح',
        bank: updatedBank[0]
      });
    } catch (error) {
      console.error('خطأ في تحديث البنك:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث البنك'
      });
    }
  }

  // Delete a bank (soft delete)
  static async deleteBank(req, res) {
    try {
      const { bankId } = req.params;

      // Check if bank exists
      const [existingBank] = await pool.execute(`
        SELECT bank_id, bank_name FROM banks WHERE bank_id = ? AND is_active = 1
      `, [bankId]);

      if (existingBank.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'البنك غير موجود'
        });
      }

      // Soft delete the bank
      await pool.execute(`
        UPDATE banks SET is_active = 0 WHERE bank_id = ?
      `, [bankId]);

      res.json({
        success: true,
        message: `تم حذف البنك "${existingBank[0].bank_name}" بنجاح`
      });
    } catch (error) {
      console.error('خطأ في حذف البنك:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف البنك'
      });
    }
  }

  // Get total banks balance
  static async getTotalBanksBalance(req, res) {
    try {
      const [result] = await pool.execute(`
        SELECT 
          COUNT(*) as total_banks,
          COALESCE(SUM(balance), 0) as total_balance
        FROM banks 
        WHERE is_active = 1
      `);

      res.json({
        success: true,
        summary: {
          total_banks: result[0].total_banks,
          total_balance: parseFloat(result[0].total_balance)
        }
      });
    } catch (error) {
      console.error('خطأ في حساب إجمالي رصيد البنوك:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حساب إجمالي رصيد البنوك'
      });
    }
  }

  // Get single bank details
  static async getBankDetails(req, res) {
    try {
      const { bankId } = req.params;

      const [bank] = await pool.execute(`
        SELECT 
          b.bank_id,
          b.bank_name,
          b.balance,
          b.description,
          b.is_active,
          b.created_at,
          b.updated_at,
          u.Aname as created_by_admin_name
        FROM banks b
        LEFT JOIN users u ON b.created_by_admin_id = u.user_id
        WHERE b.bank_id = ? AND b.is_active = 1
      `, [bankId]);

      if (bank.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'البنك غير موجود'
        });
      }

      res.json({
        success: true,
        bank: bank[0]
      });
    } catch (error) {
      console.error('خطأ في جلب تفاصيل البنك:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب تفاصيل البنك'
      });
    }
  }
}

module.exports = BankController;