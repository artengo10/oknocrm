import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f8fafc]">
      <header className="flex items-center justify-between bg-[#1e293b] px-5 flex-shrink-0 h-12">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-[#94a3b8] hover:text-white transition-colors text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Назад
          </button>
          <div className="w-px h-4 bg-[#334155]" />
          <span className="font-semibold text-white text-sm">Настройки</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#2563eb] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white leading-none">
              {user ? getInitials(user.email) : 'ME'}
            </span>
          </div>
          <span className="text-xs text-[#94a3b8] hidden md:block">{user?.email}</span>
          <button onClick={logout} className="text-xs text-[#64748b] hover:text-white transition-colors ml-1">
            Выйти
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#f1f5f9] flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="#94a3b8" strokeWidth="2" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="#94a3b8" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#64748b]">Настройки появятся позже</p>
        </div>
      </div>
    </div>
  );
}
