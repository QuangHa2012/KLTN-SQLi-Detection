const { sql, connectDB } = require('../../config/db/db');
const OrderModel = require("../models/orderModel");
const ProductModel = require("../models/productModel");

class OrderAdminController {
    // Danh sách đơn hàng (phân trang + lọc trạng thái)
    async listOrders(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 10;
            const offset = (page - 1) * limit;
            const statusFilter = req.query.status || 'all'; // lọc trạng thái
            const pool = await connectDB();

            // --- Đếm tổng số đơn ---
            let countQuery = `SELECT COUNT(*) AS total FROM Orders`;
            let listQuery = `
                SELECT o.id, u.username, o.total, o.status, o.createdAt 
                FROM Orders o
                JOIN Users u ON o.user_id = u.id
            `;

            if (statusFilter !== 'all') {
                countQuery += ` WHERE status=@status`;
                listQuery += ` WHERE o.status=@status`;
            }

            listQuery += `
                ORDER BY o.createdAt DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `;

            // --- Query đếm tổng ---
            const countReq = pool.request();
            if (statusFilter !== 'all') countReq.input('status', sql.NVarChar, statusFilter);
            const countResult = await countReq.query(countQuery);
            const total = countResult.recordset[0].total;
            const totalPages = Math.ceil(total / limit);

            // --- Query danh sách ---
            const listReq = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);
            if (statusFilter !== 'all') listReq.input('status', sql.NVarChar, statusFilter);
            const result = await listReq.query(listQuery);

            res.render('admin/orders/index', {
                orders: result.recordset,
                currentPage: page,
                totalPages,
                statusFilter
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('Lỗi khi lấy danh sách đơn hàng');
        }
    }

    // Chi tiết đơn hàng
    async orderDetail(req, res) {
        try {
            const orderId = parseInt(req.params.id);
            const pool = await connectDB();

            const orderResult = await pool.request()
                .input('id', sql.Int, orderId)
                .query(`
                    SELECT o.*, u.username, u.email 
                    FROM Orders o
                    JOIN Users u ON o.user_id = u.id
                    WHERE o.id=@id
                `);

            if (!orderResult.recordset.length) return res.status(404).send('Không tìm thấy đơn hàng');
            const order = orderResult.recordset[0];

            const itemsResult = await pool.request()
                .input('orderId', sql.Int, orderId)
                .query(`
                    SELECT oi.quantity, oi.price, p.name, p.img
                    FROM OrderItems oi
                    JOIN Products p ON oi.product_id = p.id
                    WHERE oi.order_id=@orderId
                `);

            res.render('admin/orders/detail', { order, items: itemsResult.recordset });
        } catch (err) {
            console.error(err);
            res.status(500).send('Lỗi khi lấy chi tiết đơn hàng');
        }
    }

    // async updateStatus(req, res) {
    //     try {
    //         const orderId = parseInt(req.params.id);
    //         const { status } = req.body;
    //         const pool = await connectDB();

    //         await pool.request()
    //             .input('id', sql.Int, orderId)
    //             .input('status', sql.NVarChar, status)
    //             .query('UPDATE Orders SET status=@status WHERE id=@id');

    //         res.redirect('/admin/orders');
    //     } catch (err) {
    //         console.error(err);
    //         res.status(500).send('Lỗi khi cập nhật trạng thái');
    //     }
    // }

    
    async updateStatus(req, res) {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;

        // Lấy order kèm items
        const order = await OrderModel.getOrderWithItems(orderId);
        if (!order) return res.redirect("/admin/orders");

        const oldStatus = order.status;
        

        // xóa khi callback momo thành công 
        // === 1️⃣ Chuyển sang "paid" và chưa trừ kho ===
        if (status === "paid" && oldStatus !== "paid" && !order.stockUpdated) {
            for (const item of order.items) {
                await ProductModel.changeStock(item.productId, -item.quantity);
            }
            await OrderModel.markStockUpdated(orderId, true);
        }

        // xóa khi callback momo thành công 
        // === 2️⃣ Chuyển về "pending", "cancelled" hoặc "failed" và đã trừ kho trước đó ===
        if (["pending", "cancelled", "failed"].includes(status) && order.stockUpdated) {
            for (const item of order.items) {
                await ProductModel.changeStock(item.productId, item.quantity);
            }
            await OrderModel.markStockUpdated(orderId, false);
        }

        // === 3️⃣ Trạng thái "shipping" hoặc "completed" giữ nguyên kho ===
        // Không cần làm gì thêm

        // Cập nhật trạng thái mới
        await OrderModel.updateStatus(orderId, status);

        res.redirect("/admin/orders");
    }



    async deleteOrder(req, res) {
        try {
            const orderId = parseInt(req.params.id);
            const pool = await connectDB();
    
            await pool.request().input('orderId', sql.Int, orderId).query('DELETE FROM OrderItems WHERE order_id=@orderId');
            await pool.request().input('id', sql.Int, orderId).query('DELETE FROM Orders WHERE id=@id');
    
            res.redirect('/admin/orders');
        } catch (err) {
            console.error(err);
            res.status(500).send('Lỗi khi xóa đơn hàng');
        }
    }
}

module.exports = new OrderAdminController();
