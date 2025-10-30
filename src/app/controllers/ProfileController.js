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

            let birthday = null;
                if (day && month && year) {
                    birthday = `${year}-${month}-${day}`;
                }


            if (req.file) {
                avatarPath = `/uploads/avatars/${req.file.filename}`;
                // nếu người dùng có avatar cũ thì xóa ảnh cũ (tùy chọn)
                const user = await userModel.findById(req.session.user.id);
                if (user.avatar && fs.existsSync(path.join('public', user.avatar))) {
                    fs.unlinkSync(path.join('public', user.avatar));
                }
            }

            await userModel.updateProfile(req.session.user.id, {
                username,
                email,
                phone,
                address,
                gender,
                birthday,
                ...(avatarPath && { avatar: avatarPath })
            });
            res.redirect("/profile");
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi khi cập nhật hồ sơ");
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
            console.error(error);
            res.status(500).send("Lỗi khi đổi mật khẩu");
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
