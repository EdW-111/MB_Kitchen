const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './database.db';
const fullPath = path.resolve(dbPath);

console.log('📋 Database Diagnostic Report');
console.log('================================');
console.log(`Database path: ${dbPath}`);
console.log(`Full path: ${fullPath}`);
console.log(`Environment: ${process.env.NODE_ENV}`);

// Check if database file exists
if (fs.existsSync(fullPath)) {
  const stats = fs.statSync(fullPath);
  console.log(`✅ Database file exists`);
  console.log(`   Size: ${stats.size} bytes`);
  console.log(`   Created: ${stats.birthtimeMs}`);
  console.log(`   Modified: ${stats.mtimeMs}`);
  console.log(`   Readable: ${fs.constants.R_OK & fs.accessSync(fullPath, fs.constants.R_OK) === 0}`);
  console.log(`   Writable: ${fs.constants.W_OK & fs.accessSync(fullPath, fs.constants.W_OK) === 0}`);
} else {
  console.log(`❌ Database file does NOT exist at ${fullPath}`);
  
  // Check if directory is writable
  const dir = path.dirname(fullPath);
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    console.log(`✅ Directory ${dir} is writable`);
  } catch (e) {
    console.log(`❌ Directory ${dir} is NOT writable`);
  }
}

// Try to connect
console.log('\nTrying to connect to database...');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.log(`❌ Connection failed: ${err.message}`);
    process.exit(1);
  } else {
    console.log('✅ Successfully connected to database');
    
    // Check tables
    db.all(`SELECT name FROM sqlite_master WHERE type='table'`, [], (err, rows) => {
      if (err) {
        console.log(`❌ Error querying tables: ${err.message}`);
      } else {
        console.log(`✅ Found ${rows.length} tables:`);
        rows.forEach(row => console.log(`   - ${row.name}`));
      }
      db.close();
    });
  }
});
