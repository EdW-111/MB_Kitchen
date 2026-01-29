const bcrypt = require('bcryptjs');
const { getAsync, runAsync } = require('../config/db');
const { generateToken } = require('../middleware/auth');

// 注册
const register = async (req, res) => {
  try {
    const { full_name, phone, email, password } = req.body;

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

    // 创建用户
    const result = await runAsync(
      `INSERT INTO customers (full_name, phone, email, password_hash)
       VALUES (?, ?, ?, ?)`,
      [full_name, phone, email || null, hashedPassword]
    );

    const user = {
      id: result.id,
      full_name,
      phone,
      email: email || null
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
        email: user.email
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
      'SELECT id, full_name, phone, email FROM customers WHERE id = ?',
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

module.exports = {
  register,
  login,
  logout,
  getCurrentUser
};
