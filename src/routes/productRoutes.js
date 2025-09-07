const express = require('express');
const router = express.Router();

const productController = require('../app/controllers/ProductController');





router.get('/outerwears', productController.getOuterwearsProducts);
router.get('/bottom', productController.getBottomProducts);
router.get('/top', productController.getTopProducts);
router.get('/', productController.listProducts);

module.exports = router;