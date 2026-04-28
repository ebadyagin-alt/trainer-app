import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import type { Session, Client, Template } from '../../types';
import SessionCard from './SessionCard';
import SessionModal from './SessionModal';

interface Props {
  clients: Client[];
  templates: Template[];
  onTemplatesChange: (templates: Template[]) => void;
}

export default function SessionsTab({ clients, templates, onTemplatesChange }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = filterClient
        ? await api.get<Session[]>(`/api/sessions/client/${filterClient}`)
        : await api.get<Session[]>('/api/sessions');
      setSessions(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [filterClient]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditingSession(null);
    setModalOpen(true);
  }

  function openEdit(s: Session) {
    setEditingSession(s);
    setModalOpen(true);
  }

  async function handleDelete(s: Session) {
    if (!confirm('Удалить запись о тренировке?')) return;
    await api.del(`/api/sessions/${s.id}`);
    await load();
  }

  async function handleSave(data: Partial<Session>) {
    if (data.id) {
      await api.put(`/api/sessions/${data.id}`, data);
    } else {
      await api.post('/api/sessions', data);
    }
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7 gap-4">
        <h1
          className="text-3xl font-black uppercase text-text1"
          style={{ letterSpacing: '-0.03em' }}
        >
          История тренировок
        </h1>
        <button onClick={openNew} className="btn-primary">
          + Добавить тренировку
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          className="input-base max-w-[280px]"
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
        >
          <option value="">Все клиенты</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-text2 py-16">Загрузка...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-text2">
          <div className="text-[56px] mb-4 opacity-70">🏋️</div>
          <p className="text-[15px] font-medium">Тренировок пока нет</p>
        </div>
      ) : (
        <div className="flex flex-col gap-[14px]">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <SessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        session={editingSession}
        clients={clients}
        templates={templates}
        onTemplatesChange={onTemplatesChange}
      />
    </div>
  );
}
