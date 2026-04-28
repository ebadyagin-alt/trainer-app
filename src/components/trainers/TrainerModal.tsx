import { useState, type FormEvent } from 'react';
import Modal from '../Modal';

interface NewTrainerData {
  name: string;
  email: string;
  password: string;
  role: 'trainer' | 'admin';
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewTrainerData) => Promise<void>;
}

export default function TrainerModal({ open, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'trainer' | 'admin'>('trainer');
  const [saving, setSaving] = useState(false);

  function reset() {
    setName('');
    setEmail('');
    setPassword('');
    setRole('trainer');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ name, email, password, role });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'input-base';
  const labelCls = 'form-label';

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Новый тренер">
      <form onSubmit={handleSubmit} className="px-[26px] py-[22px] flex flex-col gap-4">
        <div>
          <label className={labelCls}>Имя *</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Иванов Иван"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Email *</label>
          <input
            type="email"
            className={inputCls}
            placeholder="trainer@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Пароль *</label>
          <input
            type="password"
            className={inputCls}
            placeholder="Минимум 6 символов"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div>
          <label className={labelCls}>Роль</label>
          <select
            className={inputCls}
            value={role}
            onChange={(e) => setRole(e.target.value as 'trainer' | 'admin')}
          >
            <option value="trainer">Тренер</option>
            <option value="admin">Администратор</option>
          </select>
        </div>

        <div
          className="flex justify-end gap-[10px] mt-2 pt-[18px]"
          style={{ borderTop: '1px solid #262b3d' }}
        >
          <button type="button" onClick={() => { reset(); onClose(); }} className="btn-ghost btn-sm">
            Отмена
          </button>
          <button type="submit" disabled={saving} className="btn-primary btn-sm disabled:opacity-60">
            {saving ? 'Создаём...' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
