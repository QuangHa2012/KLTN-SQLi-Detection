const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const passport = require('../../config/passport');

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
            const user = await userModel.findUserByUsernameOrEmail(username);
            if (!user) {
                return res.render('accounts/login', { error: 'Không tìm thấy tài khoản!' });
            }

            if (user.authProvider && user.authProvider !== 'local') {
                return res.render('accounts/login', {
                    error: `Tài khoản này được tạo bằng ${user.authProvider}. Vui lòng đăng nhập bằng ${user.authProvider}.`
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.render('accounts/login', { error: 'Sai mật khẩu!' });
            }

            req.session.user = { id: user.id, username: user.username, role: user.role };
            res.redirect('/');
        } catch (err) {
            console.error(err);
            res.render('accounts/login', { error: 'Đăng nhập thất bại!' });
        }
    }

    // POST /accounts/register
    async register(req, res) {
        const { username, email, password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            return res.render('accounts/register', { error: 'Mật khẩu không khớp!' });
        }

        try {
            const existingLocalUser = await userModel.findByEmailAndProvider(email, 'local');
            if (existingLocalUser) {
                return res.render('accounts/register', { error: 'Email này đã được đăng ký bằng tài khoản thường!' });
            }

            const hashed = await bcrypt.hash(password, 10);
            await userModel.createUser({
                username,
                email,
                password: hashed,
                role: 'user',
                authProvider: 'local'
            });

            res.redirect('/accounts/login');
        } catch (err) {
            console.error(err);
            res.render('accounts/register', { error: 'Đăng ký thất bại!' });
        }
    }



    // GET /accounts/logout
    logout(req, res) {
        req.session.destroy(() => {
            res.redirect('/accounts/login');
        });
    }

    // GET /accounts/google đăng nhập với Google
    googleLogin(req, res, next) {
        passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
    }

    //  GET /accounts/google/callback xử lý callback từ Google
    googleCallback(req, res, next) {
        passport.authenticate("google", { failureRedirect: "/accounts/login" }, (err, user) => {
            if (err || !user) {
                console.error("Lỗi Google Callback:", err);
                return res.redirect("/accounts/login");
            }

            //  Dòng quan trọng: để Passport lưu user vào session
            req.login(user, (err) => {
                if (err) {
                    console.error("Lỗi khi login user:", err);
                    return res.redirect("/accounts/login");
                }

                // Sau đó vẫn có thể lưu thêm dữ liệu tùy ý
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    authProvider: user.authProvider || 'google',
                };

                res.redirect("/");
            });
        })(req, res, next);
    }

    // GET /accounts/facebook
    facebookLogin(req, res, next) {
        passport.authenticate("facebook", { scope: ["email"] })(req, res, next);
    }

    // GET /accounts/facebook/callback
    facebookCallback(req, res, next) {
        passport.authenticate("facebook", { failureRedirect: "/accounts/login" }, (err, user) => {
            if (err || !user) {
            console.error("Lỗi Facebook Callback:", err);
            return res.redirect("/accounts/login");
            }

            req.login(user, (err) => {
            if (err) return res.redirect("/accounts/login");
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                authProvider: user.authProvider || 'facebook',
            };
            res.redirect("/");
            });
        })(req, res, next);
    }

    
}

module.exports = new AccountController();
