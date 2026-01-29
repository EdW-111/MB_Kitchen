const { getAsync, allAsync, runAsync } = require('../config/db');

// 获取所有菜品（支持分类筛选）
const getDishes = async (req, res) => {
  try {
    const { category } = req.query;

    let sql = 'SELECT * FROM dishes WHERE is_available = 1';
    let params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY category, name';

    const dishes = await allAsync(sql, params);

    res.json({
      success: true,
      data: dishes
    });
  } catch (error) {
    console.error('Get dishes error:', error);
    res.status(500).json({
      success: false,
      message: '获取菜品失败',
      error: error.message
    });
  }
};

// 获取单个菜品详情
const getDishById = async (req, res) => {
  try {
    const { id } = req.params;

    const dish = await getAsync(
      'SELECT * FROM dishes WHERE id = ? AND is_available = 1',
      [id]
    );

    if (!dish) {
      return res.status(404).json({
        success: false,
        message: '菜品不存在或已下架'
      });
    }

    res.json({
      success: true,
      data: dish
    });
  } catch (error) {
    console.error('Get dish error:', error);
    res.status(500).json({
      success: false,
      message: '获取菜品失败',
      error: error.message
    });
  }
};

// 获取所有分类
const getCategories = async (req, res) => {
  try {
    const categories = await allAsync(
      `SELECT DISTINCT category FROM dishes WHERE is_available = 1 ORDER BY category`,
      []
    );

    const categoryLabels = {
      main: '主食',
      snack: '小食',
      drink: '饮品',
      dessert: '甜品'
    };

    const data = categories.map(cat => ({
      value: cat.category,
      label: categoryLabels[cat.category] || cat.category
    }));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: '获取分类失败'
    });
  }
};

// 创建新菜品（管理员）
const createDish = async (req, res) => {
  try {
    const { name, category, description, price } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({
        success: false,
        message: '菜名、分类和价格为必填项'
      });
    }

    const result = await runAsync(
      `INSERT INTO dishes (name, category, description, price, is_available) 
       VALUES (?, ?, ?, ?, 1)`,
      [name, category, description || '', price]
    );

    res.json({
      success: true,
      message: '菜品已创建',
      data: {
        id: result.lastID,
        name,
        category,
        description: description || '',
        price
      }
    });
  } catch (error) {
    console.error('Create dish error:', error);
    res.status(500).json({
      success: false,
      message: '创建菜品失败',
      error: error.message
    });
  }
};

// 更新菜品（管理员）
const updateDish = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, price, is_available } = req.body;

    const dish = await getAsync('SELECT * FROM dishes WHERE id = ?', [id]);
    if (!dish) {
      return res.status(404).json({
        success: false,
        message: '菜品不存在'
      });
    }

    await runAsync(
      `UPDATE dishes SET name = ?, category = ?, description = ?, price = ?, is_available = ? WHERE id = ?`,
      [
        name || dish.name,
        category || dish.category,
        description !== undefined ? description : dish.description,
        price !== undefined ? price : dish.price,
        is_available !== undefined ? is_available : dish.is_available,
        id
      ]
    );

    res.json({
      success: true,
      message: '菜品已更新',
      data: {
        id,
        name: name || dish.name,
        category: category || dish.category,
        price: price !== undefined ? price : dish.price
      }
    });
  } catch (error) {
    console.error('Update dish error:', error);
    res.status(500).json({
      success: false,
      message: '更新菜品失败',
      error: error.message
    });
  }
};

// 删除菜品（管理员）
const deleteDish = async (req, res) => {
  try {
    const { id } = req.params;

    const dish = await getAsync('SELECT * FROM dishes WHERE id = ?', [id]);
    if (!dish) {
      return res.status(404).json({
        success: false,
        message: '菜品不存在'
      });
    }

    await runAsync('DELETE FROM dishes WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '菜品已删除'
    });
  } catch (error) {
    console.error('Delete dish error:', error);
    res.status(500).json({
      success: false,
      message: '删除菜品失败',
      error: error.message
    });
  }
};

// 获取所有菜品（含下架）- 管理员用
const getAllDishesAdmin = async (req, res) => {
  try {
    const dishes = await allAsync(
      `SELECT * FROM dishes ORDER BY category, name`,
      []
    );

    res.json({
      success: true,
      data: dishes || []
    });
  } catch (error) {
    console.error('Get all dishes error:', error);
    res.status(500).json({
      success: false,
      message: '获取菜品列表失败',
      error: error.message
    });
  }
};

module.exports = {
  getDishes,
  getDishById,
  getCategories,
  createDish,
  updateDish,
  deleteDish,
  getAllDishesAdmin
};
