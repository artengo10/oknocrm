import { useAuth } from '../../hooks/useAuth';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { ClientPanel } from './ClientPanel';

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex items-center justify-between bg-[#1e293b] px-5 flex-shrink-0 h-12">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#2563eb] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="13" rx="2" stroke="white" strokeWidth="2.5" />
              <path d="M8 20h8M12 16v4" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-semibold text-white text-sm tracking-wide">CRM · Мягкие окна</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-xs text-[#94a3b8] bg-[#334155] px-2.5 py-1 rounded-full">
              0 заказов
            </span>
            <span className="text-xs text-[#94a3b8] bg-[#334155] px-2.5 py-1 rounded-full">
              0 клиентов
            </span>
          </div>

          <div className="w-px h-5 bg-[#334155]" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#2563eb] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white leading-none">
                {user ? getInitials(user.email) : 'ME'}
              </span>
            </div>
            <span className="text-xs text-[#94a3b8] hidden md:block max-w-[180px] truncate">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="text-xs text-[#64748b] hover:text-white transition-colors ml-0.5"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainContent />
        <ClientPanel />
      </div>
    </div>
  );
}
