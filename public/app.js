// ── AUTH ─────────────────────────────────────────────────────────────────────
let currentTrainer = null;

function getToken() { return localStorage.getItem('trainer_jwt'); }

function logout() {
  localStorage.removeItem('trainer_jwt');
  localStorage.removeItem('trainer_info');
  window.location.href = '/login';
}

// ── STATE ─────────────────────────────────────────────────────────────────────
let clients = [];
let templates = [];
let currentWeekOffset = 0;

// ── API ───────────────────────────────────────────────────────────────────────
const api = {
  _h() {
    const t = getToken();
    return { 'Content-Type': 'application/json', ...(t ? { 'Authorization': `Bearer ${t}` } : {}) };
  },
  async _handle(r) {
    if (r.status === 401) { logout(); return {}; }
    return r.json();
  },
  async get(url) { return this._handle(await fetch(url, { headers: this._h() })); },
  async post(url, data) { return this._handle(await fetch(url, { method: 'POST', headers: this._h(), body: JSON.stringify(data) })); },
  async put(url, data) { return this._handle(await fetch(url, { method: 'PUT', headers: this._h(), body: JSON.stringify(data) })); },
  async del(url) { return this._handle(await fetch(url, { method: 'DELETE', headers: this._h() })); }
};

// ── UTILS ─────────────────────────────────────────────────────────────────────
function formatDate(d) { return d.toISOString().split('T')[0]; }
function formatRu(dateStr) {
  const clean = (dateStr || '').split('T')[0].split(' ')[0];
  const [y, m, day] = clean.split('-');
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
}
function todayStr() { return formatDate(new Date()); }
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatMoney(n) { return Number(n).toLocaleString('ru-RU'); }

// ── TABS ──────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll(`[data-tab="${tab}"]`).forEach(l => l.classList.add('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  if (tab === 'schedule') renderSchedule();
  if (tab === 'clients') renderClients();
  if (tab === 'sessions') renderSessions();
  if (tab === 'payments') renderPayments();
  if (tab === 'trainers') renderTrainers();
}

document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); switchTab(link.dataset.tab); });
});

// ── MODALS ────────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
});

// ── CLIENTS ───────────────────────────────────────────────────────────────────
async function loadClients() {
  clients = await api.get('/api/clients');
  populateClientSelects();
}

function populateClientSelects() {
  ['appt-client', 'session-client', 'payment-client', 'session-filter-client'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const prev = el.value;
    const isFilter = id === 'session-filter-client';
    el.innerHTML = isFilter ? '<option value="">Все клиенты</option>' : '<option value="">— Выберите клиента —</option>';
    clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.name;
      el.appendChild(opt);
    });
    if (prev) el.value = prev;
  });
}

function renderClients(filter = '') {
  const list = document.getElementById('clients-list');
  const filtered = filter ? clients.filter(c => c.name.toLowerCase().includes(filter.toLowerCase())) : clients;
  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><p>Клиентов пока нет. Добавьте первого!</p></div>`;
    return;
  }
  list.innerHTML = filtered.map(c => `
    <div class="client-card" data-id="${c.id}">
      <div class="client-card-name">${esc(c.name)}</div>
      <div class="client-card-info">
        ${c.phone ? `📞 ${esc(c.phone)}<br>` : ''}
        ${c.email ? `✉️ ${esc(c.email)}<br>` : ''}
        ${c.goals ? `🎯 ${esc(c.goals)}` : ''}
      </div>
      <div class="client-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="viewClient(${c.id}, event)">Подробнее</button>
        <button class="btn btn-ghost btn-sm" onclick="editClient(${c.id}, event)">Изменить</button>
        <button class="btn btn-ghost btn-sm" onclick="copyInviteLink('${c.invite_token}', event)" title="Ссылка для клиента">🔗 Ссылка</button>
        <button class="btn btn-icon" onclick="deleteClient(${c.id}, event)" title="Удалить">🗑️</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('client-search').addEventListener('input', e => renderClients(e.target.value));

document.getElementById('btn-add-client').addEventListener('click', () => {
  document.getElementById('modal-client-title').textContent = 'Новый клиент';
  document.getElementById('form-client').reset();
  document.getElementById('client-id').value = '';
  if (currentTrainer?.role === 'admin') populateTrainerSelect();
  openModal('modal-client');
});

async function editClient(id, e) {
  if (e) e.stopPropagation();
  const c = clients.find(x => x.id === id);
  if (!c) return;
  document.getElementById('modal-client-title').textContent = 'Редактировать клиента';
  document.getElementById('client-id').value = c.id;
  document.getElementById('client-name').value = c.name;
  document.getElementById('client-phone').value = c.phone || '';
  document.getElementById('client-email').value = c.email || '';
  document.getElementById('client-goals').value = c.goals || '';
  document.getElementById('client-notes').value = c.notes || '';
  if (currentTrainer?.role === 'admin') {
    await populateTrainerSelect();
    document.getElementById('client-trainer').value = c.trainer_id || '';
  }
  openModal('modal-client');
}

async function deleteClient(id, e) {
  if (e) e.stopPropagation();
  if (!confirm('Удалить клиента и все его данные?')) return;
  await api.del(`/api/clients/${id}`);
  await loadClients();
  renderClients(document.getElementById('client-search').value);
}

document.getElementById('form-client').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('client-id').value;
  const data = {
    name: document.getElementById('client-name').value.trim(),
    phone: document.getElementById('client-phone').value.trim(),
    email: document.getElementById('client-email').value.trim(),
    goals: document.getElementById('client-goals').value.trim(),
    notes: document.getElementById('client-notes').value.trim()
  };
  if (currentTrainer?.role === 'admin') {
    data.trainer_id = document.getElementById('client-trainer').value || null;
  }
  if (id) await api.put(`/api/clients/${id}`, data);
  else await api.post('/api/clients', data);
  await loadClients();
  renderClients(document.getElementById('client-search').value);
  closeModal('modal-client');
});

async function viewClient(id, e) {
  if (e) e.stopPropagation();
  const c = clients.find(x => x.id === id);
  if (!c) return;
  document.getElementById('client-view-name').textContent = c.name;
  const sessions = await api.get(`/api/sessions/client/${id}`);
  const content = document.getElementById('client-view-content');
  content.innerHTML = `
    <div class="client-view-section">
      <h3>Контакты</h3>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Телефон</div>${esc(c.phone) || '—'}</div>
        <div class="info-item"><div class="info-label">Email</div>${esc(c.email) || '—'}</div>
        <div class="info-item"><div class="info-label">Цели</div>${esc(c.goals) || '—'}</div>
        <div class="info-item"><div class="info-label">Добавлен</div>${formatRu(c.created_at)}</div>
      </div>
      ${c.notes ? `<div style="margin-top:10px;color:var(--text2)">${esc(c.notes)}</div>` : ''}
    </div>
    <div class="client-view-section">
      <h3>История тренировок (${sessions.length})</h3>
      ${sessions.length ? sessions.slice(0, 5).map(s => {
        const exs = Array.isArray(s.exercises) ? s.exercises : JSON.parse(s.exercises || '[]');
        return `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
          <strong>${formatRu(s.date)}</strong>
          ${exs.length ? ' — ' + exs.map(ex => esc(ex.name)).join(', ') : ''}
          ${s.notes ? `<div style="color:var(--text2);font-size:13px">${esc(s.notes)}</div>` : ''}
        </div>`;
      }).join('') : '<div style="color:var(--text2)">Тренировок пока нет</div>'}
    </div>
  `;
  openModal('modal-client-view');
}

// ── SCHEDULE ──────────────────────────────────────────────────────────────────
function getWeekDates(offset = 0) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
}

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];

async function renderSchedule() {
  const days = getWeekDates(currentWeekOffset);
  const from = formatDate(days[0]), to = formatDate(days[6]);
  const appointments = await api.get(`/api/appointments?from=${from}&to=${to}`);
  const today = todayStr();

  document.getElementById('week-label').textContent =
    `${days[0].getDate()} ${MONTHS_SHORT[days[0].getMonth()]} — ${days[6].getDate()} ${MONTHS_SHORT[days[6].getMonth()]} ${days[6].getFullYear()}`;

  document.getElementById('schedule-grid').innerHTML = days.map((d, i) => {
    const dateStr = formatDate(d);
    const isToday = dateStr === today;
    const dayAppts = appointments.filter(a => (a.date || '').split('T')[0] === dateStr);
    return `
      <div class="day-column">
        <div class="day-header${isToday ? ' today' : ''}">
          ${DAY_NAMES[i]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}
        </div>
        <div class="day-events">
          ${dayAppts.map(a => `
            <div class="event-card ${a.status === 'done' ? 'done' : a.status === 'cancelled' ? 'cancelled' : a.status === 'pending' ? 'pending' : ''}"
                 onclick="editAppointment(${a.id})">
              <button class="event-del" onclick="deleteAppointment(${a.id}, event)">×</button>
              <div class="event-client">${esc(a.client_name)}</div>
              <div class="event-time">⏰ ${(a.time||'').slice(0,5)} · ${a.duration} мин</div>
              ${a.status === 'pending' ? '<div style="font-size:10px;color:var(--warning);margin-top:2px">⏳ Ждёт подтверждения</div>' : ''}
              ${a.notes ? `<div style="color:var(--text2);font-size:11px;margin-top:3px">${esc(a.notes)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('btn-prev-week').addEventListener('click', () => { currentWeekOffset--; renderSchedule(); });
document.getElementById('btn-next-week').addEventListener('click', () => { currentWeekOffset++; renderSchedule(); });

document.getElementById('btn-add-appointment').addEventListener('click', () => {
  document.getElementById('modal-appt-title').textContent = 'Новая запись';
  document.getElementById('form-appointment').reset();
  document.getElementById('appt-id').value = '';
  document.getElementById('appt-date').value = todayStr();
  populateClientSelects();
  openModal('modal-appointment');
});

async function editAppointment(id) {
  const appts = await api.get(`/api/appointments?from=2000-01-01&to=2099-12-31`);
  const a = appts.find(x => x.id === id);
  if (!a) return;
  document.getElementById('modal-appt-title').textContent = 'Редактировать запись';
  document.getElementById('appt-id').value = a.id;
  populateClientSelects();
  document.getElementById('appt-client').value = a.client_id;
  document.getElementById('appt-date').value = (a.date||'').split('T')[0];
  document.getElementById('appt-time').value = (a.time||'').slice(0,5);
  document.getElementById('appt-duration').value = a.duration;
  document.getElementById('appt-status').value = a.status;
  document.getElementById('appt-notes').value = a.notes || '';
  openModal('modal-appointment');
}

async function deleteAppointment(id, e) {
  if (e) e.stopPropagation();
  if (!confirm('Удалить эту запись?')) return;
  await api.del(`/api/appointments/${id}`);
  renderSchedule();
}

document.getElementById('form-appointment').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('appt-id').value;
  const data = {
    client_id: document.getElementById('appt-client').value,
    date: document.getElementById('appt-date').value,
    time: document.getElementById('appt-time').value,
    duration: document.getElementById('appt-duration').value,
    status: document.getElementById('appt-status').value,
    notes: document.getElementById('appt-notes').value.trim()
  };
  if (id) await api.put(`/api/appointments/${id}`, data);
  else await api.post('/api/appointments', data);
  closeModal('modal-appointment');
  renderSchedule();
});

// ── SESSIONS ──────────────────────────────────────────────────────────────────
async function renderSessions() {
  const clientId = document.getElementById('session-filter-client').value;
  const sessions = clientId
    ? await api.get(`/api/sessions/client/${clientId}`)
    : await api.get('/api/sessions');

  const list = document.getElementById('sessions-list');
  if (!sessions.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏋️</div><p>Тренировок пока нет</p></div>`;
    return;
  }
  list.innerHTML = sessions.map(s => {
    const exs = Array.isArray(s.exercises) ? s.exercises : JSON.parse(s.exercises || '[]');
    return `
      <div class="session-card">
        <div class="session-header">
          <div>
            <div class="session-meta">${formatRu(s.date)}</div>
            <div class="session-client">👤 ${esc(s.client_name)}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="editSession(${s.id})" title="Редактировать">✏️ Изменить</button>
            <button class="btn btn-icon" onclick="deleteSession(${s.id})" title="Удалить">🗑️</button>
          </div>
        </div>
        ${exs.length ? `
          <div class="exercises-display">
            ${exs.map(ex => renderExerciseDisplay(ex)).join('')}
          </div>
        ` : ''}
        ${s.notes ? `<div class="session-notes">${esc(s.notes)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function renderExerciseDisplay(ex) {
  const metrics = [];
  if (ex.sets && ex.reps) metrics.push(`${ex.sets}×${ex.reps}`);
  else if (ex.sets) metrics.push(`${ex.sets} подх.`);
  if (ex.weight) metrics.push(`${ex.weight} кг`);
  if (ex.rir !== undefined && ex.rir !== '') metrics.push(`RIR ${ex.rir}`);
  if (ex.rpe !== undefined && ex.rpe !== '') metrics.push(`RPE ${ex.rpe}`);
  if (ex.rest_sec && ex.rest_sec !== '') metrics.push(`отдых ${ex.rest_sec}с`);
  return `
    <div class="ex-display">
      <span class="ex-display-name">${esc(ex.name)}</span>
      ${metrics.length ? `<span class="ex-display-metrics">${metrics.join(' · ')}</span>` : ''}
    </div>
  `;
}

document.getElementById('session-filter-client').addEventListener('change', () => renderSessions());

document.getElementById('btn-add-session').addEventListener('click', () => {
  document.getElementById('modal-session-title').textContent = 'Новая тренировка';
  document.getElementById('form-session').reset();
  document.getElementById('session-id').value = '';
  document.getElementById('session-date').value = todayStr();
  document.getElementById('exercises-list').innerHTML = '';
  populateClientSelects();
  populateTemplateSelect();
  openModal('modal-session');
});

async function editSession(id) {
  const sessions = await api.get('/api/sessions');
  const s = sessions.find(x => x.id === id);
  if (!s) return;
  document.getElementById('modal-session-title').textContent = 'Редактировать тренировку';
  document.getElementById('session-id').value = s.id;
  populateClientSelects();
  populateTemplateSelect();
  document.getElementById('session-client').value = s.client_id;
  document.getElementById('session-date').value = (s.date||'').split('T')[0];
  document.getElementById('session-notes').value = s.notes || '';
  document.getElementById('exercises-list').innerHTML = '';
  const exs = Array.isArray(s.exercises) ? s.exercises : JSON.parse(s.exercises || '[]');
  exs.forEach(ex => addExerciseRow(ex));
  openModal('modal-session');
}

document.getElementById('btn-add-exercise').addEventListener('click', () => addExerciseRow());

function addExerciseRow(data = {}) {
  const row = document.createElement('div');
  row.className = 'exercise-row';
  row.innerHTML = `
    <div class="ex-header">
      <input type="text" placeholder="Название упражнения" value="${esc(data.name || '')}" class="ex-name">
      <button type="button" class="btn btn-icon ex-remove" onclick="this.closest('.exercise-row').remove()" title="Удалить">✕</button>
    </div>
    <div class="ex-metrics">
      <div class="ex-metric">
        <span>Подходы</span>
        <input type="number" class="ex-sets" min="0" placeholder="0" value="${data.sets || ''}">
      </div>
      <div class="ex-metric">
        <span>Повторения</span>
        <input type="number" class="ex-reps" min="0" placeholder="0" value="${data.reps || ''}">
      </div>
      <div class="ex-metric">
        <span>Вес (кг)</span>
        <input type="number" class="ex-weight" min="0" step="0.5" placeholder="0" value="${data.weight || ''}">
      </div>
      <div class="ex-metric">
        <span>RIR</span>
        <input type="number" class="ex-rir" min="0" max="10" placeholder="—" value="${data.rir !== undefined ? data.rir : ''}">
      </div>
      <div class="ex-metric">
        <span>RPE</span>
        <input type="number" class="ex-rpe" min="1" max="10" step="0.5" placeholder="—" value="${data.rpe !== undefined ? data.rpe : ''}">
      </div>
      <div class="ex-metric">
        <span>Отдых (с)</span>
        <input type="number" class="ex-rest" min="0" step="15" placeholder="—" value="${data.rest_sec !== undefined ? data.rest_sec : ''}">
      </div>
    </div>
  `;
  document.getElementById('exercises-list').appendChild(row);
}

function collectExercises() {
  return [...document.querySelectorAll('#exercises-list .exercise-row')].map(row => ({
    name: row.querySelector('.ex-name').value.trim(),
    sets: row.querySelector('.ex-sets').value,
    reps: row.querySelector('.ex-reps').value,
    weight: row.querySelector('.ex-weight').value,
    rir: row.querySelector('.ex-rir').value,
    rpe: row.querySelector('.ex-rpe').value,
    rest_sec: row.querySelector('.ex-rest').value
  })).filter(ex => ex.name);
}

document.getElementById('form-session').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('session-id').value;
  const data = {
    client_id: document.getElementById('session-client').value,
    date: document.getElementById('session-date').value,
    exercises: collectExercises(),
    notes: document.getElementById('session-notes').value.trim()
  };
  if (id) await api.put(`/api/sessions/${id}`, data);
  else await api.post('/api/sessions', data);
  closeModal('modal-session');
  renderSessions();
});

async function deleteSession(id) {
  if (!confirm('Удалить запись о тренировке?')) return;
  await api.del(`/api/sessions/${id}`);
  renderSessions();
}

// ── TEMPLATES ─────────────────────────────────────────────────────────────────
async function loadTemplates() {
  templates = await api.get('/api/templates');
}

function populateTemplateSelect() {
  const sel = document.getElementById('session-template-select');
  sel.innerHTML = '<option value="">Загрузить шаблон...</option>';
  templates.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id; opt.textContent = t.name;
    sel.appendChild(opt);
  });
}

document.getElementById('session-template-select').addEventListener('change', function() {
  const id = Number(this.value);
  if (!id) return;
  const tpl = templates.find(t => t.id === id);
  if (!tpl) return;
  document.getElementById('exercises-list').innerHTML = '';
  const exs = Array.isArray(tpl.exercises) ? tpl.exercises : JSON.parse(tpl.exercises || '[]');
  exs.forEach(ex => addExerciseRow(ex));
  this.value = '';
});

document.getElementById('btn-save-template').addEventListener('click', async () => {
  const exercises = collectExercises();
  if (!exercises.length) return alert('Добавьте хотя бы одно упражнение');
  const name = prompt('Название шаблона:');
  if (!name?.trim()) return;
  const tpl = await api.post('/api/templates', { name: name.trim(), exercises });
  if (tpl.id) {
    templates.push(tpl);
    alert(`Шаблон "${tpl.name}" сохранён`);
  }
});

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
async function renderPayments() {
  const [payments, summary] = await Promise.all([
    api.get('/api/payments'),
    api.get('/api/payments/summary')
  ]);

  document.getElementById('payment-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Получено в этом месяце</div>
      <div class="stat-value green">${formatMoney(summary.monthTotal)} ₽</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Долг клиентов</div>
      <div class="stat-value ${summary.debt > 0 ? 'red' : ''}">${formatMoney(summary.debt)} ₽</div>
    </div>
  `;

  const tbody = document.querySelector('#payments-table tbody');
  if (!payments.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:32px">Платежей пока нет</td></tr>`;
    return;
  }
  tbody.innerHTML = payments.map(p => `
    <tr>
      <td>${esc(p.client_name)}</td>
      <td><strong>${formatMoney(p.amount)} ₽</strong></td>
      <td>${formatRu(p.date)}</td>
      <td>${esc(p.description) || '—'}</td>
      <td>
        <span class="badge ${p.paid ? 'badge-paid' : 'badge-unpaid'}" style="cursor:pointer"
              onclick="togglePayment(${p.id}, ${p.paid ? 0 : 1})">
          ${p.paid ? 'Оплачено' : 'Не оплачено'}
        </span>
      </td>
      <td>
        <button class="btn btn-icon" onclick="editPayment(${p.id})" title="Изменить">✏️</button>
        <button class="btn btn-icon" onclick="deletePayment(${p.id})" title="Удалить">🗑️</button>
      </td>
    </tr>
  `).join('');
}

async function togglePayment(id, paid) {
  const payments = await api.get('/api/payments');
  const p = payments.find(x => x.id === id);
  if (!p) return;
  await api.put(`/api/payments/${id}`, { ...p, paid });
  renderPayments();
}

document.getElementById('btn-add-payment').addEventListener('click', () => {
  document.getElementById('modal-payment-title').textContent = 'Новый платёж';
  document.getElementById('form-payment').reset();
  document.getElementById('payment-id').value = '';
  document.getElementById('payment-date').value = todayStr();
  populateClientSelects();
  openModal('modal-payment');
});

async function editPayment(id) {
  const payments = await api.get('/api/payments');
  const p = payments.find(x => x.id === id);
  if (!p) return;
  document.getElementById('modal-payment-title').textContent = 'Редактировать платёж';
  document.getElementById('payment-id').value = p.id;
  populateClientSelects();
  document.getElementById('payment-client').value = p.client_id;
  document.getElementById('payment-amount').value = p.amount;
  document.getElementById('payment-date').value = (p.date||'').split('T')[0];
  document.getElementById('payment-description').value = p.description || '';
  document.getElementById('payment-paid').checked = !!p.paid;
  openModal('modal-payment');
}

async function deletePayment(id) {
  if (!confirm('Удалить этот платёж?')) return;
  await api.del(`/api/payments/${id}`);
  renderPayments();
}

document.getElementById('form-payment').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('payment-id').value;
  const data = {
    client_id: document.getElementById('payment-client').value,
    amount: document.getElementById('payment-amount').value,
    date: document.getElementById('payment-date').value,
    description: document.getElementById('payment-description').value.trim(),
    paid: document.getElementById('payment-paid').checked
  };
  if (id) await api.put(`/api/payments/${id}`, data);
  else await api.post('/api/payments', data);
  closeModal('modal-payment');
  renderPayments();
});

// ── TRAINERS (admin) ──────────────────────────────────────────────────────────
async function renderTrainers() {
  const trainers = await api.get('/api/trainers');
  const list = document.getElementById('trainers-list');
  if (!trainers.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👤</div><p>Тренеров пока нет</p></div>`;
    return;
  }
  list.innerHTML = trainers.map(t => `
    <div class="client-card">
      <div class="client-card-name">
        ${esc(t.name)}
        <span class="role-badge ${t.role === 'admin' ? 'role-admin' : 'role-trainer'}">${t.role === 'admin' ? 'Админ' : 'Тренер'}</span>
      </div>
      <div class="client-card-info">
        ✉️ ${esc(t.email)}<br>
        Добавлен: ${formatRu(t.created_at)}
      </div>
      <div class="client-card-actions">
        ${t.id !== currentTrainer.id ? `<button class="btn btn-ghost btn-sm" onclick="deleteTrainer(${t.id})">🗑️ Удалить</button>` : '<span style="color:var(--text2);font-size:12px">Это вы</span>'}
      </div>
    </div>
  `).join('');
}

async function deleteTrainer(id) {
  if (!confirm('Удалить тренера? Его клиенты останутся без привязки.')) return;
  await api.del(`/api/trainers/${id}`);
  renderTrainers();
}

document.getElementById('btn-add-trainer').addEventListener('click', () => {
  document.getElementById('form-trainer').reset();
  openModal('modal-trainer');
});

document.getElementById('form-trainer').addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    name: document.getElementById('trainer-name').value.trim(),
    email: document.getElementById('trainer-email').value.trim(),
    password: document.getElementById('trainer-password').value,
    role: document.getElementById('trainer-role').value
  };
  const result = await api.post('/api/trainers', data);
  if (result.error) return alert(result.error);
  closeModal('modal-trainer');
  renderTrainers();
});

// ── TRAINER SELECT (admin: client form) ───────────────────────────────────────
async function populateTrainerSelect() {
  const trainers = await api.get('/api/trainers');
  const el = document.getElementById('client-trainer');
  el.innerHTML = '<option value="">— Не назначен —</option>';
  trainers.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id; opt.textContent = t.name;
    el.appendChild(opt);
  });
  document.getElementById('client-trainer-group').style.display = 'block';
}

// ── INVITE LINK ───────────────────────────────────────────────────────────────
function copyInviteLink(token, e) {
  if (e) e.stopPropagation();
  if (!token) return alert('Токен не найден. Пересохраните клиента.');
  const url = `${location.origin}/client/${token}`;
  navigator.clipboard.writeText(url).then(() => alert(`Ссылка скопирована:\n${url}`));
}

// ── INIT ──────────────────────────────────────────────────────────────────────
(async () => {
  const token = getToken();
  if (!token) { window.location.href = '/login'; return; }

  currentTrainer = await api.get('/api/auth/me');
  if (!currentTrainer || currentTrainer.error) { logout(); return; }

  document.getElementById('sidebar-trainer-name').textContent = currentTrainer.name;
  document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('Выйти из системы?')) logout();
  });

  if (currentTrainer.role === 'admin') {
    document.getElementById('nav-trainers').style.display = '';
    document.getElementById('mobile-nav-trainers').style.display = '';
  }

  await Promise.all([loadClients(), loadTemplates()]);
  renderSchedule();
})();
