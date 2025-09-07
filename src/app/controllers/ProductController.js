const Product = require('../models/productModel');

class ProductController {
    // Hiển thị danh sách sản phẩm GET /products
    async listProducts(req, res) {
        try {
            let products = await Product.getAllProducts();
            res.render('products', { products });
        } catch (err) {
            res.status(500).send(err.message);
        }
    }
    
    // GET /products/top
    async getTopProducts(req, res) {
        try {
            let products = await Product.getProductsByCategory('top');

            res.render('products', {
                products,
                category: 'top'
            });
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi server");
        }
    }
    // GET /products/bottom
    async getBottomProducts(req, res) {
        try {
            let products = await Product.getProductsByCategory('bottom');

            res.render('products', {
                products,
                category: 'bottom'
            });
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi server");
        }
    }

    // GET /products/outerwears
        async getOuterwearsProducts(req, res) {
        try {
            let products = await Product.getProductsByCategory('outerwear');

            res.render('products', {
                products,
                category: 'outerwear'
            });
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi server");
        }
    }



    // [GET] /admin/products
    async index(req, res) {
        try {
            const products = await Product.getAllProducts();
            res.render('admin/products/index', { products });
        } catch (err) {
            res.status(500).send('Lỗi khi lấy danh sách sản phẩm');
        }
    }

    // [GET] /admin/products/create
    create(req, res) {
        res.render('admin/products/create');
    }

    // [POST] /admin/products/store
    async store(req, res) {
        try {
            const { name, price, img, stock, category } = req.body;
            await Product.createProduct({ name, price, img, stock, category });
            res.redirect('/admin/products');
        } catch (err) {
            res.status(500).send('Lỗi khi thêm sản phẩm');
        }
    }

    // [GET] /admin/products/:id/edit
    async edit(req, res) {
        try {
            const product = await Product.getProductById(req.params.id);
            res.render('admin/products/edit', { product });
        } catch (err) {
            res.status(500).send('Lỗi khi lấy sản phẩm');
        }
    }

    // [POST] /admin/products/:id/update
    async update(req, res) {
        try {
            const { name, price, img, stock, category } = req.body;
            await Product.updateProduct(req.params.id, { name, price, img, stock, category });
            res.redirect('/admin/products');
        } catch (err) {
            res.status(500).send('Lỗi khi cập nhật sản phẩm');
        }
    }

    // [POST] /admin/products/:id/delete
    async delete(req, res) {
        try {
            await Product.deleteProduct(req.params.id);
            res.redirect('/admin/products');
        } catch (err) {
            res.status(500).send('Lỗi khi xóa sản phẩm');
        }
    }

    // [GET] /admin/products/trash
    async trash(req, res) {
        try {
            const products = await Product.getDeletedProducts();
            res.render('admin/products/trash', { products });
        } catch (err) {
            res.status(500).send('Lỗi khi lấy danh sách sản phẩm đã xóa');
        }
    }

    // [POST] /admin/products/:id/restore
    async restore(req, res) {
        try {
            await Product.restoreProduct(req.params.id);
            res.redirect('/admin/products/trash');
        } catch (err) {
            res.status(500).send('Lỗi khi khôi phục sản phẩm');
        }
    }

    // [POST] /admin/products/:id/delete-permanent
    async deletePermanent(req, res) {
        try {
            await Product.deletePermanent(req.params.id);
            res.redirect('/admin/products/trash');
        } catch (err) {
            res.status(500).send('Lỗi khi xóa vĩnh viễn sản phẩm');
        }
    }
}

// export 1 instance để routes có thể dùng trực tiếp
module.exports = new ProductController();


