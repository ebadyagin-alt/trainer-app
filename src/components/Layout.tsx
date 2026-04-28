import type { Trainer } from '../types';

type Tab = 'schedule' | 'clients' | 'sessions' | 'payments' | 'trainers';

interface NavItem {
  id: Tab;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'schedule', icon: '📅', label: 'Расписание' },
  { id: 'clients', icon: '👥', label: 'Клиенты' },
  { id: 'sessions', icon: '🏋️', label: 'Тренировки' },
  { id: 'payments', icon: '💰', label: 'Финансы' },
  { id: 'trainers', icon: '👤', label: 'Тренеры' },
];

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  trainer: Trainer;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ activeTab, onTabChange, trainer, onLogout, children }: Props) {
  const visibleItems = NAV_ITEMS.filter(
    (item) => item.id !== 'trainers' || trainer.role === 'admin'
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <nav
        className="fixed top-0 left-0 bottom-0 z-40 flex flex-col border-r border-border"
        style={{
          width: 240,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)), #12151c',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-6 pb-8 pt-7 font-black text-2xl uppercase tracking-tight text-text1"
          style={{ letterSpacing: '-0.02em' }}
        >
          <span
            className="w-3 h-3 rounded-[4px] flex-shrink-0"
            style={{ background: '#d4ff3a', boxShadow: '0 0 18px rgba(212,255,58,0.35)' }}
          />
          ТРЕНЕР
        </div>

        {/* Nav links */}
        <ul className="flex flex-col gap-1 px-3 list-none flex-1">
          {visibleItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className="w-full flex items-center gap-3 px-[14px] py-3 rounded-[12px] text-sm font-semibold border transition-all duration-200 cursor-pointer text-left"
                  style={{
                    background: isActive ? '#d4ff3a' : 'transparent',
                    color: isActive ? '#0a0c10' : '#8a93ad',
                    border: isActive ? '1px solid transparent' : '1px solid transparent',
                    boxShadow: isActive ? '0 8px 28px rgba(212,255,58,0.22)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.color = '#f4f6fb';
                      (e.currentTarget as HTMLButtonElement).style.background = '#1c2030';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.color = '#8a93ad';
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }
                  }}
                >
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="mt-auto px-[18px] py-[18px] border-t border-border flex items-center gap-[10px]">
          <span className="flex-1 text-xs text-text2 font-medium truncate">{trainer.name}</span>
          <button
            onClick={onLogout}
            title="Выйти"
            className="btn-icon flex-shrink-0"
            style={{ fontSize: 16 }}
          >
            ⏻
          </button>
        </div>
      </nav>

      {/* Collapsed sidebar — tablet (1024px and below handled via media) */}
      {/* Main content */}
      <main
        className="flex-1 min-w-0"
        style={{ marginLeft: 240 }}
      >
        <div
          className="px-10 py-9"
          style={{ paddingBottom: 'calc(36px)' }}
        >
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border md:hidden"
        style={{
          background: 'rgba(18,21,28,0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
        }}
      >
        <ul className="flex list-none">
          {visibleItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <li key={item.id} className="flex-1">
                <button
                  onClick={() => onTabChange(item.id)}
                  className="w-full flex flex-col items-center justify-center gap-1 py-[11px] pb-[9px] text-[10px] font-bold uppercase tracking-[0.04em] transition-colors duration-150 relative cursor-pointer bg-transparent border-none"
                  style={{ color: isActive ? '#d4ff3a' : '#8a93ad' }}
                >
                  {isActive && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-[3px] rounded-b-[4px]"
                      style={{ background: '#d4ff3a', boxShadow: '0 0 12px rgba(212,255,58,0.35)' }}
                    />
                  )}
                  <span className="text-xl leading-none">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <style>{`
        @media (max-width: 1024px) and (min-width: 641px) {
          nav.fixed.top-0.left-0.bottom-0 {
            width: 76px !important;
          }
          nav.fixed.top-0.left-0.bottom-0 .logo-text { display: none; }
          main { margin-left: 76px !important; }
          main > div { padding-left: 22px !important; padding-right: 22px !important; }
        }
        @media (max-width: 640px) {
          nav.fixed.top-0.left-0.bottom-0 { display: none !important; }
          main { margin-left: 0 !important; }
          main > div {
            padding: 18px 16px !important;
            padding-bottom: calc(74px + env(safe-area-inset-bottom, 0)) !important;
          }
        }
      `}</style>
    </div>
  );
}
