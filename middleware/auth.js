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

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, phone: user.phone, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = { authMiddleware, generateToken };
