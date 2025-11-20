const express = require('express');
const router = express.Router();
const profileController = require('../app/controllers/ProfileController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Middleware kiểm tra đăng nhập
function ensureAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/accounts/login');
}


const avatarDir = path.join(__dirname, '../public/uploads/avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// 🖼️ Cấu hình upload avatar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads/avatars');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.session.user.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (allowed.test(ext) && allowed.test(mime)) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif)'));
  },
});

router.get('/', ensureAuthenticated, profileController.index);
router.get('/edit', ensureAuthenticated, profileController.editPage);
router.post('/edit', ensureAuthenticated, profileController.update);
router.post('/upload-avatar',ensureAuthenticated,upload.single('avatar'),profileController.uploadAvatar);
router.post('/delete-avatar', ensureAuthenticated, profileController.deleteAvatar);

router.get('/change-password', ensureAuthenticated, profileController.changePasswordPage);
router.post('/change-password', ensureAuthenticated, profileController.changePassword);



module.exports = router;
