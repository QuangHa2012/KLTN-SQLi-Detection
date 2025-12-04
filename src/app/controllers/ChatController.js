const MessageModel = require('../models/messageModel')

class ChatController {
    // [GET] /chat/user
    async userChat(req, res) {
        const userId = req.session.user.id;
        const adminId = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : 6;

        const unread = await MessageModel.getUnreadForUser(userId, adminId); // ✅
        await MessageModel.markUserRead(userId, adminId);

        const messages = await MessageModel.getChatHistory(userId, adminId);

        res.render("chat/userChat", { messages, userId, adminId, unread }); // ✅
    }

  // [GET] /chat/admin
  async adminList (req, res) {
    const adminId = req.session.user.id
    const users = await MessageModel.getUsersWithMessages(adminId)

    for (let u of users) {
      u.unread = await MessageModel.getUnreadCount(u.userId, adminId)
    }

    res.render('chat/adminList', { users, adminId })
  }

  // [GET] /chat/admin/chat/:userId
  async adminChat (req, res) {
    const adminId = req.session.user.id
    const userId = parseInt(req.params.userId)
    const users = await MessageModel.getUsersWithMessages(adminId)

    await MessageModel.markAsRead(userId, adminId);

    const messages = await MessageModel.getChatHistory(userId, adminId)

    res.render('chat/adminChat', { messages, userId, adminId, users })
  }
}

module.exports = new ChatController()
