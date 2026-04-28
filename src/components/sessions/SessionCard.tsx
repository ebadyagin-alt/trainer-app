import type { Session, Exercise } from '../../types';
import { formatRu } from '../../utils';

interface Props {
  session: Session;
  onEdit: (s: Session) => void;
  onDelete: (s: Session) => void;
}

function parseExercises(raw: Exercise[] | string): Exercise[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

function ExerciseDisplay({ ex }: { ex: Exercise }) {
  const metrics: string[] = [];
  if (ex.sets && ex.reps) metrics.push(`${ex.sets}×${ex.reps}`);
  else if (ex.sets) metrics.push(`${ex.sets} подх.`);
  if (ex.weight) metrics.push(`${ex.weight} кг`);
  if (ex.rir !== undefined && ex.rir !== '') metrics.push(`RIR ${ex.rir}`);
  if (ex.rpe !== undefined && ex.rpe !== '') metrics.push(`RPE ${ex.rpe}`);
  if (ex.rest_sec !== undefined && ex.rest_sec !== '') metrics.push(`отдых ${ex.rest_sec}с`);

  return (
    <div
      className="flex items-baseline gap-[10px] py-2 text-[13px]"
      style={{ borderBottom: '1px solid #262b3d' }}
    >
      <span className="font-bold text-text1">{ex.name}</span>
      {metrics.length > 0 && (
        <span className="text-text2 text-[12px] font-semibold tabular-nums">
          {metrics.join(' · ')}
        </span>
      )}
    </div>
  );
}

export default function SessionCard({ session, onEdit, onDelete }: Props) {
  const exercises = parseExercises(session.exercises);

  return (
    <div
      className="bg-bg2 border border-border rounded-[16px] px-6 py-5 transition-all duration-200 hover:border-border-strong hover:bg-bg-elevated"
    >
      <div className="flex justify-between items-center mb-3 gap-3">
        <div>
          <div
            className="font-extrabold text-[16px] text-text1"
            style={{ letterSpacing: '-0.01em' }}
          >
            {formatRu(session.date)}
          </div>
          <div className="text-text2 text-[13px] font-medium mt-[2px]">
            👤 {session.client_name}
          </div>
        </div>
        <div className="flex items-center gap-[6px]">
          <button
            onClick={() => onEdit(session)}
            className="btn-ghost btn-sm whitespace-nowrap"
          >
            ✏️ Изменить
          </button>
          <button
            onClick={() => onDelete(session)}
            className="btn-icon"
            title="Удалить"
          >
            🗑️
          </button>
        </div>
      </div>

      {exercises.length > 0 && (
        <div className="flex flex-col mt-[10px]">
          {exercises.map((ex, i) => (
            <ExerciseDisplay key={i} ex={ex} />
          ))}
        </div>
      )}

      {session.notes && (
        <div
          className="mt-3 text-text2 text-[13px] italic px-[14px] py-[10px] rounded-[8px]"
          style={{
            background: '#1c2030',
            borderLeft: '3px solid #ff3d8a',
          }}
        >
          {session.notes}
        </div>
      )}
    </div>
  );
}
