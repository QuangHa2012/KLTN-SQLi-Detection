const express = require('express');
const router = express.Router();

const productController = require('../app/controllers/ProductController');





router.get('/outerwears', productController.getOuterwearsProducts);
router.get('/bottom', productController.getBottomProducts);
router.get('/top', productController.getTopProducts);
router.get('/search', productController.search);
router.get('/:id', productController.detail);
router.get('/', productController.listProducts);

module.exports = router;