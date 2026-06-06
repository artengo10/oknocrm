import { create } from 'zustand';
import {
  apiGetOrders, apiCreateOrder, apiSaveOrderItem, apiDeleteOrder, apiUpdateOrderStatus,
  type OrderDto, type OrderItemDto,
} from '../api/orders';
import { useConstructorStore } from './constructorStore';
import { calculateCost, DEFAULT_PRICES } from '../lib/calculator';
import type { ProdType, Material, FrameColor, GlassType, ExtraLockType, ExtraZipperType } from '../lib/calculator';
import type { ShapeType } from './constructorStore';

interface OrdersState {
  orders: OrderDto[];
  activeOrderId: string | null;
  loading: boolean;

  fetchOrders: () => Promise<void>;
  selectOrder: (id: string) => void;
  createOrder: () => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  saveCurrentOrder: () => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
  updateOrderInList: (order: OrderDto) => void;
}

function itemToConstructor(item: OrderItemDto) {
  const cs = useConstructorStore.getState();
  cs.setField('prodType', item.prodType as ProdType);
  cs.setField('shape', (item.shape || 'rect') as ShapeType);
  cs.setField('material', item.material as Material);
  cs.setField('color', item.color as FrameColor);
  cs.setField('glass', item.glass as GlassType);
  cs.setField('openingType', item.opening);
  cs.setField('width', item.width);
  cs.setField('height', item.height);
  cs.setField('moskit', item.moskit);
  cs.setField('pocket', item.pocket);
  cs.setField('install', item.install);
  cs.setField('extraLockType', (item.extraLockType ?? 'none') as ExtraLockType);
  cs.setField('extraLockCount', item.extraLockCount ?? 1);
  cs.setField('extraZipperType', (item.extraZipperType ?? 'none') as ExtraZipperType);
  cs.setField('extraZipperLen', item.extraZipperLen ?? 100);
  cs.setField('okantovkaTop', item.okantovkaTop);
  cs.setField('okantovkaBottom', item.okantovkaBottom);
  cs.setField('okantovkaLeft', item.okantovkaLeft);
  cs.setField('okantovkaRight', item.okantovkaRight);
}

function constructorToItem(): Omit<OrderItemDto, 'id'> {
  const s = useConstructorStore.getState();
  const result = calculateCost(s.toCalcInput(), DEFAULT_PRICES);
  return {
    prodType: s.prodType,
    shape: s.shape,
    material: s.material,
    color: s.color,
    glass: s.glass,
    opening: s.openingType,
    width: s.width,
    height: s.height,
    moskit: s.moskit,
    pocket: s.pocket,
    install: s.install,
    extraLockType:  s.extraLockType !== 'none' ? s.extraLockType : null,
    extraLockCount: s.extraLockType !== 'none' ? s.extraLockCount : null,
    extraZipperType: s.extraZipperType !== 'none' ? s.extraZipperType : null,
    extraZipperLen:  s.extraZipperType !== 'none' ? s.extraZipperLen : null,
    okantovkaTop: s.okantovkaTop,
    okantovkaBottom: s.okantovkaBottom,
    okantovkaLeft: s.okantovkaLeft,
    okantovkaRight: s.okantovkaRight,
    totalPrice: result.finalTotal,
  };
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  activeOrderId: null,
  loading: false,

  fetchOrders: async () => {
    set({ loading: true });
    try {
      const orders = await apiGetOrders();
      set({ orders, loading: false });
      // auto-select first order if none active
      const { activeOrderId } = get();
      if (!activeOrderId && orders.length > 0) {
        get().selectOrder(orders[0].id);
      }
    } catch {
      set({ loading: false });
    }
  },

  selectOrder: (id: string) => {
    const order = get().orders.find((o) => o.id === id);
    if (!order) return;
    set({ activeOrderId: id });
    if (order.item) {
      itemToConstructor(order.item);
    }
  },

  createOrder: async () => {
    try {
      const order = await apiCreateOrder();
      set((s) => ({ orders: [...s.orders, order] }));
      get().selectOrder(order.id);
    } catch { /* ignore */ }
  },

  deleteOrder: async (id: string) => {
    try {
      await apiDeleteOrder(id);
      const { orders, activeOrderId } = get();
      const next = orders.filter((o) => o.id !== id);
      set({ orders: next });
      if (activeOrderId === id && next.length > 0) {
        get().selectOrder(next[0].id);
      }
    } catch { /* ignore */ }
  },

  saveCurrentOrder: async () => {
    const { activeOrderId } = get();
    if (!activeOrderId) return;
    try {
      const item = constructorToItem();
      const updated = await apiSaveOrderItem(activeOrderId, item);
      get().updateOrderInList(updated);
    } catch { /* ignore */ }
  },

  updateStatus: async (id: string, status: string) => {
    try {
      const updated = await apiUpdateOrderStatus(id, status);
      get().updateOrderInList(updated);
    } catch { /* ignore */ }
  },

  updateOrderInList: (order: OrderDto) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === order.id ? order : o)),
    }));
  },
}));
