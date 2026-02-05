const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  // 从 Cookie 或 Authorization header 中获取 token
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '需要登录'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'your-default-secret-key-please-change-in-production';
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.id;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token 无效或已过期'
    });
  }
};

const adminAuthMiddleware = (req, res, next) => {
  const token = req.cookies?.admin_token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '管理员未登录'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'your-default-secret-key-please-change-in-production';
    const decoded = jwt.verify(token, secret);
    if (decoded.isAdmin) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: '无权限访问'
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token 无效或已过期'
    });
  }
};

const adminPageMiddleware = (req, res, next) => {
  const token = req.cookies?.admin_token;

  if (!token) {
    // 如果是浏览器请求，返回 HTML 页面（让前端处理登陆）
    // 如果是 API 请求，返回 JSON 错误
    if (req.accepts('html')) {
      // 允许访问 HTML 页面，前端会检查认证状态
      console.log(`⚠️  未认证的管理面板访问尝试: ${req.ip}`);
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: '管理员未登录'
      });
    }
  } else {
    try {
      const secret = process.env.JWT_SECRET || 'your-default-secret-key-please-change-in-production';
      const decoded = jwt.verify(token, secret);
      if (decoded.isAdmin) {
        console.log(`✅ 管理员页面访问: ${req.ip}`);
        next();
      } else {
        if (req.accepts('html')) {
          next();
        } else {
          return res.status(403).json({
            success: false,
            message: '无权限访问'
          });
        }
      }
    } catch (error) {
      console.log(`⚠️  无效的管理员 token 访问: ${req.ip}`);
      if (req.accepts('html')) {
        next();
      } else {
        return res.status(401).json({
          success: false,
          message: 'Token 无效或已过期'
        });
      }
    }
  }
};

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'your-default-secret-key-please-change-in-production';
  return jwt.sign(
    { id: user.id, phone: user.phone, full_name: user.full_name },
    secret,
    { expiresIn: '7d' }
  );
};

const generateAdminToken = () => {
  const secret = process.env.JWT_SECRET || 'your-default-secret-key-please-change-in-production';
  return jwt.sign(
    { isAdmin: true },
    secret,
    { expiresIn: '7d' }
  );
};

module.exports = { authMiddleware, adminAuthMiddleware, adminPageMiddleware, generateToken, generateAdminToken };
