import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import type { Payment, PaymentSummary, Client } from '../../types';
import { formatRu, formatMoney } from '../../utils';
import PaymentModal from './PaymentModal';

interface Props {
  clients: Client[];
}

export default function PaymentsTab({ clients }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({ monthTotal: 0, debt: 0 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        api.get<Payment[]>('/api/payments'),
        api.get<PaymentSummary>('/api/payments/summary'),
      ]);
      setPayments(Array.isArray(p) ? p : []);
      setSummary(s && typeof s === 'object' ? s : { monthTotal: 0, debt: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditingPayment(null);
    setModalOpen(true);
  }

  function openEdit(p: Payment) {
    setEditingPayment(p);
    setModalOpen(true);
  }

  async function handleDelete(p: Payment) {
    if (!confirm('Удалить этот платёж?')) return;
    await api.del(`/api/payments/${p.id}`);
    await load();
  }

  async function togglePaid(p: Payment) {
    await api.put(`/api/payments/${p.id}`, { ...p, paid: !p.paid });
    await load();
  }

  async function handleSave(data: Partial<Payment>) {
    if (data.id) {
      await api.put(`/api/payments/${data.id}`, data);
    } else {
      await api.post('/api/payments', data);
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
          Финансы
        </h1>
        <button onClick={openNew} className="btn-primary">
          + Добавить платёж
        </button>
      </div>

      {/* Stats */}
      <div
        className="grid gap-[18px] mb-7"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
      >
        {[
          {
            label: 'Получено в этом месяце',
            value: `${formatMoney(summary.monthTotal)} ₽`,
            color: '#2dd4a4',
          },
          {
            label: 'Долг клиентов',
            value: `${formatMoney(summary.debt)} ₽`,
            color: summary.debt > 0 ? '#ff4d6d' : '#f4f6fb',
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-bg2 border border-border rounded-[16px] px-6 py-[22px] relative overflow-hidden transition-transform duration-200 hover:-translate-y-1"
          >
            <div
              className="absolute right-[-40px] top-[-40px] w-[140px] h-[140px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(212,255,58,0.12), transparent 70%)' }}
            />
            <div
              className="text-[11px] text-text2 font-bold uppercase mb-2"
              style={{ letterSpacing: '0.08em' }}
            >
              {label}
            </div>
            <div
              className="font-black text-[34px] tabular-nums leading-none"
              style={{ letterSpacing: '-0.03em', color }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-text2 py-16">Загрузка...</div>
      ) : (
        <div
          className="overflow-x-auto bg-bg2 border border-border rounded-[16px]"
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Клиент', 'Сумма', 'Дата', 'Описание', 'Статус', ''].map((th) => (
                  <th
                    key={th}
                    className="text-left px-[18px] py-[14px] text-[11px] text-text-muted font-bold uppercase whitespace-nowrap"
                    style={{
                      letterSpacing: '0.08em',
                      borderBottom: '1px solid #262b3d',
                      background: '#12151c',
                    }}
                  >
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center text-text2 py-8 px-[18px]"
                  >
                    Платежей пока нет
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors duration-150"
                    style={{ borderBottom: '1px solid #262b3d' }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLTableRowElement).style.background =
                        'rgba(212,255,58,0.03)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')
                    }
                  >
                    <td className="px-[18px] py-[14px] text-sm">{p.client_name}</td>
                    <td className="px-[18px] py-[14px] text-sm font-bold">
                      {formatMoney(p.amount)} ₽
                    </td>
                    <td className="px-[18px] py-[14px] text-sm">{formatRu(p.date)}</td>
                    <td className="px-[18px] py-[14px] text-sm">{p.description || '—'}</td>
                    <td className="px-[18px] py-[14px]">
                      <button
                        onClick={() => togglePaid(p)}
                        className={p.paid ? 'badge-paid cursor-pointer' : 'badge-unpaid cursor-pointer'}
                      >
                        {p.paid ? 'Оплачено' : 'Не оплачено'}
                      </button>
                    </td>
                    <td className="px-[18px] py-[14px]">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="btn-icon"
                          title="Изменить"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="btn-icon"
                          title="Удалить"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <PaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        payment={editingPayment}
        clients={clients}
      />
    </div>
  );
}
