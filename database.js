require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      phone      TEXT DEFAULT '',
      email      TEXT DEFAULT '',
      goals      TEXT DEFAULT '',
      notes      TEXT DEFAULT '',
      invite_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
      created_at TIMESTAMPTZ DEFAULT NOW()
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
  `);
  console.log('БД инициализирована');
}

const q = (sql, params) => pool.query(sql, params);

// ── CLIENTS ──────────────────────────────────────────────────────────────────
async function getClients() {
  const { rows } = await q('SELECT * FROM clients ORDER BY name');
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

async function createClient({ name, phone, email, goals, notes }) {
  const { rows } = await q(
    'INSERT INTO clients(name,phone,email,goals,notes) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [name, phone||'', email||'', goals||'', notes||'']
  );
  return rows[0];
}

async function updateClient(id, { name, phone, email, goals, notes }) {
  const { rows } = await q(
    'UPDATE clients SET name=$1,phone=$2,email=$3,goals=$4,notes=$5 WHERE id=$6 RETURNING *',
    [name, phone||'', email||'', goals||'', notes||'', id]
  );
  return rows[0];
}

async function deleteClient(id) {
  await q('DELETE FROM clients WHERE id=$1', [id]);
}

// ── APPOINTMENTS ─────────────────────────────────────────────────────────────
async function getAppointments(from, to) {
  let sql = `SELECT a.*, c.name as client_name FROM appointments a
             JOIN clients c ON a.client_id=c.id`;
  const params = [];
  if (from && to) { sql += ' WHERE a.date BETWEEN $1 AND $2'; params.push(from, to); }
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
async function getSessions(clientId) {
  let sql = `SELECT s.*, c.name as client_name FROM sessions s
             JOIN clients c ON s.client_id=c.id`;
  const params = [];
  if (clientId) { sql += ' WHERE s.client_id=$1'; params.push(clientId); }
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

async function deleteSession(id) {
  await q('DELETE FROM sessions WHERE id=$1', [id]);
}

// ── PAYMENTS ─────────────────────────────────────────────────────────────────
async function getPayments(clientId) {
  let sql = `SELECT p.*, c.name as client_name FROM payments p
             JOIN clients c ON p.client_id=c.id`;
  const params = [];
  if (clientId) { sql += ' WHERE p.client_id=$1'; params.push(clientId); }
  sql += ' ORDER BY p.date DESC';
  const { rows } = await q(sql, params);
  return rows;
}

async function getPaymentSummary() {
  const month = new Date().toISOString().slice(0, 7);
  const { rows: [r1] } = await q(
    `SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE paid=true AND to_char(date,'YYYY-MM')=$1`,
    [month]
  );
  const { rows: [r2] } = await q(
    `SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE paid=false`
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

module.exports = {
  init,
  getClients, getClient, getClientByToken, createClient, updateClient, deleteClient,
  getAppointments, getClientAppointments, createAppointment, updateAppointment, deleteAppointment,
  getSessions, createSession, deleteSession,
  getPayments, getPaymentSummary, createPayment, updatePayment, deletePayment
};
