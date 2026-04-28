require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is not set!');
  process.exit(1);
}

const isLocal = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trainers (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT DEFAULT 'trainer',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS clients (
      id           SERIAL PRIMARY KEY,
      name         TEXT NOT NULL,
      phone        TEXT DEFAULT '',
      email        TEXT DEFAULT '',
      goals        TEXT DEFAULT '',
      notes        TEXT DEFAULT '',
      invite_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id         SERIAL PRIMARY KEY,
      client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      date       DATE NOT NULL,
      time       TIME NOT NULL,
      duration   INTEGER DEFAULT 60,
      status     TEXT DEFAULT 'scheduled',
      notes      TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id             SERIAL PRIMARY KEY,
      client_id      INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      date           DATE NOT NULL,
      exercises      JSONB DEFAULT '[]',
      notes          TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS payments (
      id          SERIAL PRIMARY KEY,
      client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      amount      NUMERIC(10,2) NOT NULL,
      date        DATE NOT NULL,
      description TEXT DEFAULT '',
      paid        BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS templates (
      id         SERIAL PRIMARY KEY,
      trainer_id INTEGER REFERENCES trainers(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      exercises  JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS trainer_id INTEGER REFERENCES trainers(id) ON DELETE SET NULL;
  `);

  const { rows } = await pool.query('SELECT COUNT(*) FROM trainers');
  if (Number(rows[0].count) === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO trainers(name,email,password_hash,role) VALUES($1,$2,$3,$4)`,
      ['Администратор', 'admin@trainer.app', hash, 'admin']
    );
    console.log('✅ Создан администратор: admin@trainer.app / admin123');
  }

  console.log('БД инициализирована');
}

const q = (sql, params) => pool.query(sql, params);

// ── TRAINERS ──────────────────────────────────────────────────────────────────
async function getTrainerByEmail(email) {
  const { rows } = await q('SELECT * FROM trainers WHERE email=$1', [email]);
  return rows[0] || null;
}

async function getTrainers() {
  const { rows } = await q('SELECT id,name,email,role,created_at FROM trainers ORDER BY name');
  return rows;
}

async function createTrainer({ name, email, password, role }) {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await q(
    `INSERT INTO trainers(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role,created_at`,
    [name, email, hash, role || 'trainer']
  );
  return rows[0];
}

async function deleteTrainer(id) {
  await q('DELETE FROM trainers WHERE id=$1', [id]);
}

// ── CLIENTS ──────────────────────────────────────────────────────────────────
async function getClients(trainer) {
  let sql = 'SELECT * FROM clients';
  const params = [];
  if (trainer && trainer.role !== 'admin') {
    sql += ' WHERE trainer_id=$1';
    params.push(trainer.id);
  }
  sql += ' ORDER BY name';
  const { rows } = await q(sql, params);
  return rows;
}

async function getClient(id) {
  const { rows } = await q('SELECT * FROM clients WHERE id=$1', [id]);
  return rows[0] || null;
}

async function getClientByToken(token) {
  const { rows } = await q('SELECT * FROM clients WHERE invite_token=$1', [token]);
  return rows[0] || null;
}

async function createClient({ name, phone, email, goals, notes, trainer_id }) {
  const { rows } = await q(
    `INSERT INTO clients(name,phone,email,goals,notes,trainer_id)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, phone||'', email||'', goals||'', notes||'', trainer_id||null]
  );
  return rows[0];
}

async function updateClient(id, { name, phone, email, goals, notes, trainer_id }) {
  const { rows } = await q(
    `UPDATE clients SET name=$1,phone=$2,email=$3,goals=$4,notes=$5,trainer_id=$6
     WHERE id=$7 RETURNING *`,
    [name, phone||'', email||'', goals||'', notes||'', trainer_id||null, id]
  );
  return rows[0];
}

async function deleteClient(id) {
  await q('DELETE FROM clients WHERE id=$1', [id]);
}

// ── APPOINTMENTS ─────────────────────────────────────────────────────────────
async function getAppointments(from, to, trainer) {
  let sql = `SELECT a.*, c.name as client_name FROM appointments a
             JOIN clients c ON a.client_id=c.id`;
  const params = [];
  const conditions = [];
  if (from && to) { params.push(from, to); conditions.push(`a.date BETWEEN $${params.length-1} AND $${params.length}`); }
  if (trainer && trainer.role !== 'admin') { params.push(trainer.id); conditions.push(`c.trainer_id=$${params.length}`); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY a.date, a.time';
  const { rows } = await q(sql, params);
  return rows;
}

async function getClientAppointments(clientId) {
  const { rows } = await q(
    `SELECT a.*, c.name as client_name FROM appointments a
     JOIN clients c ON a.client_id=c.id
     WHERE a.client_id=$1 ORDER BY a.date DESC, a.time DESC`,
    [clientId]
  );
  return rows;
}

async function createAppointment({ client_id, date, time, duration, status, notes }) {
  const { rows } = await q(
    `INSERT INTO appointments(client_id,date,time,duration,status,notes)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [client_id, date, time, duration||60, status||'scheduled', notes||'']
  );
  const appt = rows[0];
  const client = await getClient(appt.client_id);
  return { ...appt, client_name: client?.name || '?' };
}

async function updateAppointment(id, { client_id, date, time, duration, status, notes }) {
  const { rows } = await q(
    `UPDATE appointments SET client_id=$1,date=$2,time=$3,duration=$4,status=$5,notes=$6
     WHERE id=$7 RETURNING *`,
    [client_id, date, time, duration||60, status||'scheduled', notes||'', id]
  );
  const appt = rows[0];
  const client = await getClient(appt.client_id);
  return { ...appt, client_name: client?.name || '?' };
}

async function deleteAppointment(id) {
  await q('DELETE FROM appointments WHERE id=$1', [id]);
}

// ── SESSIONS ─────────────────────────────────────────────────────────────────
async function getSessions(clientId, trainer) {
  let sql = `SELECT s.*, c.name as client_name FROM sessions s
             JOIN clients c ON s.client_id=c.id`;
  const params = [];
  const conditions = [];
  if (clientId) { params.push(clientId); conditions.push(`s.client_id=$${params.length}`); }
  if (trainer && trainer.role !== 'admin') { params.push(trainer.id); conditions.push(`c.trainer_id=$${params.length}`); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY s.date DESC';
  const { rows } = await q(sql, params);
  return rows;
}

async function createSession({ client_id, appointment_id, date, exercises, notes }) {
  const { rows } = await q(
    `INSERT INTO sessions(client_id,appointment_id,date,exercises,notes)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [client_id, appointment_id||null, date, JSON.stringify(exercises||[]), notes||'']
  );
  const session = rows[0];
  const client = await getClient(session.client_id);
  return { ...session, client_name: client?.name || '?' };
}

async function updateSession(id, { client_id, date, exercises, notes }) {
  const { rows } = await q(
    `UPDATE sessions SET client_id=$1,date=$2,exercises=$3,notes=$4 WHERE id=$5 RETURNING *`,
    [client_id, date, JSON.stringify(exercises||[]), notes||'', id]
  );
  const session = rows[0];
  const client = await getClient(session.client_id);
  return { ...session, client_name: client?.name || '?' };
}

async function deleteSession(id) {
  await q('DELETE FROM sessions WHERE id=$1', [id]);
}

// ── PAYMENTS ─────────────────────────────────────────────────────────────────
async function getPayments(clientId, trainer) {
  let sql = `SELECT p.*, c.name as client_name FROM payments p
             JOIN clients c ON p.client_id=c.id`;
  const params = [];
  const conditions = [];
  if (clientId) { params.push(clientId); conditions.push(`p.client_id=$${params.length}`); }
  if (trainer && trainer.role !== 'admin') { params.push(trainer.id); conditions.push(`c.trainer_id=$${params.length}`); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY p.date DESC';
  const { rows } = await q(sql, params);
  return rows;
}

async function getPaymentSummary(trainer) {
  const month = new Date().toISOString().slice(0, 7);
  const trainerFilter = trainer && trainer.role !== 'admin'
    ? `AND c.trainer_id=${trainer.id}` : '';
  const { rows: [r1] } = await q(
    `SELECT COALESCE(SUM(p.amount),0) as total FROM payments p
     JOIN clients c ON p.client_id=c.id
     WHERE p.paid=true AND to_char(p.date,'YYYY-MM')=$1 ${trainerFilter}`,
    [month]
  );
  const { rows: [r2] } = await q(
    `SELECT COALESCE(SUM(p.amount),0) as total FROM payments p
     JOIN clients c ON p.client_id=c.id
     WHERE p.paid=false ${trainerFilter}`
  );
  return { monthTotal: Number(r1.total), debt: Number(r2.total) };
}

async function createPayment({ client_id, amount, date, description, paid }) {
  const { rows } = await q(
    `INSERT INTO payments(client_id,amount,date,description,paid)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [client_id, amount, date, description||'', paid ? true : false]
  );
  const payment = rows[0];
  const client = await getClient(payment.client_id);
  return { ...payment, client_name: client?.name || '?' };
}

async function updatePayment(id, { client_id, amount, date, description, paid }) {
  const { rows } = await q(
    `UPDATE payments SET client_id=$1,amount=$2,date=$3,description=$4,paid=$5
     WHERE id=$6 RETURNING *`,
    [client_id, amount, date, description||'', paid ? true : false, id]
  );
  const payment = rows[0];
  const client = await getClient(payment.client_id);
  return { ...payment, client_name: client?.name || '?' };
}

async function deletePayment(id) {
  await q('DELETE FROM payments WHERE id=$1', [id]);
}

// ── TEMPLATES ─────────────────────────────────────────────────────────────────
async function getTemplates(trainer) {
  let sql = 'SELECT * FROM templates';
  const params = [];
  if (trainer && trainer.role !== 'admin') {
    sql += ' WHERE trainer_id=$1';
    params.push(trainer.id);
  }
  sql += ' ORDER BY name';
  const { rows } = await q(sql, params);
  return rows;
}

async function createTemplate({ trainer_id, name, exercises }) {
  const { rows } = await q(
    `INSERT INTO templates(trainer_id,name,exercises) VALUES($1,$2,$3) RETURNING *`,
    [trainer_id, name, JSON.stringify(exercises||[])]
  );
  return rows[0];
}

async function deleteTemplate(id) {
  await q('DELETE FROM templates WHERE id=$1', [id]);
}

module.exports = {
  init,
  getTrainerByEmail, getTrainers, createTrainer, deleteTrainer,
  getClients, getClient, getClientByToken, createClient, updateClient, deleteClient,
  getAppointments, getClientAppointments, createAppointment, updateAppointment, deleteAppointment,
  getSessions, createSession, updateSession, deleteSession,
  getPayments, getPaymentSummary, createPayment, updatePayment, deletePayment,
  getTemplates, createTemplate, deleteTemplate
};
