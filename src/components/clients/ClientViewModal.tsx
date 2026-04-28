import { useState, useEffect } from 'react';
import Modal from '../Modal';
import type { Client, Session, Exercise } from '../../types';
import { api } from '../../api';
import { formatRu } from '../../utils';

interface Props {
  open: boolean;
  onClose: () => void;
  client: Client | null;
}

function parseExercises(raw: Exercise[] | string): Exercise[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

export default function ClientViewModal({ open, onClose, client }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && client) {
      setLoading(true);
      api.get<Session[]>(`/api/sessions/client/${client.id}`)
        .then((data) => setSessions(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    }
  }, [open, client]);

  if (!client) return null;

  return (
    <Modal open={open} onClose={onClose} title={client.name} wide>
      <div className="px-[26px] py-[22px]">
        {/* Contacts */}
        <div className="mb-6">
          <h3
            className="text-[11px] text-text-muted font-extrabold uppercase mb-3"
            style={{ letterSpacing: '0.1em' }}
          >
            Контакты
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Телефон', value: client.phone },
              { label: 'Email', value: client.email },
              { label: 'Цели', value: client.goals },
              { label: 'Добавлен', value: formatRu(client.created_at) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="text-sm bg-bg3 px-[14px] py-[10px] rounded-[10px] border border-border"
              >
                <span
                  className="block text-[10px] text-text-muted font-bold uppercase mb-[2px]"
                  style={{ letterSpacing: '0.08em' }}
                >
                  {label}
                </span>
                <span className="text-text1">{value || '—'}</span>
              </div>
            ))}
          </div>
          {client.notes && (
            <p className="mt-3 text-text2 text-sm">{client.notes}</p>
          )}
        </div>

        {/* Sessions */}
        <div>
          <h3
            className="text-[11px] text-text-muted font-extrabold uppercase mb-3"
            style={{ letterSpacing: '0.1em' }}
          >
            История тренировок ({loading ? '...' : sessions.length})
          </h3>
          {loading ? (
            <div className="text-text2 text-sm">Загрузка...</div>
          ) : sessions.length === 0 ? (
            <div className="text-text2 text-sm">Тренировок пока нет</div>
          ) : (
            <div className="flex flex-col gap-0">
              {sessions.slice(0, 5).map((s) => {
                const exs = parseExercises(s.exercises);
                return (
                  <div
                    key={s.id}
                    className="py-2"
                    style={{ borderBottom: '1px solid #262b3d' }}
                  >
                    <strong className="text-text1">{formatRu(s.date)}</strong>
                    {exs.length > 0 && (
                      <span className="text-text2 ml-1">
                        — {exs.map((ex) => ex.name).join(', ')}
                      </span>
                    )}
                    {s.notes && (
                      <div className="text-text2 text-[13px] mt-[2px]">{s.notes}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
