import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import type { Appointment, Client } from '../../types';
import { formatDate, MONTHS_SHORT, DAY_NAMES, todayStr } from '../../utils';
import AppointmentModal from './AppointmentModal';

interface Props {
  clients: Client[];
}

function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function ScheduleTab({ clients }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const days = getWeekDates(weekOffset);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = formatDate(days[0]);
      const to = formatDate(days[6]);
      const data = await api.get<Appointment[]>(`/api/appointments?from=${from}&to=${to}`);
      setAppointments(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const today = todayStr();

  const weekLabel = `${days[0].getDate()} ${MONTHS_SHORT[days[0].getMonth()]} — ${days[6].getDate()} ${MONTHS_SHORT[days[6].getMonth()]} ${days[6].getFullYear()}`;

  async function handleSave(data: Partial<Appointment>) {
    if (data.id) {
      await api.put(`/api/appointments/${data.id}`, data);
    } else {
      await api.post('/api/appointments', data);
    }
    await load();
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Удалить эту запись?')) return;
    await api.del(`/api/appointments/${id}`);
    await load();
  }

  function openEdit(appt: Appointment) {
    setEditing(appt);
    setModalOpen(true);
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-7 gap-4">
        <h1
          className="text-3xl font-black uppercase text-text1"
          style={{ letterSpacing: '-0.03em' }}
        >
          Расписание
        </h1>
        <button onClick={openNew} className="btn-primary">
          + Новая запись
        </button>
      </div>

      {/* Week nav */}
      <div
        className="flex items-center gap-4 mb-6 px-3 py-2 rounded-[14px] border border-border"
        style={{ background: '#12151c' }}
      >
        <button onClick={() => setWeekOffset((p) => p - 1)} className="btn-ghost btn-sm">
          ‹ Назад
        </button>
        <span
          className="flex-1 text-center font-black text-[15px] uppercase text-text1"
          style={{ letterSpacing: '-0.01em' }}
        >
          {weekLabel}
        </span>
        <button onClick={() => setWeekOffset((p) => p + 1)} className="btn-ghost btn-sm">
          Вперёд ›
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center text-text2 py-16">Загрузка...</div>
      ) : (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(7, 1fr)',
            overflowX: 'auto',
          }}
        >
          {days.map((d, i) => {
            const dateStr = formatDate(d);
            const isToday = dateStr === today;
            const dayAppts = appointments.filter(
              (a) => (a.date || '').split('T')[0] === dateStr
            );

            return (
              <div
                key={dateStr}
                className="border border-border rounded-[16px] overflow-hidden min-h-[180px] transition-colors duration-200 hover:border-border-strong"
                style={{ background: '#12151c' }}
              >
                {/* Day header */}
                <div
                  className="px-[14px] py-3 text-center text-[12px] font-extrabold uppercase tracking-[0.08em] border-b border-border"
                  style={{
                    background: isToday
                      ? '#d4ff3a'
                      : 'linear-gradient(180deg, #1c2030, #12151c)',
                    color: isToday ? '#0a0c10' : '#8a93ad',
                    borderBottomColor: isToday ? '#d4ff3a' : '#262b3d',
                  }}
                >
                  {DAY_NAMES[i]}, {d.getDate()} {MONTHS_SHORT[d.getMonth()]}
                </div>

                {/* Events */}
                <div className="p-[10px] flex flex-col gap-2">
                  {dayAppts.map((a) => {
                    const borderColor =
                      a.status === 'done'
                        ? '#2dd4a4'
                        : a.status === 'cancelled'
                        ? '#ff4d6d'
                        : a.status === 'pending'
                        ? '#ffb627'
                        : '#d4ff3a';
                    const opacity = a.status === 'done' ? 0.7 : a.status === 'cancelled' ? 0.45 : 1;

                    return (
                      <div
                        key={a.id}
                        className="rounded-[11px] px-3 py-[10px] text-xs cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative group"
                        style={{
                          background: '#1c2030',
                          borderLeft: `3px solid ${borderColor}`,
                          opacity,
                          textDecoration: a.status === 'cancelled' ? 'line-through' : 'none',
                        }}
                        onClick={() => openEdit(a)}
                      >
                        <button
                          className="absolute top-[6px] right-[6px] w-5 h-5 rounded-[6px] flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer border-none"
                          style={{ background: 'rgba(0,0,0,0.4)', color: '#8a93ad' }}
                          onClick={(e) => handleDelete(a.id, e)}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = '#ff4d6d';
                            (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.4)';
                            (e.currentTarget as HTMLButtonElement).style.color = '#8a93ad';
                          }}
                        >
                          ×
                        </button>
                        <div className="font-bold text-text1 leading-tight" style={{ letterSpacing: '-0.005em' }}>
                          {a.client_name}
                        </div>
                        <div className="text-text2 mt-[3px] font-semibold tabular-nums">
                          ⏰ {(a.time || '').slice(0, 5)} · {a.duration} мин
                        </div>
                        {a.status === 'pending' && (
                          <div className="mt-[2px] text-[10px]" style={{ color: '#ffb627' }}>
                            ⏳ Ждёт подтверждения
                          </div>
                        )}
                        {a.notes && (
                          <div className="mt-[3px] text-[11px] text-text2">{a.notes}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AppointmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        appointment={editing}
        clients={clients}
      />

      <style>{`
        @media (max-width: 1024px) {
          .schedule-week-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .schedule-week-grid {
            display: flex !important;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
          }
          .schedule-week-grid > div {
            min-width: 150px;
            flex-shrink: 0;
            scroll-snap-align: start;
          }
        }
      `}</style>
    </div>
  );
}
