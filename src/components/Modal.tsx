import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, wide = false, children }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-h-[90vh] overflow-y-auto"
        style={{
          maxWidth: wide ? 680 : 500,
          background: '#12151c',
          border: '1px solid #353b54',
          borderRadius: 22,
          boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
          animation: 'scaleIn .25s cubic-bezier(.2,.8,.2,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div
          className="sm:hidden w-11 h-1 mx-auto mt-3 rounded-full"
          style={{ background: '#353b54' }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-[26px] pt-[22px] pb-[18px]"
          style={{ borderBottom: '1px solid #262b3d' }}
        >
          <h2
            className="font-black text-xl uppercase text-text1"
            style={{ letterSpacing: '-0.02em' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="btn-icon text-lg"
            style={{ width: 32, height: 32, fontSize: 18 }}
          >
            ×
          </button>
        </div>

        {children}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .modal-overlay > div {
            max-width: 100% !important;
            border-radius: 24px 24px 0 0 !important;
            max-height: 92vh !important;
          }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
