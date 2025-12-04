const { sql, connectDB } = require('../../config/db/db');

class ProductReviewModel {

    // Lấy danh sách đánh giá theo sản phẩm
    async getReviewsByProductId(productId) {
        let pool = await connectDB();
        let result = await pool.request()
            .input("productId", sql.Int, productId)
            .query(`
                SELECT r.id, r.rating, r.comment, r.createdAt,r.user_id, 
                       u.username AS username, u.avatar
                FROM ProductReviews r
                JOIN Users u ON r.user_id = u.id
                WHERE r.product_id = @productId
                ORDER BY r.createdAt DESC
            `);
        return result.recordset;
    }

    // Kiểm tra xem user đã đánh giá sản phẩm chưa
    async getUserReview(productId, userId) {
        let pool = await connectDB();
        let result = await pool.request()
            .input("productId", sql.Int, productId)
            .input("userId", sql.Int, userId)
            .query(`
                SELECT * FROM ProductReviews
                WHERE product_id = @productId AND user_id = @userId
            `);
        return result.recordset[0];
    }

    // Cập nhật đánh giá
    async updateReview(productId, userId, rating, comment) {
        const pool = await connectDB();
        const result = await pool.request()
            .input("productId", sql.Int, productId)
            .input("userId", sql.Int, userId)
            .input("rating", sql.Int, rating)
            .input("comment", sql.NVarChar, comment)
            .query(`
                UPDATE ProductReviews
                SET rating = @rating, comment = @comment, updatedAt = GETDATE()
                WHERE product_id = @productId AND user_id = @userId
            `);
        return result.rowsAffected[0] > 0;
    }

    //  Xóa đánh giá (người dùng hoặc admin)
    async deleteReview(reviewId, userId, role) {
        let pool = await connectDB();

        let query = `
            DELETE FROM ProductReviews
            WHERE id = @reviewId
        `;

        // Nếu KHÔNG phải admin → chỉ được xóa đánh giá của chính mình
        if (role !== 'admin') {
            query += ` AND user_id = @userId`;
        }

        let result = await pool.request()
            .input("reviewId", sql.Int, reviewId)
            .input("userId", sql.Int, userId)
            .query(query);

        return result.rowsAffected[0] > 0;
    }

    //  Tính điểm trung bình đánh giá cho sản phẩm
    async getAverageRating(productId) {
        let pool = await connectDB();
        let result = await pool.request()
            .input("productId", sql.Int, productId)
            .query(`
                SELECT 
                    ISNULL(AVG(CAST(rating AS FLOAT)), 0) AS avgRating,
                    COUNT(*) AS totalReviews
                FROM ProductReviews
                WHERE product_id = @productId
            `);
        return result.recordset[0];
    }

    //  Kiểm tra xem user đã đánh giá sản phẩm này chưa
    async hasUserReviewed(productId, userId) {
        let pool = await connectDB();
        let result = await pool.request()
            .input("productId", sql.Int, productId)
            .input("userId", sql.Int, userId)
            .query(`
                SELECT COUNT(*) AS count
                FROM ProductReviews
                WHERE product_id = @productId AND user_id = @userId
            `);
        return result.recordset[0].count > 0;
    }

    // Thêm đánh giá (theo đúng thứ tự trong controller)
    async addReview(productId, userId, rating, comment) {
        let pool = await connectDB();
        let result = await pool.request()
            .input("productId", sql.Int, productId)
            .input("userId", sql.Int, userId)
            .input("rating", sql.Int, rating)
            .input("comment", sql.NVarChar, comment)
            .query(`
                INSERT INTO ProductReviews (product_id, user_id, rating, comment, createdAt)
                VALUES (@productId, @userId, @rating, @comment, GETDATE())
            `);
        return result.rowsAffected[0] > 0;
    }

    
    
    

}

module.exports = new ProductReviewModel();
