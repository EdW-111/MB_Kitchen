const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getCurrentUser,
  getProfile,      // 获取用户信息
  updateProfile,   // 更新用户信息
  adminLogin,      // 管理员登录
  adminLogout,     // 管理员登出
  checkAdminAuth   // 检查管理员认证
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// 公开路由
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/admin/login', adminLogin);
router.post('/admin/logout', adminLogout);
router.get('/admin/check', checkAdminAuth);

// 需要认证的路由
router.get('/profile', authMiddleware, getProfile);        // 获取用户信息
router.patch('/profile', authMiddleware, updateProfile);   // 更新用户信息
router.get('/me', authMiddleware, getCurrentUser);

module.exports = router;
