# 📊 常用 SQL 查询

在终端中使用 SQLite3 直接查询数据库：

```bash
sqlite3 database.db
```

## 查看表结构

```sql
-- 查看所有表
.tables

-- 查看菜品表结构
.schema dishes

-- 查看订单表结构
.schema orders
```

## 用户相关

```sql
-- 查看所有用户
SELECT id, full_name, phone, email, created_at FROM customers;

-- 查看特定用户
SELECT * FROM customers WHERE phone = '13800138000';

-- 修改用户信息
UPDATE customers SET full_name = '李四' WHERE id = 1;

-- 删除用户
DELETE FROM customers WHERE id = 1;
```

## 菜品相关

```sql
-- 查看所有菜品
SELECT id, name, category, price, is_available FROM dishes;

-- 按分类查看
SELECT id, name, price FROM dishes WHERE category = 'main';

-- 查看可用菜品（下架的不显示）
SELECT * FROM dishes WHERE is_available = 1;

-- 添加新菜品
INSERT INTO dishes (name, category, price, description, is_available)
VALUES ('水煮鱼', 'main', 14.99, '麻辣鲜香，鱼肉鲜嫩', 1);

-- 修改菜品价格
UPDATE dishes SET price = 15.99 WHERE id = 1;

-- 下架菜品
UPDATE dishes SET is_available = 0 WHERE id = 5;

-- 上架菜品
UPDATE dishes SET is_available = 1 WHERE id = 5;

-- 删除菜品
DELETE FROM dishes WHERE id = 100;
```

## 订单相关

```sql
-- 查看所有订单
SELECT * FROM orders ORDER BY created_at DESC;

-- 查看今天的订单
SELECT order_number, customer_id, status, created_at
FROM orders
WHERE date(created_at) = date('now')
ORDER BY created_at DESC;

-- 查看特定客户的订单
SELECT * FROM orders WHERE customer_id = 1 ORDER BY created_at DESC;

-- 统计订单状态
SELECT status, COUNT(*) as count FROM orders GROUP BY status;

-- 计算总营收
SELECT SUM(
  (SELECT SUM(quantity * unit_price_snapshot) FROM order_items WHERE order_id = orders.id)
) as total_revenue
FROM orders;

-- 查看订单详情（包含菜品）
SELECT 
  o.order_number,
  c.full_name,
  c.phone,
  oi.quantity,
  d.name,
  oi.unit_price_snapshot,
  (oi.quantity * oi.unit_price_snapshot) as subtotal
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN dishes d ON oi.dish_id = d.id
WHERE o.id = 1
ORDER BY oi.id;

-- 修改订单状态
UPDATE orders SET status = 'accepted', updated_at = CURRENT_TIMESTAMP 
WHERE order_number = 'ORD-20250127-00001';

-- 取消订单
UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
WHERE id = 1;

-- 查看订单最多的客户
SELECT c.full_name, COUNT(o.id) as order_count, SUM(oi.quantity * oi.unit_price_snapshot) as total_spent
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY c.id
ORDER BY order_count DESC
LIMIT 10;
```

## 订单项目相关

```sql
-- 查看订单的所有项目
SELECT * FROM order_items WHERE order_id = 1;

-- 查看最受欢迎的菜品
SELECT d.name, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.unit_price_snapshot) as revenue
FROM order_items oi
LEFT JOIN dishes d ON oi.dish_id = d.id
GROUP BY oi.dish_id
ORDER BY total_sold DESC;

-- 统计菜品销售
SELECT 
  d.category,
  d.name,
  COUNT(oi.id) as times_ordered,
  SUM(oi.quantity) as qty_sold
FROM order_items oi
LEFT JOIN dishes d ON oi.dish_id = d.id
GROUP BY oi.dish_id
ORDER BY qty_sold DESC;
```

## 统计分析

```sql
-- 日均订单数
SELECT 
  DATE(created_at) as date,
  COUNT(*) as order_count,
  ROUND(AVG((SELECT SUM(quantity * unit_price_snapshot) FROM order_items WHERE order_id = orders.id)), 2) as avg_order_value
FROM orders
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 高频客户
SELECT c.full_name, c.phone, COUNT(o.id) as orders, 
ROUND(SUM(oi.quantity * oi.unit_price_snapshot), 2) as spent
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at > datetime('now', '-30 days')
GROUP BY c.id
ORDER BY orders DESC
LIMIT 20;

-- 按小时统计订单
SELECT strftime('%H:00', created_at) as hour, COUNT(*) as count
FROM orders
WHERE date(created_at) = date('now')
GROUP BY strftime('%H', created_at)
ORDER BY hour;

-- 周订单统计
SELECT 
  strftime('%Y-W%W', created_at) as week,
  COUNT(*) as order_count,
  SUM(oi.quantity * oi.unit_price_snapshot) as revenue
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY week
ORDER BY week DESC
LIMIT 12;
```

## 数据管理

```sql
-- 导出数据为 CSV
.mode csv
.output orders_export.csv
SELECT * FROM orders;
.output stdout

-- 清空数据（谨慎！）
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM dishes;
DELETE FROM customers;

-- 重置自增 ID
DELETE FROM sqlite_sequence;
```

## 常用命令

```bash
# 从文件导入 SQL
sqlite3 database.db < query.sql

# 导出数据
sqlite3 database.db ".dump" > backup.sql

# 备份数据库
cp database.db database_backup_$(date +%Y%m%d).db

# 恢复备份
cp database_backup_20250127.db database.db
```

## 示例数据查询

```sql
-- 显示最近 5 个订单及其详情
SELECT 
  o.order_number,
  c.full_name,
  o.created_at,
  o.status,
  COUNT(DISTINCT oi.id) as items_count,
  ROUND(SUM(oi.quantity * oi.unit_price_snapshot), 2) as total
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id
ORDER BY o.created_at DESC
LIMIT 5;

-- 今日营业统计
SELECT 
  COUNT(DISTINCT customer_id) as unique_customers,
  COUNT(*) as total_orders,
  COUNT(DISTINCT dish_id) as dishes_sold,
  ROUND(SUM(quantity * unit_price_snapshot), 2) as total_revenue
FROM order_items
WHERE DATE(created_at) = DATE('now');
```

---

**提示：** 
- 在 SQLite CLI 中输入 `.help` 查看所有命令
- 输入 `.quit` 或 `.exit` 退出
- 大多数查询可以直接从后端的 getAllOrders API 获取
