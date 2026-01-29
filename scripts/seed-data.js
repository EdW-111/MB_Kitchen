const { runAsync, getAsync } = require('../config/db');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  try {
    console.log('🌱 插入种子数据...');

    // 清空现有数据（开发用）
    // await runAsync('DELETE FROM order_items');
    // await runAsync('DELETE FROM orders');
    // await runAsync('DELETE FROM dishes');
    // await runAsync('DELETE FROM customers');

    // 插入菜品数据
    const dishes = [
      // 主食 (main)
      {
        name: '红油抄手',
        category: 'main',
        price: 12.99,
        description: '四川传统小食，麻辣鲜香，咬破后麻油四溅',
        image_url: null
      },
      {
        name: '担担面',
        category: 'main',
        price: 11.50,
        description: '正宗四川担担面，芝麻油香，肉末鲜，面劲道',
        image_url: null
      },
      {
        name: '宫保鸡丁',
        category: 'main',
        price: 13.99,
        description: '花生、鸡丁、干辣椒完美搭配，酸甜适度',
        image_url: null
      },
      {
        name: '麻婆豆腐',
        category: 'main',
        price: 10.99,
        description: '豆腐嫩滑，麻辣味道十足，下饭一绝',
        image_url: null
      },
      // 小食 (snack)
      {
        name: '春卷（4个）',
        category: 'snack',
        price: 8.99,
        description: '金黄酥脆，馅料丰富，蘸酱食用更佳',
        image_url: null
      },
      {
        name: '油炸花生米',
        category: 'snack',
        price: 6.99,
        description: '香脆可口，越吃越香，是下酒最好的选择',
        image_url: null
      },
      {
        name: '清汤水饺（10个）',
        category: 'snack',
        price: 9.99,
        description: '猪肉白菜馅，鲜美多汁，汤清味鲜',
        image_url: null
      },
      // 饮品 (drink)
      {
        name: '冰红茶',
        category: 'drink',
        price: 3.99,
        description: '冰爽解腻，清凉祛暑',
        image_url: null
      },
      {
        name: '豆浆',
        category: 'drink',
        price: 3.49,
        description: '现磨豆浆，香浓滑口',
        image_url: null
      },
      {
        name: '鲜榨果汁',
        category: 'drink',
        price: 5.99,
        description: '新鲜水果现榨，健康营养',
        image_url: null
      },
      // 甜品 (dessert)
      {
        name: '杨枝甘露',
        category: 'dessert',
        price: 7.99,
        description: '芒果、椰汁、西米的完美结合，甜蜜冰爽',
        image_url: null
      },
      {
        name: '红豆薏米粥',
        category: 'dessert',
        price: 6.99,
        description: '清热祛湿，甜美滋补',
        image_url: null
      }
    ];

    for (const dish of dishes) {
      const exists = await getAsync(
        'SELECT id FROM dishes WHERE name = ?',
        [dish.name]
      );
      
      if (!exists) {
        await runAsync(
          `INSERT INTO dishes (name, category, price, description, image_url, is_available)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [dish.name, dish.category, dish.price, dish.description, dish.image_url]
        );
      }
    }
    console.log(`✅ 插入了 ${dishes.length} 个菜品`);

    // 插入示例用户
    const testUser = {
      full_name: '张三',
      phone: '13800138000',
      email: 'user1@example.com',
      password: '123456'
    };

    const existingUser = await getAsync(
      'SELECT id FROM customers WHERE phone = ?',
      [testUser.phone]
    );

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      await runAsync(
        `INSERT INTO customers (full_name, phone, email, password_hash)
         VALUES (?, ?, ?, ?)`,
        [testUser.full_name, testUser.phone, testUser.email, hashedPassword]
      );
      console.log('✅ 插入了测试用户 (13800138000 / 123456)');
    }

    console.log('✨ 种子数据插入完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 插入失败:', error.message);
    process.exit(1);
  }
};

seedData();
