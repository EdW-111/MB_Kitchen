const bcrypt = require('bcryptjs');
const { getAsync, runAsync } = require('../config/db');
const { generateToken } = require('../middleware/auth');

// 注册
const register = async (req, res) => {
  try {
    const { full_name, phone, email, password, height, weight } = req.body;

    // 验证输入
    if (!full_name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: '姓名、手机号和密码为必填项'
      });
    }

    // 检查手机号是否已注册
    const existingUser = await getAsync(
      'SELECT id FROM customers WHERE phone = ?',
      [phone]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '该手机号已被注册'
      });
    }

    // 如果提供了邮箱，检查邮箱是否已注册
    if (email) {
      const emailExists = await getAsync(
        'SELECT id FROM customers WHERE email = ?',
        [email]
      );
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: '该邮箱已被注册'
        });
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户（添加身高体重）
    const result = await runAsync(
      `INSERT INTO customers (full_name, phone, email, password_hash, height, weight)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, phone, email || null, hashedPassword, height || 0, weight || 0]
    );

    const user = {
      id: result.id,
      full_name,
      phone,
      email: email || null,
      height: height || 0,
      weight: weight || 0
    };

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: '注册成功',
      token,
      user
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: error.message
    });
  }
};

// 登录
const login = async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    // 验证输入
    if ((!phone && !email) || !password) {
      return res.status(400).json({
        success: false,
        message: '请提供手机号或邮箱和密码'
      });
    }

    // 查询用户
    let user;
    if (phone) {
      user = await getAsync(
        'SELECT * FROM customers WHERE phone = ?',
        [phone]
      );
    } else {
      user = await getAsync(
        'SELECT * FROM customers WHERE email = ?',
        [email]
      );
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const token = generateToken(user);

    // 设置 HttpOnly Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        height: user.height || 0,
        weight: user.weight || 0
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message
    });
  }
};

// 登出
const logout = (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: '已登出'
  });
};

// 获取当前用户
const getCurrentUser = async (req, res) => {
  try {
    const user = await getAsync(
      'SELECT id, full_name, phone, email, height, weight FROM customers WHERE id = ?',
      [req.userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
};

// 获取用户 Profile
const getProfile = async (req, res) => {
  try {
    const user = await getAsync(
      'SELECT id, full_name, phone, email, height, weight FROM customers WHERE id = ?',
      [req.userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message
    });
  }
};

// 更新用户 Profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { full_name, height, weight } = req.body;

    const user = await getAsync('SELECT * FROM customers WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    await runAsync(
      `UPDATE customers
       SET full_name = ?, height = ?, weight = ?
       WHERE id = ?`,
      [
        full_name || user.full_name,
        height !== undefined ? height : user.height,
        weight !== undefined ? weight : user.weight,
        userId
      ]
    );

    res.json({
      success: true,
      message: '用户信息已更新',
      data: {
        id: userId,
        full_name: full_name || user.full_name,
        phone: user.phone,
        email: user.email,
        height: height !== undefined ? height : user.height,
        weight: weight !== undefined ? weight : user.weight
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败',
      error: error.message
    });
  }
};

// 管理员登录
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码为必填项'
      });
    }

    // 硬编码的管理员凭证
    const ADMIN_USERNAME = 'mkchufang';
    const ADMIN_PASSWORD = 'zhengdaqian';

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const { generateAdminToken } = require('../middleware/auth');
    const token = generateAdminToken();

    // 设置 HttpOnly Cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: '管理员登录成功',
      token
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message
    });
  }
};

// 管理员登出
const adminLogout = (req, res) => {
  res.clearCookie('admin_token');
  res.json({
    success: true,
    message: '已登出'
  });
};

// 检查管理员认证状态
const checkAdminAuth = (req, res) => {
  const token = req.cookies?.admin_token;

  if (!token) {
    return res.json({
      success: false,
      message: '未登陆'
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin-secret');
    if (decoded.isAdmin) {
      return res.json({
        success: true,
        message: '已登陆'
      });
    }
  } catch (error) {
    return res.json({
      success: false,
      message: 'Token 无效'
    });
  }

  res.json({
    success: false,
    message: '未登陆'
  });
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  getProfile,
  updateProfile,
  adminLogin,
  adminLogout
};
