
const { sql, connectDB } = require('../../config/db/db');

class UserModel {
    // Tạo user mới
    async createUser(username, hashedPassword) {
        const pool = await connectDB();
        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, hashedPassword)
            .query('INSERT INTO users (username, password) VALUES (@username, @password)');
    }

    // Tìm user theo username
    async findUserByUsername(username) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM users WHERE username = @username');
        return result.recordset[0];
    }

    // Lấy user theo id
    async findById(id) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM users WHERE id = @id');
        return result.recordset[0];
    }

    // Xóa user theo id
    async deleteById(id) {
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM users WHERE id = @id');
    }

    // Cập nhật mật khẩu
    async updatePassword(id, newHashedPassword) {
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('password', sql.NVarChar, newHashedPassword)
            .query('UPDATE users SET password = @password WHERE id = @id');
    }
}

// Xuất instance dùng chung
module.exports = new UserModel();
// Sử dụng như: const userModel = require('path_to_this_file');