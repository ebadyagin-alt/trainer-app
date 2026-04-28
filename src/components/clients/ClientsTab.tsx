import { useState } from 'react';
import { api } from '../../api';
import type { Client, Trainer } from '../../types';
import ClientCard from './ClientCard';
import ClientModal from './ClientModal';
import ClientViewModal from './ClientViewModal';

interface Props {
  clients: Client[];
  onReload: () => Promise<void>;
  currentTrainer: Trainer;
  trainers: Trainer[];
}

export default function ClientsTab({ clients, onReload, currentTrainer, trainers }: Props) {
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const filtered = search
    ? clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : clients;

  function openNew() {
    setEditingClient(null);
    setModalOpen(true);
  }

  function openEdit(c: Client) {
    setEditingClient(c);
    setModalOpen(true);
  }

  function openView(c: Client) {
    setViewClient(c);
    setViewOpen(true);
  }

  async function handleDelete(c: Client) {
    if (!confirm('Удалить клиента и все его данные?')) return;
    await api.del(`/api/clients/${c.id}`);
    await onReload();
  }

  async function handleSave(data: Partial<Client>) {
    if (data.id) {
      await api.put(`/api/clients/${data.id}`, data);
    } else {
      await api.post('/api/clients', data);
    }
    await onReload();
  }

  function copyInviteLink(token: string) {
    if (!token) {
      alert('Токен не найден. Пересохраните клиента.');
      return;
    }
    const url = `${location.origin}/client/${token}`;
    navigator.clipboard.writeText(url).then(() => alert(`Ссылка скопирована:\n${url}`));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7 gap-4">
        <h1
          className="text-3xl font-black uppercase text-text1"
          style={{ letterSpacing: '-0.03em' }}
        >
          Клиенты
        </h1>
        <button onClick={openNew} className="btn-primary">
          + Добавить клиента
        </button>
      </div>

      <input
        type="text"
        className="input-base mb-6"
        placeholder="Поиск по имени..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-text2">
          <div className="text-[56px] mb-4 opacity-70">👥</div>
          <p className="text-[15px] font-medium">
            {search ? 'Ничего не найдено' : 'Клиентов пока нет. Добавьте первого!'}
          </p>
        </div>
      ) : (
        <div
          className="grid gap-[18px]"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {filtered.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              onView={openView}
              onEdit={openEdit}
              onDelete={handleDelete}
              onCopyLink={copyInviteLink}
            />
          ))}
        </div>
      )}

      <ClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        client={editingClient}
        currentTrainer={currentTrainer}
        trainers={trainers}
      />

      <ClientViewModal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        client={viewClient}
      />
    </div>
  );
}
