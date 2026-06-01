import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiLogin } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';

export function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      login(data.user, data.token);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Ошибка входа';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#2563eb] rounded-xl mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="13" rx="2" stroke="white" strokeWidth="2" />
              <path d="M8 20h8M12 16v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#0f172a]">CRM · Мягкие окна</h1>
          <p className="text-sm text-[#64748b] mt-1">Войдите в свой аккаунт</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Email</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-[#e2e8f0] rounded-lg px-3.5 py-2.5 text-sm text-[#0f172a] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-[#94a3b8]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Пароль</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-[#e2e8f0] rounded-lg px-3.5 py-2.5 text-sm text-[#0f172a] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-[#94a3b8]"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3.5 py-2.5 rounded-lg">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-60 mt-1"
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>
          <p className="text-center text-sm text-[#64748b] mt-5">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-[#2563eb] font-semibold hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
