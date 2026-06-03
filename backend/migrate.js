const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function migrate() {
  // Tạo bảng tracking migrations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Đọc tất cả file migration
  const dir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(dir)) {
    console.log('No migrations folder found');
    return;
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    // Kiểm tra đã chạy chưa
    const done = await pool.query('SELECT id FROM migrations WHERE name=$1', [file]);
    if (done.rows.length > 0) {
      console.log(`⏭  Skipped: ${file} (already executed)`);
      continue;
    }

    // Chạy migration
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO migrations(name) VALUES($1)', [file]);
      console.log(`✅ Executed: ${file}`);
    } catch (err) {
      console.error(`❌ Failed: ${file}`, err.message);
      process.exit(1);
    }
  }

  console.log('🎉 All migrations done');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
