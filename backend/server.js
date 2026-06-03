const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*', methods: ['GET','POST','PUT','DELETE'] } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Upload config
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random()*1e6) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10*1024*1024 } });
app.use('/uploads', express.static(uploadDir));

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// =============================================
// AUTH - Password cứng
// =============================================
const PASSWORDS = { pd: 'pdadmin@2026', qc: 'adminqc@2026', qa: 'admin-qa@2026' };

app.post('/api/auth', (req, res) => {
  const { role, password } = req.body;
  if (PASSWORDS[role] && PASSWORDS[role] === password) {
    return res.json({ success: true, role });
  }
  res.status(401).json({ success: false, message: 'Sai mật khẩu' });
});

// =============================================
// DASHBOARD - Lấy tất cả dữ liệu
// =============================================
app.get('/api/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const [kpi, actionPlan, goodNews, monthlyStar, announcements, productionPlan, shiftSchedule, problems, coa, others, kpiCalendar] = await Promise.all([
      pool.query('SELECT * FROM daily_kpi WHERE date=$1 AND archived=false', [today]),
      pool.query('SELECT * FROM action_plan WHERE archived=false ORDER BY date DESC, created_at DESC LIMIT 20'),
      pool.query('SELECT * FROM good_news WHERE archived=false ORDER BY created_at DESC LIMIT 20'),
      pool.query('SELECT * FROM monthly_star WHERE month=$1 AND year=$2 AND archived=false ORDER BY created_at DESC', [now.getMonth()+1, now.getFullYear()]),
      pool.query('SELECT * FROM announcements WHERE archived=false ORDER BY created_at DESC LIMIT 20'),
      pool.query('SELECT * FROM weekly_production_plan WHERE archived=false ORDER BY updated_at DESC LIMIT 1'),
      pool.query('SELECT * FROM shift_schedule WHERE date=$1 AND archived=false LIMIT 1', [today]),
      pool.query("SELECT * FROM problems WHERE status!='resolved' AND archived=false ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, created_at DESC LIMIT 20"),
      pool.query('SELECT * FROM release_coa WHERE archived=false ORDER BY created_at DESC LIMIT 20'),
      pool.query('SELECT * FROM others WHERE archived=false ORDER BY created_at DESC LIMIT 20'),
      pool.query('SELECT * FROM kpi_calendar WHERE month=$1 AND year=$2', [now.getMonth()+1, now.getFullYear()]),
    ]);
    res.json({
      kpi: kpi.rows, actionPlan: actionPlan.rows, goodNews: goodNews.rows,
      monthlyStar: monthlyStar.rows, announcements: announcements.rows,
      productionPlan: productionPlan.rows[0]||null, shiftSchedule: shiftSchedule.rows[0]||null,
      problems: problems.rows, coa: coa.rows, others: others.rows, kpiCalendar: kpiCalendar.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================
// CRUD APIs
// =============================================

// Helper: generic archive
const archiveItem = (table) => async (req, res) => {
  try {
    const r = await pool.query(`UPDATE ${table} SET archived=true WHERE id=$1 RETURNING *`, [req.params.id]);
    if (r.rows[0]) io.emit(`${table}-archived`, r.rows[0]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- Daily KPI ---
app.get('/api/kpi', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const r = await pool.query('SELECT * FROM daily_kpi WHERE date=$1 AND archived=false ORDER BY kpi_type', [date]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/kpi/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { image_url, updated_by } = req.body;
    const date = new Date().toISOString().split('T')[0];
    const r = await pool.query(
      `INSERT INTO daily_kpi (date,kpi_type,image_url,updated_by,updated_at) VALUES($1,$2,$3,$4,NOW())
       ON CONFLICT(date,kpi_type) DO UPDATE SET image_url=COALESCE($3,daily_kpi.image_url),updated_by=$4,updated_at=NOW() RETURNING *`,
      [date, type, image_url, updated_by]);
    io.emit('kpi-updated', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- KPI Calendar (vòng tròn S/Q/D/C) ---
app.get('/api/kpi-calendar/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth()+1;
    const year = parseInt(req.query.year) || now.getFullYear();
    const r = await pool.query('SELECT * FROM kpi_calendar WHERE kpi_type=$1 AND month=$2 AND year=$3 ORDER BY day,shift', [type,month,year]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/kpi-calendar/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { day, shift, passed, month, year, updated_by, reason } = req.body;
    const now = new Date();
    const m = month || now.getMonth()+1;
    const y = year || now.getFullYear();
    const r = await pool.query(
      `INSERT INTO kpi_calendar(kpi_type,month,year,day,shift,passed,reason,updated_by,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT(kpi_type,year,month,day,shift) DO UPDATE SET passed=$6,reason=$7,updated_by=$8,updated_at=NOW() RETURNING *`,
      [type, m, y, day, shift, passed, reason||null, updated_by]);
    io.emit('kpi-calendar-updated', { ...r.rows[0], kpi_type: type });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Action Plan ---
app.get('/api/action-plan', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM action_plan WHERE archived=false ORDER BY date DESC, created_at DESC');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/action-plan', async (req, res) => {
  try {
    const { date, kpi_topic, phenomenon, rootcause, action, pic, status, created_by } = req.body;
    const r = await pool.query(
      'INSERT INTO action_plan(date,kpi_topic,phenomenon,rootcause,action,pic,status,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [date||new Date().toISOString().split('T')[0], kpi_topic||null, phenomenon, rootcause, action, pic, status||'Open', created_by]);
    io.emit('action-plan-added', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/action-plan/:id', async (req, res) => {
  try {
    const { kpi_topic, phenomenon, rootcause, action, pic, status } = req.body;
    const r = await pool.query(
      'UPDATE action_plan SET kpi_topic=COALESCE($1,kpi_topic),phenomenon=COALESCE($2,phenomenon),rootcause=COALESCE($3,rootcause),action=COALESCE($4,action),pic=COALESCE($5,pic),status=COALESCE($6,status) WHERE id=$7 RETURNING *',
      [kpi_topic, phenomenon, rootcause, action, pic, status, req.params.id]);
    io.emit('action-plan-updated', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/action-plan/:id/archive', archiveItem('action_plan'));

// --- Good News ---
app.get('/api/good-news', async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM good_news WHERE archived=false ORDER BY created_at DESC')).rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/good-news', async (req, res) => {
  try {
    const { content, created_by } = req.body;
    const r = await pool.query('INSERT INTO good_news(content,created_by) VALUES($1,$2) RETURNING *', [content,created_by]);
    io.emit('good-news-added', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/good-news/:id/archive', archiveItem('good_news'));

// --- Monthly Star ---
app.get('/api/monthly-star', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM monthly_star WHERE month=EXTRACT(MONTH FROM CURRENT_DATE) AND year=EXTRACT(YEAR FROM CURRENT_DATE) AND archived=false ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/monthly-star', async (req, res) => {
  try {
    const { employee_name, employee_image, content, created_by } = req.body;
    const now = new Date();
    const r = await pool.query(
      'INSERT INTO monthly_star(month,year,employee_name,employee_image,content,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [now.getMonth()+1, now.getFullYear(), employee_name, employee_image, content, created_by]);
    io.emit('monthly-star-added', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/monthly-star/:id/archive', archiveItem('monthly_star'));

// --- Announcements ---
app.get('/api/announcements', async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM announcements WHERE archived=false ORDER BY created_at DESC')).rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/announcements', async (req, res) => {
  try {
    const { content, created_by } = req.body;
    const r = await pool.query('INSERT INTO announcements(content,created_by) VALUES($1,$2) RETURNING *', [content,created_by]);
    io.emit('announcement-added', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/announcements/:id/archive', archiveItem('announcements'));

// --- Production Plan ---
app.get('/api/production-plan', async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM weekly_production_plan WHERE archived=false ORDER BY updated_at DESC LIMIT 1')).rows[0]||null); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/production-plan', async (req, res) => {
  try {
    const { week_start, week_end, image_url, notes, updated_by } = req.body;
    const r = await pool.query(
      'INSERT INTO weekly_production_plan(week_start,week_end,image_url,notes,updated_by,updated_at) VALUES($1,$2,$3,$4,$5,NOW()) RETURNING *',
      [week_start, week_end, image_url, notes, updated_by]);
    io.emit('production-plan-updated', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Shift Schedule ---
app.get('/api/shift-schedule', async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM shift_schedule WHERE date=CURRENT_DATE AND archived=false LIMIT 1')).rows[0]||null); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/shift-schedule', async (req, res) => {
  try {
    const { image_url, notes, updated_by } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const r = await pool.query(
      `INSERT INTO shift_schedule(date,image_url,notes,updated_by,updated_at) VALUES($1,$2,$3,$4,NOW())
       ON CONFLICT(date) DO UPDATE SET image_url=$2,notes=$3,updated_by=$4,updated_at=NOW() RETURNING *`,
      [today, image_url, notes, updated_by]);
    io.emit('shift-schedule-updated', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Release COA ---
app.get('/api/coa', async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM release_coa WHERE archived=false ORDER BY created_at DESC')).rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/coa', async (req, res) => {
  try {
    const { product, batch_number, stage, submit_coa, approve_coa, created_by } = req.body;
    const r = await pool.query(
      'INSERT INTO release_coa(product,batch_number,stage,submit_coa,approve_coa,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [product, batch_number, stage||'', submit_coa||'', approve_coa||'', created_by]);
    io.emit('coa-added', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/coa/:id', async (req, res) => {
  try {
    const { product, batch_number, stage, submit_coa, approve_coa, updated_by } = req.body;
    const r = await pool.query(
      'UPDATE release_coa SET product=COALESCE($1,product),batch_number=COALESCE($2,batch_number),stage=COALESCE($3,stage),submit_coa=COALESCE($4,submit_coa),approve_coa=COALESCE($5,approve_coa),updated_by=$6,updated_at=NOW() WHERE id=$7 RETURNING *',
      [product, batch_number, stage, submit_coa, approve_coa, updated_by, req.params.id]);
    io.emit('coa-updated', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/coa/:id/archive', archiveItem('release_coa'));

// --- Problems ---
app.get('/api/problems', async (req, res) => {
  try { res.json((await pool.query("SELECT * FROM problems WHERE status!='resolved' AND archived=false ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, created_at DESC LIMIT 20")).rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/problems', async (req, res) => {
  try {
    const { department, description, severity, reported_by } = req.body;
    const r = await pool.query('INSERT INTO problems(department,description,severity,reported_by) VALUES($1,$2,$3,$4) RETURNING *',
      [department, description, severity||'info', reported_by]);
    io.emit('new-problem', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/problems/:id/resolve', async (req, res) => {
  try {
    const r = await pool.query("UPDATE problems SET status='resolved',resolved_at=NOW() WHERE id=$1 RETURNING *", [req.params.id]);
    io.emit('problem-resolved', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/problems/:id/archive', archiveItem('problems'));

// --- Others ---
app.get('/api/others', async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM others WHERE archived=false ORDER BY created_at DESC')).rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/others', async (req, res) => {
  try {
    const { content, created_by } = req.body;
    const r = await pool.query('INSERT INTO others(content,created_by) VALUES($1,$2) RETURNING *', [content,created_by]);
    io.emit('others-added', r.rows[0]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/others/:id/archive', archiveItem('others'));

// --- Archive ALL (kết thúc ngày) ---
app.post('/api/archive-all', async (req, res) => {
  try {
    await Promise.all([
      pool.query('UPDATE good_news SET archived=true WHERE archived=false'),
      pool.query('UPDATE announcements SET archived=true WHERE archived=false'),
      pool.query('UPDATE problems SET archived=true WHERE archived=false'),
      pool.query('UPDATE others SET archived=true WHERE archived=false'),
      pool.query('UPDATE action_plan SET archived=true WHERE archived=false'),
      pool.query('UPDATE release_coa SET archived=true WHERE archived=false'),
      pool.query('UPDATE daily_kpi SET archived=true WHERE archived=false'),
      pool.query('UPDATE weekly_production_plan SET archived=true WHERE archived=false'),
      pool.query('UPDATE shift_schedule SET archived=true WHERE archived=false'),
    ]);
    io.emit('all-archived');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================
// SOCKET.IO
// =============================================
io.on('connection', (socket) => {
  console.log(`✅ Client kết nối: ${socket.id}`);
  socket.on('disconnect', () => console.log(`❌ Client ngắt: ${socket.id}`));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Backend: http://0.0.0.0:${PORT}`));
