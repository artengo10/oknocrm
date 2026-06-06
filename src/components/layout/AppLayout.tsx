import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AutoSave } from '../AutoSave';
import { useOrdersStore } from '../../store/ordersStore';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { ClientPanel } from './ClientPanel';
import { SettingsModal } from './SettingsModal';

const SIDEBAR_DEFAULT = 240;
const CLIENT_DEFAULT = 300;
const SNAP_THRESHOLD = 48;

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

function useResize(
  initial: number,
  direction: 'ltr' | 'rtl'
): [number, (e: React.MouseEvent) => void, () => void] {
  const [width, setWidth] = useState(initial);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;

    function onMove(ev: MouseEvent) {
      const delta = ev.clientX - startX;
      const next = direction === 'ltr' ? startW + delta : startW - delta;
      const clamped = Math.max(0, Math.min(500, next));
      setWidth(clamped < SNAP_THRESHOLD ? 0 : clamped);
    }

    function onUp() {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function expand() {
    setWidth(initial);
  }

  return [width, startDrag, expand];
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="relative w-1 flex-shrink-0 cursor-col-resize group z-10"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
      <div className="absolute inset-y-0 left-0 right-0 bg-[#e2e8f0] group-hover:bg-[#2563eb] transition-colors duration-150" />
    </div>
  );
}

function ExpandTab({
  onClick,
  side,
}: {
  onClick: () => void;
  side: 'left' | 'right';
}) {
  return (
    <button
      onClick={onClick}
      title="Развернуть панель"
      className="flex-shrink-0 w-4 bg-[#cbd5e1] hover:bg-[#94a3b8] border-[#cbd5e1] flex items-center justify-center transition-colors group"
      style={{ borderLeft: side === 'right' ? '1px solid #e2e8f0' : undefined, borderRight: side === 'left' ? '1px solid #e2e8f0' : undefined }}
    >
      <svg
        width="8"
        height="12"
        viewBox="0 0 8 12"
        fill="none"
        className="text-[#94a3b8] group-hover:text-[#2563eb] transition-colors"
      >
        {side === 'right' ? (
          <path d="M2 1l4 5-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M6 1L2 6l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const ordersCount = useOrdersStore((s) => s.orders.length);
  const [sidebarWidth, startSidebarDrag, expandSidebar] = useResize(SIDEBAR_DEFAULT, 'ltr');
  const [clientWidth, startClientDrag, expandClient] = useResize(CLIENT_DEFAULT, 'rtl');
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

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
            <span className="text-xs text-[#94a3b8] bg-[#334155] px-2.5 py-1 rounded-full">{ordersCount} заказов</span>
            <span className="text-xs text-[#94a3b8] bg-[#334155] px-2.5 py-1 rounded-full">0 клиентов</span>
          </div>
          <div className="w-px h-5 bg-[#334155]" />
          <button
            onClick={() => setSettingsOpen(true)}
            title="Настройки"
            className="text-[#64748b] hover:text-white transition-colors p-1 rounded"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
          <div className="w-px h-5 bg-[#334155]" />
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-[#334155] transition-colors"
            >
              <div className="w-7 h-7 bg-[#2563eb] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white leading-none">
                  {user ? getInitials(user.email) : 'ME'}
                </span>
              </div>
              <span className="text-xs text-[#94a3b8] hidden md:block max-w-[160px] truncate">
                {user?.email}
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`text-[#64748b] transition-transform ${profileOpen ? 'rotate-180' : ''}`}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-[420px] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#e2e8f0] dark:border-slate-700 z-50 overflow-hidden">
                <div className="px-5 py-4 border-b border-[#f1f5f9] dark:border-slate-700">
                  <p className="text-xs text-[#94a3b8] dark:text-slate-500">Аккаунт</p>
                  <p className="text-sm font-medium text-[#0f172a] dark:text-slate-100 mt-0.5 truncate">{user?.email}</p>
                </div>

                <div className="p-4 grid grid-cols-2 gap-3">
                  <div className="border border-[#e2e8f0] dark:border-slate-600 rounded-xl p-4 flex flex-col gap-3 hover:border-[#2563eb] hover:shadow-sm transition-all cursor-default">
                    <div>
                      <span className="text-xs font-semibold text-[#64748b] dark:text-slate-400 uppercase tracking-wider">Малое производство</span>
                      <div className="flex items-end gap-1 mt-2">
                        <span className="text-2xl font-bold text-[#0f172a] dark:text-slate-100 leading-none">2 990</span>
                        <span className="text-sm text-[#64748b] dark:text-slate-400 mb-0.5">₽/мес</span>
                      </div>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {['До 50 заказов в месяц', '1 пользователь', 'Конструктор изделий', 'Экспорт PDF'].map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-[#475569] dark:text-slate-400">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                            <path d="M2 6l3 3 5-5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full mt-auto py-2 rounded-lg border border-[#2563eb] text-[#2563eb] text-xs font-semibold hover:bg-[#eff6ff] dark:hover:bg-blue-900/20 transition-colors">
                      Выбрать
                    </button>
                  </div>

                  <div className="border-2 border-[#2563eb] rounded-xl p-4 flex flex-col gap-3 bg-[#fafcff] dark:bg-blue-900/10 relative">
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="bg-[#2563eb] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                        Популярный
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#64748b] dark:text-slate-400 uppercase tracking-wider">Большое производство</span>
                      <div className="flex items-end gap-1 mt-2">
                        <span className="text-2xl font-bold text-[#0f172a] dark:text-slate-100 leading-none">5 990</span>
                        <span className="text-sm text-[#64748b] dark:text-slate-400 mb-0.5">₽/мес</span>
                      </div>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {['Неограниченные заказы', 'До 5 пользователей', 'Конструктор изделий', 'Экспорт PDF', 'Приоритетная поддержка'].map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-[#475569] dark:text-slate-400">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                            <path d="M2 6l3 3 5-5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full mt-auto py-2 rounded-lg bg-[#2563eb] text-white text-xs font-semibold hover:bg-[#1d4ed8] transition-colors">
                      Выбрать
                    </button>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <button
                    onClick={logout}
                    className="w-full py-2 rounded-lg text-xs text-[#64748b] dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Выйти из аккаунта
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {children ?? (
        <div className="flex flex-1 overflow-hidden">
          {sidebarWidth > 0 ? (
            <div style={{ width: sidebarWidth, minWidth: sidebarWidth }} className="flex-shrink-0 overflow-hidden h-full">
              <Sidebar />
            </div>
          ) : (
            <ExpandTab onClick={expandSidebar} side="right" />
          )}

          {sidebarWidth > 0 && <ResizeHandle onMouseDown={startSidebarDrag} />}

          <MainContent />

          {clientWidth > 0 && <ResizeHandle onMouseDown={startClientDrag} />}

          {clientWidth > 0 ? (
            <div style={{ width: clientWidth, minWidth: clientWidth }} className="flex-shrink-0 overflow-hidden h-full">
              <ClientPanel />
            </div>
          ) : (
            <ExpandTab onClick={expandClient} side="left" />
          )}
        </div>
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      <AutoSave />
    </div>
  );
}
