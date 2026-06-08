import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FittingItem } from './constructorStore';

export interface TableRow {
  id: string;
  prodType: string;
  shape: string;
  size: string;
  mat: string;
  color: string;
  glass: string;
  opening: string;
  moskit: boolean;
  pocket: boolean;
  install: boolean;
  extraLockType: string;
  extraLockCount: number;
  extraZipperType: string;
  extraZipperLen: number;
  materialCost: number;
  fittingsCost: number;
  moskitCost: number;
  pocketCost: number;
  extraLockCost: number;
  extraZipperCost: number;
  glassSurcharge: number;
  installCost: number;
  extraWorkPrice: number;
  extraWorkDesc: string;
  price: number;
  okantovkaTop?: number;
  okantovkaBottom?: number;
  okantovkaLeft?: number;
  okantovkaRight?: number;
  luverSpacingTop?: number;
  luverSpacingBottom?: number;
  luverSpacingLeft?: number;
  luverSpacingRight?: number;
  remenLength?: number;
  remenWidth?: number;
  fittings?: FittingItem[];
}

interface TableState {
  rows: Record<string, TableRow[]>;
  addRow: (orderId: string, row: TableRow) => void;
  removeRow: (orderId: string, rowId: string) => void;
  updateRows: (orderId: string, rows: TableRow[]) => void;
  patchRow: (orderId: string, rowId: string, patch: Partial<TableRow>) => void;
  clearOrder: (orderId: string) => void;
}

export const useTableStore = create<TableState>()(
  persist(
    (set, get) => ({
      rows: {},
      addRow: (orderId, row) => {
        const cur = get().rows[orderId] ?? [];
        set((s) => ({ rows: { ...s.rows, [orderId]: [...cur, row] } }));
      },
      removeRow: (orderId, rowId) => {
        const cur = get().rows[orderId] ?? [];
        set((s) => ({ rows: { ...s.rows, [orderId]: cur.filter((r) => r.id !== rowId) } }));
      },
      updateRows: (orderId, rows) => {
        set((s) => ({ rows: { ...s.rows, [orderId]: rows } }));
      },
      patchRow: (orderId, rowId, patch) => {
        set((s) => ({
          rows: {
            ...s.rows,
            [orderId]: (s.rows[orderId] ?? []).map((r) => r.id === rowId ? { ...r, ...patch } : r),
          },
        }));
      },
      clearOrder: (orderId) => {
        set((s) => {
          const next = { ...s.rows };
          delete next[orderId];
          return { rows: next };
        });
      },
    }),
    { name: 'crm-order-table' }
  )
);
