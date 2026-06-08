import { useRef, useEffect, useState } from 'react';
import { useConstructorStore, type FittingItem, type FittingSide } from '../../store/constructorStore';
import { getFrameHex, getGlassHex } from '../../lib/calculator';
import { useThemeStore } from '../../store/themeStore';
import franSrc from '../../assets/fran.png';
import luversSrc from '../../assets/luvers.svg';
import remenSrc from '../../assets/remen.png';

// ─── shape path builders ──────────────────────────────────────────────────────

function rectPaths(ox: number, oy: number, w: number, h: number, okL: number, okR: number, okT: number, okB: number) {
  const outer = `M${ox},${oy} L${ox+w},${oy} L${ox+w},${oy+h} L${ox},${oy+h} Z`;
  const ix = ox+okL, iy = oy+okT, iw = w-okL-okR, ih = h-okT-okB;
  const inner = iw > 2 && ih > 2 ? `M${ix},${iy} L${ix+iw},${iy} L${ix+iw},${iy+ih} L${ix},${iy+ih} Z` : '';
  return { outer, inner, ix, iy, iw, ih };
}

function archPaths(ox: number, oy: number, w: number, h: number, okL: number, okR: number, okT: number, okB: number) {
  // Эллиптическая дуга: rx=w/2 (всегда spanning полную ширину), ry=archH.
  // Это исключает SVG auto-scale, который при r<w/2 выталкивает арку выше oy.
  const archH  = Math.min(w / 2, h * 0.55);   // высота арки (ry внешней)
  const rx_out = w / 2;
  const arcCY  = oy + archH;                   // центр дуги по Y
  const outer  = `M${ox},${arcCY} A${rx_out},${archH},0,0,1,${ox+w},${arcCY} L${ox+w},${oy+h} L${ox},${oy+h} Z`;

  const ix     = ox + okL;
  const iw     = Math.max(0, w - okL - okR);
  const rx_in  = iw / 2;
  const ry_in  = Math.max(0, archH - okT);     // внутренняя высота = внешняя − okT
  // innerCY совпадает с arcCY (тот же центр) → внутренний верх = arcCY − ry_in = oy+okT ✓
  const ibottom = oy + h - okB;
  const inner  = iw > 2 && (ibottom - arcCY) > 2
    ? `M${ix},${arcCY} A${rx_in},${ry_in},0,0,1,${ix+iw},${arcCY} L${ix+iw},${ibottom} L${ix},${ibottom} Z`
    : '';
  return { outer, inner, ix, iy: arcCY, iw, ih: Math.max(0, ibottom - arcCY) };
}

function trianglePaths(ox: number, oy: number, w: number, h: number, okL: number, okR: number, okT: number, okB: number) {
  const cx = ox+w/2;
  const outer = `M${cx},${oy} L${ox+w},${oy+h} L${ox},${oy+h} Z`;
  const lLen = Math.sqrt((w/2)**2 + h**2);
  const bottomY = oy+h-okB;
  const topY = oy+okT*(lLen/(w/2));
  const blX = ox+okL+okB*((w/2)/h);
  const brX = ox+w-okR-okB*((w/2)/h);
  const iw = brX-blX, ih = bottomY-topY;
  const inner = iw > 4 && ih > 4 ? `M${cx},${topY} L${brX},${bottomY} L${blX},${bottomY} Z` : '';
  return { outer, inner, ix: blX, iy: topY, iw, ih };
}


// ─── interactive fittings layer (rect / square) ───────────────────────────────

function FittingsInteractive({
  fittings, vox, voy, visW, visH, autoBandPx,
  containerRef, vt, selectedId, onSelect, onStripClick, moveFitting,
  localPos, setLocalPos,
  shape, ix, iy, iw, ih,
  openingType,
  remenLengthPx, remenWidthPx,
  frameFill, innerPath,
}: {
  fittings: FittingItem[];
  vox: number; voy: number; visW: number; visH: number;
  autoBandPx: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  vt: { scale: number; x: number; y: number };
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onStripClick: (side: FittingSide, posNorm: number, clientX: number, clientY: number) => void;
  moveFitting: (id: string, posNorm: number) => void;
  localPos: Record<string, number>;
  setLocalPos: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  shape: string;
  ix: number; iy: number; iw: number; ih: number;
  openingType: string;
  remenLengthPx: number;
  remenWidthPx: number;
  frameFill: string;
  innerPath: string;
}) {
  const [ghost, setGhost] = useState<{ side: FittingSide; cx: number; cy: number } | null>(null);
  const vtRef = useRef(vt);
  useEffect(() => { vtRef.current = vt; }, [vt]);

  // Реальная толщина рамы для rect/square — из ix/iy.
  // Для arch/triangle используем autoBandPx (приближение).
  const realBand = (shape === 'rect' || shape === 'square') ? (iy - voy) : autoBandPx;
  const r  = Math.max(4, Math.min(realBand * 0.27, 15));
  const sz = r * 2;

  function screenToSvg(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const cur = vtRef.current;
    return {
      x: (clientX - rect.left - cur.x) / cur.scale,
      y: (clientY - rect.top  - cur.y) / cur.scale,
    };
  }

  // Returns SVG position for a fitting, or null if invisible for this shape
  function fittingPx(side: FittingSide, posNorm: number): { cx: number; cy: number } | null {
    if (shape === 'arch') {
      const arcCy  = iy;
      const ryOut  = iy - voy;
      const rxOut  = visW / 2;
      const arcCx  = vox + visW / 2;
      if (side === 'top') {
        const x    = vox + posNorm * visW;
        const cosA = Math.max(-1, Math.min(1, (x - arcCx) / rxOut));
        const yOut = arcCy - ryOut * Math.sin(Math.acos(cosA));
        return { cx: x, cy: yOut + autoBandPx / 2 };
      }
      if (side === 'left')  {
        const cy = voy + posNorm * visH;
        return cy < arcCy ? null : { cx: vox + autoBandPx / 2, cy };
      }
      if (side === 'right') {
        const cy = voy + posNorm * visH;
        return cy < arcCy ? null : { cx: vox + visW - autoBandPx / 2, cy };
      }
      // bottom
      return { cx: vox + posNorm * visW, cy: voy + visH - autoBandPx / 2 };
    }

    if (shape === 'triangle') {
      if (side === 'top') return null; // triangle has no horizontal top edge
      if (side === 'bottom') return { cx: vox + posNorm * visW, cy: voy + visH - autoBandPx / 2 };
      // left/right diagonal: interpolate midpoint between outer and inner edge
      const tipO = { x: vox + visW / 2, y: voy };
      const tipI = { x: vox + visW / 2, y: iy };
      const endO = side === 'left' ? { x: vox,       y: voy + visH } : { x: vox + visW,  y: voy + visH };
      const endI = side === 'left' ? { x: ix,         y: iy + ih    } : { x: ix + iw,     y: iy + ih    };
      const pO   = { x: tipO.x + posNorm * (endO.x - tipO.x), y: tipO.y + posNorm * (endO.y - tipO.y) };
      const pI   = { x: tipI.x + posNorm * (endI.x - tipI.x), y: tipI.y + posNorm * (endI.y - tipI.y) };
      return { cx: (pO.x + pI.x) / 2, cy: (pO.y + pI.y) / 2 };
    }

    // rect / square — используем реальные границы рамы из ix/iy/iw/ih
    {
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
  }

  function getPosNorm(clientX: number, clientY: number, side: FittingSide): number {
    const { x, y } = screenToSvg(clientX, clientY);
    if (shape === 'triangle' && (side === 'left' || side === 'right')) {
      // project mouse onto the outer diagonal to get parameter t
      const tipO = { x: vox + visW / 2, y: voy };
      const endO = side === 'left' ? { x: vox, y: voy + visH } : { x: vox + visW, y: voy + visH };
      const dx = endO.x - tipO.x, dy = endO.y - tipO.y;
      const len2 = dx * dx + dy * dy;
      const t = len2 > 0 ? ((x - tipO.x) * dx + (y - tipO.y) * dy) / len2 : 0;
      return Math.max(0.02, Math.min(0.98, t));
    }
    const raw = (side === 'top' || side === 'bottom') ? (x - vox) / visW : (y - voy) / visH;
    return Math.max(0.02, Math.min(0.98, raw));
  }

  function startDrag(e: React.MouseEvent, f: FittingItem) {
    e.stopPropagation();
    onSelect(f.id);
    document.body.style.cursor = 'grabbing';
    function onMove(ev: MouseEvent) {
      setLocalPos(prev => ({ ...prev, [f.id]: getPosNorm(ev.clientX, ev.clientY, f.side) }));
    }
    function onUp(ev: MouseEvent) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      const pn = getPosNorm(ev.clientX, ev.clientY, f.side);
      moveFitting(f.id, pn);
      setLocalPos(prev => { const n = { ...prev }; delete n[f.id]; return n; });
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ── build strip hit-areas based on shape ─────────────────────────────────────

  // Rect-based strips for sides that are straight lines
  const rectStrips: { side: FittingSide; x: number; y: number; w: number; h: number }[] =
    (shape === 'arch') ? [
      { side: 'left',   x: vox,                 y: iy,                  w: autoBandPx, h: visH - (iy - voy) },
      { side: 'right',  x: vox+visW-autoBandPx, y: iy,                  w: autoBandPx, h: visH - (iy - voy) },
      { side: 'bottom', x: vox,                 y: voy+visH-autoBandPx, w: visW,       h: autoBandPx },
    ] : (shape === 'triangle') ? [
      { side: 'bottom', x: vox, y: voy+visH-autoBandPx, w: visW, h: autoBandPx },
    ] : [
      { side: 'top',    x: vox,                 y: voy,                 w: visW,       h: autoBandPx },
      { side: 'bottom', x: vox,                 y: voy+visH-autoBandPx, w: visW,       h: autoBandPx },
      { side: 'left',   x: vox,                 y: voy+autoBandPx,      w: autoBandPx, h: visH-2*autoBandPx },
      { side: 'right',  x: vox+visW-autoBandPx, y: voy+autoBandPx,      w: autoBandPx, h: visH-2*autoBandPx },
    ];

  // Arch top band path
  const archTopBand = shape === 'arch' ? (() => {
    const arcCy  = iy, ryOut = iy - voy, rxOut = visW / 2;
    const ryIn   = Math.max(0, ryOut - (ix - vox));
    const rxIn   = iw / 2;
    const arcCx  = vox + visW / 2;
    return `M${vox},${arcCy} A${rxOut},${ryOut},0,0,1,${vox+visW},${arcCy}`
         + ` L${arcCx+rxIn},${arcCy} A${rxIn},${ryIn},0,0,0,${arcCx-rxIn},${arcCy} Z`;
  })() : null;

  // Triangle diagonal band paths
  function triSidePath(side: 'left' | 'right') {
    const tipO = { x: vox + visW / 2, y: voy };
    const tipI = { x: vox + visW / 2, y: iy };
    const endO = side === 'left' ? { x: vox,      y: voy + visH } : { x: vox + visW, y: voy + visH };
    const endI = side === 'left' ? { x: ix,        y: iy + ih    } : { x: ix + iw,   y: iy + ih    };
    return `M${tipO.x},${tipO.y} L${endO.x},${endO.y} L${endI.x},${endI.y} L${tipI.x},${tipI.y} Z`;
  }

  function stripHandlers(side: FittingSide) {
    return {
      onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        const pn = getPosNorm(e.clientX, e.clientY, side);
        onStripClick(side, pn, e.clientX, e.clientY);
        setGhost(null);
      },
      onMouseMove: (e: React.MouseEvent) => {
        const pn = getPosNorm(e.clientX, e.clientY, side);
        const pos = fittingPx(side, pn);
        if (pos) setGhost({ side, ...pos });
      },
      onMouseLeave: () => setGhost(null),
    };
  }

  return <>
    {rectStrips.map(s => (
      <rect key={s.side} x={s.x} y={s.y} width={s.w} height={s.h}
        fill="transparent" style={{ cursor: 'crosshair' }}
        {...stripHandlers(s.side)}
      />
    ))}
    {archTopBand && (
      <path d={archTopBand} fill="transparent" style={{ cursor: 'crosshair' }}
        {...stripHandlers('top')} />
    )}
    {shape === 'triangle' && (['left', 'right'] as const).map(side => (
      <path key={side} d={triSidePath(side)} fill="transparent" style={{ cursor: 'crosshair' }}
        {...stripHandlers(side)} />
    ))}

    {/* Молния */}
    {openingType.includes('молни') && innerPath && (() => {
      const isTwo  = openingType.startsWith('2 молнии');
      const bandW  = Math.max(4, Math.round((ix - vox) * 0.55));
      const zipW   = 5;
      const zxArr  = isTwo ? [ix + iw * 0.33, ix + iw * 0.67] : [ix + iw / 2];
      return <>
        <defs>
          <clipPath id="zipper-inner-clip">
            <path d={innerPath}/>
          </clipPath>
        </defs>
        {zxArr.map((zx, zi) => (
          <g key={`zip${zi}`} style={{ pointerEvents: 'none' }} clipPath="url(#zipper-inner-clip)">
            <rect x={zx - bandW - zipW/2} y={voy} width={bandW} height={visH} fill={frameFill}/>
            <rect x={zx - zipW/2} y={voy} width={zipW} height={visH} fill="#111"/>
            <rect x={zx + zipW/2} y={voy} width={bandW} height={visH} fill={frameFill}/>
          </g>
        ))}
      </>;
    })()}

    {/* Ghost при наведении */}
    {ghost && (() => {
      const isV = ghost.side === 'left' || ghost.side === 'right';
      const tf  = isV ? `rotate(90,${ghost.cx},${ghost.cy})` : undefined;
      return <image key="ghost" href={luversSrc}
        x={ghost.cx-sz/2} y={ghost.cy-sz/2} width={sz} height={sz}
        transform={tf} opacity={0.35} style={{ pointerEvents: 'none' }}/>;
    })()}

    {/* Люверсы/замки/ремни: drag для перемещения */}
    {fittings.map(f => {
      // Straps only for rect/square shapes
      if (f.type === 'remen' && shape !== 'rect' && shape !== 'square') return null;
      const posNorm = localPos[f.id] ?? f.posNorm;
      const pos = fittingPx(f.side, posNorm);
      if (!pos) return null;
      const { cx, cy } = pos;
      const isV  = f.side === 'left' || f.side === 'right';
      const isSelected = f.id === selectedId;

      if (f.type === 'remen') {
        const L    = remenLengthPx > 0 ? remenLengthPx : Math.min(ih * 0.48, 108);
        const Wimg = remenWidthPx  > 0 ? remenWidthPx  : L / 7;
        // For side straps hang from cy (fitting position); for top hang from iy (frame inner edge)
        const strapY = isV ? cy : iy;
        const tf     = `translate(${cx},${strapY + L/2}) rotate(90) translate(${-L/2},${-Wimg/2})`;
        return (
          <g key={f.id} style={{ cursor: 'grab' }}
            onMouseDown={e => startDrag(e, f)}
            onClick={e => e.stopPropagation()}
          >
            {isSelected && (
              <rect x={cx - Wimg/2 - 3} y={strapY - 3}
                width={Wimg + 6} height={L + 6}
                fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3,2" rx="2"/>
            )}
            <image href={remenSrc} x={0} y={0} width={L} height={Wimg}
              transform={tf} preserveAspectRatio="none"/>
          </g>
        );
      }

      let tf: string | undefined;
      if (shape === 'triangle' && f.side === 'left') {
        tf = `rotate(${Math.atan2(visH, -visW / 2) * 180 / Math.PI},${cx},${cy})`;
      } else if (shape === 'triangle' && f.side === 'right') {
        tf = `rotate(${-Math.atan2(visH, visW / 2) * 180 / Math.PI},${cx},${cy})`;
      } else if (isV) {
        tf = `rotate(90,${cx},${cy})`;
      }
      return (
        <g key={f.id} style={{ cursor: 'grab' }}
          onMouseDown={e => startDrag(e, f)}
          onClick={e => e.stopPropagation()}
        >
          {isSelected && (
            <circle cx={cx} cy={cy} r={sz / 2 + 4}
              fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3,2"/>
          )}
          {f.type === 'fran' ? (
            <image href={franSrc} x={cx-r*0.7} y={cy-r*1.2} width={r*1.4} height={r*2.4}
              transform={tf} opacity={1}/>
          ) : (
            <image href={luversSrc} x={cx-sz/2} y={cy-sz/2} width={sz} height={sz}
              transform={tf} opacity={1}/>
          )}
        </g>
      );
    })}
  </>;
}

// ─── ruler from actual fitting positions ──────────────────────────────────────

function LuverRulersFromFittings({ fittings, vox, voy, visW, visH, pxPerCm }: {
  fittings: FittingItem[]; vox: number; voy: number; visW: number; visH: number; pxPerCm: number;
}) {
  const lc = '#94a3b8', tc = '#475569', fs = 7, tk = 5;

  const topF    = fittings.filter(f => f.side === 'top'   ).sort((a,b) => a.posNorm - b.posNorm);
  const bottomF = fittings.filter(f => f.side === 'bottom').sort((a,b) => a.posNorm - b.posNorm);
  const leftF   = fittings.filter(f => f.side === 'left'  ).sort((a,b) => a.posNorm - b.posNorm);
  const rightF  = fittings.filter(f => f.side === 'right' ).sort((a,b) => a.posNorm - b.posNorm);

  const topXs    = [vox, ...topF.map(f    => vox + f.posNorm * visW), vox + visW];
  const bottomXs = [vox, ...bottomF.map(f => vox + f.posNorm * visW), vox + visW];
  const leftYs   = [voy, ...leftF.map(f   => voy + f.posNorm * visH), voy + visH];
  const rightYs  = [voy, ...rightF.map(f  => voy + f.posNorm * visH), voy + visH];

  const topY    = voy - 16;
  const bottomY = voy + visH + 16;
  const leftX   = vox - 20;
  const rightX  = vox + visW + 22;

  function hRuler(key: string, y: number, xs: number[], labelsBelow: boolean) {
    return <>
      <line x1={vox} y1={y} x2={vox + visW} y2={y} stroke={lc} strokeWidth="0.8"/>
      {xs.map((x, i) => <g key={`${key}${i}`}>
        <line x1={x} y1={y - tk} x2={x} y2={y + tk} stroke={lc} strokeWidth="0.8"/>
        {i < xs.length - 1 && (
          <text x={(x + xs[i + 1]) / 2} y={labelsBelow ? y + 14 : y - 8}
            fontSize={fs} fill={tc} textAnchor="middle" fontFamily="system-ui,sans-serif">
            {((xs[i + 1] - x) / pxPerCm).toFixed(1)}
          </text>
        )}
      </g>)}
    </>;
  }

  function vRuler(key: string, x: number, ys: number[], labelsRight: boolean) {
    return <>
      <line x1={x} y1={voy} x2={x} y2={voy + visH} stroke={lc} strokeWidth="0.8"/>
      {ys.map((y, i) => <g key={`${key}${i}`}>
        <line x1={x - tk} y1={y} x2={x + tk} y2={y} stroke={lc} strokeWidth="0.8"/>
        {i < ys.length - 1 && (
          <text x={labelsRight ? x + 8 : x - 8} y={(y + ys[i + 1]) / 2}
            fontSize={fs} fill={tc} textAnchor={labelsRight ? 'start' : 'end'}
            fontFamily="system-ui,sans-serif" dominantBaseline="middle">
            {((ys[i + 1] - y) / pxPerCm).toFixed(1)}
          </text>
        )}
      </g>)}
    </>;
  }

  return <>
    {topF.length    > 0 && hRuler('ht', topY,    topXs,    false)}
    {bottomF.length > 0 && hRuler('hb', bottomY, bottomXs, true)}
    {leftF.length   > 0 && vRuler('vl', leftX,   leftYs,   false)}
    {rightF.length  > 0 && vRuler('vr', rightX,  rightYs,  true)}
  </>;
}

// ─── annotations ──────────────────────────────────────────────────────────────

function Annotations({ ox, oy, shapeW, shapeH, width, height }: {
  ox:number; oy:number; shapeW:number; shapeH:number; width:number; height:number;
}) {
  const tick=8, hLX=ox+shapeW+85, wLY=oy+shapeH+52;
  return <>
    <text x={ox-14} y={oy-4} fontSize="11" fill="#64748b" fontWeight="700">A</text>
    <text x={ox+shapeW+4} y={oy-4} fontSize="11" fill="#64748b" fontWeight="700">B</text>
    <text x={ox-14} y={oy+shapeH+14} fontSize="11" fill="#64748b" fontWeight="700">D</text>
    <text x={ox+shapeW+4} y={oy+shapeH+14} fontSize="11" fill="#64748b" fontWeight="700">C</text>
    <line x1={hLX} y1={oy} x2={hLX} y2={oy+shapeH} stroke="#64748b" strokeWidth="1.5"/>
    <line x1={hLX-tick} y1={oy} x2={hLX+tick} y2={oy} stroke="#64748b" strokeWidth="1.5"/>
    <line x1={hLX-tick} y1={oy+shapeH} x2={hLX+tick} y2={oy+shapeH} stroke="#64748b" strokeWidth="1.5"/>
    <text x={hLX+13} y={oy+shapeH/2+5} fontSize="15" fill="#0f172a" fontWeight="800">{height} см</text>
    <line x1={ox} y1={wLY} x2={ox+shapeW} y2={wLY} stroke="#64748b" strokeWidth="1.5"/>
    <line x1={ox} y1={wLY-tick} x2={ox} y2={wLY+tick} stroke="#64748b" strokeWidth="1.5"/>
    <line x1={ox+shapeW} y1={wLY-tick} x2={ox+shapeW} y2={wLY+tick} stroke="#64748b" strokeWidth="1.5"/>
    <text x={ox+shapeW/2-24} y={wLY+18} fontSize="15" fill="#0f172a" fontWeight="800">{width} см</text>
  </>;
}

// ─── texture helpers ──────────────────────────────────────────────────────────

function darkenHex(hex: string, amt: number): string {
  if (hex.length < 7) return hex;
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amt);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amt);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amt);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function lightenHex(hex: string, amt: number): string {
  if (hex.length < 7) return hex;
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amt);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amt);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amt);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ─── main component ───────────────────────────────────────────────────────────

type PendingAdd = { side: FittingSide; posNorm: number; left: number; top: number };

export function WindowVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 400, h: 500 });
  const [vt, setVt] = useState({ scale: 1, x: 0, y: 0 });
  const [selectedFittingId, setSelectedFittingId] = useState<string | null>(null);
  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null);
  const [localPos, setLocalPos] = useState<Record<string, number>>({});

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // zoom on scroll (non-passive so preventDefault stops page scroll)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.13 : 1 / 1.13;
      setVt(prev => {
        const ns = Math.max(0.2, Math.min(10, prev.scale * factor));
        return {
          scale: ns,
          x: mx - (mx - prev.x) * (ns / prev.scale),
          y: my - (my - prev.y) * (ns / prev.scale),
        };
      });
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function startPan(e: React.MouseEvent<HTMLDivElement>) {
    const startX = e.clientX, startY = e.clientY;
    const startTx = vt.x, startTy = vt.y;
    function onMove(ev: MouseEvent) {
      setVt(prev => ({ ...prev, x: startTx + (ev.clientX - startX), y: startTy + (ev.clientY - startY) }));
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const {
    width, height, color, glass, shape, openingType, material,
    okantovkaTop, okantovkaBottom, okantovkaLeft, okantovkaRight, luverSpacing,
    luverSpacingTop, luverSpacingBottom, luverSpacingLeft, luverSpacingRight,
    remenLength, remenWidth,
    fittings, fittingsHistory, fittingsRedoStack, fittingsCustomized,
    generateFittings, addFitting, undoFitting, redoFitting, moveFitting, removeFitting,
  } = useConstructorStore();
  const isDark = useThemeStore((s) => s.theme === 'dark');

  // Auto-generate fittings when settings change (only if not customized by user)
  useEffect(() => {
    if (!fittingsCustomized) generateFittings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    width, height, luverSpacing,
    luverSpacingTop, luverSpacingBottom, luverSpacingLeft, luverSpacingRight,
    okantovkaTop, okantovkaBottom, okantovkaLeft, okantovkaRight,
    openingType, generateFittings,
  ]);

  // Delete/Backspace удаляет выделенный фиттинг; Escape снимает выделение
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFittingId) {
        e.preventDefault();
        removeFitting(selectedFittingId);
        setSelectedFittingId(null);
      }
      if (e.key === 'Escape') {
        setSelectedFittingId(null);
        setPendingAdd(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedFittingId, removeFitting]);

  const frameHex = getFrameHex(color);
  const glassHex = getGlassHex(glass, isDark);

  const PAD_T = 44, PAD_L = 56, PAD_R = 155, PAD_B = 96;
  const maxW = size.w - PAD_L - PAD_R;
  const maxH = size.h - PAD_T - PAD_B;

  const scale = Math.min(maxW / width, maxH / height);
  const shapeW = width * scale;
  const shapeH = height * scale;
  const ox = PAD_L + (maxW - shapeW) / 2;
  const oy = PAD_T + (maxH - shapeH) / 2;

  // autoBandPx используется для FittingsInteractive (полосы клика, иконки)
  const autoBandPx = Math.max(8, Math.min(Math.min(shapeW, shapeH) * 0.045, 38));
  // Визуальная окантовка берётся из реальных значений пользователя (мм → px)
  const okT = Math.max(4, (okantovkaTop    / 10) * scale);
  const okB = Math.max(4, (okantovkaBottom / 10) * scale);
  const okL = Math.max(4, (okantovkaLeft   / 10) * scale);
  const okR = Math.max(4, (okantovkaRight  / 10) * scale);

  // square: force equal sides
  const visW = shape==='square' ? Math.min(shapeW,shapeH) : shapeW;
  const visH = shape==='square' ? Math.min(shapeW,shapeH) : shapeH;
  const vox = ox + (shapeW-visW)/2;
  const voy = oy + (shapeH-visH)/2;

  const builders = { rect: rectPaths, square: rectPaths, arch: archPaths, triangle: trianglePaths };
  const { outer, inner, ix, iy, iw, ih } = builders[shape](vox, voy, visW, visH, okL, okR, okT, okB);

  const frameFill = material === 'oxford' ? 'url(#mat-oxford)'
                  : material === 'screen' ? 'url(#mat-screen)'
                  : material === 'fabric' ? 'url(#mat-fabric)'
                  : frameHex;

  const d1 = darkenHex(frameHex, 38);
  const l1 = lightenHex(frameHex, 42);
  const d2 = darkenHex(frameHex, 55);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative select-none"
      onMouseDown={startPan}
      onDoubleClick={() => setVt({ scale: 1, x: 0, y: 0 })}
      onClick={() => { setSelectedFittingId(null); setPendingAdd(null); }}
      style={{ cursor: 'grab' }}
    >
      {/* Кнопки отмены / сброса */}
      {(
        <div className="absolute top-2 left-2 z-10 flex gap-1.5" onMouseDown={e => e.stopPropagation()}>
          <button
            onClick={undoFitting}
            disabled={fittingsHistory.length === 0}
            title="Отменить последнее действие"
            className="px-2 py-1 text-[11px] font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded shadow-sm transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
          >
            ↩ Отменить
          </button>
          <button
            onClick={redoFitting}
            disabled={fittingsRedoStack.length === 0}
            title="Вернуть отменённое действие"
            className="px-2 py-1 text-[11px] font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded shadow-sm transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
          >
            ↪ Вернуть
          </button>
          {selectedFittingId && (
            <button
              onClick={() => { removeFitting(selectedFittingId); setSelectedFittingId(null); }}
              className="px-2 py-1 text-[11px] font-medium bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-colors"
            >
              🗑 Удалить
            </button>
          )}
        </div>
      )}

      {/* Панель выбора типа при добавлении нового фиттинга */}
      {pendingAdd && (
        <div
          className="absolute z-20 bg-white dark:bg-slate-800 border border-[#e2e8f0] dark:border-slate-600 rounded-xl shadow-xl p-2 flex flex-col gap-1"
          style={{
            left: Math.max(90, Math.min(size.w - 90, pendingAdd.left)),
            top: pendingAdd.top > size.h * 0.6 ? pendingAdd.top - 118 : pendingAdd.top + 8,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] font-semibold text-[#64748b] dark:text-slate-400 text-center mb-0.5 px-1">Добавить</p>
          <button
            onClick={() => { addFitting(pendingAdd.side, pendingAdd.posNorm, 'luvers'); setPendingAdd(null); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#eff6ff] dark:hover:bg-blue-900/20 text-sm text-[#0f172a] dark:text-slate-100 transition-colors"
          >
            <img src={luversSrc} width={18} height={18} alt=""/>
            Люверс
          </button>
          <button
            onClick={() => { addFitting(pendingAdd.side, pendingAdd.posNorm, 'fran'); setPendingAdd(null); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#eff6ff] dark:hover:bg-blue-900/20 text-sm text-[#0f172a] dark:text-slate-100 transition-colors"
          >
            <img src={franSrc} width={11} height={19} alt=""/>
            Французский замок
          </button>
          <button
            onClick={() => setPendingAdd(null)}
            className="text-[10px] text-[#94a3b8] dark:text-slate-500 hover:text-[#64748b] dark:hover:text-slate-300 text-center py-0.5 transition-colors"
          >
            отмена
          </button>
        </div>
      )}

      {vt.scale !== 1 && (
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setVt({ scale: 1, x: 0, y: 0 })}
          className="absolute top-2 right-2 z-10 px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-[#e2e8f0] dark:border-slate-600 rounded shadow-sm text-[#64748b] dark:text-slate-400 hover:border-[#2563eb] hover:text-[#2563eb] transition-colors"
        >
          {Math.round(vt.scale * 100)}% · сброс
        </button>
      )}
      <svg
        width={size.w} height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        xmlns="http://www.w3.org/2000/svg"
        className="block"
        style={{ transform: `translate(${vt.x}px,${vt.y}px) scale(${vt.scale})`, transformOrigin: '0 0' }}
      >
        <defs>
          {/* Oxford basket-weave: 10×10 tile, alternating raised squares */}
          <pattern id="mat-oxford" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill={frameHex}/>
            <rect x="0" y="0" width="5" height="5" fill={d1} opacity="0.45"/>
            <rect x="5" y="5" width="5" height="5" fill={d1} opacity="0.45"/>
            <line x1="0" y1="5" x2="10" y2="5" stroke={l1} strokeWidth="0.9" opacity="0.55"/>
            <line x1="5" y1="0" x2="5" y2="10" stroke={l1} strokeWidth="0.9" opacity="0.55"/>
            <line x1="0" y1="0" x2="10" y2="0" stroke={d2} strokeWidth="0.5" opacity="0.25"/>
            <line x1="0" y1="0" x2="0" y2="10" stroke={d2} strokeWidth="0.5" opacity="0.25"/>
          </pattern>
          {/* Screen mesh: 5×5 tile, open square holes */}
          <pattern id="mat-screen" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
            <rect width="5" height="5" fill={darkenHex(frameHex, 20)}/>
            <rect x="1" y="1" width="3" height="3" fill={lightenHex(frameHex, 65)} opacity="0.5"/>
          </pattern>
          {/* Fabric twill weave: 8×8 tile, diagonal diagonal ribs */}
          <pattern id="mat-fabric" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill={frameHex}/>
            {/* diagonal twill lines — darker */}
            <line x1="0" y1="2" x2="2" y2="0" stroke={d2} strokeWidth="1.1" opacity="0.45"/>
            <line x1="0" y1="6" x2="6" y2="0" stroke={d2} strokeWidth="1.1" opacity="0.45"/>
            <line x1="2" y1="8" x2="8" y2="2" stroke={d2} strokeWidth="1.1" opacity="0.45"/>
            <line x1="6" y1="8" x2="8" y2="6" stroke={d2} strokeWidth="1.1" opacity="0.45"/>
            {/* highlight between ribs */}
            <line x1="0" y1="4" x2="4" y2="0" stroke={l1} strokeWidth="0.7" opacity="0.35"/>
            <line x1="4" y1="8" x2="8" y2="4" stroke={l1} strokeWidth="0.7" opacity="0.35"/>
            {/* subtle horizontal thread lines */}
            <line x1="0" y1="0" x2="8" y2="0" stroke={d1} strokeWidth="0.4" opacity="0.2"/>
            <line x1="0" y1="4" x2="8" y2="4" stroke={d1} strokeWidth="0.4" opacity="0.2"/>
          </pattern>
        </defs>
        <path d={outer} fill={frameFill} />
        {inner && <path d={inner} fill={glassHex} />}
        <>
          <FittingsInteractive
            fittings={fittings} vox={vox} voy={voy} visW={visW} visH={visH}
            autoBandPx={autoBandPx}
            containerRef={containerRef} vt={vt}
            selectedId={selectedFittingId}
            onSelect={setSelectedFittingId}
            onStripClick={(side, posNorm, clientX, clientY) => {
              const rect = containerRef.current?.getBoundingClientRect();
              if (!rect) return;
              setSelectedFittingId(null);
              setPendingAdd({ side, posNorm, left: clientX - rect.left, top: clientY - rect.top });
            }}
            moveFitting={moveFitting}
            localPos={localPos}
            setLocalPos={setLocalPos}
            shape={shape} ix={ix} iy={iy} iw={iw} ih={ih}
            openingType={openingType}
            remenLengthPx={remenLength > 0 ? remenLength * scale : 0}
            remenWidthPx={remenWidth > 0 ? remenWidth * scale : 0}
            frameFill={frameFill}
            innerPath={inner ?? ''}
          />
          <LuverRulersFromFittings
            fittings={fittings.map(f => localPos[f.id] !== undefined ? { ...f, posNorm: localPos[f.id] } : f)}
            vox={vox} voy={voy} visW={visW} visH={visH} pxPerCm={scale}
          />
        </>
        <Annotations ox={vox} oy={voy} shapeW={visW} shapeH={visH} width={width} height={height} />
      </svg>
    </div>
  );
}
