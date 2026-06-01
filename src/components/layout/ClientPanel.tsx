export function ClientPanel() {
  return (
    <aside className="w-[290px] min-w-[250px] bg-white border-l border-[#e2e8f0] flex flex-col overflow-y-auto flex-shrink-0">
      <div className="px-5 py-4 border-b border-[#e2e8f0]">
        <h3 className="text-sm font-semibold text-[#0f172a]">Данные клиента</h3>
        <p className="text-xs text-[#94a3b8] mt-0.5">Выберите заказ для просмотра</p>
      </div>

      <div className="flex flex-col items-center justify-center px-6 py-6 gap-3 border-b border-[#e2e8f0]">
        <div className="w-12 h-12 rounded-2xl bg-[#f1f5f9] flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="#94a3b8" strokeWidth="2" />
            <path
              d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[#64748b]">Клиент не выбран</p>
          <p className="text-xs text-[#94a3b8] mt-0.5">Данные появятся при выборе заказа</p>
        </div>
      </div>

      <div className="px-5 py-5 flex flex-col gap-3 flex-1">
        {(['ФИО', 'Телефон', 'Адрес', 'Email'] as const).map((label) => (
          <div key={label}>
            <label className="block text-xs font-medium text-[#64748b] mb-1">{label}</label>
            <input
              type="text"
              disabled
              placeholder="—"
              className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm bg-[#f8fafc] text-[#94a3b8] cursor-not-allowed outline-none"
            />
          </div>
        ))}
      </div>

      <div className="px-5 pb-5 flex flex-col gap-2">
        <button
          disabled
          className="w-full py-2.5 bg-[#2563eb] text-white font-semibold text-sm rounded-lg opacity-30 cursor-not-allowed"
        >
          Редактировать
        </button>
        <button
          disabled
          className="w-full py-2.5 bg-[#059669] text-white font-semibold text-sm rounded-lg opacity-30 cursor-not-allowed"
        >
          Оформить заказ
        </button>
      </div>
    </aside>
  );
}
