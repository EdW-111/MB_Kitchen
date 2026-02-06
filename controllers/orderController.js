const { getAsync, allAsync, runAsync } = require('../config/db');

// 生成订单号
const generateOrderNumber = async () => {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');

  // 获取当天最后一个订单
  const lastOrder = await getAsync(
  `SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1`,
  [`ORD-${dateStr}-%`]
);

  let sequence = 1;
  if (lastOrder) {
    const lastNum = parseInt(lastOrder.order_number.split('-')[2]) || 0;
    sequence = lastNum + 1;
  }

  return `ORD-${dateStr}-${String(sequence).padStart(5, '0')}`;
};

// 创建订单
const createOrder = async (req, res) => {
  try {
    const { items, note, plan_type } = req.body;
    const customerId = req.userId;

    // 验证输入
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '订单必须至少包含一个菜品'
      });
    }

    // 验证套餐类型
    const planPrices = {
      '5': 69.95,
      '10': 119.90
    };

    const validPlan = plan_type && planPrices[plan_type];
    if (!validPlan) {
      return res.status(400).json({
        success: false,
        message: '请选择有效的套餐类型（5顿或10顿）'
      });
    }

    const unitPrice = planPrices[plan_type];
    const totalPrice = unitPrice; // 套餐固定价格

    // 验证菜品是否存在且可用
    const orderItems = [];

    for (const item of items) {
      const dish = await getAsync(
        'SELECT * FROM dishes WHERE id = ? AND is_available = 1',
        [item.dish_id]
      );

      if (!dish) {
        return res.status(400).json({
          success: false,
          message: `菜品 ${item.dish_id} 不存在或已下架`
        });
      }

      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: '菜品数量必须大于0'
        });
      }

      orderItems.push({
        dish_id: item.dish_id,
        quantity: item.quantity,
        unit_price: 0,
        dish_name: dish.name
      });
    }

    // 生成订单号
    const orderNumber = await generateOrderNumber();

    // 创建订单（包含 plan_type）
    const orderResult = await runAsync(
      `INSERT INTO orders (order_number, customer_id, status, note, total_price, plan_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderNumber, customerId, 'submitted', note || null, totalPrice, plan_type]
    );

    const orderId = orderResult.id;

    // 添加订单项
    for (const item of orderItems) {
      await runAsync(
        `INSERT INTO order_items (order_id, dish_id, quantity, unit_price_snapshot)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.dish_id, item.quantity, item.unit_price]
      );
    }

    res.status(201).json({
      success: true,
      message: '订单已提交',
      order: {
        id: orderId,
        order_number: orderNumber,
        created_at: new Date().toISOString(),
        status: 'submitted',
        total_price: totalPrice,
        plan_type: plan_type,
        items_count: orderItems.length
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: '创建订单失败',
      error: error.message
    });
  }
};

// 获取当前用户的所有订单
const getOrders = async (req, res) => {
  try {
    const customerId = req.userId;

    const orders = await allAsync(
      `SELECT
        o.id,
        o.order_number,
        o.status,
        o.note,
        o.created_at,
        o.updated_at,
        o.total_price,
        o.plan_type,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
       FROM orders o
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC`,
      [customerId]
    );

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: '获取订单失败',
      error: error.message
    });
  }
};

// 获取订单详情
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.userId;

    // 获取订单
    const order = await getAsync(
      `SELECT * FROM orders WHERE id = ? AND customer_id = ?`,
      [id, customerId]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 获取订单项
    const items = await allAsync(
      `SELECT
        oi.id,
        oi.dish_id,
        d.name as dish_name,
        d.category,
        oi.quantity
       FROM order_items oi
       LEFT JOIN dishes d ON oi.dish_id = d.id
       WHERE oi.order_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...order,
        items
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: '获取订单详情失败',
      error: error.message
    });
  }
};

// 查看所有订单（餐厅管理员）
const getAllOrders = async (req, res) => {
  try {
    const orders = await allAsync(
      `SELECT
        o.id,
        o.order_number,
        c.full_name as customer_name,
        c.phone,
        o.status,
        o.note,
        o.created_at,
        o.total_price,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count,
        (SELECT GROUP_CONCAT(d.name, ', ') FROM order_items oi
         LEFT JOIN dishes d ON oi.dish_id = d.id
         WHERE oi.order_id = o.id) as items_display
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       ORDER BY o.created_at DESC`,
      []
    );

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: '获取订单失败'
    });
  }
};
// 更新订单状态（管理员）
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['submitted', 'accepted', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的订单状态'
      });
    }

    const order = await getAsync('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    await runAsync(
      `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, id]
    );

    res.json({
      success: true,
      message: '订单状态已更新',
      data: { id, status, updated_at: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: '更新订单状态失败',
      error: error.message
    });
  }
};

// 获取订单详情（管理员）
const getOrderDetailAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // 获取订单和客户信息
    const order = await getAsync(
      `SELECT
        o.id,
        o.order_number,
        o.status,
        o.note,
        o.total_price,
        o.created_at,
        o.updated_at,
        c.id as customer_id,
        c.full_name,
        c.phone,
        c.email,
        c.address,
        c.height,
        c.weight,
        c.additional_info
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 获取订单项（产品详情）
    const items = await allAsync(
      `SELECT
        oi.id,
        oi.dish_id,
        d.name as dish_name,
        d.category,
        d.image_url,
        oi.quantity
       FROM order_items oi
       LEFT JOIN dishes d ON oi.dish_id = d.id
       WHERE oi.order_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...order,
        items
      }
    });
  } catch (error) {
    console.error('Get order detail error:', error);
    res.status(500).json({
      success: false,
      message: '获取订单详情失败',
      error: error.message
    });
  }
};

// 删除订单（管理员）
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await getAsync('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }
    await runAsync('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ success: true, message: '订单已删除' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: '删除订单失败',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  getOrderDetailAdmin,
  deleteOrder
};
