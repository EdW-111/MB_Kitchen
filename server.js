const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const dishRoutes = require('./routes/dishes');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', restaurant: process.env.RESTAURANT_NAME });
});

// 管理面板路由 - 特殊处理

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// SPA 路由 - 所有非 API 请求都返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: '服务器错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🍽️  ${process.env.RESTAURANT_NAME} 点餐系统`);
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📋 菜单: http://localhost:${PORT}/menu`);
  console.log(`📦 所有订单: http://localhost:${PORT}/admin`);
});

module.exports = app;