const token = location.pathname.split('/').pop();

const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const STATUS_LABELS = { scheduled: 'Подтверждено', pending: 'Ожидает подтверждения', done: 'Проведено', cancelled: 'Отменено' };

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
  const upcoming = data.appointments.filter(a => a.status !== 'cancelled' && a.status !== 'done');
  const past = data.appointments.filter(a => a.status === 'done' || a.status === 'cancelled');

  if (!data.appointments.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📅</div><p>Записей пока нет. Запишитесь к тренеру!</p></div>`;
    return;
  }

  let html = '';
  if (upcoming.length) {
    html += '<h3 style="color:var(--text2);font-size:13px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Предстоящие</h3>';
    html += upcoming.map(apptCard).join('');
  }
  if (past.length) {
    html += '<h3 style="color:var(--text2);font-size:13px;text-transform:uppercase;letter-spacing:.5px;margin:20px 0 12px">Прошедшие</h3>';
    html += past.map(apptCard).join('');
  }
  list.innerHTML = html;
}

function apptCard(a) {
  const d = new Date(a.date);
  const statusClass = `status-${a.status}`;
  return `
    <div class="appt-card">
      <div class="appt-date-block">
        <div class="appt-day">${d.getDate()}</div>
        <div class="appt-month">${MONTHS[d.getMonth()]}</div>
      </div>
      <div class="appt-info">
        <div class="appt-time">${a.time?.slice(0,5) || ''}</div>
        <div class="appt-duration">${a.duration} минут</div>
        ${a.notes ? `<div class="appt-notes">${esc(a.notes)}</div>` : ''}
      </div>
      <span class="appt-status ${statusClass}">${STATUS_LABELS[a.status] || a.status}</span>
    </div>
  `;
}

// ── SESSIONS ─────────────────────────────────────────────────────────────────
function renderSessions() {
  const list = document.getElementById('sessions-list');
  if (!data.sessions.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">🏋️</div><p>Тренировок пока нет</p></div>`;
    return;
  }
  list.innerHTML = data.sessions.map(s => {
    const exercises = Array.isArray(s.exercises) ? s.exercises : JSON.parse(s.exercises || '[]');
    const d = new Date(s.date);
    return `
      <div class="session-card">
        <div class="session-date">${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}</div>
        ${exercises.length ? `
          <table class="exercises-table">
            <thead><tr><th>Упражнение</th><th>Подходы</th><th>Повторения</th><th>Вес (кг)</th></tr></thead>
            <tbody>${exercises.map(ex => `
              <tr>
                <td>${esc(ex.name)}</td>
                <td>${ex.sets || '—'}</td>
                <td>${ex.reps || '—'}</td>
                <td>${ex.weight || '—'}</td>
              </tr>
            `).join('')}</tbody>
          </table>
        ` : ''}
        ${s.notes ? `<div class="session-notes">${esc(s.notes)}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ── PAYMENTS ─────────────────────────────────────────────────────────────────
function renderPayments() {
  const list = document.getElementById('payments-list');
  if (!data.payments.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">💰</div><p>Платежей пока нет</p></div>`;
    return;
  }
  list.innerHTML = data.payments.map(p => {
    const d = new Date(p.date);
    return `
      <div class="payment-row">
        <div>
          <div class="payment-desc">${esc(p.description) || 'Тренировка'}</div>
          <div class="payment-date">${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}</div>
          <span class="badge ${p.paid ? 'badge-paid' : 'badge-unpaid'}">${p.paid ? 'Оплачено' : 'Не оплачено'}</span>
        </div>
        <div class="payment-amount ${p.paid ? 'paid' : 'unpaid'}">${Number(p.amount).toLocaleString('ru-RU')} ₽</div>
      </div>
    `;
  }).join('');
}

// ── BOOKING ──────────────────────────────────────────────────────────────────
const overlay = document.getElementById('modal-book');
document.getElementById('btn-book').addEventListener('click', () => {
  document.getElementById('form-book').reset();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('book-date').value = today;
  overlay.classList.add('open');
});
document.getElementById('btn-close-book').addEventListener('click', () => overlay.classList.remove('open'));
document.getElementById('btn-cancel-book').addEventListener('click', () => overlay.classList.remove('open'));
overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });

document.getElementById('form-book').addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    date: document.getElementById('book-date').value,
    time: document.getElementById('book-time').value,
    duration: document.getElementById('book-duration').value,
    notes: document.getElementById('book-notes').value.trim()
  };
  const r = await fetch(`/api/portal/${token}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (r.ok) {
    const appt = await r.json();
    data.appointments.unshift(appt);
    renderSchedule();
    overlay.classList.remove('open');
    alert('Запрос отправлен! Тренер подтвердит в ближайшее время.');
  }
});

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

load();
