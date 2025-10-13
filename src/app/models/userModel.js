const { sql, connectDB } = require('../../config/db/db');

class UserModel {
    // Tạo user mới (có kiểm tra trùng)
    async createUser(username, hashedPassword) {
        if (!username || !hashedPassword) {
            throw new Error("Thiếu thông tin username hoặc password khi tạo user");
        }

        const pool = await connectDB();

        // Kiểm tra trùng username trước khi chèn
        const checkUser = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT id FROM users WHERE username = @username');

        if (checkUser.recordset.length > 0) {
            throw new Error("Username đã tồn tại, không thể thêm mới");
        }

        // Chèn user mới
        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, hashedPassword)
            .query(`
                INSERT INTO users (username, password)
                VALUES (@username, @password)
            `);

        console.log(`✅ Đã thêm user mới: ${username}`);
    }

    //  Tìm user theo username
    async findUserByUsername(username) {
        if (!username) return null;

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

        console.log(`🗑️ Đã xóa user có id: ${id}`);
    }

    // 🔐 Cập nhật mật khẩu
    async updatePassword(id, newHashedPassword) {
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('password', sql.NVarChar, newHashedPassword)
            .query('UPDATE users SET password = @password WHERE id = @id');

        console.log(`🔄 Đã cập nhật mật khẩu cho user ID: ${id}`);
    }
}

module.exports = new UserModel();
