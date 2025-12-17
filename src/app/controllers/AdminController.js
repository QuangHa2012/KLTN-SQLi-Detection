const { sql, connectDB } = require('../../config/db/db');

class AdminController {
    // GET /admin/users
    async listUsers(req, res) {
        try {
            let pool = await connectDB();

            // Lấy query filter
            let page = parseInt(req.query.page) || 1;
            let limit = 5;
            let offset = (page - 1) * limit;
            let { username, role } = req.query; // lấy điều kiện từ query string

            // Điều kiện WHERE động
            let conditions = [];
            if (username) {
                conditions.push(`username LIKE @username`);
            }
            if (role && role !== "all") {
                conditions.push(`role = @role`);
            }
            let whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

            // Đếm tổng user
            let countQuery = `SELECT COUNT(*) AS total FROM Users ${whereClause}`;
            let countRequest = pool.request();
            if (username) countRequest.input("username", sql.NVarChar, `%${username}%`);
            if (role && role !== "all") countRequest.input("role", sql.NVarChar, role);
            let countResult = await countRequest.query(countQuery);
            let totalUsers = countResult.recordset[0].total;
            let totalPages = Math.ceil(totalUsers / limit);

            // Lấy user với filter + phân trang
            let query = `
                SELECT id, username, email, role, createdAt
                FROM Users
                ${whereClause}
                ORDER BY id
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `;
            let request = pool.request()
                .input("offset", sql.Int, offset)
                .input("limit", sql.Int, limit);
            if (username) request.input("username", sql.NVarChar, `%${username}%`);
            if (role && role !== "all") request.input("role", sql.NVarChar, role);

            let result = await request.query(query);

            res.render("admin/users", {
                users: result.recordset,
                currentPage: page,
                totalPages,
                query: { username, role }
            });
        } catch (err) {
            console.error(err);
            res.status(500).render("500", { message: "Lỗi server" });
        }
    }
    // GET /admin/users/:id
    async deleteUser(req, res) {
        try {
            let userId = req.params.id;
            let pool = await connectDB();
            await pool.request()
                .input("id", sql.Int, userId)
                .query("DELETE FROM Users WHERE id=@id");
            res.redirect("/admin/users");
        } catch (err) {
            console.error(err);
            res.status(500).render("500", { message: "Lỗi server" });
        }
    }

    // POST /admin/users/:id/role
    async updateRole(req, res) {
        try {
            let userId = req.params.id;
            let { role } = req.body;
            let pool = await connectDB();
            await pool.request()
                .input("id", sql.Int, userId)
                .input("role", sql.NVarChar, role)
                .query("UPDATE Users SET role=@role WHERE id=@id");
            res.redirect("/admin/users");
        } catch (err) {
            console.error(err);
            res.status(500).render("500", { message: "Lỗi server" });
        }
    }

    // GET /admin/users/:id
    async userDetail(req, res) {
        try {
            let userId = req.params.id;
            const page = parseInt(req.query.page) || 1;
            const limit = 5;
            const offset = (page - 1) * limit;
            let pool = await connectDB();

            // --- Lấy thông tin user ---
            let userResult = await pool.request()
                .input("id", sql.Int, userId)
                .query(`
                    SELECT 
                        id, username, email, role, authProvider, avatar, createdAt
                    FROM Users 
                    WHERE id=@id
                `);
            if (!userResult.recordset.length) {
                return res.status(404).render("404", { message: "Người dùng không tồn tại" });
            }
            let user = userResult.recordset[0];

            // --- Lấy giỏ hàng mới nhất ---
            let cartResult = await pool.request()
                .input("userId", sql.Int, userId)
                .query("SELECT TOP 1 id, createdAt FROM Carts WHERE user_id=@userId ORDER BY createdAt DESC");
            let cart = cartResult.recordset[0];

            let cartItems = [];
            if (cart) {
                let itemsResult = await pool.request()
                    .input("cartId", sql.Int, cart.id)
                    .query(`
                        SELECT ci.id, ci.quantity,
                            p.name, p.price, p.img
                        FROM CartItems ci
                        JOIN Products p ON ci.product_id = p.id
                        WHERE ci.cart_id=@cartId
                    `);
                cartItems = itemsResult.recordset;
            }

            // --- Lấy tổng số đơn hàng ---
            const totalOrdersResult = await pool.request()
                .input("userId", sql.Int, userId)
                .query("SELECT COUNT(*) AS total FROM Orders WHERE user_id=@userId");
            const totalOrders = totalOrdersResult.recordset[0].total;
            const totalPages = Math.ceil(totalOrders / limit);

            // --- Lấy danh sách đơn hàng theo phân trang ---
            let ordersResult = await pool.request()
                .input("userId", sql.Int, userId)
                .input("offset", sql.Int, offset)
                .input("limit", sql.Int, limit)
                .query(`
                    SELECT id, total, status, createdAt
                    FROM Orders
                    WHERE user_id=@userId
                    ORDER BY createdAt DESC
                    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
                `);
            let orders = ordersResult.recordset;

            // --- Lấy chi tiết sản phẩm từng đơn hàng ---
            for (let order of orders) {
                let items = await pool.request()
                    .input("orderId", sql.Int, order.id)
                    .query(`
                        SELECT oi.quantity, oi.price, p.name, p.img
                        FROM OrderItems oi
                        JOIN Products p ON oi.product_id = p.id
                        WHERE oi.order_id=@orderId
                    `);
                order.items = items.recordset;
            }

            // --- Render ---
            res.render("admin/users/detail", {
                user,
                cart,
                cartItems,
                orders,
                currentPage: page,
                totalPages
            });

        } catch (err) {
            console.error(err);
            res.status(500).render("500", { message: "Lỗi server" });
        }
    }



}

module.exports = new AdminController();
