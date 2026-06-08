import type { FittingItem, FittingSide } from '../store/constructorStore';
import { getFrameHex, getGlassHex } from './calculator';

// ─── color helpers ────────────────────────────────────────────────────────────

function darkenHex(hex: string, amt: number): string {
  if (hex.length < 7) return hex;
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amt);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amt);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amt);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function lightenHex(hex: string, amt: number): string {
  if (hex.length < 7) return hex;
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amt);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amt);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amt);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── shape path builders (identical to WindowVisualizer.tsx) ─────────────────

type PathResult = { outer: string; inner: string; ix: number; iy: number; iw: number; ih: number };
type PathFn = (ox: number, oy: number, w: number, h: number, okL: number, okR: number, okT: number, okB: number) => PathResult;

const rectPaths: PathFn = (ox, oy, w, h, okL, okR, okT, okB) => {
  const outer = `M${ox},${oy} L${ox + w},${oy} L${ox + w},${oy + h} L${ox},${oy + h} Z`;
  const ix = ox + okL, iy = oy + okT, iw = w - okL - okR, ih = h - okT - okB;
  const inner = iw > 2 && ih > 2 ? `M${ix},${iy} L${ix + iw},${iy} L${ix + iw},${iy + ih} L${ix},${iy + ih} Z` : '';
  return { outer, inner, ix, iy, iw, ih };
};

const archPaths: PathFn = (ox, oy, w, h, okL, okR, okT, okB) => {
  const archH = Math.min(w / 2, h * 0.55);
  const rx_out = w / 2;
  const arcCY = oy + archH;
  const outer = `M${ox},${arcCY} A${rx_out},${archH},0,0,1,${ox + w},${arcCY} L${ox + w},${oy + h} L${ox},${oy + h} Z`;
  const ix = ox + okL;
  const iw = Math.max(0, w - okL - okR);
  const rx_in = iw / 2;
  const ry_in = Math.max(0, archH - okT);
  const ibottom = oy + h - okB;
  const inner = iw > 2 && (ibottom - arcCY) > 2
    ? `M${ix},${arcCY} A${rx_in},${ry_in},0,0,1,${ix + iw},${arcCY} L${ix + iw},${ibottom} L${ix},${ibottom} Z`
    : '';
  return { outer, inner, ix, iy: arcCY, iw, ih: Math.max(0, ibottom - arcCY) };
};

const trianglePaths: PathFn = (ox, oy, w, h, okL, okR, okT, okB) => {
  const cx = ox + w / 2;
  const outer = `M${cx},${oy} L${ox + w},${oy + h} L${ox},${oy + h} Z`;
  const lLen = Math.sqrt((w / 2) ** 2 + h ** 2);
  const bottomY = oy + h - okB;
  const topY = oy + okT * (lLen / (w / 2));
  const blX = ox + okL + okB * ((w / 2) / h);
  const brX = ox + w - okR - okB * ((w / 2) / h);
  const iw = brX - blX, ih = bottomY - topY;
  const inner = iw > 4 && ih > 4 ? `M${cx},${topY} L${brX},${bottomY} L${blX},${bottomY} Z` : '';
  return { outer, inner, ix: blX, iy: topY, iw, ih };
};

// ─── fitting position (same logic as FittingsInteractive in WindowVisualizer) ─

function fittingPx(
  side: FittingSide, posNorm: number,
  vox: number, voy: number, visW: number, visH: number,
  ix: number, iy: number, iw: number, ih: number,
  autoBandPx: number, shape: string,
): { cx: number; cy: number } | null {
  if (shape === 'arch') {
    const arcCy = iy;
    const ryOut = iy - voy;
    const rxOut = visW / 2;
    const arcCx = vox + visW / 2;
    if (side === 'top') {
      const x = vox + posNorm * visW;
      const cosA = Math.max(-1, Math.min(1, (x - arcCx) / rxOut));
      const yOut = arcCy - ryOut * Math.sin(Math.acos(cosA));
      return { cx: x, cy: yOut + autoBandPx / 2 };
    }
    if (side === 'left') {
      const cy = voy + posNorm * visH;
      return cy < arcCy ? null : { cx: vox + autoBandPx / 2, cy };
    }
    if (side === 'right') {
      const cy = voy + posNorm * visH;
      return cy < arcCy ? null : { cx: vox + visW - autoBandPx / 2, cy };
    }
    return { cx: vox + posNorm * visW, cy: voy + visH - autoBandPx / 2 };
  }

  if (shape === 'triangle') {
    if (side === 'top') return null;
    if (side === 'bottom') return { cx: vox + posNorm * visW, cy: voy + visH - autoBandPx / 2 };
    const tipO = { x: vox + visW / 2, y: voy };
    const tipI = { x: vox + visW / 2, y: iy };
    const endO = side === 'left' ? { x: vox, y: voy + visH } : { x: vox + visW, y: voy + visH };
    const endI = side === 'left' ? { x: ix, y: iy + ih } : { x: ix + iw, y: iy + ih };
    const pO = { x: tipO.x + posNorm * (endO.x - tipO.x), y: tipO.y + posNorm * (endO.y - tipO.y) };
    const pI = { x: tipI.x + posNorm * (endI.x - tipI.x), y: tipI.y + posNorm * (endI.y - tipI.y) };
    return { cx: (pO.x + pI.x) / 2, cy: (pO.y + pI.y) / 2 };
  }

  // rect / square — same logic as WindowVisualizer
  const topBand = iy - voy;
  const botBand = (voy + visH) - (iy + ih);
  const lftBand = ix - vox;
  const rgtBand = (vox + visW) - (ix + iw);
  switch (side) {
    case 'top':    return { cx: vox + posNorm * visW,  cy: voy + topBand / 2 };
    case 'bottom': return { cx: vox + posNorm * visW,  cy: iy + ih + botBand / 2 };
    case 'left':   return { cx: vox + lftBand / 2,     cy: voy + posNorm * visH };
    case 'right':  return { cx: ix + iw + rgtBand / 2, cy: voy + posNorm * visH };
  }
}

// ─── fitting spacing rulers (same as LuverRulersFromFittings in WindowVisualizer) ─

function buildFittingRulers(
  fittings: FittingItem[],
  vox: number, voy: number, visW: number, visH: number,
  scale: number,
): string {
  const lc = '#64748b', tc = '#1e293b', fs = 9, tk = 5;
  let svg = '';

  const topF    = fittings.filter(f => f.side === 'top'   ).sort((a, b) => a.posNorm - b.posNorm);
  const bottomF = fittings.filter(f => f.side === 'bottom').sort((a, b) => a.posNorm - b.posNorm);
  const leftF   = fittings.filter(f => f.side === 'left'  ).sort((a, b) => a.posNorm - b.posNorm);
  const rightF  = fittings.filter(f => f.side === 'right' ).sort((a, b) => a.posNorm - b.posNorm);

  const topXs    = [vox, ...topF.map(f    => vox + f.posNorm * visW), vox + visW];
  const bottomXs = [vox, ...bottomF.map(f => vox + f.posNorm * visW), vox + visW];
  const leftYs   = [voy, ...leftF.map(f   => voy + f.posNorm * visH), voy + visH];
  const rightYs  = [voy, ...rightF.map(f  => voy + f.posNorm * visH), voy + visH];

  const topRY    = voy - 16;
  const bottomRY = voy + visH + 16;
  const leftRX   = vox - 20;
  const rightRX  = vox + visW + 22;

  function hRuler(y: number, xs: number[], labelsBelow: boolean): string {
    let s = `<line x1="${vox}" y1="${y}" x2="${vox + visW}" y2="${y}" stroke="${lc}" stroke-width="0.8"/>`;
    xs.forEach((x, i) => {
      s += `<line x1="${x}" y1="${y - tk}" x2="${x}" y2="${y + tk}" stroke="${lc}" stroke-width="0.8"/>`;
      if (i < xs.length - 1) {
        const mid = (x + xs[i + 1]) / 2;
        const ly = labelsBelow ? y + 14 : y - 8;
        const dist = ((xs[i + 1] - x) / scale).toFixed(1);
        s += `<text x="${mid}" y="${ly}" font-size="${fs}" fill="${tc}" text-anchor="middle" font-family="Arial,sans-serif">${dist}</text>`;
      }
    });
    return s;
  }

  function vRuler(x: number, ys: number[], labelsRight: boolean): string {
    let s = `<line x1="${x}" y1="${voy}" x2="${x}" y2="${voy + visH}" stroke="${lc}" stroke-width="0.8"/>`;
    ys.forEach((y, i) => {
      s += `<line x1="${x - tk}" y1="${y}" x2="${x + tk}" y2="${y}" stroke="${lc}" stroke-width="0.8"/>`;
      if (i < ys.length - 1) {
        const mid = (y + ys[i + 1]) / 2;
        const lx = labelsRight ? x + 8 : x - 8;
        const anchor = labelsRight ? 'start' : 'end';
        const dist = ((ys[i + 1] - y) / scale).toFixed(1);
        s += `<text x="${lx}" y="${mid}" font-size="${fs}" fill="${tc}" text-anchor="${anchor}" font-family="Arial,sans-serif" dominant-baseline="middle">${dist}</text>`;
      }
    });
    return s;
  }

  if (topF.length    > 0) svg += hRuler(topRY,    topXs,    false);
  if (bottomF.length > 0) svg += hRuler(bottomRY, bottomXs, true);
  if (leftF.length   > 0) svg += vRuler(leftRX,   leftYs,   false);
  if (rightF.length  > 0) svg += vRuler(rightRX,  rightYs,  true);

  return svg;
}

// ─── material pattern defs (same as WindowVisualizer <defs>) ─────────────────

function buildPatternDefs(frameHex: string): string {
  const d1 = darkenHex(frameHex, 38);
  const l1 = lightenHex(frameHex, 42);
  const d2 = darkenHex(frameHex, 55);
  return `
    <pattern id="mat-oxford" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="${frameHex}"/>
      <rect x="0" y="0" width="5" height="5" fill="${d1}" opacity="0.45"/>
      <rect x="5" y="5" width="5" height="5" fill="${d1}" opacity="0.45"/>
      <line x1="0" y1="5" x2="10" y2="5" stroke="${l1}" stroke-width="0.9" opacity="0.55"/>
      <line x1="5" y1="0" x2="5" y2="10" stroke="${l1}" stroke-width="0.9" opacity="0.55"/>
      <line x1="0" y1="0" x2="10" y2="0" stroke="${d2}" stroke-width="0.5" opacity="0.25"/>
      <line x1="0" y1="0" x2="0" y2="10" stroke="${d2}" stroke-width="0.5" opacity="0.25"/>
    </pattern>
    <pattern id="mat-screen" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
      <rect width="5" height="5" fill="${darkenHex(frameHex, 20)}"/>
      <rect x="1" y="1" width="3" height="3" fill="${lightenHex(frameHex, 65)}" opacity="0.5"/>
    </pattern>
    <pattern id="mat-fabric" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="${frameHex}"/>
      <line x1="0" y1="2" x2="2" y2="0" stroke="${d2}" stroke-width="1.1" opacity="0.45"/>
      <line x1="0" y1="6" x2="6" y2="0" stroke="${d2}" stroke-width="1.1" opacity="0.45"/>
      <line x1="2" y1="8" x2="8" y2="2" stroke="${d2}" stroke-width="1.1" opacity="0.45"/>
      <line x1="6" y1="8" x2="8" y2="6" stroke="${d2}" stroke-width="1.1" opacity="0.45"/>
      <line x1="0" y1="4" x2="4" y2="0" stroke="${l1}" stroke-width="0.7" opacity="0.35"/>
      <line x1="4" y1="8" x2="8" y2="4" stroke="${l1}" stroke-width="0.7" opacity="0.35"/>
      <line x1="0" y1="0" x2="8" y2="0" stroke="${d1}" stroke-width="0.4" opacity="0.2"/>
      <line x1="0" y1="4" x2="8" y2="4" stroke="${d1}" stroke-width="0.4" opacity="0.2"/>
    </pattern>`;
}

// ─── default fitting generation (mirrors buildFittings in constructorStore) ───

export function buildDefaultFittings(
  widthCm: number, heightCm: number,
  okTopMm: number, okBotMm: number, okLeftMm: number, okRightMm: number,
  spacingTopMm: number, spacingBotMm: number, spacingLeftMm: number, spacingRightMm: number,
  openingType: string,
  shape = 'rect',
): FittingItem[] {
  const items: FittingItem[] = [];
  let counter = 0;
  const isFrance = openingType.includes('замок');

  const archHCm = shape === 'arch' ? Math.min(widthCm / 2, heightCm * 0.55) : 0;

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

  genSide('top',    widthCm,  okTopMm  / 10, 'luvers',                     spacingTopMm   / 10);
  genSide('bottom', widthCm,  okBotMm  / 10, isFrance ? 'fran' : 'luvers', spacingBotMm   / 10);
  genSide('left',   heightCm, okLeftMm / 10, isFrance ? 'fran' : 'luvers', spacingLeftMm  / 10, archHCm);
  genSide('right',  heightCm, okRightMm/ 10, isFrance ? 'fran' : 'luvers', spacingRightMm / 10, archHCm);

  if (shape === 'rect' || shape === 'square') {
    items.push({ id: 'remen-0', side: 'top', posNorm: 0.33, type: 'remen' });
    items.push({ id: 'remen-1', side: 'top', posNorm: 0.67, type: 'remen' });
  }

  return items;
}

// ─── public interface & builder ───────────────────────────────────────────────

export interface WindowSvgParams {
  wCm: number;
  hCm: number;
  shape: string;
  material: string;
  color: string;
  glass: string;
  fittings: FittingItem[];
  okantovkaTop: number;
  okantovkaBottom: number;
  okantovkaLeft: number;
  okantovkaRight: number;
  luverSpacingTop?: number;
  luverSpacingBottom?: number;
  luverSpacingLeft?: number;
  luverSpacingRight?: number;
  opening?: string;
  remenLength?: number;
  remenWidth?: number;
  svgMaxW?: number;
  svgMaxH?: number;
  assets: { remen: string; fran: string; luvers: string };
}

export function buildWindowSvg({
  wCm, hCm, shape, material, color, glass, fittings,
  okantovkaTop, okantovkaBottom, okantovkaLeft, okantovkaRight,
  luverSpacingTop = 300, luverSpacingBottom = 300, luverSpacingLeft = 300, luverSpacingRight = 300,
  opening = '',
  remenLength = 0,
  remenWidth = 0,
  svgMaxW = 370,
  svgMaxH = 430,
  assets,
}: WindowSvgParams): string {
  // Fallback: reconstruct default fittings from row params when not saved
  const resolvedFittings = fittings.length > 0 ? fittings : buildDefaultFittings(
    wCm, hCm,
    okantovkaTop, okantovkaBottom, okantovkaLeft, okantovkaRight,
    luverSpacingTop, luverSpacingBottom, luverSpacingLeft, luverSpacingRight,
    opening, shape,
  );
  const DM = 50;
  const MAX_W = svgMaxW, MAX_H = svgMaxH;
  const scale = Math.min(MAX_W / wCm, MAX_H / hCm); // px/cm

  const visW = Math.round(wCm * scale);
  const visH = Math.round(hCm * scale);
  const vox = DM, voy = DM;

  // Convert okantovka mm → px (same formula as WindowVisualizer)
  const okT = Math.max(4, (okantovkaTop    / 10) * scale);
  const okB = Math.max(4, (okantovkaBottom / 10) * scale);
  const okL = Math.max(4, (okantovkaLeft   / 10) * scale);
  const okR = Math.max(4, (okantovkaRight  / 10) * scale);

  // autoBandPx: used for arch/triangle fitting icon centering
  const autoBandPx = Math.max(8, Math.min(Math.min(visW, visH) * 0.045, 38));

  const builders: Record<string, PathFn> = {
    rect: rectPaths, square: rectPaths, arch: archPaths, triangle: trianglePaths,
  };
  const { outer, inner, ix, iy, iw, ih } = (builders[shape] ?? rectPaths)(vox, voy, visW, visH, okL, okR, okT, okB);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const frameHex = getFrameHex(color as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const glassHex = getGlassHex(glass as any, false);

  const frameFill = material === 'oxford' ? 'url(#mat-oxford)'
                  : material === 'screen' ? 'url(#mat-screen)'
                  : material === 'fabric' ? 'url(#mat-fabric)'
                  : frameHex;

  // Fitting icon size (same formula as FittingsInteractive in WindowVisualizer)
  const realBand = (shape === 'rect' || shape === 'square') ? (iy - voy) : autoBandPx;
  const r = Math.max(4, Math.min(realBand * 0.27, 15));
  const sz = r * 2;

  // Render fitting icons as SVG string
  let fittingSvg = '';
  for (const f of resolvedFittings) {
    if (f.type === 'remen' && shape !== 'rect' && shape !== 'square') continue;
    const pos = fittingPx(f.side, f.posNorm, vox, voy, visW, visH, ix, iy, iw, ih, autoBandPx, shape);
    if (!pos) continue;
    const { cx, cy } = pos;

    if (f.type === 'remen') {
      const L      = remenLength > 0 ? remenLength * scale : Math.min(ih * 0.48, 108);
      const Wimg   = remenWidth  > 0 ? remenWidth  * scale : L / 7;
      const isVR   = f.side === 'left' || f.side === 'right';
      const strapY = isVR ? cy : iy;
      const tf     = `translate(${cx},${strapY + L / 2}) rotate(90) translate(${-L / 2},${-Wimg / 2})`;
      fittingSvg += `\n  <image href="${assets.remen}" x="0" y="0" width="${L}" height="${Wimg}" transform="${tf}" preserveAspectRatio="none"/>`;
      continue;
    }

    const isV = f.side === 'left' || f.side === 'right';
    let tf = '';
    if (shape === 'triangle' && f.side === 'left') {
      tf = ` transform="rotate(${(Math.atan2(visH, -visW / 2) * 180 / Math.PI).toFixed(2)},${cx.toFixed(2)},${cy.toFixed(2)})"`;
    } else if (shape === 'triangle' && f.side === 'right') {
      tf = ` transform="rotate(${(-Math.atan2(visH, visW / 2) * 180 / Math.PI).toFixed(2)},${cx.toFixed(2)},${cy.toFixed(2)})"`;
    } else if (isV) {
      tf = ` transform="rotate(90,${cx.toFixed(2)},${cy.toFixed(2)})"`;
    }

    if (f.type === 'fran') {
      const bw = r * 1.4, bh = r * 2.4;
      fittingSvg += `\n  <image href="${assets.fran}" x="${(cx - bw / 2).toFixed(2)}" y="${(cy - bh / 2).toFixed(2)}" width="${bw.toFixed(2)}" height="${bh.toFixed(2)}"${tf}/>`;
    } else {
      fittingSvg += `\n  <image href="${assets.luvers}" x="${(cx - sz / 2).toFixed(2)}" y="${(cy - sz / 2).toFixed(2)}" width="${sz.toFixed(2)}" height="${sz.toFixed(2)}"${tf}/>`;
    }
  }

  // Dimension annotations (same as Annotations component in WindowVisualizer)
  const tick = 8;
  const hLX = vox + visW + 85;
  const wLY = voy + visH + 52;
  const annotations = `
  <text x="${vox - 14}" y="${voy - 4}" font-size="11" fill="#64748b" font-weight="700" font-family="Arial,sans-serif">A</text>
  <text x="${vox + visW + 4}" y="${voy - 4}" font-size="11" fill="#64748b" font-weight="700" font-family="Arial,sans-serif">B</text>
  <text x="${vox - 14}" y="${voy + visH + 14}" font-size="11" fill="#64748b" font-weight="700" font-family="Arial,sans-serif">D</text>
  <text x="${vox + visW + 4}" y="${voy + visH + 14}" font-size="11" fill="#64748b" font-weight="700" font-family="Arial,sans-serif">C</text>
  <line x1="${hLX}" y1="${voy}" x2="${hLX}" y2="${voy + visH}" stroke="#64748b" stroke-width="1.5"/>
  <line x1="${hLX - tick}" y1="${voy}" x2="${hLX + tick}" y2="${voy}" stroke="#64748b" stroke-width="1.5"/>
  <line x1="${hLX - tick}" y1="${voy + visH}" x2="${hLX + tick}" y2="${voy + visH}" stroke="#64748b" stroke-width="1.5"/>
  <text x="${hLX + 13}" y="${voy + visH / 2 + 5}" font-size="15" fill="#0f172a" font-weight="800" font-family="Arial,sans-serif">${hCm} см</text>
  <line x1="${vox}" y1="${wLY}" x2="${vox + visW}" y2="${wLY}" stroke="#64748b" stroke-width="1.5"/>
  <line x1="${vox}" y1="${wLY - tick}" x2="${vox}" y2="${wLY + tick}" stroke="#64748b" stroke-width="1.5"/>
  <line x1="${vox + visW}" y1="${wLY - tick}" x2="${vox + visW}" y2="${wLY + tick}" stroke="#64748b" stroke-width="1.5"/>
  <text x="${vox + visW / 2 - 24}" y="${wLY + 18}" font-size="15" fill="#0f172a" font-weight="800" font-family="Arial,sans-serif">${wCm} см</text>
  <text x="${ix + 4}" y="${iy + ih - 6}" font-size="9" fill="#94a3b8" font-family="Arial,sans-serif">Чертёж создан в программе ОКНО CRM</text>`;

  const rulers = buildFittingRulers(resolvedFittings, vox, voy, visW, visH, scale);

  // Zipper (молния) — same logic as FittingsInteractive in WindowVisualizer
  let zipperSvg = '';
  if (opening.includes('молни') && inner) {
    const isTwo = opening.startsWith('2 молнии');
    const bandW = Math.max(4, Math.round((ix - vox) * 0.55));
    const zipW  = 5;
    const zxArr = isTwo ? [ix + iw * 0.33, ix + iw * 0.67] : [ix + iw / 2];
    zipperSvg += `\n  <defs><clipPath id="zip-clip"><path d="${inner}"/></clipPath></defs>`;
    for (const zx of zxArr) {
      zipperSvg += `\n  <g clip-path="url(#zip-clip)">`;
      zipperSvg += `\n    <rect x="${(zx - bandW - zipW / 2).toFixed(2)}" y="${voy}" width="${bandW.toFixed(2)}" height="${visH}" fill="${frameFill}"/>`;
      zipperSvg += `\n    <rect x="${(zx - zipW / 2).toFixed(2)}" y="${voy}" width="${zipW}" height="${visH}" fill="#111"/>`;
      zipperSvg += `\n    <rect x="${(zx + zipW / 2).toFixed(2)}" y="${voy}" width="${bandW.toFixed(2)}" height="${visH}" fill="${frameFill}"/>`;
      zipperSvg += `\n  </g>`;
    }
  }

  const totalW = DM + visW + 150;
  const totalH = DM + visH + 90;

  return `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%;height:auto;">
  <defs>${buildPatternDefs(frameHex)}</defs>
  <path d="${outer}" fill="${frameFill}"/>
  ${inner ? `<path d="${inner}" fill="${glassHex}"/>` : ''}
  ${zipperSvg}
  ${fittingSvg}
  ${rulers}
  ${annotations}
</svg>`;
}
