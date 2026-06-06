import { create } from 'zustand';
import {
  OPENING_OPTIONS,
  type ProdType,
  type Material,
  type FrameColor,
  type GlassType,
  type ExtraLockType,
  type ExtraZipperType,
  type CalcInput,
} from '../lib/calculator';

export type ShapeType = 'rect' | 'square' | 'arch' | 'triangle';

export const SHAPE_OPTIONS: Record<ProdType, ShapeType[]> = {
  window: ['rect', 'square', 'arch', 'triangle'],
  door: ['rect', 'arch'],
};

// ─── fitting types ────────────────────────────────────────────────────────────

export type FittingType = 'luvers' | 'fran';
export type FittingSide = 'top' | 'bottom' | 'left' | 'right';

export interface FittingItem {
  id: string;
  side: FittingSide;
  /** Position as fraction of total side length cm [0..1] */
  posNorm: number;
  type: FittingType;
}

// Generate default fitting items from current settings
function buildFittings(
  width: number, height: number,
  okTop: number, okBot: number, okLeft: number, okRight: number,
  spacingMm: number, openingType: string,
): FittingItem[] {
  const spacingCm = spacingMm / 10;
  const items: FittingItem[] = [];
  let counter = 0;

  const isFrance = openingType.includes('замок');

  function genSide(side: FittingSide, sideLenCm: number, bandCm: number, type: FittingType) {
    let pos = bandCm + spacingCm;
    const endPos = sideLenCm - bandCm - spacingCm * 0.5;
    while (pos <= endPos) {
      items.push({ id: `${side}-${counter++}`, side, posNorm: pos / sideLenCm, type });
      pos += spacingCm;
    }
    if (!items.some(f => f.side === side)) {
      items.push({ id: `${side}-${counter++}`, side, posNorm: 0.5, type });
    }
  }

  genSide('top',    width,  okTop  / 10, 'luvers');
  genSide('bottom', width,  okBot  / 10, isFrance ? 'fran' : 'luvers');
  genSide('left',   height, okLeft / 10, isFrance ? 'fran' : 'luvers');
  genSide('right',  height, okRight/ 10, isFrance ? 'fran' : 'luvers');

  return items;
}

// ─── store interface ──────────────────────────────────────────────────────────

type FnKeys = 'setField' | 'toCalcInput' | 'generateFittings' | 'cycleFitting' | 'addFitting' | 'resetFittings' | 'undoFitting' | 'moveFitting' | 'removeFitting';

interface ConstructorState {
  prodType: ProdType;
  shape: ShapeType;
  width: number;
  height: number;
  material: Material;
  color: FrameColor;
  glass: GlassType;
  openingType: string;
  moskit: boolean;
  pocket: boolean;
  install: boolean;
  extraLockType: ExtraLockType;
  extraLockCount: number;
  extraZipperType: ExtraZipperType;
  extraZipperLen: number;
  extraWorkPrice: number;
  okantovkaTop: number;
  okantovkaBottom: number;
  okantovkaLeft: number;
  okantovkaRight: number;
  luverSpacing: number;

  fittings: FittingItem[];
  fittingsHistory: FittingItem[][];   // стек для отмены, макс 20 шагов
  fittingsCustomized: boolean;

  setField: <K extends keyof Omit<ConstructorState, FnKeys>>(key: K, value: ConstructorState[K]) => void;
  toCalcInput: () => CalcInput;
  generateFittings: () => void;
  cycleFitting: (id: string) => void;
  addFitting: (side: FittingSide, posNorm: number, type?: FittingType) => void;
  undoFitting: () => void;
  resetFittings: () => void;
  moveFitting: (id: string, posNorm: number) => void;
  removeFitting: (id: string) => void;
}

export const useConstructorStore = create<ConstructorState>((set, get) => ({
  prodType: 'window',
  shape: 'rect',
  width: 150,
  height: 200,
  material: 'pvc',
  color: 'brown',
  glass: 'clear',
  openingType: OPENING_OPTIONS.window[0],
  moskit: false,
  pocket: false,
  install: false,
  extraLockType: 'none',
  extraLockCount: 1,
  extraZipperType: 'none',
  extraZipperLen: 100,
  extraWorkPrice: 0,
  okantovkaTop: 70,
  okantovkaBottom: 70,
  okantovkaLeft: 70,
  okantovkaRight: 70,
  luverSpacing: 300,

  fittings: [],
  fittingsHistory: [],
  fittingsCustomized: false,

  setField: (key, value) => set({ [key]: value } as Pick<ConstructorState, typeof key>),

  generateFittings: () => {
    const s = get();
    const items = buildFittings(
      s.width, s.height,
      s.okantovkaTop, s.okantovkaBottom, s.okantovkaLeft, s.okantovkaRight,
      s.luverSpacing, s.openingType,
    );
    set({ fittings: items, fittingsHistory: [], fittingsCustomized: false });
  },

  cycleFitting: (id: string) => {
    set(state => {
      const f = state.fittings.find(x => x.id === id);
      if (!f) return state;
      const history = [...state.fittingsHistory, state.fittings].slice(-20);
      const newFittings = f.type === 'luvers'
        ? state.fittings.map(x => x.id === id ? { ...x, type: 'fran' as FittingType } : x)
        : state.fittings.filter(x => x.id !== id);
      return { fittings: newFittings, fittingsHistory: history, fittingsCustomized: true };
    });
  },

  addFitting: (side, posNorm, type = 'luvers') => {
    const id = `custom-${Date.now()}`;
    set(state => ({
      fittings: [...state.fittings, { id, side, posNorm, type }],
      fittingsHistory: [...state.fittingsHistory, state.fittings].slice(-20),
      fittingsCustomized: true,
    }));
  },

  undoFitting: () => {
    set(state => {
      if (state.fittingsHistory.length === 0) return state;
      const history = [...state.fittingsHistory];
      const prev = history.pop()!;
      return {
        fittings: prev,
        fittingsHistory: history,
        fittingsCustomized: history.length > 0,
      };
    });
  },

  resetFittings: () => {
    const s = get();
    const items = buildFittings(
      s.width, s.height,
      s.okantovkaTop, s.okantovkaBottom, s.okantovkaLeft, s.okantovkaRight,
      s.luverSpacing, s.openingType,
    );
    set({ fittings: items, fittingsHistory: [], fittingsCustomized: false });
  },

  moveFitting: (id, posNorm) => {
    set(state => {
      const history = [...state.fittingsHistory, state.fittings].slice(-20);
      return {
        fittings: state.fittings.map(f => f.id === id ? { ...f, posNorm } : f),
        fittingsHistory: history,
        fittingsCustomized: true,
      };
    });
  },

  removeFitting: (id) => {
    set(state => {
      const history = [...state.fittingsHistory, state.fittings].slice(-20);
      return {
        fittings: state.fittings.filter(f => f.id !== id),
        fittingsHistory: history,
        fittingsCustomized: true,
      };
    });
  },

  toCalcInput: (): CalcInput => {
    const s = get();
    return {
      prodType: s.prodType,
      width: s.width,
      height: s.height,
      material: s.material,
      glass: s.glass,
      openingType: s.openingType,
      moskit: s.moskit,
      pocket: s.pocket,
      install: s.install,
      extraLockType: s.extraLockType,
      extraLockCount: s.extraLockCount,
      extraZipperType: s.extraZipperType,
      extraZipperLen: s.extraZipperLen,
      extraWorkPrice: s.extraWorkPrice,
    };
  },
}));
