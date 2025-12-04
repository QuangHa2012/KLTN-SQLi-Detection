const express = require('express');
const router = express.Router();
const ChatController = require('../app/controllers/ChatController');

// Middleware check admin
function isAdmin (req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    next()
  } else {
    res.redirect('/login')
  }

}
function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}
router.get('/user', isLoggedIn, ChatController.userChat)
router.get('/admin', isAdmin, ChatController.adminList)
router.get('/admin/chat/:userId', isAdmin, ChatController.adminChat)

module.exports = router;

