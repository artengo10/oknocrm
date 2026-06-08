import { useState } from 'react';
import { useConstructorStore } from '../../store/constructorStore';
import { calculateCost, type CalcPrices } from '../../lib/calculator';
import { useTableStore } from '../../store/tableStore';
import { useOrdersStore } from '../../store/ordersStore';

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ru-RU') + ' ₽';
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  if (value === 0) return null;
  return (
    <div className={`flex justify-between items-center py-2 ${bold ? '' : 'border-b border-[#f1f5f9] dark:border-slate-700'}`}>
      <span className={`text-xs ${bold ? 'font-semibold text-[#0f172a] dark:text-slate-100' : 'text-[#64748b] dark:text-slate-400'}`}>
        {label}
      </span>
      <span className={`text-xs font-medium tabular-nums ${bold ? 'text-[#0f172a] dark:text-slate-100' : 'text-[#0f172a] dark:text-slate-200'}`}>
        {fmt(value)}
      </span>
    </div>
  );
}

interface Props {
  prices: CalcPrices;
  hideButton?: boolean;
}

export function ResultsBlock({ prices, hideButton }: Props) {
  const [flash, setFlash] = useState(false);
  const store = useConstructorStore();
  const input = store.toCalcInput();
  const r = calculateCost(input, prices);
  const activeOrderId = useOrdersStore((s) => s.activeOrderId);
  const addRow = useTableStore((s) => s.addRow);

  function handleAddToTable() {
    if (!activeOrderId) return;
    addRow(activeOrderId, {
      id: String(Date.now()) + Math.random(),
      prodType:        input.prodType,
      shape:           store.shape,
      size:            `${input.height}×${input.width}`,
      mat:             input.material,
      color:           store.color,
      glass:           input.glass,
      opening:         input.openingType,
      moskit:          input.moskit,
      pocket:          input.pocket,
      install:         input.install,
      extraLockType:   input.extraLockType,
      extraLockCount:  input.extraLockCount,
      extraZipperType: input.extraZipperType,
      extraZipperLen:  input.extraZipperLen,
      materialCost:    r.materialCost,
      fittingsCost:    r.fittingsCost,
      moskitCost:      r.moskitCost,
      pocketCost:      r.pocketCost,
      extraLockCost:   r.extraLockCost,
      extraZipperCost: r.extraZipperCost,
      glassSurcharge:  r.glassSurcharge,
      installCost:     r.installCost,
      extraWorkPrice:  0,
      extraWorkDesc:   '',
      price:           r.finalTotal,
      okantovkaTop:    store.okantovkaTop,
      okantovkaBottom: store.okantovkaBottom,
      okantovkaLeft:   store.okantovkaLeft,
      okantovkaRight:  store.okantovkaRight,
      luverSpacingTop:    store.luverSpacingTop,
      luverSpacingBottom: store.luverSpacingBottom,
      luverSpacingLeft:   store.luverSpacingLeft,
      luverSpacingRight:  store.luverSpacingRight,
      remenLength:     store.remenLength,
      remenWidth:      store.remenWidth,
      fittings:        store.fittings,
    });
    setFlash(true);
    setTimeout(() => setFlash(false), 1200);
  }

  const area = (input.width / 100) * (input.height / 100);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#e2e8f0] dark:border-slate-700">
        <h3 className="text-sm font-semibold text-[#0f172a] dark:text-slate-100">Стоимость</h3>
        <p className="text-xs text-[#94a3b8] dark:text-slate-500 mt-0.5">
          {input.width}×{input.height} см · {area.toFixed(2)} м²
        </p>
      </div>

      {/* Breakdown */}
      <div className="px-4 py-2 flex-1 overflow-y-auto">
        <Row label="Материал" value={r.materialCost} />
        <Row label="Фурнитура (открывание)" value={r.fittingsCost} />
        <Row label="Москитная сетка" value={r.moskitCost} />
        <Row label="Карман для сетки" value={r.pocketCost} />
        <Row label="Доп. замки" value={r.extraLockCost} />
        <Row label="Доп. молния" value={r.extraZipperCost} />

        {r.totalBeforeGlass > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-[#e2e8f0] dark:border-slate-700">
            <span className="text-xs text-[#64748b] dark:text-slate-400">Итого (до тонировки)</span>
            <span className="text-xs font-medium tabular-nums text-[#0f172a] dark:text-slate-200">
              {fmt(r.totalBeforeGlass)}
            </span>
          </div>
        )}

        <Row label={`Тонировка (${prices.glassTint}%)`} value={r.glassSurcharge} />
        <Row label="Монтаж" value={r.installCost} />
        <Row label="Прочие работы" value={r.extraWorkPrice} />
      </div>

      {/* Total */}
      <div className="px-4 py-4 border-t border-[#e2e8f0] dark:border-slate-700 bg-[#fafafa] dark:bg-slate-900">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-semibold text-[#0f172a] dark:text-slate-100">Итого</span>
          <span className="text-lg font-bold text-[#2563eb] tabular-nums">
            {fmt(r.finalTotal)}
          </span>
        </div>
        <p className="text-xs text-[#94a3b8] dark:text-slate-500">
          {(r.finalTotal / area).toFixed(0)} ₽/м²
        </p>

        {!hideButton && (
          <button
            type="button"
            onClick={handleAddToTable}
            disabled={!activeOrderId}
            className={`mt-3 w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              flash ? 'bg-[#059669]' : 'bg-[#2563eb] hover:bg-[#1d4ed8]'
            }`}
          >
            {flash ? '✓ Добавлено!' : '+ Добавить в заказ'}
          </button>
        )}
      </div>
    </div>
  );
}
