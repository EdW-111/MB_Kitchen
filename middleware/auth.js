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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin-secret');
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
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: '管理员未登录'
      });
    }
  } else {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin-secret');
      if (decoded.isAdmin) {
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
  return jwt.sign(
    { id: user.id, phone: user.phone, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const generateAdminToken = () => {
  return jwt.sign(
    { isAdmin: true },
    process.env.JWT_SECRET || 'admin-secret',
    { expiresIn: '7d' }
  );
};

module.exports = { authMiddleware, adminAuthMiddleware, adminPageMiddleware, generateToken, generateAdminToken };
