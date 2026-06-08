export type ProdType = 'window' | 'door';
export type Material = 'pvc' | 'screen' | 'oxford' | 'fabric';
export type FrameColor = 'brown' | 'white' | 'gray' | 'beige' | 'black' | 'blue';
export type GlassType = 'clear' | 'tinted';
export type ExtraLockType = 'rotary' | 'french' | 'none';
export type ExtraZipperType = 'spiral' | 'tractor' | 'none';

export const OPENING_OPTIONS: Record<ProdType, string[]> = {
  door: [
    '1 молния(спираль) по центру + люверсы 10 мм',
    '1 молния(трактор) по центру + люверсы 10 мм',
    '2 молнии(спираль) + люверсы 10 мм',
    '2 молнии(трактор) + люверсы 10 мм',
  ],
  window: [
    'Поворотные скобы (пластик)',
    'Глухое (без открывания)',
    'Французский замок (металл)',
    '1 молния(спираль) + поворотная скоба (низ)',
    '1 молния(спираль) + французский замок (низ)',
    '2 молнии(спираль) + французский замок (низ)',
    '2 молнии(спираль) + поворотная скоба (низ)',
    '2 молнии(трактор) + французский замок (низ)',
    '2 молнии(трактор) + поворотная скоба (низ)',
  ],
};

export const FRAME_COLORS: Array<{ value: FrameColor; label: string; hex: string }> = [
  { value: 'brown', label: 'Коричневый', hex: '#734C29' },
  { value: 'white', label: 'Белый', hex: '#eaeaea' },
  { value: 'gray', label: 'Серый', hex: '#b5b7bb' },
  { value: 'beige', label: 'Бежевый', hex: '#e9deb9' },
  { value: 'black', label: 'Чёрный', hex: '#2c2b2a' },
  { value: 'blue', label: 'Синий', hex: '#195ee6' },
];

export interface CalcPrices {
  materialPvc: number;
  materialScreen: number;
  materialOxford: number;
  materialFabric?: number;
  moskit: number;
  pocket: number;
  extraLockRotary: number;
  extraLockFrench: number;
  extraZipperSpiral: number;
  extraZipperTractor: number;
  glassTint: number;
  install: number;
}

export const DEFAULT_PRICES: CalcPrices = {
  materialPvc: 950,
  materialScreen: 1250,
  materialOxford: 1150,
  materialFabric: 1100,
  moskit: 680,
  pocket: 380,
  extraLockRotary: 60,
  extraLockFrench: 120,
  extraZipperSpiral: 340,
  extraZipperTractor: 540,
  glassTint: 3,
  install: 200,
};

export interface CalcInput {
  prodType: ProdType;
  width: number;
  height: number;
  material: Material;
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
}

export interface CalcResult {
  materialCost: number;
  fittingsCost: number;
  moskitCost: number;
  pocketCost: number;
  extraLockCost: number;
  extraZipperCost: number;
  totalBeforeGlass: number;
  glassSurcharge: number;
  installCost: number;
  extraWorkPrice: number;
  finalTotal: number;
}

function getFittingsCost(openingType: string, hM: number, wM: number, p: CalcPrices): number {
  switch (openingType) {
    case '1 молния(спираль) по центру + люверсы 10 мм': return hM * p.extraZipperSpiral;
    case '1 молния(трактор) по центру + люверсы 10 мм': return hM * p.extraZipperTractor;
    case '2 молнии(спираль) + люверсы 10 мм':           return 2 * hM * p.extraZipperSpiral;
    case '2 молнии(трактор) + люверсы 10 мм':           return 2 * hM * p.extraZipperTractor;
    case 'Поворотные скобы (пластик)':                  return ((2 * hM + wM) / 0.4) * p.extraLockRotary;
    case 'Глухое (без открывания)':                     return 2 * (hM + wM) * p.extraLockRotary;
    case 'Французский замок (металл)':                  return ((2 * hM + wM) / 0.4) * p.extraLockFrench;
    case '2 молнии(спираль) + французский замок (низ)': return 2 * hM * p.extraZipperSpiral + (wM / 0.4) * p.extraLockFrench;
    case '2 молнии(спираль) + поворотная скоба (низ)':  return 2 * hM * p.extraZipperSpiral + (wM / 0.4) * p.extraLockRotary;
    case '2 молнии(трактор) + французский замок (низ)': return 2 * hM * p.extraZipperTractor + (wM / 0.4) * p.extraLockFrench;
    case '2 молнии(трактор) + поворотная скоба (низ)':  return 2 * hM * p.extraZipperTractor + (wM / 0.4) * p.extraLockRotary;
    default: return 0;
  }
}

export function calculateCost(input: CalcInput, prices: CalcPrices): CalcResult {
  const hM = input.height / 100;
  const wM = input.width / 100;
  const area = hM * wM;

  const matMap: Record<Material, number> = {
    pvc: prices.materialPvc,
    screen: prices.materialScreen,
    oxford: prices.materialOxford,
    fabric: prices.materialFabric ?? 1100,
  };
  const materialCost = matMap[input.material] * area;
  const fittingsCost = getFittingsCost(input.openingType, hM, wM, prices);
  const moskitCost = input.moskit ? prices.moskit * area : 0;
  const pocketCost = input.pocket ? prices.pocket * wM : 0;

  const lockMap: Record<ExtraLockType, number> = {
    rotary: prices.extraLockRotary,
    french: prices.extraLockFrench,
    none: 0,
  };
  const extraLockCost = input.extraLockType !== 'none'
    ? input.extraLockCount * lockMap[input.extraLockType]
    : 0;

  const zipMap: Record<ExtraZipperType, number> = {
    spiral: prices.extraZipperSpiral,
    tractor: prices.extraZipperTractor,
    none: 0,
  };
  const extraZipperCost = input.extraZipperType !== 'none'
    ? (input.extraZipperLen / 100) * zipMap[input.extraZipperType]
    : 0;

  const totalBeforeGlass = materialCost + fittingsCost + moskitCost + pocketCost + extraLockCost + extraZipperCost;
  const glassSurcharge = input.glass === 'tinted' ? totalBeforeGlass * (prices.glassTint / 100) : 0;
  const installCost = input.install ? prices.install * area : 0;
  const extraWork = input.extraWorkPrice || 0;
  const finalTotal = totalBeforeGlass + glassSurcharge + installCost + extraWork;

  return {
    materialCost,
    fittingsCost,
    moskitCost,
    pocketCost,
    extraLockCost,
    extraZipperCost,
    totalBeforeGlass,
    glassSurcharge,
    installCost,
    extraWorkPrice: extraWork,
    finalTotal,
  };
}

export function getFrameHex(color: FrameColor): string {
  return FRAME_COLORS.find((c) => c.value === color)?.hex ?? '#195ee6';
}

export function getGlassHex(glass: GlassType, dark = false): string {
  if (glass === 'tinted') return dark ? '#4a3520' : '#ede3d1';
  return dark ? '#1e3a4a' : '#cce4ed';
}
