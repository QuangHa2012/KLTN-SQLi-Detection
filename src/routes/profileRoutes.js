const express = require('express');
const router = express.Router();
const profileController = require('../app/controllers/ProfileController');

// Middleware kiểm tra đăng nhập
function ensureAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/accounts/login');
}

router.get('/', ensureAuthenticated, profileController.index);
router.get('/edit', ensureAuthenticated, profileController.editPage);
router.post('/edit', ensureAuthenticated, profileController.update);

router.get('/change-password', ensureAuthenticated, profileController.changePasswordPage);
router.post('/change-password', ensureAuthenticated, profileController.changePassword);

module.exports = router;
