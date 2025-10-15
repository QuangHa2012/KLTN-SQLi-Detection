const { sql, connectDB } = require('../../config/db/db');

class CartController {
    // Thêm vào giỏ hàng
    async addToCart(req, res) {
        const userId = req.session.user?.id; // user đang đăng nhập
        const productId = req.params.id;
        const quantity = 1;

        if (!userId) {
            return res.redirect('/accounts/login'); // bắt đăng nhập
        }

        try {
            const pool = await connectDB();

            // Kiểm tra giỏ hàng user đã có chưa
            let cartResult = await pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT * FROM Carts WHERE user_id = @userId');

            let cartId;
            if (cartResult.recordset.length === 0) {
                // tạo giỏ hàng mới
                let newCart = await pool.request()
                    .input('userId', sql.Int, userId)
                    .query('INSERT INTO Carts (user_id) OUTPUT INSERTED.id VALUES (@userId)');
                cartId = newCart.recordset[0].id;
            } else {
                cartId = cartResult.recordset[0].id;
            }

            // Kiểm tra sản phẩm đã có trong giỏ chưa
            let itemResult = await pool.request()
                .input('cartId', sql.Int, cartId)
                .input('productId', sql.Int, productId)
                .query('SELECT * FROM CartItems WHERE cart_id=@cartId AND product_id=@productId');

            if (itemResult.recordset.length > 0) {
                // update quantity
                await pool.request()
                    .input('cartId', sql.Int, cartId)
                    .input('productId', sql.Int, productId)
                    .query('UPDATE CartItems SET quantity = quantity + 1 WHERE cart_id=@cartId AND product_id=@productId');
            } else {
                // thêm mới
                await pool.request()
                    .input('cartId', sql.Int, cartId)
                    .input('productId', sql.Int, productId)
                    .input('quantity', sql.Int, quantity)
                    .query('INSERT INTO CartItems (cart_id, product_id, quantity) VALUES (@cartId, @productId, @quantity)');
            }

            res.redirect('/carts');
        } catch (err) {
            console.error(err);
            res.status(500).send('Error thêm giỏ hàng');
        }
    }

    // Xem giỏ hàng
    async viewCart(req, res) {
        const userId = req.session.user?.id;
        if (!userId) return res.redirect('/accounts/login');

        try {
            const pool = await connectDB();

            let result = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT ci.id as cartItemId, p.id as productId, p.name, p.price, p.img, ci.quantity
                    FROM Carts c
                    JOIN CartItems ci ON c.id = ci.cart_id
                    JOIN Products p ON ci.product_id = p.id
                    WHERE c.user_id = @userId
                `);

            const items = result.recordset;

            
            let total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

           
            const discountResult = await pool.request()
                .input("total", sql.Decimal(18,2), total)
                .query(`
                    SELECT TOP 1 discountPercent
                    FROM DiscountRules
                    WHERE @total >= minTotal AND active = 1
                    ORDER BY minTotal DESC
                `);

            let discountPercent = 0;
            if (discountResult.recordset.length > 0) {
                discountPercent = discountResult.recordset[0].discountPercent;
            }

            
            const discountAmount = total * discountPercent / 100;
            const finalTotal = total - discountAmount;

            
            res.render('cart', { 
                items,
                total,
                discountPercent,
                discountAmount,
                finalTotal
            });

        } catch (err) {
            console.error(err);
            res.status(500).send('Error load cart');
        }
    }


    // Xóa 1 sản phẩm khỏi giỏ
    async removeItem(req, res) {
        const userId = req.session.user?.id;
        const cartItemId = req.params.id;

        if (!userId) return res.redirect('/login');

        try {
            const pool = await connectDB();

            // Xóa item dựa trên cartItemId (chỉ xóa nếu thuộc về user đó)
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('cartItemId', sql.Int, cartItemId)
                .query(`
                    DELETE ci
                    FROM CartItems ci
                    JOIN Carts c ON ci.cart_id = c.id
                    WHERE ci.id = @cartItemId AND c.user_id = @userId
                `);

            res.redirect('/carts');
        } catch (err) {
            console.error(err);
            res.status(500).send('Error remove cart item');
        }
    }

    // Cập nhật số lượng
    async updateQuantity(req, res) {
        const userId = req.session.user?.id;
        const cartItemId = req.params.id;
        const { quantity } = req.body;

        if (!userId) return res.redirect('/login');

        try {
            const pool = await connectDB();

            // Nếu quantity <= 0 thì xóa luôn item
            if (quantity <= 0) {
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('cartItemId', sql.Int, cartItemId)
                    .query(`
                        DELETE ci
                        FROM CartItems ci
                        JOIN Carts c ON ci.cart_id = c.id
                        WHERE ci.id = @cartItemId AND c.user_id = @userId
                    `);
            } else {
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('cartItemId', sql.Int, cartItemId)
                    .input('quantity', sql.Int, quantity)
                    .query(`
                        UPDATE ci
                        SET ci.quantity = @quantity
                        FROM CartItems ci
                        JOIN Carts c ON ci.cart_id = c.id
                        WHERE ci.id = @cartItemId AND c.user_id = @userId
                    `);
            }

            res.redirect('/carts');
        } catch (err) {
            console.error(err);
            res.status(500).send('Error update cart item');
        }
    }

    // Xóa hết giỏ hàng
    async clearCart(req, res) {
        const userId = req.session.user?.id;
        if (!userId) return res.redirect('/login');

        try {
            const pool = await connectDB();
            await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    DELETE ci
                    FROM CartItems ci
                    JOIN Carts c ON ci.cart_id = c.id
                    WHERE c.user_id = @userId
                `);

            res.redirect('/carts');
        } catch (err) {
            console.error(err);
            res.status(500).send('Error clear cart');
        }
    }

    

}

module.exports = new CartController();
