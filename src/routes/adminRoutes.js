const express = require('express');
const router = express.Router();
const productController = require('../app/controllers/ProductController');

// Middleware check admin
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.redirect('/login');
    }
}

router.get('/products', isAdmin, productController.index);
router.get('/products/create', isAdmin, productController.create);
router.post('/products/store', isAdmin, productController.store);
router.get('/products/trash',isAdmin, productController.trash);
router.get('/products/:id/edit', isAdmin, productController.edit);
router.post('/products/:id/update', isAdmin, productController.update);
router.post('/products/:id/delete', isAdmin, productController.delete);
router.post('/products/:id/delete-permanent',isAdmin, productController.deletePermanent);
router.post('/products/:id/restore',isAdmin,productController.restore);

module.exports = router;