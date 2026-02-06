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
const { db, runAsync } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化数据库表结构（如果不存在）
const initDatabase = async () => {
  try {
    const dbPath = process.env.DATABASE_PATH || './database.db';
    console.log(`📁 Using database at: ${dbPath}`);

    console.log('🔧 Initializing database tables...');

    // 顾客表 - 使用 CREATE TABLE IF NOT EXISTS 安全创建
    await runAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        height INTEGER DEFAULT 0,
        weight INTEGER DEFAULT 0,
        address TEXT,
        additional_info TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Customers table ready');

    // 菜品表
    await runAsync(`
      CREATE TABLE IF NOT EXISTS dishes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        image_url TEXT,
        is_available BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Dishes table ready');

    // 订单表
    await runAsync(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        status TEXT DEFAULT 'submitted',
        note TEXT,
        total_price REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Orders table ready');

    // 订单项表
    await runAsync(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        dish_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price_snapshot REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (dish_id) REFERENCES dishes(id)
      )
    `);
    console.log('✅ Order items table ready');

    // 创建索引
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`);
    await runAsync(`CREATE INDEX IF NOT EXISTS idx_dishes_category ON dishes(category)`);
    console.log('✅ Indexes ready');

    // 迁移：为 orders 表添加 plan_type 列
    try {
      await runAsync(`ALTER TABLE orders ADD COLUMN plan_type TEXT DEFAULT '5'`);
      console.log('✅ Added plan_type column to orders');
    } catch (e) {
      // 列已存在则忽略
    }

    console.log('✨ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

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

// 初始化数据库后启动服务器
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🍽️  ${process.env.RESTAURANT_NAME} 点餐系统`);
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📋 菜单: http://localhost:${PORT}/menu`);
    console.log(`📦 所有订单: http://localhost:${PORT}/admin`);
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

module.exports = app;