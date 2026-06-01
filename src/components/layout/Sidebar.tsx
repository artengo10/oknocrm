export function Sidebar() {
  return (
    <aside className="w-[260px] min-w-[220px] bg-white border-r border-[#e2e8f0] flex flex-col h-full overflow-hidden flex-shrink-0">
      <div className="px-4 pt-4 pb-3 border-b border-[#e2e8f0]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#0f172a]">Заказы</h2>
          <span className="text-xs bg-[#f1f5f9] text-[#64748b] px-2 py-0.5 rounded-full font-medium">
            0
          </span>
        </div>
        <button
          onClick={() => alert('Доступно на следующем этапе')}
          className="w-full py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-sm transition-colors flex items-center justify-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Добавить заказ
        </button>
      </div>

      <div className="px-4 py-3">
        <input
          type="text"
          placeholder="Поиск заказа..."
          disabled
          className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm bg-[#f8fafc] text-[#94a3b8] cursor-not-allowed outline-none"
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#f1f5f9] flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <rect x="9" y="3" width="6" height="4" rx="1" stroke="#94a3b8" strokeWidth="2" />
            <path d="M9 12h6M9 16h4" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-[#64748b]">Заказов пока нет</p>
          <p className="text-xs text-[#94a3b8] mt-0.5">Нажмите «+ Добавить заказ»</p>
        </div>
      </div>
    </aside>
  );
}
