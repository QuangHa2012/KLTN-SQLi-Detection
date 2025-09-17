const sql = require('mssql');
require('dotenv').config(); // load biến môi trường từ file .env

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'abc@123',
    server: process.env.DB_SERVER || 'localhost',          // hoặc DESKTOP-HV20LOM\SQLEXPRESS
    database: process.env.DB_NAME || 'mssql',           // database
    options: {
        encrypt: false,
        trustServerCertificate: true,
        

    },
    port: parseInt(process.env.DB_PORT, 10),
    instanceName: process.env.DB_INSTANCE || "QUANGHA"   //named instance
};

async function connectDB() {
    try {
        let pool = await sql.connect(config);
        console.log("✅ Kết nối SQL Server thành công!");
        return pool;
    } catch (err) {
        console.error("❌ Lỗi kết nối SQL Server:", err.message);
        throw err; // quăng lỗi ra ngoài thay vì return undefined
    }
}

module.exports = { sql, connectDB };//để bên app.js req 

//sql (object/thư viện mssql)

//connectDB (hàm tự viết để kết nối CSDL)