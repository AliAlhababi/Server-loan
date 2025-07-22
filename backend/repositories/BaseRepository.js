const { pool } = require('../config/database');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = pool;
  }

  async findById(id, idColumn = 'id') {
    try {
      const [rows] = await this.pool.execute(
        `SELECT * FROM ${this.tableName} WHERE ${idColumn} = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw new Error(`خطأ في جلب البيانات من ${this.tableName}: ${error.message}`);
    }
  }

  async findAll(conditions = {}, orderBy = null, limit = null) {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
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

      const [rows] = await this.pool.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error(`خطأ في جلب البيانات من ${this.tableName}: ${error.message}`);
    }
  }

  async create(data) {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map(() => '?').join(', ');
      
      const query = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      const [result] = await this.pool.execute(query, values);
      
      return {
        id: result.insertId,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      throw new Error(`خطأ في إنشاء البيانات في ${this.tableName}: ${error.message}`);
    }
  }

  async update(id, data, idColumn = 'id') {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${idColumn} = ?`;
      
      const [result] = await this.pool.execute(query, [...values, id]);
      return {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows
      };
    } catch (error) {
      throw new Error(`خطأ في تحديث البيانات في ${this.tableName}: ${error.message}`);
    }
  }

  async delete(id, idColumn = 'id') {
    try {
      const [result] = await this.pool.execute(
        `DELETE FROM ${this.tableName} WHERE ${idColumn} = ?`,
        [id]
      );
      return {
        affectedRows: result.affectedRows
      };
    } catch (error) {
      throw new Error(`خطأ في حذف البيانات من ${this.tableName}: ${error.message}`);
    }
  }

  async count(conditions = {}) {
    try {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const params = [];

      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map(key => `${key} = ?`)
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }

      const [rows] = await this.pool.execute(query, params);
      return parseInt(rows[0].count);
    } catch (error) {
      throw new Error(`خطأ في عد البيانات في ${this.tableName}: ${error.message}`);
    }
  }

  async executeQuery(query, params = []) {
    try {
      const [rows] = await this.pool.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error(`خطأ في تنفيذ الاستعلام: ${error.message}`);
    }
  }

  async beginTransaction() {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    return connection;
  }

  async commitTransaction(connection) {
    await connection.commit();
    connection.release();
  }

  async rollbackTransaction(connection) {
    await connection.rollback();
    connection.release();
  }
}

module.exports = BaseRepository;