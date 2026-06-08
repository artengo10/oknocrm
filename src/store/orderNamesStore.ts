import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OrderNamesState {
  names: Record<string, string>;
  setName: (orderId: string, name: string) => void;
  clearName: (orderId: string) => void;
}

export const useOrderNamesStore = create<OrderNamesState>()(
  persist(
    (set) => ({
      names: {},
      setName: (orderId, name) =>
        set((s) => ({ names: { ...s.names, [orderId]: name } })),
      clearName: (orderId) =>
        set((s) => {
          const next = { ...s.names };
          delete next[orderId];
          return { names: next };
        }),
    }),
    { name: 'order-names' }
  )
);
