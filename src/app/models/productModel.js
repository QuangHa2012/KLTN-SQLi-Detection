const { sql, connectDB } = require('../../config/db/db');


class ProductModel {
    // Lấy tất cả sản phẩm (chỉ lấy sp chưa bị xóa)
    async getAllProducts() {
        let pool = await connectDB();
        let result = await pool.request()
            .query("SELECT * FROM Products WHERE isDeleted = 0");
        return result.recordset;
    }
    // Lấy danh sách sản phẩm đã bị xóa (isDeleted = 1)
    async getDeletedProducts() {
        let pool = await connectDB();
        let result = await pool.request()
            .query("SELECT * FROM Products WHERE isDeleted = 1");
        return result.recordset;
    }

    // Lấy theo category
    async getProductsByCategory(category) {
        let pool = await connectDB();
        let result = await pool.request()
            .input('category', sql.NVarChar, category)
            .query("SELECT * FROM Products WHERE category = @category AND isDeleted = 0");
        return result.recordset;
    }

    // Lấy theo id
    async getProductById(id) {
        let pool = await connectDB();
        let result = await pool.request()
            .input('id', sql.Int, id)
            .query("SELECT * FROM Products WHERE id = @id AND isDeleted = 0");
        return result.recordset[0];
    }

    // Lấy sản phẩm theo id kèm ảnh
    async getProductWithImages(id) {
        let pool = await connectDB();

        // Lấy thông tin sản phẩm
        let productResult = await pool.request()
            .input('id', sql.Int, id)
            .query("SELECT * FROM Products WHERE id = @id AND isDeleted = 0");

        if (productResult.recordset.length === 0) return null;

        let product = productResult.recordset[0];

        // Lấy danh sách ảnh
        let imagesResult = await pool.request()
            .input('id', sql.Int, id)
            .query("SELECT img FROM ProductImages WHERE product_id = @id");

        product.images = imagesResult.recordset.map(row => row.img);

        return product;
    } 
    
    // Tạo mới sản phẩm
    async createProduct({ name, price, img, stock, category,des }) {
        let pool = await connectDB();
        let result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('price', sql.Decimal(18, 2), price)
            .input('img', sql.NVarChar, img || null)
            .input('stock', sql.Int, stock || 0)
            .input('category', sql.NVarChar, category || null)
            .input('des', sql.NVarChar(sql.MAX), des)
            .query(`
                INSERT INTO Products (name, price, img, stock, category, des,isDeleted)
                OUTPUT INSERTED.id
                VALUES (@name, @price, @img, @stock, @category, @des,0)
            `);

        return result.recordset[0].id; // trả về id sản phẩm
    }

    // Cập nhật sản phẩm
    async updateProduct(id, { name, price, img, stock, category, des }) {
        let pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('price', sql.Decimal(18, 2), price)
            .input('img', sql.NVarChar, img)
            .input('stock', sql.Int, stock)
            .input('category', sql.NVarChar, category)
            .input('des', sql.NVarChar(sql.MAX), des)
            .query(`
                UPDATE Products
                SET name = @name,
                    price = @price,
                    img = @img,
                    stock = @stock,
                    category = @category,
                    des = @des
                WHERE id = @id
            `);
    }

    // Thêm ảnh phụ
    async addImage(productId, imgUrl) {
        let pool = await connectDB();
        await pool.request()
            .input('product_id', sql.Int, productId)
            .input('img', sql.NVarChar, imgUrl)
            .query(`
                INSERT INTO ProductImages (product_id, img)
                VALUES (@product_id, @img)
            `);
    }

    // xóa ảnh sản phẩm
    async deleteImages(productId) {
        let pool = await connectDB();
        await pool.request()
            .input('product_id', sql.Int, productId)
            .query(`DELETE FROM ProductImages WHERE product_id = @product_id`);
    }

    // Xóa mềm sản phẩm
    async deleteProduct(id) {
        let pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE Products SET isDeleted = 1 WHERE id=@id");
    }

    // Khôi phục sản phẩm (set isDeleted = 0)
    async restoreProduct(id) {
        let pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE Products SET isDeleted = 0 WHERE id=@id");
    }

    // Xóa vĩnh viễn sản phẩm
    async deletePermanent(id) {
        let pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .query("DELETE FROM Products WHERE id=@id");
    }

    // Lấy sản phẩm với phân trang + sort + search
    async getProductsPaginated(page = 1, limit = 8, sort = "newest", q = "") {
        let pool = await connectDB();

        const offset = (page - 1) * limit;

        // Xác định sắp xếp
        let orderBy = "ORDER BY createdAt DESC"; // mặc định: mới nhất
        switch (sort) {
            case "oldest":
                orderBy = "ORDER BY createdAt ASC";
                break;
            case "price_asc":
                orderBy = "ORDER BY price ASC";
                break;
            case "price_desc":
                orderBy = "ORDER BY price DESC";
                break;
        }

        // Điều kiện search
        let whereClause = "WHERE isDeleted = 0";
        if (q && q.trim() !== "") {
            whereClause += ` AND name LIKE @q`; // tìm theo tên
        }

        // Lấy danh sách sản phẩm phân trang
        let request = pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit);

        if (q && q.trim() !== "") {
            request.input('q', sql.NVarChar, `%${q}%`);
        }

        let result = await request.query(`
            SELECT * FROM Products 
            ${whereClause}
            ${orderBy}
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `);

        // Lấy tổng số sản phẩm
        let countRequest = pool.request();
        if (q && q.trim() !== "") {
            countRequest.input('q', sql.NVarChar, `%${q}%`);
        }

        let countResult = await countRequest.query(`
            SELECT COUNT(*) AS total 
            FROM Products 
            ${whereClause}
        `);

        const totalProducts = countResult.recordset[0].total;

        return {
            products: result.recordset,
            total: totalProducts
        };
    }


    // Lấy sản phẩm theo category với phân trang
    async getProductsByCategoryPaginated(category, page = 1, limit = 8) {
        let pool = await connectDB();
        const offset = (page - 1) * limit;

        // Lấy sản phẩm theo category
        let result = await pool.request()
            .input('category', sql.NVarChar, category)
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT * FROM Products 
                WHERE category = @category AND isDeleted = 0
                ORDER BY id DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

        // Tổng số sản phẩm của category
        let countResult = await pool.request()
            .input('category', sql.NVarChar, category)
            .query("SELECT COUNT(*) AS total FROM Products WHERE category = @category AND isDeleted = 0");

        const totalProducts = countResult.recordset[0].total;

        return {
            products: result.recordset,
            total: totalProducts
        };
    }

    // Tìm kiếm có phân trang
    async searchProducts(keyword, page = 1, limit = 8) {
        let pool = await connectDB();

        const offset = (page - 1) * limit;

        // Đếm tổng sản phẩm
        const countResult = await pool.request()
            .input('keyword', sql.NVarChar, `%${keyword}%`)
            .query("SELECT COUNT(*) as total FROM Products WHERE isDeleted = 0 AND name LIKE @keyword");

        const totalItems = countResult.recordset[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        // Lấy sản phẩm theo phân trang
        const result = await pool.request()
            .input('keyword', sql.NVarChar, `%${keyword}%`)
            .input('limit', sql.Int, limit)
            .input('offset', sql.Int, offset)
            .query(`
                SELECT * FROM Products
                WHERE isDeleted = 0 AND name LIKE @keyword
                ORDER BY id DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `);

        return {
            products: result.recordset,
            totalItems,
            totalPages,
            currentPage: page
        };
    }

}

module.exports = new ProductModel();//bên controller gọi hàm này