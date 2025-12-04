const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const { sql, connectDB } = require("../../config/db/db");
const path = require("path");

class ProfileController {
    // GET /profile
    async index(req, res) {
        try {
            const user = await userModel.findById(req.session.user.id);
            res.render('profile/index', { user });
        } catch (error) {
            console.error(error);
            res.status(500).send('Lỗi khi tải hồ sơ người dùng');
        }
    }

    // GET /profile/edit
    async editPage(req, res) {
        const user = await userModel.findById(req.session.user.id);
        res.render('profile/edit', { user });
    }

    // POST /profile/edit
    async update(req, res) {
        try {
            const { username, email, phone, address, gender, day, month, year } = req.body;
            const user = await userModel.findById(req.session.user.id);

            // --- Birthday ---
            let birthday = null;
            if (day && month && year) {
                birthday = `${year}-${month}-${day}`;
            }

            // --- Avatar ---
            let avatarPath = null;
            if (req.file) {
                avatarPath = `/uploads/avatars/${req.file.filename}`;
                // Xóa ảnh cũ nếu có
                if (user.avatar && fs.existsSync(path.join('public', user.avatar))) {
                    fs.unlinkSync(path.join('public', user.avatar));
                }
            }

            // --- Kiểm tra số điện thoại trùng (local)---
            if (phone) {
                const existingPhone = await userModel.findByPhone(phone);
                if (existingPhone && existingPhone.id !== user.id && existingPhone.authProvider === 'local') {
                    return res.render('profile/edit', {
                        user,
                        error: 'Số điện thoại này đã được sử dụng cho tài khoản local khác!'
                    });
                }
            }
            // --- Kiểm tra email trùng (local) ---
            if (user.authProvider === 'local' && email) {
                const existingEmail = await userModel.findByEmail(email);
                if (existingEmail && existingEmail.id !== user.id && existingEmail.authProvider === 'local') {
                    return res.render('profile/edit', {
                        user,
                        error: 'Email này đã được sử dụng cho tài khoản local khác!'
                    });
                }
            }

            // --- Dữ liệu để update ---
            let updateData = {
                username,
                phone,
                address,
                gender,
                birthday,
                ...(avatarPath && { avatar: avatarPath })
            };

            // Chỉ update email nếu là tài khoản local
            if (user.authProvider === 'local') {
                updateData.email = email;
            }

            // --- Update profile ---
            await userModel.updateProfile(user.id, updateData);

            // --- Cập nhật session ---
            Object.assign(req.session.user, updateData);

            // Redirect về trang profile
            res.redirect("/profile");

        } catch (error) {
            console.error(error);
            // Lỗi server -> render lại form với thông báo
            const user = await userModel.findById(req.session.user.id);
            res.render('profile/edit', { 
                user, 
                error: 'Có lỗi xảy ra khi cập nhật hồ sơ, vui lòng thử lại.' 
            });
        }
    }


    // GET /profile/change-password
    changePasswordPage(req, res) {
        res.render('profile/change-password');
    }

    
    // POST /profile/change-password
    async changePassword(req, res) {
        try {
            const { oldPassword, newPassword, confirmPassword } = req.body;
            const user = await userModel.findById(req.session.user.id);

            
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.render("profile/change-password", {
                    error: "Mật khẩu cũ không đúng!",
                });
            }

            if (newPassword !== confirmPassword) {
                return res.render("profile/change-password", {
                    error: "Xác nhận mật khẩu không khớp!",
                });
            }

            
            const hashed = await bcrypt.hash(newPassword, 10);
            await userModel.updatePassword(user.id, hashed);

            res.render("profile/change-password", { success: "Đổi mật khẩu thành công!" });
        } catch (error) {
            return res.render("profile/change-password", { 
                error: "Lỗi đổi mật khẩu",
            });
        }
    }

    // POST /profile/upload-avatar
    async uploadAvatar(req, res) {
        try {
            if (!req.file) return res.status(400).send('Không có file nào được tải lên.');

            const id = req.session.user.id;
            const avatarPath = `/uploads/avatars/${req.file.filename}`;

            // Nếu user có ảnh cũ, xóa file cũ đi (tránh rác)
            if (req.session.user.avatar && !req.session.user.avatar.includes('default-avatar.png')) {
                const oldPath = path.join('public', req.session.user.avatar);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }

            const pool = await connectDB();
            await pool.request()
                .input('id', sql.Int, id)
                .input('avatar', sql.NVarChar, avatarPath)
                .query(`UPDATE users SET avatar = @avatar WHERE id = @id`);

            req.session.user.avatar = avatarPath;
            res.redirect('/profile');
        } catch (err) {
            console.error('❌ Lỗi upload avatar:', err);
            res.status(500).send('Lỗi khi tải ảnh đại diện');
        }
          
    }

    // POST /profile/delete-avatar
    async deleteAvatar(req, res) {
        try {
        const id = req.session.user.id;
        const defaultAvatar = '/img/avatar-df.png';

        // Nếu có file cũ thì xóa
        if (req.session.user.avatar && !req.session.user.avatar.includes('avatar-df.png')) {
            const oldPath = path.join('public', req.session.user.avatar);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        // Cập nhật database
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('avatar', sql.NVarChar, defaultAvatar)
            .query(`UPDATE users SET avatar = @avatar WHERE id = @id`);

        // Cập nhật session
        req.session.user.avatar = defaultAvatar;

        res.redirect('/profile');
        } catch (err) {
        console.error('❌ Lỗi xóa avatar:', err);
        res.status(500).send('Lỗi khi xóa ảnh đại diện');
        }

    }
}

module.exports = new ProfileController();
