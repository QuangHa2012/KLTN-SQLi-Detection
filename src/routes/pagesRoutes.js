const express = require('express');
const router = express.Router();
const pagesController = require('../app/controllers/pagesController');


router.get('/gioi-thieu', pagesController.aboutUs);
router.get('/chinh-sach-su-dung', pagesController.usePolicy);
router.get('/phuong-thuc-thanh-toan', pagesController.paymentMethods);
router.get('/chinh-sach-giao-nhan', pagesController.deliveryPolicy);
router.get('/chinh-sach-bao-mat', pagesController.privacyPolicy);
router.get('/chinh-sach-giam-gia', pagesController.privacyDiscount);
router.get('/huong-dan-mua-hang', pagesController.buyGuide);

module.exports = router;
