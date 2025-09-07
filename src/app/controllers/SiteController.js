class SiteController { // [GET] / 
    home(req, res) {
         res.render('home'); 
    } 
} 


module.exports = new SiteController;