const { sql, connectDB } = require('../../config/db/db');

class OrderModel {

    // Lấy đơn hàng theo user + phân trang
    async getOrdersByUserPaginated(userId, page, limit) {
        let offset = (page - 1) * limit;
        let pool = await connectDB();

        // lấy danh sách đơn
        let orders = await pool.request()
            .input("userId", sql.Int, userId)
            .input("limit", sql.Int, limit)
            .input("offset", sql.Int, offset)
            .query(`
                SELECT o.id, o.total, o.status, o.createdAt 
                FROM Orders o
                WHERE o.user_id = @userId
                ORDER BY o.createdAt DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `);

        // lấy tổng số đơn để tính số trang
        let countResult = await pool.request()
            .input("userId", sql.Int, userId)
            .query(`SELECT COUNT(*) as total FROM Orders WHERE user_id = @userId`);

        return {
            orders: orders.recordset,
            total: countResult.recordset[0].total
        };
    }

    // Hủy đơn hàng
    async cancelOrder(orderId, userId) {
        let pool = await connectDB();
        let result = await pool.request()
            .input("orderId", sql.Int, orderId)
            .input("userId", sql.Int, userId)
            .query(`
                UPDATE Orders 
                SET status = 'cancelled'
                WHERE id = @orderId AND user_id = @userId AND status = 'pending'
            `);
        return result.rowsAffected[0] > 0;
    }

}

module.exports = new OrderModel();
