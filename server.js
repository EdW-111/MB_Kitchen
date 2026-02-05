const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const dishRoutes = require('./routes/dishes');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const { adminPageMiddleware, adminAuthMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// 创建上传文件夹
const uploadDir = path.join(__dirname, 'public', 'uploads', 'dishes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'dish-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPEG, PNG, GIF 和 WebP 格式的图片'), false);
    }
  }
});

// 中间件
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 将 upload 对象存到 app.locals
app.locals.upload = upload;

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', restaurant: process.env.RESTAURANT_NAME });
});

// 管理面板路由 - 需要管理员认证
app.get('/admin', adminPageMiddleware, (req, res) => {
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