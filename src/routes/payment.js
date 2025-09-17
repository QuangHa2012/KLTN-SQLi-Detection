const express = require('express');
const router = express.Router();
const paymentController = require('../app/controllers/PaymentController');

router.post('/momo', paymentController.checkout);
router.post('/momo-notify', paymentController.momoNotify);
router.get('/success', paymentController.success);

module.exports = router;