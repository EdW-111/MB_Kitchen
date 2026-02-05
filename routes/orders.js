const express = require('express');
const router = express.Router();
const { authMiddleware, adminAuthMiddleware } = require('../middleware/auth');
const {
  createOrder,
  getOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  deleteOrder
} = require('../controllers/orderController');

// 管理员路由（需要放在前面，因为 /admin/all 会被 /:id 匹配）
router.get('/admin/all', adminAuthMiddleware, getAllOrders);
router.patch('/admin/:id/status', adminAuthMiddleware, updateOrderStatus);
router.delete('/admin/:id', adminAuthMiddleware, deleteOrder);

// 需要认证的路由
router.post('/', authMiddleware, createOrder);
router.get('/', authMiddleware, getOrders);
router.get('/:id', authMiddleware, getOrderById);

module.exports = router;
