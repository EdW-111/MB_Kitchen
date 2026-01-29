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

// 管理员路由（需要放在前面）
router.get('/admin/all-dishes', getAllDishesAdmin);
router.post('/admin', createDish);
router.patch('/admin/:id', updateDish);
router.delete('/admin/:id', deleteDish);

// 用户路由
router.get('/', getDishes);
router.get('/categories', getCategories);
router.get('/:id', getDishById);

module.exports = router;
