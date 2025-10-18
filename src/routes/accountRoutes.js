const express = require('express');
const router = express.Router();
const accountController = require('../app/controllers/AccountController');


router.get('/login', accountController.loginPage);
router.post('/login', accountController.login);

router.get('/register', accountController.registerPage);
router.post('/register', accountController.register);

router.get('/logout', accountController.logout);


router.get('/google', accountController.googleLogin);
router.get('/google/callback', accountController.googleCallback);

router.get('/facebook', accountController.facebookLogin);
router.get('/facebook/callback', accountController.facebookCallback);

module.exports = router;
