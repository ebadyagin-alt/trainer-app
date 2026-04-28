import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../Modal';
import type { Appointment, Client } from '../../types';
import { todayStr } from '../../utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Appointment>) => Promise<void>;
  appointment: Appointment | null;
  clients: Client[];
}

export default function AppointmentModal({ open, onClose, onSave, appointment, clients }: Props) {
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [status, setStatus] = useState<Appointment['status']>('scheduled');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (appointment) {
      setClientId(String(appointment.client_id));
      setDate((appointment.date || '').split('T')[0]);
      setTime((appointment.time || '').slice(0, 5));
      setDuration(String(appointment.duration));
      setStatus(appointment.status);
      setNotes(appointment.notes || '');
    } else {
      setClientId('');
      setDate(todayStr());
      setTime('');
      setDuration('60');
      setStatus('scheduled');
      setNotes('');
    }
  }, [appointment, open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...(appointment ? { id: appointment.id } : {}),
        client_id: Number(clientId),
        date,
        time,
        duration: Number(duration),
        status,
        notes,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'input-base';
  const labelCls = 'form-label';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={appointment ? 'Редактировать запись' : 'Новая запись'}
    >
      <form onSubmit={handleSubmit} className="px-[26px] py-[22px] flex flex-col gap-4">
        <div>
          <label className={labelCls}>Клиент *</label>
          <select
            className={inputCls}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="">— Выберите клиента —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Дата *</label>
            <input
              type="date"
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Время *</label>
            <input
              type="time"
              className={inputCls}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Длительность (мин)</label>
            <input
              type="number"
              className={inputCls}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min={15}
              step={15}
            />
          </div>
          <div>
            <label className={labelCls}>Статус</label>
            <select
              className={inputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as Appointment['status'])}
            >
              <option value="scheduled">Подтверждено</option>
              <option value="pending">Ожидает подтверждения</option>
              <option value="done">Проведено</option>
              <option value="cancelled">Отменено</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Заметки</label>
          <textarea
            className={inputCls}
            rows={2}
            placeholder="Дополнительная информация..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

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
