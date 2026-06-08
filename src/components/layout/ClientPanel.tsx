import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ResultsBlock } from '../constructor/ResultsBlock';
import { apiGetPrices } from '../../api/settings';
import { DEFAULT_PRICES, type CalcPrices } from '../../lib/calculator';
import { useOrdersStore } from '../../store/ordersStore';
import { useTableStore } from '../../store/tableStore';
import { generateOrderPdf, downloadPdf, sendPdfToMax } from '../../lib/generateOrderPdf';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  novy:     { label: 'Новый',        color: 'bg-blue-500' },
  v_rabote: { label: 'В работе',     color: 'bg-yellow-500' },
  gotov:    { label: 'Готов',        color: 'bg-green-500' },
  otgr:     { label: 'Отгружен',     color: 'bg-slate-400' },
};

const PROD_LABEL: Record<string, string> = { window: 'Окно', door: 'Дверь' };
const SHAPE_LABEL: Record<string, string> = {
  rect: 'Прямоугольник', square: 'Квадрат', arch: 'Арка', triangle: 'Треугольник',
};
const MAT_LABEL: Record<string, string> = {
  pvc: 'ПВХ', screen: 'Сетка', oxford: 'Оксфорд',
};

interface ClientFields { fio: string; phone: string; address: string; email: string; comment: string; }
const EMPTY: ClientFields = { fio: '', phone: '', address: '', email: '', comment: '' };
const EMPTY_ROWS: never[] = [];

export function ClientPanel() {
  const [prices, setPrices] = useState<CalcPrices>(DEFAULT_PRICES);
  const [client, setClient] = useState<ClientFields>(EMPTY);
  const [confirmed, setConfirmed] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { orders, activeOrderId, updateStatus, saveCurrentOrder } = useOrdersStore();
  const savedRows = useTableStore((s) => s.rows[activeOrderId ?? ''] ?? EMPTY_ROWS);

  // Reset fields when active order changes
  useEffect(() => { setClient(EMPTY); setConfirmed(false); }, [activeOrderId]);

  async function handleConfirm() {
    if (!activeOrderId || !activeOrder) return;
    setPdfLoading(true);
    try {
      // Generate and download PDF
      const blob = await generateOrderPdf({
        orderNum: activeOrder.orderNum,
        client,
        rows: savedRows,
      });
      downloadPdf(blob, activeOrder.orderNum);
      sendPdfToMax(blob, activeOrder.orderNum).catch((e) => console.error('MAX send error:', e));
      // Update order status
      await saveCurrentOrder();
      await updateStatus(activeOrderId, 'v_rabote');
      setConfirmed(true);
    } catch (e) {
      console.error('PDF generation error:', e);
    } finally {
      setPdfLoading(false);
    }
  }

  const activeOrder = orders.find((o) => o.id === activeOrderId) ?? null;
  const item = activeOrder?.item ?? null;
  const status = activeOrder ? (STATUS_LABEL[activeOrder.status] ?? STATUS_LABEL['novy']) : null;

  useEffect(() => {
    apiGetPrices()
      .then((dto) => setPrices({
        materialPvc: dto.materialPvc,
        materialScreen: dto.materialScreen,
        materialOxford: dto.materialOxford,
        moskit: dto.moskit,
        pocket: dto.pocket,
        extraLockRotary: dto.extraLockRotary,
        extraLockFrench: dto.extraLockFrench,
        extraZipperSpiral: dto.extraZipperSpiral,
        extraZipperTractor: dto.extraZipperTractor,
        glassTint: dto.glassTint,
        install: dto.install,
      }))
      .catch(() => {});
  }, []);

  return (
    <>
    {pdfLoading && createPortal(
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-5 min-w-[260px]">
          <div className="w-12 h-12 border-4 border-[#059669] border-t-transparent rounded-full animate-spin"/>
          <p className="text-sm font-semibold text-[#0f172a] dark:text-slate-100">Генерация PDF...</p>
          <p className="text-xs text-[#94a3b8] text-center">Формируем чертёж и раскрой.<br/>Обычно занимает 2–4 секунды.</p>
        </div>
      </div>,
      document.body
    )}
    <aside className="w-full bg-white dark:bg-slate-900 border-l border-[#e2e8f0] dark:border-slate-700 flex flex-col h-full overflow-hidden">

      {/* Header — показывает активный заказ или плейсхолдер */}
      <div className="px-4 py-3 border-b border-[#e2e8f0] dark:border-slate-700 flex-shrink-0">
        {activeOrder ? (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#0f172a] dark:text-slate-100">
                Заказ №{activeOrder.orderNum}
              </h3>
              {item && (
                <p className="text-[11px] text-[#94a3b8] dark:text-slate-500 mt-0.5">
                  {PROD_LABEL[item.prodType] ?? item.prodType} · {SHAPE_LABEL[item.shape] ?? item.shape} · {item.width}×{item.height} см
                </p>
              )}
            </div>
            {status && (
              <div className="flex items-center gap-1.5 bg-[#f1f5f9] dark:bg-slate-800 px-2 py-1 rounded-full">
                <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                <span className="text-[10px] font-medium text-[#64748b] dark:text-slate-400">{status.label}</span>
              </div>
            )}
          </div>
        ) : (
          <>
            <h3 className="text-xs font-semibold text-[#0f172a] dark:text-slate-100">Данные клиента</h3>
            <p className="text-[11px] text-[#94a3b8] dark:text-slate-500 mt-0.5">Выберите заказ для просмотра</p>
          </>
        )}
      </div>

      {/* Client info */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Карточка клиента */}
        <div className="flex flex-col items-center justify-center px-4 py-3 gap-2 border-b border-[#e2e8f0] dark:border-slate-700">
          <div className="w-9 h-9 rounded-xl bg-[#f1f5f9] dark:bg-slate-800 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#94a3b8" strokeWidth="2" />
              <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-[#64748b] dark:text-slate-400">Клиент не привязан</p>
            <p className="text-[11px] text-[#94a3b8] dark:text-slate-500 mt-0.5">
              {activeOrder ? 'Нажмите «Привязать клиента»' : 'Выберите заказ из списка'}
            </p>
          </div>
        </div>

        {/* Поля клиента */}
        <div className="px-4 py-3 flex flex-col gap-2">
          {([
            ['fio',     'ФИО',        'text',  'Иванов Иван Иванович'],
            ['phone',   'Телефон',    'tel',   '+7 (___) ___-__-__'],
            ['address', 'Адрес',      'text',  'г. Москва, ул. ...'],
            ['email',   'Email',      'email', 'client@mail.ru'],
            ['comment', 'Комментарий','text',  'Пробой в цеху...'],
          ] as [keyof ClientFields, string, string, string][]).map(([key, label, type, placeholder]) => (
            <div key={key}>
              <label className="block text-[11px] font-medium text-[#64748b] dark:text-slate-400 mb-1">{label}</label>
              <input
                type={type}
                value={client[key]}
                onChange={(e) => setClient((c) => ({ ...c, [key]: e.target.value }))}
                placeholder={activeOrder ? placeholder : '—'}
                disabled={!activeOrder}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none transition-all ${
                  activeOrder
                    ? 'border-[#e2e8f0] dark:border-slate-600 bg-white dark:bg-slate-800 text-[#0f172a] dark:text-slate-100 placeholder:text-[#cbd5e1] dark:placeholder:text-slate-600 focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/10'
                    : 'border-[#e2e8f0] dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800 text-[#94a3b8] dark:text-slate-500 cursor-not-allowed'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Параметры изделия (если заказ выбран) */}
        {item && (
          <div className="px-4 pb-3 border-t border-[#f1f5f9] dark:border-slate-700 pt-3">
            <p className="text-[10px] font-semibold text-[#94a3b8] dark:text-slate-500 uppercase tracking-wider mb-2">Изделие</p>
            <div className="flex flex-col gap-1">
              {[
                ['Тип', `${PROD_LABEL[item.prodType] ?? item.prodType} · ${SHAPE_LABEL[item.shape] ?? item.shape}`],
                ['Размер', `${item.width} × ${item.height} см`],
                ['Материал', MAT_LABEL[item.material] ?? item.material],
                ['Открывание', item.opening],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-2">
                  <span className="text-[11px] text-[#94a3b8] dark:text-slate-500 flex-shrink-0">{k}</span>
                  <span className="text-[11px] text-[#475569] dark:text-slate-300 text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Price block */}
      <div className="border-t border-[#e2e8f0] dark:border-slate-700 flex-shrink-0">
        <ResultsBlock prices={prices} hideButton />
      </div>

      {/* Buttons */}
      <div className="px-4 pb-4 pt-2 flex flex-col gap-2 flex-shrink-0 border-t border-[#e2e8f0] dark:border-slate-700">
        {confirmed ? (
          <div className="flex flex-col items-center gap-1.5 py-2">
            <div className="w-8 h-8 rounded-full bg-[#059669] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3.5 3.5L13 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-xs font-semibold text-[#059669]">Заказ оформлен!</p>
            <p className="text-[11px] text-[#94a3b8] dark:text-slate-500">Статус: В работе</p>
            <button
              onClick={() => setConfirmed(false)}
              className="mt-1 text-[11px] text-[#2563eb] hover:underline"
            >
              Редактировать
            </button>
          </div>
        ) : (
          <button
            disabled={!activeOrder || pdfLoading}
            onClick={handleConfirm}
            className="w-full py-2 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {pdfLoading ? 'Генерация PDF...' : 'Оформить заказ'}
          </button>
        )}
      </div>

    </aside>
    </>
  );
}
