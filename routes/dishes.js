const express = require('express');
const router = express.Router();
const {
  getDishes,
  getDishById,
  getCategories,
  createDish,
  updateDish,
  deleteDish,
  getAllDishesAdmin
} = require('../controllers/dishController');
const { adminAuthMiddleware } = require('../middleware/auth');

// 管理员路由（需要放在前面）
router.get('/admin/all-dishes', adminAuthMiddleware, getAllDishesAdmin);

router.post('/admin', adminAuthMiddleware, (req, res, next) => {
  const upload = req.app.locals.upload;
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, createDish);

router.patch('/admin/:id', adminAuthMiddleware, (req, res, next) => {
  const upload = req.app.locals.upload;
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, updateDish);

router.delete('/admin/:id', adminAuthMiddleware, deleteDish);

// 用户路由
router.get('/', getDishes);
router.get('/categories', getCategories);
router.get('/:id', getDishById);

module.exports = router;
