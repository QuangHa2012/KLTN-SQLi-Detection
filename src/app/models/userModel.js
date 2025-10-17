const { sql, connectDB } = require('../../config/db/db');

class UserModel {
    // Tạo user mới (có kiểm tra trùng)
    // Tạo user đầy đủ (cho local, có email + authProvider)
    async createUser({ username, email, password, role, authProvider }) {
        const pool = await connectDB();

        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email || null)
            .input('password', sql.NVarChar, password)
            .input('role', sql.NVarChar, role)
            .input('authProvider', sql.NVarChar, authProvider)
            .query(`
                INSERT INTO users (username, email, password, role, authProvider)
                VALUES (@username, @email, @password, @role, @authProvider)
            `);

        console.log(`✅ Đã thêm user mới (local): ${username}`);
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

    
    // Tìm user theo username hoặc email (dùng cho đăng nhập)
    async findUserByUsernameOrEmail(identifier) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('identifier', sql.NVarChar, identifier)
            .query(`
                SELECT * FROM users
                WHERE username = @identifier OR email = @identifier
            `);
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

    //  Cập nhật mật khẩu
    async updatePassword(id, newHashedPassword) {
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('password', sql.NVarChar, newHashedPassword)
            .query('UPDATE users SET password = @password WHERE id = @id');

        console.log(`🔄 Đã cập nhật mật khẩu cho user ID: ${id}`);
    }

    //  Tạo user đăng nhập qua mạng xã hội
    async createSocialUser(username, avatar, provider) {
        const pool = await connectDB();

        const fakePassword = "oauth_random_fake_password"; // mật khẩu giả (sẽ được hash ở ngoài)
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, fakePassword)
            .input('role', sql.NVarChar, 'user')
            .input('authProvider', sql.NVarChar, provider)
            .input('avatar', sql.NVarChar, avatar)
            .query(`
                INSERT INTO users (username, password, role, authProvider, avatar)
                OUTPUT INSERTED.*
                VALUES (@username, @password, @role, @authProvider, @avatar)
            `);

        return result.recordset[0];
    }

    //  Tìm user theo username + provider
    async findByUsernameAndProvider(username, provider) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('authProvider', sql.NVarChar, provider)
            .query('SELECT * FROM users WHERE username = @username AND authProvider = @authProvider');
        return result.recordset[0];
    }

    // Tìm user theo username hoặc email (dùng cho đăng nhập)
    async findUserByUsernameOrEmail(identifier) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('identifier', sql.NVarChar, identifier)
            .query(`
                SELECT * FROM users
                WHERE username = @identifier OR email = @identifier
            `);
        return result.recordset[0];
    }

}

module.exports = new UserModel();
