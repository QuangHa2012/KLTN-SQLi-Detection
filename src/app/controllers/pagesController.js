

class PagesController {

    // Giới thiệu về chúng tôi
    aboutUs(req, res) {
        res.render('pages/aboutUs', {
            title: "Giới thiệu về chúng tôi"
        });
    }

    // Chính sách sử dụng web
    usePolicy(req, res) {
        res.render('pages/usePolicy', {
            title: "Chính sách sử dụng website"
        });
    }


    // Phương thức thanh toán
    paymentMethods(req, res) {
        res.render('pages/paymentMethods', {
            title: "Phương thức thanh toán"
        });
    }

    // Chính sách giao nhận - vận chuyển
    deliveryPolicy(req, res) {
        res.render('pages/deliveryPolicy', {
            title: "Chính sách giao nhận - vận chuyển"
        });
    }

    // Chính sách bảo mật
    privacyPolicy(req, res) {
        res.render('pages/privacyPolicy', {
            title: "Chính sách bảo mật"
        });
    }

    // Chính sách giảm giá
    privacyDiscount(req, res) {
        res.render('pages/privacyDiscount', {
            title: "Chính sách giảm giá"
        });
    }

    // Hướng dẫn mua hàng
    buyGuide(req, res) {
        res.render('pages/buyGuide', {
            title: "Hướng dẫn mua hàng"
        });
    }

}

module.exports = new PagesController();
