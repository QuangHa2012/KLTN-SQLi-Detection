const express = require('express');
const router = express.Router();
const productController = require('../app/controllers/ProductController');
const AdminController = require('../app/controllers/AdminController');
const reportController = require('../app/controllers/ReportController');
const discountController = require('../app/controllers/discountController');

// Middleware check admin
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.redirect('/login');
    }
}

// Product management routes
router.get('/products', isAdmin, productController.index);
router.get('/products/create', isAdmin, productController.create);
router.post('/products/store', isAdmin, productController.store);
router.get('/products/trash',isAdmin, productController.trash);
router.get('/products/:id/edit', isAdmin, productController.edit);
router.post('/products/:id/update', isAdmin, productController.update);
router.post('/products/:id/delete', isAdmin, productController.delete);
router.post('/products/:id/delete-permanent',isAdmin, productController.deletePermanent);
router.post('/products/:id/restore',isAdmin,productController.restore);

// User management routes
router.get('/users', isAdmin, AdminController.listUsers);
router.post('/users/:id/delete', isAdmin, AdminController.deleteUser);
router.post('/users/:id/role', isAdmin, AdminController.updateRole);
router.get('/users/:id', isAdmin, AdminController.userDetail);


// Report routes
router.get('/reports', reportController.showReportPage);

// API JSON chart
router.get('/api/revenue/day', reportController.revenueByDay);
router.get('/api/products/best-selling', reportController.bestSellingProducts);
router.get('/api/orders/status', reportController.orderStatusStats);
router.get('/api/summary', reportController.summaryStats);



// Discount management routes
router.get('/discounts', discountController.list);
router.get('/discounts/add', discountController.addPage);
router.post('/discounts/add', discountController.add);
router.get('/discounts/edit/:id', discountController.editPage);
router.post('/discounts/edit/:id', discountController.update);
router.get('/discounts/delete/:id', discountController.delete);



module.exports = router;