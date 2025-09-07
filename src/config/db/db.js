const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'abc@123',
    server: 'localhost',          // hoặc DESKTOP-HV20LOM\SQLEXPRESS
    database: 'mssql',           // database
    options: {
        encrypt: false,
        trustServerCertificate: true,
        

    },
    instanceName: "QUANGHA"   //named instance
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