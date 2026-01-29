const express = require('express');
const router = express.Router();
const { register, login, logout, getCurrentUser } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// 公开路由
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// 需要认证的路由
router.get('/me', authMiddleware, getCurrentUser);

module.exports = router;
