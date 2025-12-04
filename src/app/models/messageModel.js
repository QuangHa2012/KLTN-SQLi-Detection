const { connectDB, sql } = require('../../config/db/db')

class MessageModel {
    // Lưu tin nhắn
    async saveMessage(senderId, receiverId, message, isAdmin = 0) {
        const pool = await connectDB();
        await pool.request()
            .input('senderId', sql.Int, senderId)
            .input('receiverId', sql.Int, receiverId)
            .input('message', sql.NVarChar(sql.MAX), message)
            .input('isAdmin', sql.Bit, isAdmin)
            .query(`
                INSERT INTO Messages (senderId, receiverId, message, isAdmin, readByAdmin, readByUser)
                VALUES (@senderId, @receiverId, @message, @isAdmin,
                        CASE WHEN @isAdmin = 0 THEN 0 ELSE 1 END, 
                        CASE WHEN @isAdmin = 1 THEN 0 ELSE 1 END)
            `);
    }

    // Lấy lịch sử chat giữa 1 user và admin
    async getChatHistory(userId, adminId) {
        const pool = await connectDB();
        const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('adminId', sql.Int, adminId)
        .query(`
            SELECT m.*, 
                u.username AS senderName, 
                u2.username AS receiverName
            FROM Messages m
            LEFT JOIN users u ON m.senderId = u.id
            LEFT JOIN users u2 ON m.receiverId = u2.id
            WHERE (m.senderId = @userId AND m.receiverId = @adminId)
            OR (m.senderId = @adminId AND m.receiverId = @userId)
            ORDER BY m.createdAt ASC
        `);
        return result.recordset;
    }

    // Lấy danh sách user đã chat với admin
    async getUsersWithMessages(adminId) {
        const pool = await connectDB();
        const result = await pool.request()
        .input('adminId', sql.Int, adminId)
        .query(`
            SELECT DISTINCT
            CASE
                WHEN senderId = @adminId THEN receiverId
                WHEN receiverId = @adminId THEN senderId
            END AS userId
            FROM Messages
            WHERE senderId = @adminId OR receiverId = @adminId
        `);
        return result.recordset;
    }

    // Đếm tin nhắn user gửi mà admin chưa đọc
    async getUnreadCount(userId, adminId) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('adminId', sql.Int, adminId)
            .query(`
                SELECT COUNT(*) AS unread
                FROM Messages
                WHERE senderId = @userId
                AND receiverId = @adminId
                AND isAdmin = 0
                AND readByAdmin = 0
            `);

        return result.recordset[0].unread;
    }

    // Đánh dấu tất cả tin nhắn user → admin là đã đọc
    async markAsRead(userId, adminId) {
        const pool = await connectDB();
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('adminId', sql.Int, adminId)
            .query(`
                UPDATE Messages
                SET readByAdmin = 1
                WHERE senderId = @userId
                AND receiverId = @adminId
                AND isAdmin = 0
            `);
    }

    // Đếm tin nhắn admin → user mà user chưa đọc
    async getUnreadForUser(userId, adminId) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('adminId', sql.Int, adminId)
            .query(`
                SELECT COUNT(*) AS unread
                FROM Messages
                WHERE senderId = @adminId
                AND receiverId = @userId
                AND isAdmin = 1
                AND readByUser = 0
            `);
        return result.recordset[0].unread;
    }

    async markUserRead(userId, adminId) {
        const pool = await connectDB();
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('adminId', sql.Int, adminId)
            .query(`
                UPDATE Messages
                SET readByUser = 1
                WHERE senderId = @adminId
                AND receiverId = @userId
            `);
    }
}

module.exports = new MessageModel();
