import { useEffect } from 'react';
import { useOrdersStore } from '../../store/ordersStore';
import type { OrderDto } from '../../api/orders';

const PROD_LABEL: Record<string, string> = {
  window: 'Окно', door: 'Дверь',
};
const SHAPE_LABEL: Record<string, string> = {
  rect: 'Прямоуг.', square: 'Квадрат', arch: 'Арка', triangle: 'Треугол.',
};
const STATUS_COLOR: Record<string, string> = {
  novy:    'bg-blue-500',
  v_rabote:'bg-yellow-500',
  gotov:   'bg-green-500',
  otgr:    'bg-slate-400',
};

function fmt(n: number | null | undefined) {
  if (!n) return null;
  return Math.round(n).toLocaleString('ru-RU') + ' ₽';
}

function OrderCard({ order, active, onSelect, onDelete }: {
  order: OrderDto;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const item = order.item;
  const price = fmt(item?.totalPrice);

  return (
    <div
      onClick={onSelect}
      className={`group relative mx-2 mb-1 rounded-xl border cursor-pointer transition-all ${
        active
          ? 'border-[#2563eb] bg-[#eff6ff] dark:bg-blue-900/20'
          : 'border-[#e2e8f0] dark:border-slate-700 hover:border-[#94a3b8] dark:hover:border-slate-500 bg-white dark:bg-slate-800'
      }`}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLOR[order.status] ?? 'bg-blue-500'}`} />
            <span className={`text-xs font-semibold ${active ? 'text-[#2563eb]' : 'text-[#0f172a] dark:text-slate-100'}`}>
              Заказ №{order.orderNum}
            </span>
          </div>
          {price && (
            <span className={`text-xs font-bold tabular-nums ${active ? 'text-[#2563eb]' : 'text-[#64748b] dark:text-slate-400'}`}>
              {price}
            </span>
          )}
        </div>

        {item ? (
          <div className="text-[11px] text-[#64748b] dark:text-slate-400 flex items-center gap-1">
            <span>{PROD_LABEL[item.prodType] ?? item.prodType}</span>
            <span className="text-[#cbd5e1] dark:text-slate-600">·</span>
            <span>{SHAPE_LABEL[item.shape] ?? item.shape}</span>
            <span className="text-[#cbd5e1] dark:text-slate-600">·</span>
            <span>{item.width}×{item.height}</span>
          </div>
        ) : (
          <div className="text-[11px] text-[#94a3b8] dark:text-slate-500">Пустой заказ</div>
        )}
      </div>

      {/* Delete button — only visible on hover, hidden if only 1 order */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Удалить заказ"
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded text-[#94a3b8] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function Sidebar() {
  const { orders, activeOrderId, loading, fetchOrders, selectOrder, createOrder, deleteOrder } = useOrdersStore();

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <aside className="w-full bg-white dark:bg-slate-900 border-r border-[#e2e8f0] dark:border-slate-700 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#e2e8f0] dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#0f172a] dark:text-slate-100">Заказы</h2>
          <span className="text-xs bg-[#f1f5f9] dark:bg-slate-800 text-[#64748b] dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
            {orders.length}
          </span>
        </div>
        <button
          onClick={createOrder}
          className="w-full py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-sm transition-colors flex items-center justify-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Добавить заказ
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 flex-shrink-0">
        <input
          type="text"
          placeholder="Поиск заказа..."
          disabled
          className="w-full border border-[#e2e8f0] dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-[#f8fafc] dark:bg-slate-800 text-[#94a3b8] dark:text-slate-500 cursor-not-allowed outline-none placeholder:text-[#94a3b8] dark:placeholder:text-slate-600"
        />
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading && orders.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-8 text-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#f1f5f9] dark:bg-slate-800 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                <rect x="9" y="3" width="6" height="4" rx="1" stroke="#94a3b8" strokeWidth="2" />
              </svg>
            </div>
            <p className="text-xs text-[#64748b] dark:text-slate-400">Нет заказов</p>
          </div>
        )}

        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            active={order.id === activeOrderId}
            onSelect={() => selectOrder(order.id)}
            onDelete={() => deleteOrder(order.id)}
          />
        ))}
      </div>
    </aside>
  );
}
