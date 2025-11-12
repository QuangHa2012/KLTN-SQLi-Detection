require('dotenv').config();

const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const cartCount = require('./app/middleware/cartCount');
const path = require('path');
const passport = require('./config/passport');
const app = express();
const port = process.env.PORT || 3000;


const route = require('./routes/index');//import route()


//static
app.use(express.static(path.join(__dirname,'public')));




//xử lý dữ liệu từ form gửi lên
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    rolling: true,  // reset lại thời gian cookie mỗi lần request
    cookie: { maxAge: 60000 * 60 } // 1h
}));

// passport
app.use(passport.initialize());
app.use(passport.session());



// Truyền user vào tất cả view
app.use((req, res, next) => {
  res.locals.user = req.user || req.session.user || null;
  next();
});

//count cart items
app.use(cartCount);

//template engine
app.engine('hbs', engine({ 
  extname: '.hbs',
  helpers: {
    formatPrice: (price) => {
      if (price == null) return '';
        return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
    },
    eq: (a, b) => a === b,
    or: (a, b) => a || b,
    gt: (a, b) => a > b,
    lt: (a, b) => a < b,
    lte: (a, b) => a <= b,
    add: (a, b) => a + b,
    sub: (a, b) => a - b,
    multiply: (a, b) => a * b,
    calcTotal: (items) => {
      return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    },
    formatDate: (date) => new Date(date).toLocaleString("vi-VN"),
    formatBD: (date) => new Date(date).toLocaleDateString("vi-VN"),
    range: (from, to) => {
      let arr = [];
      for (let i = from; i <= to; i++) arr.push(i);
      return arr;
    },
    orderStatus: function(status) {
      switch (status) {
        case 'pending': return "Đang xử lý";
        case 'paid': return "Đã thanh toán";
        case 'failed': return "Thanh toán thất bại";
        case 'shipping': return "Đang giao hàng";
        case 'cancelled': return "Đã hủy";
        default: return status;
      }
    },
    ifIndexZero: function(index) {
        return index === 0 ? "active" : "";
    },
    rangeStar: (from, to, step = 1) => {
      let arr = [];
      if (step > 0) {
        for (let i = from; i <= to; i += step) arr.push(i);
      } else {
        for (let i = from; i >= to; i += step) arr.push(i);
      }
      return arr;
    },
  }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname,'resources','views'));//__dirname fix path folder đi từ src -> resources -> views


//init routes
route(app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})