const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const path = require('path');
const app = express();
const port = 3000;


const route = require('./routes/index');//import route()


//static
app.use(express.static(path.join(__dirname,'public')));



//xử lý dữ liệu từ form gửi lên
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// session
app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: true,
    rolling: true,  // reset lại thời gian cookie mỗi lần request
    cookie: { maxAge: 60000 * 60 } // 1h
}));

// Truyền user vào tất cả view
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

//template engine
app.engine('hbs', engine({ 
  extname: '.hbs',
  helpers: {
    formatPrice: (price) => {
      if (price == null) return '';
        return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
    },
    eq: (a, b) => a === b,
  }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname,'resources','views'));//__dirname fix path folder đi từ src -> resources -> views


//init routes
route(app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})