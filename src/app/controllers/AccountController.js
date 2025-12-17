const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
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

            req.session.user = {
                id: user.id,
                username: user.username,
                role: user.role,
                avatar: user.avatar || '/img/avatar-df.png',
                email: user.email,
                phone: user.phone
            };
            res.redirect('/');
        } catch (err) {
            console.error(err);
            res.render('accounts/login', { error: 'Đăng nhập thất bại!' });
        }
    }

    // POST /accounts/register
    async register(req, res) {
        const { username, email, password, confirmPassword } = req.body;

        if (!email) {
            return res.render('accounts/register', { error: 'Vui lòng nhập email!' });
}

        if (password !== confirmPassword) {
            return res.render('accounts/register', { error: 'Mật khẩu không khớp!' });
        }

        try {
            const existingLocalUser = await userModel.findByEmailAndProvider(email, 'local');
            if (existingLocalUser) {
                return res.render('accounts/register', { error: 'Email này đã được đăng ký bằng tài khoản khác!' });
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

    // GET /accounts/forgot
    forgotPage(req, res) {
        res.render('accounts/forgot');
    }

    // POST /accounts/forgot
    async handleForgot(req, res) {
        const { email } = req.body;
        try {
            const user = await userModel.findUserByUsernameOrEmail(email, 'local');
            if (!user) {
                return res.render('accounts/forgot', { error: 'Email không tồn tại trong hệ thống!' });
            }

            if (user.authProvider && user.authProvider !== 'local') {
                return res.render('accounts/forgot', { 
                    error: 'Tài khoản này đăng nhập bằng Google, không thể đặt lại mật khẩu local!'
                });
            }

            const token = await userModel.createResetToken(email);
            console.log(" Token được tạo:", token);
            const resetLink = `https://tardiest-vestibular-cathrine.ngrok-free.dev/accounts/reset?token=${token}`;

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'hn657237@gmail.com',       // Thay bằng Gmail 
                    pass: 'lvytfthlrazaosqb'          // App password, không phải mật khẩu thật
                }
            });

            await transporter.sendMail({
                to: email,
                subject: 'Đặt lại mật khẩu',
                html: `
                    <h3>Yêu cầu đặt lại mật khẩu</h3>
                    <p>Nhấn vào link bên dưới để đặt lại mật khẩu (hết hạn sau 15 phút):</p>
                    <a href="${resetLink}">${resetLink}</a>
                `
            });

            res.render('accounts/forgot', { success: 'Đã gửi link đặt lại mật khẩu qua email!' });
        } catch (err) {
            console.error(err);
            res.render('accounts/forgot', { error: 'Có lỗi khi gửi email!' });
        }
    }

    // GET /accounts/reset?token=...
    async resetPage(req, res) {
        const token = req.query.token;
        if (!token) return res.render('accounts/reset', { error: 'Thiếu token!' });
        res.render('accounts/reset', { token });
    }

    // POST /accounts/reset
    async handleReset(req, res) {
        const { token, password, confirmPassword } = req.body;
        if (password !== confirmPassword)
            return res.render('accounts/reset', { error: 'Mật khẩu không khớp!', token });

        try {
            const user = await userModel.findByResetToken(token);
            if (!user) return res.render('accounts/reset', { error: 'Token không hợp lệ hoặc đã hết hạn!' });

            if (user.authProvider && user.authProvider !== 'local') {
                return res.render('accounts/reset', {
                    error: `Tài khoản này được tạo bằng ${user.authProvider}. Vui lòng đăng nhập bằng ${user.authProvider}.`
                });
            }
            
            const hashed = await bcrypt.hash(password, 10);
            await userModel.updatePassword(user.id, hashed);
            await userModel.clearResetToken(user.id);

            res.render('accounts/reset', { success: 'Đặt lại mật khẩu thành công!' });
            res.redirect('/accounts/login');
        } catch (err) {
            console.error(err);
            res.render('accounts/reset', { error: 'Có lỗi khi đặt lại mật khẩu!' });
        }
    }

    
}

module.exports = new AccountController();
