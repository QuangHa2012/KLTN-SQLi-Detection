const express = require('express');
const router = express.Router();
const cartController = require('../app/controllers/CartController');


router.post('/add/:id', cartController.addToCart);
router.post('/remove/:id', cartController.removeItem);
router.post('/update/:id', cartController.updateQuantity);
router.post('/clear', cartController.clearCart);
router.get('/', cartController.viewCart);

module.exports = router;