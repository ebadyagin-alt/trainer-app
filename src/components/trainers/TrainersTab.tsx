import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import type { Trainer } from '../../types';
import { formatRu } from '../../utils';
import TrainerModal from './TrainerModal';

interface Props {
  currentTrainer: Trainer;
}

export default function TrainersTab({ currentTrainer }: Props) {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Trainer[]>('/api/trainers');
      setTrainers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(t: Trainer) {
    if (!confirm('Удалить тренера? Его клиенты останутся без привязки.')) return;
    await api.del(`/api/trainers/${t.id}`);
    await load();
  }

  async function handleSave(data: { name: string; email: string; password: string; role: 'trainer' | 'admin' }) {
    const result = await api.post<Trainer & { error?: string }>('/api/trainers', data);
    if (result.error) {
      alert(result.error);
      throw new Error(result.error);
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
          Тренеры
        </h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          + Добавить тренера
        </button>
      </div>

      {loading ? (
        <div className="text-center text-text2 py-16">Загрузка...</div>
      ) : trainers.length === 0 ? (
        <div className="text-center py-16 text-text2">
          <div className="text-[56px] mb-4 opacity-70">👤</div>
          <p className="text-[15px] font-medium">Тренеров пока нет</p>
        </div>
      ) : (
        <div
          className="grid gap-[18px]"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {trainers.map((t) => (
            <div
              key={t.id}
              className="bg-bg2 border border-border rounded-[16px] p-[22px] transition-all duration-200 hover:border-border-strong"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="font-extrabold text-lg text-text1"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {t.name}
                </span>
                <span
                  className="inline-block px-[10px] py-[3px] rounded-full text-[10px] font-extrabold uppercase"
                  style={{
                    letterSpacing: '0.06em',
                    background:
                      t.role === 'admin'
                        ? 'rgba(255,61,138,0.14)'
                        : 'rgba(45,212,164,0.14)',
                    color: t.role === 'admin' ? '#ff3d8a' : '#2dd4a4',
                  }}
                >
                  {t.role === 'admin' ? 'Админ' : 'Тренер'}
                </span>
              </div>
              <div className="text-text2 text-[13px] leading-relaxed">
                <div>✉️ {t.email}</div>
                <div>Добавлен: {formatRu(t.created_at)}</div>
              </div>
              <div
                className="mt-4 pt-4 flex items-center"
                style={{ borderTop: '1px dashed #262b3d' }}
              >
                {t.id !== currentTrainer.id ? (
                  <button
                    onClick={() => handleDelete(t)}
                    className="btn-ghost btn-sm"
                  >
                    🗑️ Удалить
                  </button>
                ) : (
                  <span className="text-text2 text-xs">Это вы</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TrainerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
