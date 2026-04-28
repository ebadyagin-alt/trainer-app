import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../Modal';
import type { Client, Trainer } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Client>) => Promise<void>;
  client: Client | null;
  currentTrainer: Trainer;
  trainers: Trainer[];
}

export default function ClientModal({ open, onClose, onSave, client, currentTrainer, trainers }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [goals, setGoals] = useState('');
  const [notes, setNotes] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setPhone(client.phone || '');
      setEmail(client.email || '');
      setGoals(client.goals || '');
      setNotes(client.notes || '');
      setTrainerId(client.trainer_id ? String(client.trainer_id) : '');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setGoals('');
      setNotes('');
      setTrainerId('');
    }
  }, [client, open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data: Partial<Client> = { name, phone, email, goals, notes };
      if (client) data.id = client.id;
      if (currentTrainer.role === 'admin') {
        data.trainer_id = trainerId ? Number(trainerId) : null;
      }
      await onSave(data);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'input-base';
  const labelCls = 'form-label';

  return (
    <Modal open={open} onClose={onClose} title={client ? 'Редактировать клиента' : 'Новый клиент'}>
      <form onSubmit={handleSubmit} className="px-[26px] py-[22px] flex flex-col gap-4">
        <div>
          <label className={labelCls}>Имя *</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Иванов Иван"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Телефон</label>
            <input
              type="tel"
              className={inputCls}
              placeholder="+7 900 000-00-00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              className={inputCls}
              placeholder="ivan@mail.ru"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Цели</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Похудение, набор массы..."
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>Заметки</label>
          <textarea
            className={inputCls}
            rows={3}
            placeholder="Противопоказания, пожелания..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {currentTrainer.role === 'admin' && (
          <div>
            <label className={labelCls}>Тренер</label>
            <select
              className={inputCls}
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
            >
              <option value="">— Не назначен —</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          className="flex justify-end gap-[10px] mt-2 pt-[18px]"
          style={{ borderTop: '1px solid #262b3d' }}
        >
          <button type="button" onClick={onClose} className="btn-ghost btn-sm">
            Отмена
          </button>
          <button type="submit" disabled={saving} className="btn-primary btn-sm disabled:opacity-60">
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
