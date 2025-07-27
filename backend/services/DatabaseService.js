const { pool } = require('../config/database');
const { AppError } = require('../utils/ErrorHandler');

class DatabaseService {
  static async executeQuery(query, params = []) {
    try {
      const [results] = await pool.execute(query, params);
      return results;
    } catch (error) {
      console.error('Database query error:', { query, params, error: error.message });
      throw new AppError(`خطأ في قاعدة البيانات: ${error.message}`, 500);
    }
  }

  static async getConnection() {
    try {
      return await pool.getConnection();
    } catch (error) {
      console.error('Database connection error:', error.message);
      throw new AppError('خطأ في الاتصال بقاعدة البيانات', 500);
    }
  }

  static async transaction(callback) {
    const connection = await this.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Helper methods for common operations
  static async findById(table, id, idColumn = 'id') {
    const query = `SELECT * FROM ${table} WHERE ${idColumn} = ? LIMIT 1`;
    const results = await this.executeQuery(query, [id]);
    return results.length > 0 ? results[0] : null;
  }

  static async findMany(table, conditions = {}, limit = null, orderBy = null) {
    let query = `SELECT * FROM ${table}`;
    const params = [];

    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }

    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    return await this.executeQuery(query, params);
  }

  static async create(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const result = await this.executeQuery(query, values);
    
    return {
      insertId: result.insertId,
      affectedRows: result.affectedRows
    };
  }

  static async update(table, data, conditions, idColumn = 'id') {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const whereClause = Object.keys(conditions)
      .map(key => `${key} = ?`)
      .join(' AND ');

    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const params = [...Object.values(data), ...Object.values(conditions)];

    const result = await this.executeQuery(query, params);
    return result.affectedRows;
  }

  static async delete(table, conditions) {
    const whereClause = Object.keys(conditions)
      .map(key => `${key} = ?`)
      .join(' AND ');

    const query = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await this.executeQuery(query, Object.values(conditions));
    
    return result.affectedRows;
  }

  static async count(table, conditions = {}) {
    let query = `SELECT COUNT(*) as count FROM ${table}`;
    const params = [];

    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }

    const result = await this.executeQuery(query, params);
    return result[0].count;
  }

  static async exists(table, conditions) {
    const count = await this.count(table, conditions);
    return count > 0;
  }

  // Pagination helper
  static async paginate(table, page = 1, limit = 10, conditions = {}, orderBy = null) {
    const offset = (page - 1) * limit;
    
    let query = `SELECT * FROM ${table}`;
    const params = [];

    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }

    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [data, totalCount] = await Promise.all([
      this.executeQuery(query, params),
      this.count(table, conditions)
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }
}

module.exports = DatabaseService;