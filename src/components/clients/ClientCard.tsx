import type { Client } from '../../types';

interface Props {
  client: Client;
  onView: (c: Client) => void;
  onEdit: (c: Client) => void;
  onDelete: (c: Client) => void;
  onCopyLink: (token: string) => void;
}

export default function ClientCard({ client, onView, onEdit, onDelete, onCopyLink }: Props) {
  return (
    <div
      className="bg-bg2 border border-border rounded-[16px] p-[22px] cursor-pointer transition-all duration-300 relative overflow-hidden group"
      style={{ transition: 'all .25s cubic-bezier(.2,.8,.2,1)' }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = '#353b54';
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.45)';
        el.style.background = '#232838';
        const bar = el.querySelector('.gradient-bar') as HTMLElement | null;
        if (bar) bar.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = '#262b3d';
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
        el.style.background = '#12151c';
        const bar = el.querySelector('.gradient-bar') as HTMLElement | null;
        if (bar) bar.style.opacity = '0';
      }}
    >
      {/* Gradient top bar */}
      <div
        className="gradient-bar absolute top-0 left-0 right-0 h-1 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(90deg, #d4ff3a, #ff3d8a)',
          opacity: 0,
        }}
      />

      <div
        className="font-black text-lg text-text1 mb-2"
        style={{ letterSpacing: '-0.02em', fontFamily: 'var(--font-display, Inter)' }}
      >
        {client.name}
      </div>

      <div className="text-text2 text-[13px] leading-relaxed">
        {client.phone && <div>📞 {client.phone}</div>}
        {client.email && <div>✉️ {client.email}</div>}
        {client.goals && <div>🎯 {client.goals}</div>}
      </div>

      <div
        className="flex flex-wrap gap-[6px] mt-4 pt-4"
        style={{ borderTop: '1px dashed #262b3d' }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onView(client); }}
          className="btn-ghost btn-sm whitespace-nowrap"
        >
          Подробнее
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(client); }}
          className="btn-ghost btn-sm whitespace-nowrap"
        >
          Изменить
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onCopyLink(client.invite_token || ''); }}
          className="btn-ghost btn-sm whitespace-nowrap"
          title="Ссылка для клиента"
        >
          🔗 Ссылка
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(client); }}
          className="btn-icon flex-shrink-0"
          title="Удалить"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
