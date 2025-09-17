const { sql, connectDB } = require('../../config/db/db');

async function cartCount(req, res, next) {
    if (req.session.user) {
        try {
            const pool = await connectDB();
            const result = await pool.request()
                .input('userId', sql.Int, req.session.user.id)
                .query(`
                    SELECT ISNULL(SUM(ci.quantity), 0) as total
                    FROM Carts c
                    LEFT JOIN CartItems ci ON c.id = ci.cart_id
                    WHERE c.user_id = @userId
                `);

            res.locals.cartCount = result.recordset[0].total || 0;
        } catch (err) {
            console.error(err);
            res.locals.cartCount = 0;
        }
    } else {
        res.locals.cartCount = 0;
    }

    next();
}

module.exports = cartCount;