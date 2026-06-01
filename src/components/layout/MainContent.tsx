const features = [
  'Конструктор изделий — 11 типов мягких окон и дверей',
  'Автоматический расчёт стоимости по прайс-листу',
  'SVG-визуализация каждого изделия',
  'Москитные сетки, карманы, замки, молнии',
  'Добавление позиций в заказ с итоговой суммой',
];

export function MainContent() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] p-8 overflow-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-10 text-center max-w-md w-full">
        <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] flex items-center justify-center mx-auto mb-5">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="13" rx="2" stroke="#2563eb" strokeWidth="2" />
            <path d="M8 20h8M12 16v4" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
            <path d="M7 8h10M7 12h6" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <span className="inline-block bg-[#eff6ff] text-[#2563eb] text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Этап 2
        </span>

        <h2 className="text-base font-semibold text-[#0f172a] mb-2">Конструктор изделия</h2>
        <p className="text-sm text-[#64748b] mb-6 leading-relaxed">
          Здесь появится полноценный редактор мягких окон и дверей
        </p>

        <ul className="text-left space-y-2.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-[#475569]">
              <svg
                className="mt-0.5 flex-shrink-0"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle cx="8" cy="8" r="7" stroke="#e2e8f0" strokeWidth="1.5" />
                <path
                  d="M5 8l2 2 4-4"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
