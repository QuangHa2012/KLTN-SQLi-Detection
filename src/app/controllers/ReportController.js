const { sql, connectDB } = require("../../config/db/db");

class ReportController {
  showReportPage(req, res) {
    res.render('admin/report');
  }

  // === Doanh thu theo ngày ===
  async revenueByDay(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const pool = await connectDB();
      let query = `
          SELECT 
              CAST(createdAt AS DATE) AS date, 
              SUM(total) AS revenue
          FROM Orders
          WHERE status = 'paid'
      `;
      if (startDate && endDate) {
        query += ` AND createdAt BETWEEN @startDate AND @endDate `;
      }
      query += ` GROUP BY CAST(createdAt AS DATE) ORDER BY date `;

      const request = pool.request();
      if (startDate && endDate) {
        request.input('startDate', sql.DateTime, startDate);
        request.input('endDate', sql.DateTime, endDate);
      }

      const result = await request.query(query);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }

  // === Sản phẩm bán chạy ===
  async bestSellingProducts(req, res) {
    try {
      const pool = await connectDB();
      const result = await pool.request().query(`
          SELECT TOP 10 
              p.name, 
              SUM(oi.quantity) AS totalSold
          FROM OrderItems oi
          JOIN Products p ON oi.product_id = p.id
          JOIN Orders o ON oi.order_id = o.id
          WHERE o.status = 'paid'
          GROUP BY p.name
          ORDER BY totalSold DESC
      `);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }

  // === Đơn hàng theo trạng thái ===
  async orderStatusStats(req, res) {
    try {
      const pool = await connectDB();
      const result = await pool.request().query(`
          SELECT status, COUNT(*) AS totalOrders
          FROM Orders
          GROUP BY status
      `);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }

  // === Thống kê tổng quan ===
  async summaryStats(req, res) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const pool = await connectDB();

      // Doanh thu hôm nay
      const revenueToday = await pool.request().query(`
          SELECT ISNULL(SUM(total), 0) AS revenueToday
          FROM Orders
          WHERE status = 'paid' AND CAST(createdAt AS DATE) = '${today}'
      `);

      // Tổng số đơn hàng
      const totalOrders = await pool.request().query(`
          SELECT COUNT(*) AS totalOrders FROM Orders
      `);

      // Tổng sản phẩm đã bán
      const totalSold = await pool.request().query(`
          SELECT ISNULL(SUM(oi.quantity), 0) AS totalSold
          FROM OrderItems oi
          JOIN Orders o ON oi.order_id = o.id
          WHERE o.status = 'paid'
      `);

      res.json({
        revenueToday: revenueToday.recordset[0].revenueToday,
        totalOrders: totalOrders.recordset[0].totalOrders,
        totalSold: totalSold.recordset[0].totalSold
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }
}

module.exports = new ReportController();
