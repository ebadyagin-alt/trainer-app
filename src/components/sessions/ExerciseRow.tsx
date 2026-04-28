import type { Exercise } from '../../types';

interface Props {
  exercise: Exercise;
  index: number;
  onChange: (index: number, updated: Exercise) => void;
  onRemove: (index: number) => void;
}

export default function ExerciseRow({ exercise, index, onChange, onRemove }: Props) {
  function update(field: keyof Exercise, value: string) {
    onChange(index, { ...exercise, [field]: value });
  }

  const metricInputCls =
    'w-full bg-bg px-2 py-[7px] text-[13px] text-center font-bold tabular-nums text-text1 border border-border rounded-[10px] outline-none transition-all duration-200 focus:border-primary focus:bg-bg-elevated';

  return (
    <div
      className="rounded-[13px] px-[14px] py-3 mb-[10px] border border-border transition-colors duration-200 hover:border-border-strong"
      style={{ background: '#0a0c10' }}
    >
      {/* Name + remove */}
      <div className="flex items-center gap-2 mb-[10px]">
        <input
          type="text"
          className="input-base flex-1"
          placeholder="Название упражнения"
          value={exercise.name || ''}
          onChange={(e) => update('name', e.target.value)}
        />
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="btn-icon flex-shrink-0"
          title="Удалить"
        >
          ✕
        </button>
      </div>

      {/* Metrics */}
      <div className="grid gap-[6px]" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {[
          { label: 'Подходы', field: 'sets' as keyof Exercise, min: 0, step: 1, placeholder: '0' },
          { label: 'Повторения', field: 'reps' as keyof Exercise, min: 0, step: 1, placeholder: '0' },
          { label: 'Вес (кг)', field: 'weight' as keyof Exercise, min: 0, step: 0.5, placeholder: '0' },
          { label: 'RIR', field: 'rir' as keyof Exercise, min: 0, max: 10, step: 1, placeholder: '—' },
          { label: 'RPE', field: 'rpe' as keyof Exercise, min: 1, max: 10, step: 0.5, placeholder: '—' },
          { label: 'Отдых (с)', field: 'rest_sec' as keyof Exercise, min: 0, step: 15, placeholder: '—' },
        ].map(({ label, field, min, max, step, placeholder }) => (
          <div key={field} className="flex flex-col gap-1">
            <span
              className="text-[9px] text-text-muted font-bold uppercase"
              style={{ letterSpacing: '0.08em' }}
            >
              {label}
            </span>
            <input
              type="number"
              className={metricInputCls}
              min={min}
              max={max}
              step={step}
              placeholder={placeholder}
              value={String(exercise[field] ?? '')}
              onChange={(e) => update(field, e.target.value)}
            />
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .ex-metrics-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
