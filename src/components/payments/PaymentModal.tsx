import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../Modal';
import type { Payment, Client } from '../../types';
import { todayStr } from '../../utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Payment>) => Promise<void>;
  payment: Payment | null;
  clients: Client[];
}

export default function PaymentModal({ open, onClose, onSave, payment, clients }: Props) {
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState('');
  const [paid, setPaid] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (payment) {
      setClientId(String(payment.client_id));
      setAmount(String(payment.amount));
      setDate((payment.date || '').split('T')[0]);
      setDescription(payment.description || '');
      setPaid(!!payment.paid);
    } else {
      setClientId('');
      setAmount('');
      setDate(todayStr());
      setDescription('');
      setPaid(false);
    }
  }, [payment, open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...(payment ? { id: payment.id } : {}),
        client_id: Number(clientId),
        amount: Number(amount),
        date,
        description,
        paid,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'input-base';
  const labelCls = 'form-label';

  return (
    <Modal open={open} onClose={onClose} title={payment ? 'Редактировать платёж' : 'Новый платёж'}>
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
            <label className={labelCls}>Сумма (₽) *</label>
            <input
              type="number"
              className={inputCls}
              placeholder="3000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              step={100}
              required
            />
          </div>
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
        </div>

        <div>
          <label className={labelCls}>Описание</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Абонемент на месяц, разовое занятие..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-[10px] cursor-pointer text-sm font-medium text-text1">
          <input
            type="checkbox"
            className="w-[18px] h-[18px] cursor-pointer rounded"
            style={{ accentColor: '#d4ff3a' }}
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
          />
          Оплачено
        </label>

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
