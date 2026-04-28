import { useState, useEffect, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import type { PortalData, Appointment, Session, Payment, Exercise } from '../types';
import { MONTHS_SHORT, todayStr } from '../utils';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Подтверждено',
  pending: 'Ожидает подтверждения',
  done: 'Проведено',
  cancelled: 'Отменено',
};

const STATUS_ICONS: Record<string, string> = {
  scheduled: '✓',
  pending: '⏳',
  done: '✅',
  cancelled: '✕',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#2dd4a4',
  pending: '#ffb627',
  done: '#8a93ad',
  cancelled: '#ff4d6d',
};

function parseExercises(raw: Exercise[] | string): Exercise[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

function fmt(n: number | string) {
  return Number(n).toLocaleString('ru-RU');
}

type TabId = 'schedule' | 'sessions' | 'payments';

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('schedule');
  const [bookOpen, setBookOpen] = useState(false);
  const [bookDate, setBookDate] = useState(todayStr());
  const [bookTime, setBookTime] = useState('');
  const [bookDuration, setBookDuration] = useState('60');
  const [bookNotes, setBookNotes] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!token) { setError(true); return; }
    fetch(`/api/portal/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }, [token]);

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center text-center p-8"
        style={{ background: '#0a0c10' }}
      >
        <div className="text-7xl mb-6">🔗</div>
        <h2 className="text-2xl font-black text-text1 mb-3" style={{ letterSpacing: '-0.02em' }}>
          Ссылка недействительна
        </h2>
        <p className="text-text2 text-sm">
          Обратитесь к тренеру для получения новой персональной ссылки.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: '#0a0c10' }}
      >
        <div
          className="w-12 h-12 rounded-full border-[3px] border-primary border-t-transparent animate-spin"
          style={{ borderColor: '#d4ff3a', borderTopColor: 'transparent' }}
        />
        <p className="text-text2 text-sm">Загрузка кабинета...</p>
      </div>
    );
  }

  async function handleBook(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBooking(true);
    try {
      const r = await fetch(`/api/portal/${token}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: bookDate,
          time: bookTime,
          duration: bookDuration,
          notes: bookNotes,
        }),
      });
      if (r.ok) {
        const appt = (await r.json()) as Appointment;
        setData((prev) =>
          prev ? { ...prev, appointments: [appt, ...prev.appointments] } : prev
        );
        setBookOpen(false);
        setBookTime('');
        setBookNotes('');
      }
    } finally {
      setBooking(false);
    }
  }

  const upcoming = data.appointments.filter(
    (a) => a.status !== 'cancelled' && a.status !== 'done'
  );
  const past = data.appointments.filter(
    (a) => a.status === 'done' || a.status === 'cancelled'
  );
  const paidTotal = data.payments.filter((p) => p.paid).reduce((s, p) => s + Number(p.amount), 0);
  const unpaidTotal = data.payments.filter((p) => !p.paid).reduce((s, p) => s + Number(p.amount), 0);

  function ApptCard({ a }: { a: Appointment }) {
    const d = new Date(a.date);
    return (
      <div
        className="flex items-center gap-4 p-4 rounded-[14px] border border-border mb-3"
        style={{ background: '#12151c' }}
      >
        <div
          className="flex-shrink-0 w-14 text-center rounded-[10px] py-2"
          style={{ background: '#1c2030' }}
        >
          <div className="text-2xl font-black text-text1 leading-none">{d.getUTCDate()}</div>
          <div className="text-[11px] text-text2 font-bold uppercase mt-[2px]">
            {MONTHS_SHORT[d.getUTCMonth()]}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-text1 text-sm">{(a.time || '').slice(0, 5)}</div>
          <div className="text-text2 text-xs mt-[2px]">{a.duration} минут</div>
          {a.notes && <div className="text-text2 text-xs mt-1 italic">{a.notes}</div>}
        </div>
        <span
          className="text-[11px] font-extrabold uppercase px-3 py-1 rounded-full flex-shrink-0"
          style={{
            color: STATUS_COLORS[a.status] ?? '#8a93ad',
            background: (STATUS_COLORS[a.status] ?? '#8a93ad') + '22',
            letterSpacing: '0.04em',
          }}
        >
          {STATUS_ICONS[a.status]} {STATUS_LABELS[a.status] ?? a.status}
        </span>
      </div>
    );
  }

  function SessionCard({ s }: { s: Session }) {
    const exs = parseExercises(s.exercises);
    const d = new Date(s.date);
    const dateStr = `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    return (
      <div
        className="rounded-[14px] p-4 border border-border mb-3"
        style={{ background: '#12151c' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className="inline-block px-3 py-1 rounded-full text-[11px] font-bold"
            style={{ background: '#1c2030', color: '#8a93ad' }}
          >
            {dateStr}
          </span>
          {exs.length > 0 && (
            <span className="text-[11px] text-text2">{exs.length} упр.</span>
          )}
        </div>
        {exs.length > 0 && (
          <div className="flex flex-col gap-2">
            {exs.map((ex, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-text1 min-w-0 flex-1">{ex.name}</span>
                <div className="flex gap-3 text-text2 text-xs tabular-nums flex-shrink-0">
                  {ex.sets && <span><strong>{ex.sets}</strong> подх.</span>}
                  {ex.reps && <span><strong>{ex.reps}</strong> повт.</span>}
                  {ex.weight && <span><strong>{ex.weight}</strong> кг</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        {s.notes && (
          <div className="mt-3 text-text2 text-xs italic">{s.notes}</div>
        )}
      </div>
    );
  }

  function PaymentCard({ p }: { p: Payment }) {
    const d = new Date(p.date);
    return (
      <div
        className="flex items-center gap-4 p-4 rounded-[14px] border border-border mb-3"
        style={{ background: '#12151c' }}
      >
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-text1 text-sm">{p.description || 'Тренировка'}</div>
          <div className="text-text2 text-xs mt-[2px]">
            {d.getUTCDate()} {MONTHS_SHORT[d.getUTCMonth()]} {d.getUTCFullYear()}
          </div>
          <span className={p.paid ? 'badge-paid mt-1 inline-block' : 'badge-unpaid mt-1 inline-block'}>
            {p.paid ? 'Оплачено' : 'Не оплачено'}
          </span>
        </div>
        <div
          className="font-black text-xl tabular-nums flex-shrink-0"
          style={{ color: p.paid ? '#2dd4a4' : '#ff4d6d', letterSpacing: '-0.02em' }}
        >
          {fmt(p.amount)} ₽
        </div>
      </div>
    );
  }

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'schedule', label: 'Расписание', icon: '📅' },
    { id: 'sessions', label: 'Тренировки', icon: '🏋️' },
    { id: 'payments', label: 'Платежи', icon: '💰' },
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(ellipse 1000px 500px at 80% -5%, rgba(212,255,58,0.07), transparent 60%), radial-gradient(ellipse 800px 400px at -5% 105%, rgba(124,111,255,0.07), transparent 60%), #0a0c10',
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b border-border"
        style={{ background: 'rgba(18,21,28,0.92)', backdropFilter: 'blur(14px)' }}
      >
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: 'rgba(212,255,58,0.12)', border: '1px solid rgba(212,255,58,0.2)' }}
            >
              💪
            </div>
            <div>
              <div className="text-sm font-bold text-text1">Мой кабинет</div>
              <div className="text-xs text-text2">Личный портал клиента</div>
            </div>
          </div>
          <div
            className="text-[13px] font-bold px-4 py-[6px] rounded-full"
            style={{ background: 'rgba(212,255,58,0.12)', color: '#d4ff3a', border: '1px solid rgba(212,255,58,0.2)' }}
          >
            {data.client.name}
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <nav
        className="sticky top-[61px] z-20 border-b border-border"
        style={{ background: 'rgba(18,21,28,0.95)', backdropFilter: 'blur(8px)' }}
      >
        <div className="max-w-2xl mx-auto px-5 flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-150 cursor-pointer bg-transparent"
              style={{
                color: activeTab === tab.id ? '#d4ff3a' : '#8a93ad',
                borderBottomColor: activeTab === tab.id ? '#d4ff3a' : 'transparent',
              }}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-5 py-6 pb-10">
        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-text1" style={{ letterSpacing: '-0.02em' }}>
                Мои записи
              </h2>
              <button
                onClick={() => {
                  setBookDate(todayStr());
                  setBookOpen(true);
                }}
                className="btn-primary btn-sm"
              >
                + Записаться
              </button>
            </div>

            {data.appointments.length === 0 ? (
              <EmptyState icon="📅" title="Записей пока нет" sub="Нажмите «Записаться», чтобы выбрать время" />
            ) : (
              <>
                {upcoming.length > 0 && (
                  <>
                    <div className="text-[11px] text-text-muted font-bold uppercase mb-3" style={{ letterSpacing: '0.08em' }}>
                      Предстоящие
                    </div>
                    {upcoming.map((a) => <ApptCard key={a.id} a={a} />)}
                  </>
                )}
                {past.length > 0 && (
                  <>
                    <div className="text-[11px] text-text-muted font-bold uppercase mt-5 mb-3" style={{ letterSpacing: '0.08em' }}>
                      Прошедшие
                    </div>
                    {past.map((a) => <ApptCard key={a.id} a={a} />)}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div>
            <h2 className="text-xl font-black text-text1 mb-5" style={{ letterSpacing: '-0.02em' }}>
              История тренировок
            </h2>
            {data.sessions.length === 0 ? (
              <EmptyState icon="🏋️" title="Тренировок пока нет" sub="Здесь будет история ваших занятий" />
            ) : (
              data.sessions.map((s) => <SessionCard key={s.id} s={s} />)
            )}
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div>
            <h2 className="text-xl font-black text-text1 mb-5" style={{ letterSpacing: '-0.02em' }}>
              Мои платежи
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Оплачено', value: `${fmt(paidTotal)} ₽`, color: '#2dd4a4' },
                { label: 'К оплате', value: `${fmt(unpaidTotal)} ₽`, color: unpaidTotal > 0 ? '#ff4d6d' : '#f4f6fb' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-[14px] p-4 border border-border"
                  style={{ background: '#12151c' }}
                >
                  <div className="text-[11px] text-text2 font-bold uppercase mb-2" style={{ letterSpacing: '0.06em' }}>{label}</div>
                  <div className="font-black text-2xl tabular-nums" style={{ color, letterSpacing: '-0.02em' }}>{value}</div>
                </div>
              ))}
            </div>

            {data.payments.length === 0 ? (
              <EmptyState icon="💳" title="Платежей пока нет" sub="Здесь будет история оплат" />
            ) : (
              data.payments.map((p) => <PaymentCard key={p.id} p={p} />)
            )}
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {bookOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-5"
          style={{ background: 'rgba(5,7,11,0.80)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setBookOpen(false); }}
        >
          <div
            className="w-full sm:max-w-sm max-h-[90vh] overflow-y-auto"
            style={{
              background: '#12151c',
              border: '1px solid #353b54',
              borderRadius: '22px 22px 0 0',
            }}
          >
            {/* Handle */}
            <div className="w-11 h-1 mx-auto mt-3 rounded-full bg-border-strong sm:hidden" />

            <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-border">
              <h2 className="font-black text-lg text-text1 uppercase" style={{ letterSpacing: '-0.02em' }}>
                Записаться к тренеру
              </h2>
              <button onClick={() => setBookOpen(false)} className="btn-icon">×</button>
            </div>

            <form onSubmit={handleBook} className="px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="form-label">Дата</label>
                <input
                  type="date"
                  className="input-base"
                  value={bookDate}
                  onChange={(e) => setBookDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label">Время</label>
                <input
                  type="time"
                  className="input-base"
                  value={bookTime}
                  onChange={(e) => setBookTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label">Длительность</label>
                <select
                  className="input-base"
                  value={bookDuration}
                  onChange={(e) => setBookDuration(e.target.value)}
                >
                  <option value="30">30 минут</option>
                  <option value="45">45 минут</option>
                  <option value="60">60 минут</option>
                  <option value="90">90 минут</option>
                </select>
              </div>
              <div>
                <label className="form-label">Пожелания</label>
                <textarea
                  className="input-base"
                  rows={3}
                  placeholder="Что хотите проработать на тренировке?"
                  value={bookNotes}
                  onChange={(e) => setBookNotes(e.target.value)}
                />
              </div>

              <div
                className="text-[12px] text-text2 px-4 py-3 rounded-[10px] border border-border"
                style={{ background: 'rgba(255,182,39,0.08)', borderColor: 'rgba(255,182,39,0.2)', color: '#ffb627' }}
              >
                ⏳ Тренер подтвердит запись в ближайшее время
              </div>

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setBookOpen(false)}
                  className="btn-ghost btn-sm flex-1"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={booking}
                  className="btn-primary btn-sm flex-1 disabled:opacity-60"
                >
                  {booking ? 'Отправляем...' : 'Отправить запрос'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-[56px] mb-4 opacity-60">{icon}</div>
      <div className="font-bold text-text1 text-base mb-1">{title}</div>
      <div className="text-text2 text-sm">{sub}</div>
    </div>
  );
}
