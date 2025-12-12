const { sql, connectDB } = require('../../config/db/db');
const crypto = require('crypto');

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
            .input('password', sql.VarChar, newHashedPassword) // Dùng VarChar thay vì NVarChar
            .query('UPDATE users SET password = @password WHERE id = @id');

        console.log(` Đã cập nhật mật khẩu cho user ID: ${id}`);
    }

     // Tạo user mới từ đăng nhập xã hội
    async createSocialUser(username, email, avatar, provider) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('avatar', sql.NVarChar, avatar)
            .input('authProvider', sql.NVarChar, provider)
            .query(`
                INSERT INTO users (username, email, avatar, authProvider)
                OUTPUT INSERTED.*
                VALUES (@username, @email, @avatar, @authProvider)
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

    // Tìm user theo email + provider (dùng cho login Google/Facebook)
    async findByEmailAndProvider(email, provider) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('authProvider', sql.NVarChar, provider)
            .query('SELECT * FROM users WHERE email = @email AND authProvider = @authProvider');
        return result.recordset[0];
    }

    // Cập nhật thông tin hồ sơ
    async updateProfile(id, { username, email, phone, address, gender, birthday, avatar }) {
        const pool = await connectDB();
        let query = `
            UPDATE users
            SET username = @username,
                email = @email,
                phone = @phone,
                address = @address,
                gender = @gender,
                birthday = @birthday
        `;

        if (avatar) {
            query += `, avatar = @avatar`;
        }

        query += ` WHERE id = @id`;

        const request = pool.request();
        request.input('id', sql.Int, id);
        request.input('username', sql.NVarChar, username);
        request.input('email', sql.NVarChar, email);
        request.input('phone', sql.NVarChar, phone);
        request.input('address', sql.NVarChar, address);
        request.input('gender', sql.NVarChar, gender);
        request.input('birthday', sql.Date, birthday || null);
        if (avatar) request.input('avatar', sql.NVarChar, avatar);

        await request.query(query);
    }

     //  Tạo token reset password (UTC-based)
    async createResetToken(email) {
        const pool = await connectDB();
        const token = crypto.randomBytes(32).toString('hex');

        // SQL tự tính thời gian hết hạn theo UTC: GETUTCDATE()
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('token', sql.NVarChar, token)
            .query(`
                UPDATE users
                SET resetToken = @token,
                    resetTokenExpiry = DATEADD(MINUTE, 15, GETUTCDATE())
                WHERE email = @email
                AND (authProvider IS NULL OR authProvider = 'local');

                SELECT @@ROWCOUNT AS affected;
            `);

        // Lấy số dòng bị ảnh hưởng
        const affected = result.recordset[0]?.affected || 0;
        if (affected === 0) {
            throw new Error('Không thể tạo token (tài khoản không phải local)');
        }

        console.log(' Token tạo:', token, ' / affected:', affected);

        return token;
    }

    // Kiểm tra token hợp lệ
    async findByResetToken(token) {
        if (!token) return null;
        const pool = await connectDB();
        const result = await pool.request()
            .input('token', sql.NVarChar, token)
            .query(`
                SELECT * FROM users
                WHERE resetToken = @token
                AND resetTokenExpiry IS NOT NULL
                AND resetTokenExpiry > GETUTCDATE()
            `);
        console.log(' findByResetToken result count:', result.recordset.length);
        return result.recordset[0] || null;
    }

    // Xóa token sau khi reset
    async clearResetToken(id) {
        if (!id) return;

        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE users
                SET resetToken = NULL,
                    resetTokenExpiry = NULL
                WHERE id = @id
            `);
    }

    async findByPhone(phone) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('phone', sql.NVarChar, phone)
            .query('SELECT * FROM users WHERE phone = @phone');
        return result.recordset[0] || null;
    }

    async findByEmail(email) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM users WHERE email = @email');
        return result.recordset[0] || null;
    }

}

module.exports = new UserModel();
