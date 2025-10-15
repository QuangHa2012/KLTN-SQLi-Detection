const { sql, connectDB } = require("../../config/db/db");

class DiscountController {
    // GET /admin/discounts
    async list(req, res) {
        try {
            const pool = await connectDB();
            const result = await pool.request()
                .query("SELECT * FROM DiscountRules ORDER BY minTotal ASC");

            res.render("admin/discounts/list", { discounts: result.recordset });
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi tải danh sách giảm giá");
        }
    }

    // GET /admin/discounts/add
    addPage(req, res) {
        res.render("admin/discounts/add");
    }

    // POST /admin/discounts/add
    async add(req, res) {
        try {
            const { minTotal, discountPercent, active } = req.body;
            const pool = await connectDB();

            await pool.request()
                .input("minTotal", sql.Decimal(18,2), minTotal)
                .input("discountPercent", sql.Int, discountPercent)
                .input("active", sql.Bit, active ? 1 : 0)
                .query(`
                    INSERT INTO DiscountRules (minTotal, discountPercent, active)
                    VALUES (@minTotal, @discountPercent, @active)
                `);

            res.redirect("/admin/discounts");
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi thêm quy tắc giảm giá");
        }
    }

    // GET /admin/discounts/edit/:id
    async editPage(req, res) {
        try {
            const pool = await connectDB();
            const result = await pool.request()
                .input("id", sql.Int, req.params.id)
                .query("SELECT * FROM DiscountRules WHERE id=@id");

            const discount = result.recordset[0];
            if (!discount) return res.status(404).send("Không tìm thấy quy tắc giảm giá");

            res.render("admin/discounts/edit", { discount });
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi tải dữ liệu giảm giá");
        }
    }

    // POST /admin/discounts/edit/:id
    async update(req, res) {
        try {
            const { minTotal, discountPercent, active } = req.body;
            const pool = await connectDB();

            await pool.request()
                .input("id", sql.Int, req.params.id)
                .input("minTotal", sql.Decimal(18,2), minTotal)
                .input("discountPercent", sql.Int, discountPercent)
                .input("active", sql.Bit, active ? 1 : 0)
                .query(`
                    UPDATE DiscountRules
                    SET minTotal=@minTotal, discountPercent=@discountPercent, active=@active
                    WHERE id=@id
                `);

            res.redirect("/admin/discounts");
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi cập nhật quy tắc giảm giá");
        }
    }

    // GET /admin/discounts/delete/:id
    async delete(req, res) {
        try {
            const pool = await connectDB();
            await pool.request()
                .input("id", sql.Int, req.params.id)
                .query("DELETE FROM DiscountRules WHERE id=@id");

            res.redirect("/admin/discounts");
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi xóa quy tắc giảm giá");
        }
    }
}

module.exports = new DiscountController();
