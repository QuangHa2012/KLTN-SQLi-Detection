const siteRouter = require('./siteRoutes');
const productRouter = require('./productRoutes');
const accountRouter = require('./accountRoutes');
const adminRouter = require('./adminRoutes');
const cartRouter = require('./cartRoutes');
const paymentRouter = require('./paymentRoutes');
const orderRouter = require('./orderRoutes');
const profileRouter = require('./profileRoutes');
const pagesRouter = require('./pagesRoutes');


function route(app) {
    app.use('/orders',orderRouter); //tất cả route liên quan đến đơn hàng sẽ đi qua orderRoutes.js
    app.use('/pages',pagesRouter); //tất cả route liên quan đến các trang tĩnh sẽ đi qua pagesRoutes.js
    app.use('/carts',cartRouter); //tất cả route liên quan đến giỏ hàng sẽ đi qua cartRoutes.js
    app.use('/payment',paymentRouter); //tất cả route liên quan đến thanh toán sẽ đi qua payment.js
    app.use('/admin',adminRouter); //tất cả route liên quan đến admin sẽ đi qua adminRoutes.js
    app.use('/accounts',accountRouter); //tất cả route liên quan đến accounts sẽ đi qua accountRoutes.js
    app.use('/products',productRouter); //tất cả route liên quan đến products sẽ đi qua productRoutes.js
    app.use('/profile',profileRouter); //tất cả route liên quan đến profile sẽ đi qua profileRoutes.js
    app.use('/',siteRouter);
}


module.exports = route;