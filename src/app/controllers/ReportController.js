const { sql, connectDB } = require("../../config/db/db");
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

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

  // === Xuất báo cáo Excel ===
  async exportExcel(req, res) {
    try {
      const pool = await connectDB();

      
      const revenue = await pool.request().query(`
        SELECT CAST(createdAt AS DATE) AS date, SUM(total) AS revenue
        FROM Orders
        WHERE status = 'paid'
        GROUP BY CAST(createdAt AS DATE)
        ORDER BY date
      `);

      const bestSelling = await pool.request().query(`
        SELECT TOP 10 p.name, SUM(oi.quantity) AS totalSold
        FROM OrderItems oi
        JOIN Products p ON oi.product_id = p.id
        JOIN Orders o ON oi.order_id = o.id
        WHERE o.status = 'paid'
        GROUP BY p.name
        ORDER BY totalSold DESC
      `);

      const orderStatus = await pool.request().query(`
        SELECT status, COUNT(*) AS totalOrders
        FROM Orders
        GROUP BY status
      `);

      const orderItemData = await pool.request().query(`
        SELECT 
            o.id AS MaDon,
            p.name AS TenSanPham,
            oi.quantity AS SoLuong,
            oi.price AS DonGia,
            (oi.quantity * oi.price) AS ThanhTien,
            o.status AS TrangThai
        FROM OrderItems oi
        JOIN Orders o ON oi.order_id = o.id
        JOIN Products p ON oi.product_id = p.id
        ORDER BY o.id;
      `);

      // --- Tạo workbook ---
      const workbook = new ExcelJS.Workbook();
      const sheet1 = workbook.addWorksheet('Doanh thu theo ngày');
      const sheet2 = workbook.addWorksheet('Sản phẩm bán chạy');
      const sheet3 = workbook.addWorksheet('Trạng thái đơn hàng');
      const sheet4 = workbook.addWorksheet('Chi tiết đơn hàng');

      // --- Sheet 1 ---
      sheet1.columns = [
        { header: 'Ngày', key: 'date', width: 15 },
        { header: 'Doanh thu (VNĐ)', key: 'revenue', width: 20 }
      ];
      sheet1.addRows(revenue.recordset);

      sheet1.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      sheet1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0070C0' } };

      // --- Sheet 2 ---
      sheet2.columns = [
        { header: 'Tên sản phẩm', key: 'name', width: 30 },
        { header: 'Số lượng bán', key: 'totalSold', width: 15 }
      ];
      sheet2.addRows(bestSelling.recordset);

      sheet2.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      sheet2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '228B22' } };

      // --- Sheet 3 ---
      sheet3.columns = [
        { header: 'Trạng thái đơn hàng', key: 'status', width: 25 },
        { header: 'Số lượng', key: 'totalOrders', width: 15 }
      ];
      sheet3.addRows(orderStatus.recordset);

      sheet3.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      sheet3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C00' } };


      sheet4.columns = [
        { header: "Mã đơn", key: "MaDon", width: 10 },
        { header: "Tên sản phẩm", key: "TenSanPham", width: 25 },
        { header: "Số lượng", key: "SoLuong", width: 10 },
        { header: "Đơn giá", key: "DonGia", width: 15 },
        { header: "Thành tiền", key: "ThanhTien", width: 15 },
        { header: "Trạng thái", key: "TrangThai", width: 15 },
      ];
      sheet4.addRows(orderItemData.recordset);

      sheet4.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      sheet4.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '343A40' } };

      // --- Ghi file tạm trong thư mục tmp ---
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `ThongKeBaoCao-${timestamp}.xlsx`;
      const filePath = path.join(__dirname, `../../tmp/${fileName}`);

      // Tạo thư mục tmp nếu chưa có
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      await workbook.xlsx.writeFile(filePath);

      // --- Gửi file cho client ---
      res.download(filePath, fileName, (err) => {
        if (err) console.error('Lỗi tải file:', err);
        fs.unlink(filePath, () => {}); // Xóa file sau khi tải
      });

    } catch (err) {
      console.error('Export Excel error:', err);
      res.status(500).json({ error: 'Lỗi xuất Excel' });
    }
  }
}

module.exports = new ReportController();
