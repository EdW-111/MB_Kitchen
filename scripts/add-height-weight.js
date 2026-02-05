const { runAsync } = require('../config/db');

const addHeightWeightColumns = async () => {
  try {
    console.log('🔄 添加身高体重字段到 customers 表...');
    
    // 检查列是否已存在
    const { db } = require('../config/db');
    
    // SQLite 中添加列
    await runAsync(`
      ALTER TABLE customers 
      ADD COLUMN height REAL DEFAULT 0
    `).catch(() => console.log('height 列已存在'));
    
    await runAsync(`
      ALTER TABLE customers 
      ADD COLUMN weight REAL DEFAULT 0
    `).catch(() => console.log('weight 列已存在'));
    
    console.log('✅ 字段添加成功！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误：', error.message);
    process.exit(1);
  }
};

addHeightWeightColumns();