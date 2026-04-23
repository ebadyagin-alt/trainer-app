require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── CLIENTS ──────────────────────────────────────────────────────────────────
app.get('/api/clients', async (req, res) => res.json(await db.getClients()));

app.post('/api/clients', async (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'Имя обязательно' });
  res.status(201).json(await db.createClient(req.body));
});

app.get('/api/clients/:id', async (req, res) => {
  const c = await db.getClient(req.params.id);
  if (!c) return res.status(404).json({ error: 'Клиент не найден' });
  res.json(c);
});

app.put('/api/clients/:id', async (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'Имя обязательно' });
  res.json(await db.updateClient(req.params.id, req.body));
});

app.delete('/api/clients/:id', async (req, res) => {
  await db.deleteClient(req.params.id);
  res.json({ ok: true });
});

// ── APPOINTMENTS ─────────────────────────────────────────────────────────────
app.get('/api/appointments', async (req, res) => {
  res.json(await db.getAppointments(req.query.from, req.query.to));
});

app.post('/api/appointments', async (req, res) => {
  const { client_id, date, time } = req.body;
  if (!client_id || !date || !time) return res.status(400).json({ error: 'Клиент, дата и время обязательны' });
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
app.get('/api/sessions', async (req, res) => res.json(await db.getSessions()));

app.get('/api/sessions/client/:clientId', async (req, res) => {
  res.json(await db.getSessions(req.params.clientId));
});

app.post('/api/sessions', async (req, res) => {
  if (!req.body.client_id || !req.body.date) return res.status(400).json({ error: 'Клиент и дата обязательны' });
  res.status(201).json(await db.createSession(req.body));
});

app.delete('/api/sessions/:id', async (req, res) => {
  await db.deleteSession(req.params.id);
  res.json({ ok: true });
});

// ── PAYMENTS ─────────────────────────────────────────────────────────────────
app.get('/api/payments', async (req, res) => res.json(await db.getPayments()));

app.get('/api/payments/summary', async (req, res) => res.json(await db.getPaymentSummary()));

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

// ── CLIENT PORTAL API ────────────────────────────────────────────────────────
app.get('/api/portal/:token', async (req, res) => {
  const client = await db.getClientByToken(req.params.token);
  if (!client) return res.status(404).json({ error: 'Ссылка недействительна' });
  const [appointments, sessions, payments] = await Promise.all([
    db.getClientAppointments(client.id),
    db.getSessions(client.id),
    db.getPayments(client.id)
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

// Клиент открывает портал по ссылке /client/:token
app.get('/client/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'client.html'));
});

// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

db.init().then(() => {
  app.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));
}).catch(err => {
  console.error('Ошибка подключения к БД:', err.message);
  process.exit(1);
});
