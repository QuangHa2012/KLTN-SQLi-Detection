const Product = require('../models/productModel');

class ProductController {
    // Hiển thị danh sách sản phẩm GET /products
    async listProducts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 8;
            const sort = req.query.sort || "newest";
            const q = typeof req.query.q === "string" ? req.query.q : "";
            const gender = typeof req.query.gender === "string" ? req.query.gender : "";

            const { products, total } = await Product.getProductsPaginated(page, limit, sort, q, gender);

            const totalPages = Math.ceil(total / limit);

            res.render("products", {
                products,
                currentPage: page,
                totalPages,
                sort,
                q,
                gender
            });
        } catch (error) {
            console.error("❌ Lỗi khi lấy sản phẩm:", error);
            res.status(500).send("Lỗi server");
        }
    }
    
    // GET /products/top
    async getTopProducts(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;

        const { products, total } = await Product.getProductsByCategoryPaginated("top", page, limit);
        const totalPages = Math.ceil(total / limit);

        res.render("products", {
            products,
            currentPage: page,
            totalPages,
            category: "top"
        });
    }
    // GET /products/bottom
    async getBottomProducts(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;

        const { products, total } = await Product.getProductsByCategoryPaginated("bottom", page, limit);
        const totalPages = Math.ceil(total / limit);

        res.render("products", {
            products,
            currentPage: page,
            totalPages,
            category: "bottom"
        });
    }

    // GET /products/outerwears
    async getOuterwearsProducts(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;

        const { products, total } = await Product.getProductsByCategoryPaginated("outerwear", page, limit);
        const totalPages = Math.ceil(total / limit);

        res.render("products",  {
            products,
            currentPage: page,
            totalPages,
            category: "outerwear"
        });
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
            const { name, price, img, stock, category, extraImages, des, gender } = req.body;

            // B1: thêm sản phẩm
            const productId = await Product.createProduct({ name, price, img, stock, category, des, gender });

            // B2: thêm ảnh chính vào ProductImages
            if (img && img.trim() !== "") {
                await Product.addImage(productId, img.trim());
            }

            // B3: nếu có ảnh phụ -> thêm vào ProductImages
            if (extraImages && extraImages.trim() !== "") {
                const images = extraImages.split(",").map(i => i.trim());
                for (let image of images) {
                    if (image) {
                        await Product.addImage(productId, image);
                    }
                }
            }

            res.redirect('/admin/products');
        } catch (err) {
            console.error(err);
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
            const { name, price, img, stock, category, extraImages, des, gender } = req.body;
            const productId = req.params.id;

            //update bảng Products
            await Product.updateProduct(productId, { name, price, img, stock, category, des, gender });

            //xóa hết ảnh cũ
            await Product.deleteImages(productId);

            //thêm lại ảnh chính
            if (img && img.trim() !== "") {
                await Product.addImage(productId, img.trim());
            }

            //thêm lại ảnh phụ
            if (extraImages && extraImages.trim() !== "") {
                const images = extraImages.split(",").map(i => i.trim());
                for (let image of images) {
                    if (image) {
                        await Product.addImage(productId, image);
                    }
                }
            }

            res.redirect('/admin/products');
        } catch (err) {
            console.error(err);
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

    // [GET] /products/:id
    async detail(req, res) {
        try {
            const id = parseInt(req.params.id);
            const product = await Product.getProductWithImages(id);

            if (!product) {
                return res.status(404).render('404', { message: 'Sản phẩm không tồn tại' });
            }

            res.render('productDetail', { product });
        } catch (error) {
            console.error(error);
            res.status(500).send("Lỗi server");
        }
    }

    // GET /products/search?q=...&page=...
    async search(req, res) {
        try {
            const keyword = req.query.q || "";
            const page = parseInt(req.query.page) || 1;
            const limit = 8; // số sản phẩm mỗi trang

            const { products, totalPages, currentPage } = await Product.searchProducts(keyword, page, limit);

            res.render('products', {
                products,
                q: keyword,
                totalPages,
                currentPage
            });
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi server");
        }
    }
}

// export 1 instance để routes có thể dùng trực tiếp
module.exports = new ProductController();


