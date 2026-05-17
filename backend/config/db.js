const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'production_dashboard',
  user: process.env.DB_USER || 'dashboard_user',
  password: process.env.DB_PASSWORD || 'dashboard_pass_2024',
});

pool.on('connect', () => {
  console.log('✅ Kết nối PostgreSQL thành công');
});

pool.on('error', (err) => {
  console.error('❌ Lỗi PostgreSQL:', err);
});

module.exports = pool;
