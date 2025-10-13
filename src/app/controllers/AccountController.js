const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

class AccountController {
    // GET /accounts/login
    loginPage(req, res) {
        res.render('accounts/login');
    }

    // GET /accounts/register
    registerPage(req, res) {
        res.render('accounts/register');
    }

    // POST /accounts/login
    async login(req, res) {
        const { username, password } = req.body;
        try {
            const user = await userModel.findUserByUsername(username);
            if (!user) {
                return res.render('accounts/login', { error: 'Email không tồn tại!' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.render('accounts/login', { error: 'Sai mật khẩu!' });
            }

            req.session.user = { id: user.id, username: user.username, role: user.role };
            res.redirect('/');
        } catch (err) {
            console.error(err);
            res.render('accounts/login', { error: 'Đăng nhập thất bại, vui lòng thử lại!' });
        }
    }

    // POST /accounts/register
    async register(req, res) {
        const { username, password, confirmPassword } = req.body;

        try {
            // 1 Kiểm tra dữ liệu đầu vào
            if (!username || !password || !confirmPassword) {
                return res.render('accounts/register', { error: 'Vui lòng nhập đầy đủ thông tin!' });
            }

            // 2 Kiểm tra mật khẩu nhập lại
            if (password !== confirmPassword) {
                return res.render('accounts/register', { error: 'Mật khẩu nhập lại không khớp!' });
            }

            // 3 Kiểm tra username tồn tại
            const existingUser = await userModel.findUserByUsername(username);
            if (existingUser) {
                return res.render('accounts/register', { error: 'Tên người dùng đã tồn tại!' });
            }

            // 4 Mã hóa mật khẩu và thêm user
            const hashedPassword = await bcrypt.hash(password, 10);
            await userModel.createUser(username, hashedPassword);

            // 5Thành công → chuyển đến trang đăng nhập
            res.redirect('/accounts/login');
        } catch (err) {
            console.error('❌ Lỗi khi đăng ký:', err);
            res.render('accounts/register', { error: 'Đăng ký thất bại, vui lòng thử lại!' });
        }
    }


    // GET /accounts/logout
    logout(req, res) {
        req.session.destroy(() => {
            res.redirect('/accounts/login');
        });
    }
}

module.exports = new AccountController();
