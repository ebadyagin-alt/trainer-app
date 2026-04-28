import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('trainer_jwt')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'Ошибка входа');
        return;
      }
      localStorage.setItem('trainer_jwt', data.token);
      localStorage.setItem('trainer_info', JSON.stringify(data.trainer));
      navigate('/', { replace: true });
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{
        background:
          'radial-gradient(ellipse 1200px 600px at 70% -10%, rgba(212,255,58,0.08), transparent 60%), radial-gradient(ellipse 900px 500px at -10% 110%, rgba(255,61,138,0.07), transparent 60%), #0a0c10',
      }}
    >
      <div
        className="w-full max-w-sm rounded-[22px] border border-[#262b3d] p-8"
        style={{
          background: 'linear-gradient(145deg, #12151c, #0a0c10)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
            style={{
              background: 'linear-gradient(135deg, #d4ff3a22, #d4ff3a11)',
              border: '1px solid rgba(212,255,58,0.25)',
              boxShadow: '0 0 30px rgba(212,255,58,0.15)',
            }}
          >
            💪
          </div>
          <h1
            className="text-3xl font-black uppercase tracking-tight text-text1 mb-1"
            style={{ letterSpacing: '-0.03em' }}
          >
            ВХОД
          </h1>
          <p className="text-text2 text-sm font-medium">Панель управления тренера</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="input-base"
              placeholder="trainer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="form-label">Пароль</label>
            <input
              type="password"
              className="input-base"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              className="px-4 py-3 rounded-[10px] text-sm font-medium text-center"
              style={{
                background: 'rgba(255,77,109,0.14)',
                color: '#ff4d6d',
                border: '1px solid rgba(255,77,109,0.25)',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
