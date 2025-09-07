const express = require('express');
const router = express.Router();//Express Router giúp tách biệt các route thành module riêng, giúp dễ quản lý và bảo trì code.

const siteController = require('../app/controllers/SiteController');// đối tượng đc khởi tạo từ class


router.get('/',siteController.home);// tuyến đường đọc trên xuống


module.exports = router;// bóc tách ra ngoài thì xuất ra ngoài