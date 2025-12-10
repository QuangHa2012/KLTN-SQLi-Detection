// app/controllers/OrderController.js
const axios = require("axios");
const crypto = require("crypto");
const { sql, connectDB } = require("../../config/db/db");
const OrderModel = require("../models/orderModel");

class OrderController {
    // GET /orders
    async index(req, res) {
        try {
            if (!req.session.user) {
                return res.redirect('/login');
            }

            let page = parseInt(req.query.page) || 1;
            let limit = 8; // số đơn hàng mỗi trang
            let { orders, total } = await OrderModel.getOrdersByUserPaginated(req.session.user.id, page, limit);

            let totalPages = Math.ceil(total / limit);

            res.render('orders/index', { 
                orders, 
                currentPage: page, 
                totalPages 
            });
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi server");
        }
    }

    // GET /orders/:id
    async orderDetail(req, res) {
        try {
            const orderId = parseInt(req.params.id);
            if (!orderId) return res.redirect("/orders");

            const pool = await connectDB();

            // Lấy order
            const orderResult = await pool.request()
                .input("id", sql.Int, orderId)
                .query("SELECT * FROM Orders WHERE id=@id");

            const order = orderResult.recordset[0];
            if (!order) return res.redirect("/orders");

            // Lấy items
            const itemsResult = await pool.request()
                .input("orderId", sql.Int, orderId)
                .query(`
                    SELECT oi.quantity, oi.price, p.name, p.img
                    FROM OrderItems oi
                    JOIN Products p ON oi.product_id = p.id
                    WHERE oi.order_id=@orderId
                `);

            res.render("orders/detail", { order, items: itemsResult.recordset });
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi khi lấy chi tiết đơn hàng");
        }
    }

    // POST /orders/:id/retry-payment
    async retryPayment(req, res) {
        try {
            const orderId = parseInt(req.params.id);
            const userId = req.session.user.id;
            const pool = await connectDB();

            // Lấy order
            const orderResult = await pool.request()
                .input("id", sql.Int, orderId)
                .input("userId", sql.Int, userId)
                .query("SELECT * FROM Orders WHERE id=@id AND user_id=@userId");

            const order = orderResult.recordset[0];
            if (!order) return res.redirect("/orders");

            // Chỉ cho phép retry nếu chưa thanh toán
            if (order.status === "paid") {
                return res.redirect(`/orders/${orderId}`);
            }

            // Lấy items
            const itemsResult = await pool.request()
                .input("orderId", sql.Int, orderId)
                .query("SELECT * FROM OrderItems WHERE order_id=@orderId");

            if (itemsResult.recordset.length === 0) {
                return res.redirect(`/orders/${orderId}`);
            }

            // MoMo config
            const partnerCode = process.env.MOMO_PARTNER_CODE || "MOMO";
            const accessKey = process.env.MOMO_ACCESS_KEY || "F8BBA842ECF85";
            const secretKey = process.env.MOMO_SECRET_KEY || "K951B6PE1waDMi640xX08PD3vg6EkVlz";
            const requestId = orderId.toString();
            const orderInfo = `Thanh toán lại đơn hàng #${orderId}`;
            const redirectUrl = process.env.MOMO_REDIRECT_URL || "http://localhost:3000/payment/success";
            const ipnUrl = process.env.MOMO_NOTIFY_URL || "http://localhost:3000/payment/momo-notify";
            const amount = order.total.toString();
            const extraData = "";

            // orderId unique cho MoMo
            const momoOrderId = orderId + "_" + Date.now();

            const rawSignature =
                `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
                `&orderId=${momoOrderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
                `&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`;

            const signature = crypto.createHmac("sha256", secretKey)
                .update(rawSignature)
                .digest("hex");

            const requestBody = {
                partnerCode,
                accessKey,
                requestId,
                amount,
                orderId: momoOrderId,
                orderInfo,
                redirectUrl,
                ipnUrl,
                extraData,
                requestType: "captureWallet",
                signature,
                lang: "vi"
            };

            const response = await axios.post(
                "https://test-payment.momo.vn/v2/gateway/api/create",
                requestBody
            );

            return res.redirect(response.data.payUrl);

        } catch (err) {
            console.error("===== Retry Payment Error =====", err);
            res.status(500).send("Không thể thanh toán lại");
        }
    }

    // POST /orders/:id/cancel
    async cancel(req, res) {
        try {
            if (!req.session.user) {
                return res.redirect('/login');
            }
            let orderId = parseInt(req.params.id);
            let success = await OrderModel.cancelOrder(orderId, req.session.user.id);
            if (success) {
                res.redirect('/orders');
            } else {
                res.status(400).send("Không thể hủy đơn hàng này.");
            }
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi server");
        }
    }

}

module.exports = new OrderController();
