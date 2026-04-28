require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'trainer-jwt-secret-2024';

// Serve from dist/ (React build) if it exists, otherwise fall back to public/
const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');
const useReact = fs.existsSync(distDir) && fs.existsSync(path.join(distDir, 'index.html'));
const staticDir = useReact ? distDir : publicDir;

app.use(express.json());
app.use(express.static(staticDir));

// ── AUTH ROUTES (unprotected) ─────────────────────────────────────────────────
// For the React SPA, all non-API routes serve index.html (client-side routing)
app.get('/login', (req, res) => res.sendFile(path.join(staticDir, 'index.html')));

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });
  const trainer = await db.getTrainerByEmail(email.toLowerCase().trim());
  if (!trainer) return res.status(401).json({ error: 'Неверный email или пароль' });
  const ok = await bcrypt.compare(password, trainer.password_hash);
  if (!ok) return res.status(401).json({ error: 'Неверный email или пароль' });
  const token = jwt.sign(
    { id: trainer.id, name: trainer.name, email: trainer.email, role: trainer.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.json({ token, trainer: { id: trainer.id, name: trainer.name, role: trainer.role } });
});

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Не авторизован' });
  try {
    req.trainer = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен' });
  }
}

function adminOnly(req, res, next) {
  if (req.trainer.role !== 'admin') return res.status(403).json({ error: 'Нет доступа' });
  next();
}

app.use('/api', auth);

// ── ME ────────────────────────────────────────────────────────────────────────
app.get('/api/auth/me', (req, res) => res.json(req.trainer));


// ── TRAINERS (admin only) ─────────────────────────────────────────────────────
app.get('/api/trainers', adminOnly, async (req, res) => {
  res.json(await db.getTrainers());
});

app.post('/api/trainers', adminOnly, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Имя, email и пароль обязательны' });
  try {
    res.status(201).json(await db.createTrainer({ name, email, password, role }));
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email уже используется' });
    throw e;
  }
});

app.delete('/api/trainers/:id', adminOnly, async (req, res) => {
  if (Number(req.params.id) === req.trainer.id)
    return res.status(400).json({ error: 'Нельзя удалить себя' });
  await db.deleteTrainer(req.params.id);
  res.json({ ok: true });
});

// ── CLIENTS ──────────────────────────────────────────────────────────────────
app.get('/api/clients', async (req, res) => res.json(await db.getClients(req.trainer)));

app.post('/api/clients', async (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'Имя обязательно' });
  const trainer_id = req.trainer.role === 'admin'
    ? (req.body.trainer_id || null)
    : req.trainer.id;
  res.status(201).json(await db.createClient({ ...req.body, trainer_id }));
});

app.get('/api/clients/:id', async (req, res) => {
  const c = await db.getClient(req.params.id);
  if (!c) return res.status(404).json({ error: 'Клиент не найден' });
  res.json(c);
});

app.put('/api/clients/:id', async (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'Имя обязательно' });
  const trainer_id = req.trainer.role === 'admin'
    ? (req.body.trainer_id !== undefined ? req.body.trainer_id : undefined)
    : req.trainer.id;
  res.json(await db.updateClient(req.params.id, { ...req.body, trainer_id }));
});

app.delete('/api/clients/:id', async (req, res) => {
  await db.deleteClient(req.params.id);
  res.json({ ok: true });
});

// ── APPOINTMENTS ─────────────────────────────────────────────────────────────
app.get('/api/appointments', async (req, res) => {
  res.json(await db.getAppointments(req.query.from, req.query.to, req.trainer));
});

app.post('/api/appointments', async (req, res) => {
  const { client_id, date, time } = req.body;
  if (!client_id || !date || !time)
    return res.status(400).json({ error: 'Клиент, дата и время обязательны' });
  res.status(201).json(await db.createAppointment(req.body));
});

app.put('/api/appointments/:id', async (req, res) => {
  res.json(await db.updateAppointment(req.params.id, req.body));
});

app.delete('/api/appointments/:id', async (req, res) => {
  await db.deleteAppointment(req.params.id);
  res.json({ ok: true });
});

// ── SESSIONS ─────────────────────────────────────────────────────────────────
app.get('/api/sessions', async (req, res) => {
  res.json(await db.getSessions(null, req.trainer));
});

app.get('/api/sessions/client/:clientId', async (req, res) => {
  res.json(await db.getSessions(req.params.clientId, req.trainer));
});

app.post('/api/sessions', async (req, res) => {
  if (!req.body.client_id || !req.body.date)
    return res.status(400).json({ error: 'Клиент и дата обязательны' });
  res.status(201).json(await db.createSession(req.body));
});

app.put('/api/sessions/:id', async (req, res) => {
  res.json(await db.updateSession(req.params.id, req.body));
});

app.delete('/api/sessions/:id', async (req, res) => {
  await db.deleteSession(req.params.id);
  res.json({ ok: true });
});

// ── PAYMENTS ─────────────────────────────────────────────────────────────────
app.get('/api/payments', async (req, res) => {
  res.json(await db.getPayments(null, req.trainer));
});

app.get('/api/payments/summary', async (req, res) => {
  res.json(await db.getPaymentSummary(req.trainer));
});

app.post('/api/payments', async (req, res) => {
  if (!req.body.client_id || !req.body.amount || !req.body.date)
    return res.status(400).json({ error: 'Клиент, сумма и дата обязательны' });
  res.status(201).json(await db.createPayment(req.body));
});

app.put('/api/payments/:id', async (req, res) => {
  res.json(await db.updatePayment(req.params.id, req.body));
});

app.delete('/api/payments/:id', async (req, res) => {
  await db.deletePayment(req.params.id);
  res.json({ ok: true });
});

// ── TEMPLATES ─────────────────────────────────────────────────────────────────
app.get('/api/templates', async (req, res) => {
  res.json(await db.getTemplates(req.trainer));
});

app.post('/api/templates', async (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'Название обязательно' });
  res.status(201).json(await db.createTemplate({
    trainer_id: req.trainer.id,
    name: req.body.name,
    exercises: req.body.exercises || []
  }));
});

app.delete('/api/templates/:id', async (req, res) => {
  await db.deleteTemplate(req.params.id);
  res.json({ ok: true });
});

// ── CLIENT PORTAL API (unprotected) ──────────────────────────────────────────
app.get('/api/portal/:token', async (req, res) => {
  const client = await db.getClientByToken(req.params.token);
  if (!client) return res.status(404).json({ error: 'Ссылка недействительна' });
  const [appointments, sessions, payments] = await Promise.all([
    db.getClientAppointments(client.id),
    db.getSessions(client.id, null),
    db.getPayments(client.id, null)
  ]);
  res.json({ client, appointments, sessions, payments });
});

app.post('/api/portal/:token/appointments', async (req, res) => {
  const client = await db.getClientByToken(req.params.token);
  if (!client) return res.status(404).json({ error: 'Ссылка недействительна' });
  const { date, time, duration, notes } = req.body;
  if (!date || !time) return res.status(400).json({ error: 'Дата и время обязательны' });
  res.status(201).json(await db.createAppointment({
    client_id: client.id, date, time, duration, status: 'pending', notes
  }));
});

app.get('/client/:token', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// Catch-all: serve the SPA for any non-API route (React Router handles client-side routing)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(staticDir, 'index.html'));
});

// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

db.init().then(() => {
  app.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));
}).catch(err => {
  console.error('Ошибка подключения к БД:', err.message);
  process.exit(1);
});
