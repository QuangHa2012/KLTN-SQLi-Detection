// routes/order.js
const express = require("express");
const router = express.Router();
const OrderController = require("../app/controllers/OrderController");

router.post("/:id/retry", OrderController.retryPayment);
router.post('/:id/cancel', OrderController.cancel);
router.get("/:id", OrderController.orderDetail);
router.get("/", OrderController.index);

module.exports = router;
