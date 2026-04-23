const token = location.pathname.split('/').pop();
const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const STATUS_LABELS = {
  scheduled: 'Подтверждено',
  pending:   'Ожидает подтверждения',
  done:      'Проведено',
  cancelled: 'Отменено'
};
const STATUS_ICONS = { scheduled:'✓', pending:'⏳', done:'✅', cancelled:'✕' };

let data = null;

async function load() {
  try {
    const r = await fetch(`/api/portal/${token}`);
    if (!r.ok) throw new Error();
    data = await r.json();
    show();
  } catch {
    document.getElementById('app-loading').style.display = 'none';
    document.getElementById('app-error').style.display = 'flex';
  }
}

function show() {
  document.getElementById('app-loading').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('header-name').textContent = data.client.name;
  renderSchedule();
  renderSessions();
  renderPayments();
}

// ── TABS ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ── SCHEDULE ─────────────────────────────────────────────────────────────────
function renderSchedule() {
  const list = document.getElementById('schedule-list');
  if (!data.appointments.length) {
    list.innerHTML = emptyState('📅', 'Записей пока нет', 'Нажмите «Записаться», чтобы выбрать время');
    return;
  }

  const upcoming = data.appointments.filter(a => a.status !== 'cancelled' && a.status !== 'done');
  const past     = data.appointments.filter(a => a.status === 'done' || a.status === 'cancelled');
  let html = '';

  if (upcoming.length) {
    html += '<div class="appt-group-label">Предстоящие</div>';
    html += upcoming.map(apptCard).join('');
  }
  if (past.length) {
    html += '<div class="appt-group-label">Прошедшие</div>';
    html += past.map(apptCard).join('');
  }
  list.innerHTML = html;
}

function apptCard(a) {
  const d = new Date(a.date);
  return `
    <div class="appt-card">
      <div class="appt-date-block">
        <div class="appt-day">${d.getUTCDate()}</div>
        <div class="appt-month">${MONTHS[d.getUTCMonth()]}</div>
      </div>
      <div class="appt-info">
        <div class="appt-time">${(a.time||'').slice(0,5)}</div>
        <div class="appt-duration">${a.duration} минут</div>
        ${a.notes ? `<div class="appt-notes">${esc(a.notes)}</div>` : ''}
      </div>
      <span class="appt-status status-${a.status}">
        ${STATUS_ICONS[a.status] || ''} ${STATUS_LABELS[a.status] || a.status}
      </span>
    </div>`;
}

// ── SESSIONS ─────────────────────────────────────────────────────────────────
function renderSessions() {
  const list = document.getElementById('sessions-list');
  if (!data.sessions.length) {
    list.innerHTML = emptyState('🏋️', 'Тренировок пока нет', 'Здесь будет история ваших занятий');
    return;
  }
  list.innerHTML = data.sessions.map(s => {
    const exs = Array.isArray(s.exercises) ? s.exercises : JSON.parse(s.exercises || '[]');
    const d = new Date(s.date);
    const dateStr = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    return `
      <div class="session-card">
        <div class="session-header">
          <div class="session-date-pill">${dateStr}</div>
          ${exs.length ? `<div class="session-count">${exs.length} упр.</div>` : ''}
        </div>
        ${exs.length ? `
          <div class="exercises-grid">
            ${exs.map(ex => `
              <div class="exercise-row">
                <div class="ex-name">${esc(ex.name)}</div>
                ${ex.sets   ? `<div class="ex-stat"><div class="ex-stat-val">${ex.sets}</div><div class="ex-stat-label">подх.</div></div>` : '<div></div>'}
                ${ex.reps   ? `<div class="ex-stat"><div class="ex-stat-val">${ex.reps}</div><div class="ex-stat-label">повт.</div></div>` : '<div></div>'}
                ${ex.weight ? `<div class="ex-stat"><div class="ex-stat-val">${ex.weight}</div><div class="ex-stat-label">кг</div></div>` : '<div></div>'}
              </div>`).join('')}
          </div>` : ''}
        ${s.notes ? `<div class="session-notes">${esc(s.notes)}</div>` : ''}
      </div>`;
  }).join('');
}

// ── PAYMENTS ─────────────────────────────────────────────────────────────────
function renderPayments() {
  const paid   = data.payments.filter(p => p.paid);
  const unpaid = data.payments.filter(p => !p.paid);
  const totalPaid   = paid.reduce((s, p) => s + Number(p.amount), 0);
  const totalUnpaid = unpaid.reduce((s, p) => s + Number(p.amount), 0);

  document.getElementById('payments-summary').innerHTML = `
    <div class="summary-card">
      <div class="summary-label">Оплачено</div>
      <div class="summary-value green">${fmt(totalPaid)} ₽</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">К оплате</div>
      <div class="summary-value ${totalUnpaid > 0 ? 'red' : ''}">${fmt(totalUnpaid)} ₽</div>
    </div>`;

  const list = document.getElementById('payments-list');
  if (!data.payments.length) {
    list.innerHTML = emptyState('💳', 'Платежей пока нет', 'Здесь будет история оплат');
    return;
  }
  list.innerHTML = data.payments.map(p => {
    const d = new Date(p.date);
    return `
      <div class="payment-card">
        <div class="payment-left">
          <div class="payment-desc">${esc(p.description) || 'Тренировка'}</div>
          <div class="payment-date">${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}</div>
          <span class="badge ${p.paid ? 'badge-paid' : 'badge-unpaid'}">${p.paid ? 'Оплачено' : 'Не оплачено'}</span>
        </div>
        <div class="payment-right">
          <div class="payment-amount ${p.paid ? 'paid' : 'unpaid'}">${fmt(p.amount)} ₽</div>
        </div>
      </div>`;
  }).join('');
}

// ── BOOKING ──────────────────────────────────────────────────────────────────
const overlay = document.getElementById('modal-book');
document.getElementById('btn-book').addEventListener('click', () => {
  document.getElementById('form-book').reset();
  document.getElementById('book-date').value = new Date().toISOString().split('T')[0];
  overlay.classList.add('open');
});
document.getElementById('btn-close-book').addEventListener('click',  () => overlay.classList.remove('open'));
document.getElementById('btn-cancel-book').addEventListener('click', () => overlay.classList.remove('open'));
overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });

document.getElementById('form-book').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Отправляем...';
  try {
    const r = await fetch(`/api/portal/${token}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date:     document.getElementById('book-date').value,
        time:     document.getElementById('book-time').value,
        duration: document.getElementById('book-duration').value,
        notes:    document.getElementById('book-notes').value.trim()
      })
    });
    if (r.ok) {
      data.appointments.unshift(await r.json());
      renderSchedule();
      overlay.classList.remove('open');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Отправить запрос';
  }
});

// ── HELPERS ──────────────────────────────────────────────────────────────────
function emptyState(icon, title, sub) {
  return `<div class="empty">
    <div class="empty-icon">${icon}</div>
    <div class="empty-title">${title}</div>
    <div class="empty-sub">${sub}</div>
  </div>`;
}

function fmt(n) { return Number(n).toLocaleString('ru-RU'); }

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

load();
