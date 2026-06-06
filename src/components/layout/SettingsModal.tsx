import { useAuth } from '../../hooks/useAuth';
import { useThemeStore } from '../../store/themeStore';

interface Props {
  onClose: () => void;
}

function Row({
  label,
  description,
  children,
  soon,
}: {
  label: string;
  description?: string;
  children?: React.ReactNode;
  soon?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-5">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#0f172a] dark:text-slate-100">{label}</span>
          {soon && (
            <span className="text-[10px] font-semibold bg-[#f1f5f9] dark:bg-slate-700 text-[#94a3b8] dark:text-slate-500 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              скоро
            </span>
          )}
        </div>
        {description && <p className="text-xs text-[#94a3b8] dark:text-slate-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-5 pt-4 pb-1">
        <span className="text-[11px] font-semibold text-[#94a3b8] dark:text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="divide-y divide-[#f1f5f9] dark:divide-slate-700">{children}</div>
    </div>
  );
}

export function SettingsModal({ onClose }: Props) {
  const { user } = useAuth();
  const { theme, toggle } = useThemeStore();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-[#0f172a]/30 dark:bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#e2e8f0] dark:border-slate-700 w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0] dark:border-slate-700">
          <h2 className="text-sm font-semibold text-[#0f172a] dark:text-slate-100">Настройки</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-slate-100 hover:bg-[#f1f5f9] dark:hover:bg-slate-700 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="divide-y divide-[#f1f5f9] dark:divide-slate-700 max-h-[70vh] overflow-y-auto">
          <Section title="Профиль">
            <Row label="Email" description={user?.email ?? '—'} />
            <Row label="Сменить пароль" soon>
              <button disabled className="text-xs text-[#2563eb] opacity-30 cursor-not-allowed font-medium">
                Изменить
              </button>
            </Row>
          </Section>

          <Section title="Прайс-лист">
            <Row label="Цены на материалы и работы" description="Используются в конструкторе изделий">
              <button
                disabled
                className="text-xs bg-[#f1f5f9] dark:bg-slate-700 text-[#94a3b8] dark:text-slate-500 cursor-not-allowed px-3 py-1.5 rounded-lg font-medium"
              >
                Редактировать
              </button>
            </Row>
          </Section>

          <Section title="Интерфейс">
            <Row label="Тёмная тема" description={theme === 'dark' ? 'Включена' : 'Выключена'}>
              <button
                onClick={toggle}
                className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors duration-200 ${
                  theme === 'dark' ? 'bg-[#2563eb]' : 'bg-[#e2e8f0]'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </Row>
          </Section>

          <Section title="Команда">
            <Row label="Добавить сотрудника" description="Пригласите менеджера или оператора" soon>
              <button disabled className="text-xs bg-[#f1f5f9] dark:bg-slate-700 text-[#94a3b8] dark:text-slate-500 cursor-not-allowed px-3 py-1.5 rounded-lg font-medium">
                Пригласить
              </button>
            </Row>
          </Section>

          <Section title="Подписка">
            <Row label="Текущий тариф" description="Малое производство — 2 990 ₽/мес" soon>
              <button disabled className="text-xs bg-[#f1f5f9] dark:bg-slate-700 text-[#94a3b8] dark:text-slate-500 cursor-not-allowed px-3 py-1.5 rounded-lg font-medium">
                Изменить
              </button>
            </Row>
          </Section>
        </div>

        <div className="px-5 py-3 border-t border-[#f1f5f9] dark:border-slate-700 bg-[#fafafa] dark:bg-slate-900">
          <p className="text-xs text-[#94a3b8] dark:text-slate-500 text-center">Версия 1.0 · Этап 1 завершён</p>
        </div>
      </div>
    </div>
  );
}
