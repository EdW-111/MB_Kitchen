const { runAsync } = require('../config/db');

const clearDishes = async () => {
  try {
    console.log('🔧 清除所有菜品...');

    await runAsync('DELETE FROM dishes', []);

    console.log('✅ 所有菜品已清除');
    console.log('✨ 操作完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 清除失败:', error.message);
    process.exit(1);
  }
};

clearDishes();
