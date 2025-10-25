const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

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

            await userModel.updateProfile(req.session.user.id, {
                username,
                email,
                phone,
                address,
                gender,
                birthday,
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

}

module.exports = new ProfileController();
