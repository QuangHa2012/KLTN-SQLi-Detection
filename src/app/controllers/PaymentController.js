const axios = require('axios')
const crypto = require('crypto')
const { sql, connectDB } = require('../../config/db/db')

class PaymentController {
  // Thanh toán giỏ hàng với MoMo
  async checkout (req, res) {
    try {
      const userId = req.session.user.id
      const pool = await connectDB()

      // 1. Lấy giỏ hàng
      let cart = await pool.request().input('userId', sql.Int, userId).query(`
                    SELECT ci.id as cartItemId, p.id as productId, p.price, ci.quantity
                    FROM CartItems ci
                    JOIN Carts c ON ci.cart_id = c.id
                    JOIN Products p ON ci.product_id = p.id
                    WHERE c.user_id = @userId
                `)

      if (cart.recordset.length === 0) {
        return res.redirect('/cart')
      }

      // 2. Tính tổng tiền
      let total = cart.recordset.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )

      const discountResult = await pool
        .request()
        .input('total', sql.Decimal(18, 2), total).query(`
                    SELECT TOP 1 discountPercent
                    FROM DiscountRules
                    WHERE @total >= minTotal AND active = 1
                    ORDER BY minTotal DESC
                `)

      let discountPercent = 0
      if (discountResult.recordset.length > 0) {
        discountPercent = discountResult.recordset[0].discountPercent
      }

      const discountAmount = (total * discountPercent) / 100
      const finalTotal = total - discountAmount

      // 3. Tạo order pending
      let orderResult = await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('total', sql.Decimal(18, 2), finalTotal)
        .input('discountPercent', sql.Int, discountPercent)
        .input('discountAmount', sql.Decimal(18, 2), discountAmount).query(`
                    INSERT INTO Orders (user_id, total, discountPercent, discountAmount, status) 
                    OUTPUT INSERTED.id
                    VALUES (@userId, @total, @discountPercent, @discountAmount, 'pending')
                `)

      let orderId = orderResult.recordset[0].id

      // 4. Copy giỏ sang OrderItems ngay
      for (let item of cart.recordset) {
        await pool
          .request()
          .input('order_id', sql.Int, orderId)
          .input('product_id', sql.Int, item.productId)
          .input('quantity', sql.Int, item.quantity)
          .input('price', sql.Decimal(18, 2), item.price).query(`
                        INSERT INTO OrderItems (order_id, product_id, quantity, price)
                        VALUES (@order_id, @product_id, @quantity, @price)
                    `)
      }

      // 5. Chuẩn bị dữ liệu gửi MoMo
      const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO'
      const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85'
      const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz'
      const requestId = orderId.toString()
      const orderInfo = `Thanh toán đơn hàng #${orderId}`
      const redirectUrl = "https://tardiest-vestibular-cathrine.ngrok-free.dev/payment/success";
      const ipnUrl = "https://tardiest-vestibular-cathrine.ngrok-free.dev/payment/momo-notify";

      const amount = finalTotal.toString()
      const extraData = ''

      // orderId unique cho MoMo
      const momoOrderId = orderId + '_' + Date.now()

      const rawSignature =
        `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
        `&orderId=${momoOrderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
        `&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`

      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex')

      const requestBody = {
        partnerCode,
        accessKey,
        requestId,
        amount,
        orderId: momoOrderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        extraData,
        requestType: 'captureWallet',
        signature,
        lang: 'vi'
      }

      console.log('===== MoMo Request Body =====')
      console.log(requestBody)

      // 6. Gửi request tới MoMo
      const response = await axios.post(
        'https://test-payment.momo.vn/v2/gateway/api/create',
        requestBody
      )

      console.log('===== MoMo Response =====')
      console.log(response.data)

      return res.redirect(response.data.payUrl)
    } catch (err) {
      console.error('===== MoMo Error =====')
      if (err.response) {
        console.error(err.response.data)
      } else {
        console.error(err.message)
      }
      res.status(500).send('Có lỗi xảy ra khi thanh toán')
    }
  }

  // Nhận callback từ MoMo
  async momoNotify (req, res) {
    try {
      const { orderId, resultCode } = req.body
      const pool = await connectDB()

      // orderId dạng "Orders.id_123456" -> lấy ID thật
      const dbOrderId = parseInt(orderId.toString().split('_')[0])

      if (parseInt(resultCode) === 0) {
        //  Thanh toán thành công
        // 1. Cập nhật trạng thái order
        await pool
          .request()
          .input('id', sql.Int, dbOrderId)
          .query(`UPDATE Orders SET status='paid' WHERE id=@id`)

        // 2. Trừ kho
        const items = await pool
          .request()
          .input('orderId', sql.Int, dbOrderId)
          .query(
            `SELECT product_id, quantity FROM OrderItems WHERE order_id=@orderId`
          )

        for (let item of items.recordset) {
          await pool
            .request()
            .input('pid', sql.Int, item.product_id)
            .input('qty', sql.Int, item.quantity)
            .query(`UPDATE Products SET stock = stock - @qty WHERE id=@pid`)
        }

        // 3. Xóa giỏ hàng (clear luôn)
        const orderUser = await pool
          .request()
          .input('id', sql.Int, dbOrderId)
          .query(`SELECT user_id FROM Orders WHERE id=@id`)

        if (orderUser.recordset.length > 0) {
          const userId = orderUser.recordset[0].user_id
          await pool.request().input('userId', sql.Int, userId).query(`
                            DELETE FROM CartItems 
                            WHERE cart_id IN (SELECT id FROM Carts WHERE user_id=@userId)
                        `)
        }
      } else {
        //  Thanh toán thất bại
        await pool
          .request()
          .input('id', sql.Int, dbOrderId)
          .query(`UPDATE Orders SET status='failed' WHERE id=@id`)
      }

      res.json({ message: 'ok' })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'error' })
    }
  }

  //
  async buyNow (req, res) {
    try {
      if (!req.session.user) {
        req.session.returnTo = req.originalUrl
        return res.render('error', {
          message: 'Bạn cần đăng nhập để thực hiện thanh toán.',
          suggestion: 'Vui lòng đăng nhập trước khi mua hàng.',
          actions: [
            { label: 'Đăng nhập ngay', link: '/accounts/login', primary: true },
            { label: 'Quay lại', link: 'back' }
          ]
        })
      }

      const userId = req.session.user.id
      const { productId, quantity } = req.body
      const pool = await connectDB()

      // 1. Lấy thông tin sản phẩm
      const productResult = await pool
        .request()
        .input('id', sql.Int, productId)
        .query(`SELECT id, name, price FROM Products WHERE id=@id`)

      if (productResult.recordset.length === 0) {
        return res.status(400).send('Sản phẩm không tồn tại')
      }

      const product = productResult.recordset[0]
      const total = product.price * quantity

      const discountResult = await pool
        .request()
        .input('total', sql.Decimal(18, 2), total).query(`
                    SELECT TOP 1 discountPercent
                    FROM DiscountRules
                    WHERE @total >= minTotal AND active = 1
                    ORDER BY minTotal DESC
                `)

      let discountPercent = 0
      if (discountResult.recordset.length > 0) {
        discountPercent = discountResult.recordset[0].discountPercent
      }

      const discountAmount = (total * discountPercent) / 100
      const finalTotal = total - discountAmount

      // 2. Tạo order pending
      let orderResult = await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('total', sql.Decimal(18, 2), total).query(`
                    INSERT INTO Orders (user_id, total, status) 
                    OUTPUT INSERTED.id
                    VALUES (@userId, @total, 'pending')
                `)

      let orderId = orderResult.recordset[0].id

      // 3. Thêm vào OrderItems
      await pool
        .request()
        .input('order_id', sql.Int, orderId)
        .input('product_id', sql.Int, product.id)
        .input('quantity', sql.Int, quantity)
        .input('price', sql.Decimal(18, 2), product.price).query(`
                    INSERT INTO OrderItems (order_id, product_id, quantity, price)
                    VALUES (@order_id, @product_id, @quantity, @price)
                `)

      // 4. Chuẩn bị dữ liệu MoMo
      const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO'
      const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85'
      const secretKey =
        process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz'
      const requestId = orderId.toString()
      const orderInfo = `Mua ngay sản phẩm #${productId}`
      const redirectUrl = "https://tardiest-vestibular-cathrine.ngrok-free.dev/payment/success";
      const ipnUrl = "https://tardiest-vestibular-cathrine.ngrok-free.dev/payment/momo-notify";

      const amount = finalTotal.toString()
      const extraData = ''

      const momoOrderId = orderId + '_' + Date.now()

      const rawSignature =
        `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
        `&orderId=${momoOrderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
        `&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`

      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex')

      const requestBody = {
        partnerCode,
        accessKey,
        requestId,
        amount,
        orderId: momoOrderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        extraData,
        requestType: 'captureWallet',
        signature,
        lang: 'vi'
      }

      // 5. Gửi request đến MoMo
      const response = await axios.post(
        'https://test-payment.momo.vn/v2/gateway/api/create',
        requestBody
      )

      return res.redirect(response.data.payUrl)
    } catch (err) {
      console.error('===== BuyNow Error =====')
      console.error(err.response?.data || err.message)

      return res.render('error', {
        message: 'Thanh toán thất bại!',
        suggestion: 'Vui lòng thử lại.',
        error: err.message, // chỉ hiển thị cho dev nếu cần
        actions: [
          { label: 'Thử lại', link: 'back', primary: true },
          { label: 'Trang chủ', link: '/' }
        ]
      })
    }
  }

  async success (req, res) {
    let orderId = req.query.orderId

    if (orderId) {
      // orderId kiểu "12_1694958237456" -> tách ra 12
      orderId = parseInt(orderId.toString().split('_')[0])
    }

    let order = null
    if (orderId && !isNaN(orderId)) {
      const pool = await connectDB()
      const result = await pool
        .request()
        .input('id', sql.Int, orderId)
        .query('SELECT * FROM Orders WHERE id=@id')
      order = result.recordset[0]
    }

    res.render('payment/success', { order })
  }

  fail (req, res) {
    res.render('payment/fail')
  }
}

module.exports = new PaymentController()
