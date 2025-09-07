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

}

module.exports = new ProductModel();//bên controller gọi hàm này