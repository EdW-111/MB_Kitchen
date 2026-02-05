const express = require('express');
const router = express.Router();
const { adminAuthMiddleware } = require('../middleware/auth');
const { getAllUsers, getUserDetail, deleteUser } = require('../controllers/userController');

// 管理员路由
router.get('/admin/all', adminAuthMiddleware, getAllUsers);
router.get('/admin/:id', adminAuthMiddleware, getUserDetail);
router.delete('/admin/:id', adminAuthMiddleware, deleteUser);

module.exports = router;
