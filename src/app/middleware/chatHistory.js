const MessageModel = require('../models/messageModel')

module.exports = async function chatHistory (req, res, next) {
  try {
    if (req.session.user) {
      const userId = req.session.user.id
      const adminId = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : 6

      const messages = await MessageModel.getChatHistory(userId, adminId)

      res.locals.chatMessages = messages
      res.locals.chatUserId = userId
      res.locals.chatAdminId = adminId

    }
  } catch (err) {
    console.error('Chat history middleware error:', err)
    res.locals.chatMessages = []
  }
  next()
}
