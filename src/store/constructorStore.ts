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
  window: ['rect', 'arch', 'triangle'],
  door: ['rect', 'arch'],
};

// ─── fitting types ────────────────────────────────────────────────────────────

export type FittingType = 'luvers' | 'fran' | 'remen' | 'zipper';
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
  spacingTopMm: number, spacingBottomMm: number, spacingLeftMm: number, spacingRightMm: number,
  openingType: string,
  shape = 'rect',
): FittingItem[] {
  const items: FittingItem[] = [];
  let counter = 0;
  const isFrance = openingType.includes('замок');

  // For arch: the top portion of left/right sides is the arch curve — fittings there are invisible.
  // Start side fittings below the arch curve.
  const archHCm = shape === 'arch' ? Math.min(width / 2, height * 0.55) : 0;

  function genSide(side: FittingSide, sideLenCm: number, bandCm: number, type: FittingType, spacingCm: number, minStartCm = 0) {
    if (spacingCm <= 0) {
      const fallbackNorm = Math.max((minStartCm + bandCm) / sideLenCm + 0.1, 0.5);
      items.push({ id: `${side}-${counter++}`, side, posNorm: Math.min(fallbackNorm, 0.9), type });
      return;
    }
    let pos = Math.max(bandCm + spacingCm, minStartCm + spacingCm);
    const endPos = sideLenCm - bandCm - spacingCm * 0.5;
    let count = 0;
    while (pos <= endPos && count < 40) {
      items.push({ id: `${side}-${counter++}`, side, posNorm: pos / sideLenCm, type });
      pos += spacingCm;
      count++;
    }
    if (!items.some(f => f.side === side)) {
      const midNorm = (Math.max(bandCm, minStartCm) + sideLenCm - bandCm) / 2 / sideLenCm;
      items.push({ id: `${side}-${counter++}`, side, posNorm: midNorm, type });
    }
  }

  genSide('top',    width,  okTop  / 10, 'luvers',                     spacingTopMm    / 10);
  genSide('bottom', width,  okBot  / 10, isFrance ? 'fran' : 'luvers', spacingBottomMm / 10);
  genSide('left',   height, okLeft / 10, isFrance ? 'fran' : 'luvers', spacingLeftMm   / 10, archHCm);
  genSide('right',  height, okRight/ 10, isFrance ? 'fran' : 'luvers', spacingRightMm  / 10, archHCm);

  if (shape === 'rect' || shape === 'square') {
    items.push({ id: 'remen-0', side: 'top', posNorm: 0.33, type: 'remen' });
    items.push({ id: 'remen-1', side: 'top', posNorm: 0.67, type: 'remen' });
  }

  if (openingType.includes('молни')) {
    const m = openingType.match(/^(\d+) молни/);
    const count = m ? Math.max(1, Math.min(5, parseInt(m[1]))) : 1;
    for (let i = 0; i < count; i++) {
      items.push({ id: `zipper-${i}`, side: 'top', posNorm: (i + 1) / (count + 1), type: 'zipper' });
    }
  }

  return items;
}

// Preserve zipper/remen positions from old fittings when rebuilding
function preservePositions(newItems: FittingItem[], oldFittings: FittingItem[]): FittingItem[] {
  const oldByType: Partial<Record<FittingType, FittingItem[]>> = {};
  for (const f of oldFittings) {
    if (f.type === 'zipper' || f.type === 'remen') {
      (oldByType[f.type] ??= []).push(f);
    }
  }
  const counters: Partial<Record<FittingType, number>> = {};
  return newItems.map(f => {
    if (f.type !== 'zipper' && f.type !== 'remen') return f;
    const idx = counters[f.type] ?? 0;
    counters[f.type] = idx + 1;
    const old = oldByType[f.type]?.[idx];
    return old ? { ...f, posNorm: old.posNorm } : f;
  });
}

// ─── store interface ──────────────────────────────────────────────────────────

type FnKeys = { [K in keyof ConstructorState]: ConstructorState[K] extends (...args: never[]) => unknown ? K : never }[keyof ConstructorState];

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
  luverSpacingTop: number;
  luverSpacingBottom: number;
  luverSpacingLeft: number;
  luverSpacingRight: number;
  remenLength: number;  // cm, 0 = auto
  remenWidth: number;   // cm, 0 = auto

  fittings: FittingItem[];
  fittingsHistory: FittingItem[][];   // стек undo, макс 20 шагов
  fittingsRedoStack: FittingItem[][];  // стек redo, макс 20 шагов
  fittingsCustomized: boolean;

  setField: <K extends keyof Omit<ConstructorState, FnKeys>>(key: K, value: ConstructorState[K]) => void;
  toCalcInput: () => CalcInput;
  generateFittings: () => void;
  cycleFitting: (id: string) => void;
  addFitting: (side: FittingSide, posNorm: number, type?: FittingType) => void;
  undoFitting: () => void;
  redoFitting: () => void;
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
  luverSpacingTop: 300,
  luverSpacingBottom: 300,
  luverSpacingLeft: 300,
  luverSpacingRight: 300,
  remenLength: 0,
  remenWidth: 0,

  fittings: [],
  fittingsHistory: [],
  fittingsRedoStack: [],
  fittingsCustomized: false,

  setField: (key, value) => set({ [key]: value } as Pick<ConstructorState, typeof key>),

  generateFittings: () => {
    const s = get();
    const newItems = buildFittings(
      s.width, s.height,
      s.okantovkaTop, s.okantovkaBottom, s.okantovkaLeft, s.okantovkaRight,
      s.luverSpacingTop, s.luverSpacingBottom, s.luverSpacingLeft, s.luverSpacingRight,
      s.openingType, s.shape,
    );
    const items = preservePositions(newItems, s.fittings);
    set({ fittings: items, fittingsCustomized: false });
  },

  cycleFitting: (id: string) => {
    set(state => {
      const f = state.fittings.find(x => x.id === id);
      if (!f) return state;
      const history = [...state.fittingsHistory, state.fittings].slice(-20);
      const newFittings = f.type === 'luvers'
        ? state.fittings.map(x => x.id === id ? { ...x, type: 'fran' as FittingType } : x)
        : state.fittings.filter(x => x.id !== id);
      return { fittings: newFittings, fittingsHistory: history, fittingsRedoStack: [], fittingsCustomized: true };
    });
  },

  addFitting: (side, posNorm, type = 'luvers') => {
    const id = `custom-${Date.now()}`;
    set(state => ({
      fittings: [...state.fittings, { id, side, posNorm, type }],
      fittingsHistory: [...state.fittingsHistory, state.fittings].slice(-20),
      fittingsRedoStack: [],
      fittingsCustomized: true,
    }));
  },

  undoFitting: () => {
    set(state => {
      if (state.fittingsHistory.length === 0) return state;
      const history = [...state.fittingsHistory];
      const prev = history.pop()!;
      const redoStack = [...state.fittingsRedoStack, state.fittings].slice(-20);
      return {
        fittings: prev,
        fittingsHistory: history,
        fittingsRedoStack: redoStack,
        fittingsCustomized: true,
      };
    });
  },

  redoFitting: () => {
    set(state => {
      if (state.fittingsRedoStack.length === 0) return state;
      const redoStack = [...state.fittingsRedoStack];
      const next = redoStack.pop()!;
      const history = [...state.fittingsHistory, state.fittings].slice(-20);
      return {
        fittings: next,
        fittingsHistory: history,
        fittingsRedoStack: redoStack,
        fittingsCustomized: true,
      };
    });
  },

  resetFittings: () => {
    const s = get();
    const newItems = buildFittings(
      s.width, s.height,
      s.okantovkaTop, s.okantovkaBottom, s.okantovkaLeft, s.okantovkaRight,
      s.luverSpacingTop, s.luverSpacingBottom, s.luverSpacingLeft, s.luverSpacingRight,
      s.openingType, s.shape,
    );
    const items = preservePositions(newItems, s.fittings);
    // Keep history — param changes don't wipe the undo stack
    set({ fittings: items, fittingsCustomized: false });
  },

  moveFitting: (id, posNorm) => {
    set(state => {
      const history = [...state.fittingsHistory, state.fittings].slice(-20);
      return {
        fittings: state.fittings.map(f => f.id === id ? { ...f, posNorm } : f),
        fittingsHistory: history,
        fittingsRedoStack: [],
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
        fittingsRedoStack: [],
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
