const siteRouter = require('./siteRoutes');
const productRouter = require('./productRoutes');
const accountRouter = require('./accountRoutes');
const adminRouter = require('./adminRoutes');


function route(app) {
    app.use('/admin',adminRouter); //tất cả route liên quan đến admin sẽ đi qua adminRoutes.js
    app.use('/accounts',accountRouter); //tất cả route liên quan đến accounts sẽ đi qua accountRoutes.js
    app.use('/products',productRouter); //tất cả route liên quan đến products sẽ đi qua productRoutes.js
    app.use('/',siteRouter);
}


module.exports = route;