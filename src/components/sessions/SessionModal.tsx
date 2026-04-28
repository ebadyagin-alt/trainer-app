import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../Modal';
import ExerciseRow from './ExerciseRow';
import type { Session, Client, Template, Exercise } from '../../types';
import { api } from '../../api';
import { todayStr } from '../../utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Session>) => Promise<void>;
  session: Session | null;
  clients: Client[];
  templates: Template[];
  onTemplatesChange: (templates: Template[]) => void;
}

function parseExercises(raw: Exercise[] | string): Exercise[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

const emptyExercise = (): Exercise => ({
  name: '',
  sets: '',
  reps: '',
  weight: '',
  rir: '',
  rpe: '',
  rest_sec: '',
});

export default function SessionModal({
  open,
  onClose,
  onSave,
  session,
  clients,
  templates,
  onTemplatesChange,
}: Props) {
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session) {
      setClientId(String(session.client_id));
      setDate((session.date || '').split('T')[0]);
      setNotes(session.notes || '');
      const exs = parseExercises(session.exercises);
      setExercises(exs.length ? exs : [emptyExercise()]);
    } else {
      setClientId('');
      setDate(todayStr());
      setNotes('');
      setExercises([emptyExercise()]);
    }
  }, [session, open]);

  function addExercise() {
    setExercises((prev) => [...prev, emptyExercise()]);
  }

  function updateExercise(index: number, updated: Exercise) {
    setExercises((prev) => prev.map((ex, i) => (i === index ? updated : ex)));
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function loadTemplate(templateId: string) {
    if (!templateId) return;
    const tpl = templates.find((t) => t.id === Number(templateId));
    if (!tpl) return;
    const exs = parseExercises(tpl.exercises);
    setExercises(exs.length ? exs : [emptyExercise()]);
  }

  async function saveTemplate() {
    const validExercises = exercises.filter((ex) => ex.name?.toString().trim());
    if (!validExercises.length) {
      alert('Добавьте хотя бы одно упражнение');
      return;
    }
    const name = prompt('Название шаблона:');
    if (!name?.trim()) return;
    const tpl = await api.post<Template>('/api/templates', {
      name: name.trim(),
      exercises: validExercises,
    });
    if (tpl.id) {
      onTemplatesChange([...templates, tpl]);
      alert(`Шаблон "${tpl.name}" сохранён`);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const validExercises = exercises.filter((ex) => ex.name?.toString().trim());
      await onSave({
        ...(session ? { id: session.id } : {}),
        client_id: Number(clientId),
        date,
        exercises: validExercises,
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
      title={session ? 'Редактировать тренировку' : 'Новая тренировка'}
      wide
    >
      <form onSubmit={handleSubmit} className="px-[26px] py-[22px] flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
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

        {/* Exercises */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-[10px]">
            <label className={labelCls} style={{ margin: 0 }}>
              Упражнения
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="input-base"
                style={{ width: 'auto', minWidth: 170 }}
                defaultValue=""
                onChange={(e) => {
                  loadTemplate(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="">Загрузить шаблон...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={saveTemplate}
                className="btn-ghost btn-sm whitespace-nowrap"
              >
                💾 Сохранить как шаблон
              </button>
            </div>
          </div>

          {exercises.map((ex, i) => (
            <ExerciseRow
              key={i}
              exercise={ex}
              index={i}
              onChange={updateExercise}
              onRemove={removeExercise}
            />
          ))}

          <button
            type="button"
            onClick={addExercise}
            className="btn-ghost btn-sm mt-2"
          >
            + Добавить упражнение
          </button>
        </div>

        <div>
          <label className={labelCls}>Заметки о тренировке</label>
          <textarea
            className={inputCls}
            rows={2}
            placeholder="Общие комментарии к тренировке..."
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
