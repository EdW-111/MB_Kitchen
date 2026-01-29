const { getAsync, allAsync, runAsync } = require('../config/db');

// 获取所有用户
const getAllUsers = async (req, res) => {
  try {
    const users = await allAsync(
      `SELECT id, phone, full_name,
        (SELECT COUNT(*) FROM orders WHERE customer_id = customers.id) as order_count,
        (SELECT SUM(oi.quantity * oi.unit_price_snapshot) 
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.customer_id = customers.id) as total_spent
      FROM customers
      order by id DESC`,
      
    );

    res.json({
      success: true,
      data: users.map(user => ({
        ...user,
        address: '-',
        created_at: new Date().toISOString(),
        order_count: user.order_count || 0,
        total_spent: user.total_spent || 0
      }))
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    });
  }
};

// 获取单个用户详情
const getUserDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await getAsync(
      `SELECT 
        id,
        phone,
        full_name
       FROM customers WHERE id = ?`,
      [id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 获取用户的订单
    const orders = await allAsync(
      `SELECT 
        id,
        order_number,
        status,
        total_price,
        created_at
       FROM orders 
       WHERE customer_id = ?
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...user,
        address: '-',
        created_at: new Date().toISOString(),
        orders: orders || []
      }
    });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户详情失败',
      error: error.message
    });
  }
};

// 删除用户
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await getAsync('SELECT * FROM customers WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 删除用户相关的订单
    await runAsync('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_id = ?)', [id]);
    await runAsync('DELETE FROM orders WHERE customer_id = ?', [id]);
    await runAsync('DELETE FROM customers WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '用户已删除'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserDetail,
  deleteUser
};
