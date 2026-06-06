import { useRef, useEffect, useState } from 'react';
import { useConstructorStore, type FittingItem, type FittingSide } from '../../store/constructorStore';
import { getFrameHex, getGlassHex } from '../../lib/calculator';
import { useThemeStore } from '../../store/themeStore';
import franSrc from '../../assets/fran.png';
import luversSrc from '../../assets/luvers.svg';

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

// ─── luver position helper ────────────────────────────────────────────────────
// Returns evenly-spaced positions (in px) along an axis, offset one spacingPx
// from each inner band edge. Guarantees at least one position.
function getLuverPositions(axisStart: number, axisEnd: number, bandPx: number, spacingPx: number): number[] {
  const innerStart = axisStart + bandPx;
  const innerEnd   = axisEnd   - bandPx;
  if (innerEnd - innerStart <= 0 || spacingPx <= 0) return [(axisStart + axisEnd) / 2];
  const positions: number[] = [];
  let pos = innerStart + spacingPx;
  while (pos <= innerEnd - spacingPx * 0.5) {
    positions.push(pos);
    pos += spacingPx;
  }
  if (positions.length === 0) positions.push((innerStart + innerEnd) / 2);
  return positions;
}

// ─── fittings ─────────────────────────────────────────────────────────────────

function Fittings({ openingType, prodType, shape, ox, oy, w, h, ix, iy, iw, ih, luverSpacing, pxPerCm }: {
  openingType: string; prodType: 'window'|'door'; shape: string;
  ox:number; oy:number; w:number; h:number; ix:number; iy:number; iw:number; ih:number;
  luverSpacing: number;   // мм между люверсами
  pxPerCm: number;        // пиксель на см (scale)
}) {
  const bandPx  = Math.max(1, (w - iw) / 2);           // фактическая ширина рамки, px
  const band    = Math.min(bandPx, 20);                 // ограничена для размера иконок
  const r       = Math.max(4, band * 0.32);
  const spacingPx = Math.max(20, (luverSpacing / 10) * pxPerCm); // мм→см→px
  const sz      = r * 2;
  const el: React.ReactNode[] = [];

  // Люверс горизонтальный (без поворота)
  function luversH(key: string, cx: number, cy: number) {
    return <image key={key} href={luversSrc} x={cx-sz/2} y={cy-sz/2} width={sz} height={sz}/>;
  }
  // Люверс вертикальный (повёрнут 90°)
  function luversV(key: string, cx: number, cy: number) {
    return <image key={key} href={luversSrc} x={cx-sz/2} y={cy-sz/2} width={sz} height={sz}
      transform={`rotate(90,${cx},${cy})`}/>;
  }
  // Французский замок горизонтальный
  function franH(key: string, cx: number, cy: number) {
    const bw = r*1.4, bh = r*2.4;
    return <image key={key} href={franSrc} x={cx-bw/2} y={cy-bh/2} width={bw} height={bh}/>;
  }
  // Французский замок вертикальный (повёрнут 90°)
  function franV(key: string, cx: number, cy: number) {
    const bw = r*1.4, bh = r*2.4;
    return <image key={key} href={franSrc} x={cx-bw/2} y={cy-bh/2} width={bw} height={bh}
      transform={`rotate(90,${cx},${cy})`}/>;
  }

  // n точек равномерно вдоль отрезка
  function linePoints(x1:number,y1:number, x2:number,y2:number, n:number) {
    return Array.from({length:n}, (_,i) => ({
      x: x1 + (i+0.5)/n*(x2-x1),
      y: y1 + (i+0.5)/n*(y2-y1),
    }));
  }

  // ── DOOR ─────────────────────────────────────────────────────────────────────
  if (prodType === 'door') {
    getLuverPositions(ox, ox+w, bandPx, spacingPx).forEach((x, i) => {
      el.push(luversH(`dt${i}`, x, oy+band/2));
      el.push(luversH(`db${i}`, x, oy+h-band/2));
    });
    getLuverPositions(oy, oy+h, bandPx, spacingPx).forEach((y, i) => {
      el.push(luversV(`dl${i}`, ox+band/2, y));
      el.push(luversV(`dr${i}`, ox+w-band/2, y));
    });
    const zipW = openingType.includes('трактор') ? 10 : 7;
    const step = openingType.includes('трактор') ? 10 : 9;
    const isTwo = openingType.startsWith('2 молнии');
    const zxArr = isTwo ? [ix+iw*0.15, ix+iw*0.85] : [ix+iw/2];
    zxArr.forEach((zx,zi) => {
      el.push(<rect key={`zb${zi}`} x={zx-zipW/2} y={iy} width={zipW} height={ih} fill="#e8e8e8" stroke="#444" strokeWidth="1.2" rx="1"/>);
      for (let z=0; z<Math.floor(ih/step); z++) {
        el.push(<rect key={`zt${zi}-${z}`} x={zx-2} y={iy+4+z*step} width={4} height={2.2} fill="#555" rx="0.7"/>);
      }
    });
    return <>{el}</>;
  }

  // ── TRIANGLE ─────────────────────────────────────────────────────────────────
  if (shape === 'triangle') {
    const tip_o = { x: ox+w/2, y: oy };
    const bl_o  = { x: ox,     y: oy+h };
    const br_o  = { x: ox+w,   y: oy+h };
    const blX = ix, topY = iy, brX = ix+iw, botY = iy+ih;
    const tip_i = { x: ox+w/2, y: topY };
    const bl_i  = { x: blX,    y: botY };
    const br_i  = { x: brX,    y: botY };
    const mid = (a:{x:number,y:number}, b:{x:number,y:number}) => ({ x:(a.x+b.x)/2, y:(a.y+b.y)/2 });
    const m_tip = mid(tip_o, tip_i);
    const m_bl  = mid(bl_o,  bl_i);
    const m_br  = mid(br_o,  br_i);

    // Нижняя сторона: шаг по X
    const botLen  = Math.hypot(m_br.x-m_bl.x, m_br.y-m_bl.y);
    const nBot    = Math.max(2, Math.round(botLen / spacingPx));
    linePoints(m_bl.x,m_bl.y, m_br.x,m_br.y, nBot).forEach((p,i) => el.push(luversH(`tb${i}`,p.x,p.y)));
    // Диагонали: шаг вдоль длины
    const leftLen  = Math.hypot(m_bl.x-m_tip.x, m_bl.y-m_tip.y);
    const rightLen = Math.hypot(m_br.x-m_tip.x, m_br.y-m_tip.y);
    const nLeft  = Math.max(1, Math.round(leftLen  / spacingPx));
    const nRight = Math.max(1, Math.round(rightLen / spacingPx));
    linePoints(m_tip.x,m_tip.y, m_bl.x,m_bl.y, nLeft) .forEach((p,i) => el.push(luversH(`tl${i}`,p.x,p.y)));
    linePoints(m_tip.x,m_tip.y, m_br.x,m_br.y, nRight).forEach((p,i) => el.push(luversH(`tr${i}`,p.x,p.y)));
    return <>{el}</>;
  }

  // ── ARCH ─────────────────────────────────────────────────────────────────────
  if (shape === 'arch') {
    const arcCx  = ox + w / 2;
    const arcCy  = iy;
    const ry_out = iy - oy;
    const rx_out = w / 2;
    const rx_in  = iw / 2;
    const ry_in  = Math.max(0, ry_out - (ix - ox));

    // Арка: кол-во люверсов из длины дуги / шаг
    const arcLen  = Math.PI * Math.sqrt((rx_out**2 + ry_out**2) / 2);  // приближение периметра полуэллипса
    const nArc    = Math.max(2, Math.round(arcLen / spacingPx));
    for (let i = 0; i < nArc; i++) {
      const angle  = Math.PI * (1 - (i + 0.5) / nArc);
      const ox_pt  = arcCx + rx_out * Math.cos(angle);
      const oy_pt  = arcCy - ry_out * Math.sin(angle);
      const ix_pt  = arcCx + rx_in  * Math.cos(angle);
      const iy_pt  = arcCy - ry_in  * Math.sin(angle);
      el.push(luversH(`aa${i}`, (ox_pt + ix_pt) / 2, (oy_pt + iy_pt) / 2));
    }

    // Боковые стороны — вертикальные люверсы
    const midLX = (ox + ix)          / 2;
    const midRX = (ox + w + ix + iw) / 2;
    getLuverPositions(arcCy, oy + h, bandPx, spacingPx).forEach((y, i) => {
      el.push(luversV(`asl${i}`, midLX, y));
      el.push(luversV(`asr${i}`, midRX, y));
    });

    // Нижняя сторона — горизонтальные
    getLuverPositions(ox, ox + w, bandPx, spacingPx).forEach((x, i) =>
      el.push(luversH(`ab${i}`, x, (oy + h + iy + ih) / 2)));

    return <>{el}</>;
  }

  // ── RECT / SQUARE (window) ───────────────────────────────────────────────────
  const isGluh    = openingType === 'Глухое (без открывания)';
  const isFrance  = openingType.includes('замок');
  const isSkoba   = openingType.includes('скоб');
  const hasZipper = openingType.includes('молни');

  const topY   = oy + band / 2;
  const botY   = oy + h - band / 2;
  const leftX  = ox + band / 2;
  const rightX = ox + w - band / 2;

  // Верхние люверсы — всегда горизонтальные
  getLuverPositions(ox, ox + w, bandPx, spacingPx).forEach((x, i) =>
    el.push(luversH(`ht${i}`, x, topY)));

  if (isGluh) {
    getLuverPositions(ox, ox + w, bandPx, spacingPx).forEach((x, i) =>
      el.push(luversH(`hb${i}`, x, botY)));
    getLuverPositions(oy, oy + h, bandPx, spacingPx).forEach((y, i) => {
      el.push(luversV(`hl${i}`, leftX, y));
      el.push(luversV(`hr${i}`, rightX, y));
    });
  } else if (isSkoba) {
    getLuverPositions(oy, oy + h, bandPx, spacingPx).forEach((y, i) => {
      el.push(luversV(`sl${i}`, leftX, y));
      el.push(luversV(`sr${i}`, rightX, y));
    });
    getLuverPositions(ox, ox + w, bandPx, spacingPx).forEach((x, i) =>
      el.push(luversH(`sb${i}`, x, botY)));
  } else if (isFrance) {
    // Боковые — français вертикальный (повёрнут)
    getLuverPositions(oy, oy + h, bandPx, spacingPx).forEach((y, i) => {
      el.push(franV(`fl${i}`, leftX, y));
      el.push(franV(`fr${i}`, rightX, y));
    });
    // Нижние — français горизонтальный
    getLuverPositions(ox, ox + w, bandPx, spacingPx).forEach((x, i) =>
      el.push(franH(`fb${i}`, x, botY)));
  }

  if (hasZipper) {
    const zipW = openingType.includes('трактор') ? 10 : 7;
    const step  = openingType.includes('трактор') ? 10 : 9;
    const zipH  = isFrance ? ih*0.7 : ih;
    [ix+iw*0.15, ix+iw*0.85].forEach((zx,zi) => {
      el.push(<rect key={`wzb${zi}`} x={zx-zipW/2} y={iy} width={zipW} height={zipH} fill="#e8e8e8" stroke="#444" strokeWidth="1.2" rx="1"/>);
      for (let z=0; z<Math.floor(zipH/step); z++) {
        el.push(<rect key={`wzt${zi}-${z}`} x={zx-2} y={iy+4+z*step} width={4} height={2.2} fill="#555" rx="0.7"/>);
      }
    });
  }
  return <>{el}</>;
}

// ─── dimension rulers for luver positions ─────────────────────────────────────

function LuverRulers({ ox, oy, w, h, bandPx, spacingPx, pxPerCm, shape }: {
  ox:number; oy:number; w:number; h:number;
  bandPx:number; spacingPx:number; pxPerCm:number; shape:string;
}) {
  if (pxPerCm <= 0 || spacingPx <= 0) return null;
  const lc = '#94a3b8';
  const tc = '#475569';
  const fs = 7;
  const tk = 5;

  const showRect = shape === 'rect' || shape === 'square';

  // Горизонтальная линейка — над фигурой
  const hPos = (shape !== 'triangle') ? getLuverPositions(ox, ox+w, bandPx, spacingPx) : [];
  const hXs  = [ox, ...hPos, ox+w];
  const hY   = oy - 16;

  // Вертикальная линейка — левее фигуры (только rect/square)
  const vPos = showRect ? getLuverPositions(oy, oy+h, bandPx, spacingPx) : [];
  const vYs  = [oy, ...vPos, oy+h];
  const vX   = ox - 20;

  return <>
    {/* Горизонтальная линейка */}
    {hPos.length > 0 && <>
      <line x1={ox} y1={hY} x2={ox+w} y2={hY} stroke={lc} strokeWidth="0.8"/>
      {hXs.map((x, i) => (
        <g key={`hr${i}`}>
          <line x1={x} y1={hY-tk} x2={x} y2={hY+tk} stroke={lc} strokeWidth="0.8"/>
          {i < hXs.length-1 && (
            <text x={(x+hXs[i+1])/2} y={hY-8} fontSize={fs} fill={tc} textAnchor="middle"
              fontFamily="system-ui,sans-serif" dominantBaseline="auto">
              {((hXs[i+1]-x)/pxPerCm).toFixed(1)}
            </text>
          )}
        </g>
      ))}
    </>}

    {/* Вертикальная линейка */}
    {showRect && vPos.length > 0 && <>
      <line x1={vX} y1={oy} x2={vX} y2={oy+h} stroke={lc} strokeWidth="0.8"/>
      {vYs.map((y, i) => (
        <g key={`vr${i}`}>
          <line x1={vX-tk} y1={y} x2={vX+tk} y2={y} stroke={lc} strokeWidth="0.8"/>
          {i < vYs.length-1 && (
            <text x={vX-8} y={(y+vYs[i+1])/2} fontSize={fs} fill={tc} textAnchor="end"
              fontFamily="system-ui,sans-serif" dominantBaseline="middle">
              {((vYs[i+1]-y)/pxPerCm).toFixed(1)}
            </text>
          )}
        </g>
      ))}
    </>}
  </>;
}

// ─── interactive fittings layer (rect / square) ───────────────────────────────

function FittingsInteractive({
  fittings, vox, voy, visW, visH, autoBandPx,
  containerRef, vt, selectedId, onSelect, onStripClick, moveFitting,
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
}) {
  const [ghost, setGhost] = useState<{ side: FittingSide; cx: number; cy: number } | null>(null);
  const [localPos, setLocalPos] = useState<Record<string, number>>({});
  const vtRef = useRef(vt);
  useEffect(() => { vtRef.current = vt; }, [vt]);

  const band = Math.min(autoBandPx, 20);
  const r    = Math.max(4, band * 0.32);
  const sz   = r * 2;

  function screenToSvg(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const cur = vtRef.current;
    return {
      x: (clientX - rect.left - cur.x) / cur.scale,
      y: (clientY - rect.top  - cur.y) / cur.scale,
    };
  }

  function getPosNorm(clientX: number, clientY: number, side: FittingSide): number {
    const { x, y } = screenToSvg(clientX, clientY);
    const raw = (side === 'top' || side === 'bottom')
      ? (x - vox) / visW
      : (y - voy) / visH;
    return Math.max(0.02, Math.min(0.98, raw));
  }

  function fittingPx(side: FittingSide, posNorm: number) {
    switch (side) {
      case 'top':    return { cx: vox + posNorm * visW,          cy: voy + autoBandPx / 2 };
      case 'bottom': return { cx: vox + posNorm * visW,          cy: voy + visH - autoBandPx / 2 };
      case 'left':   return { cx: vox + autoBandPx / 2,          cy: voy + posNorm * visH };
      case 'right':  return { cx: vox + visW - autoBandPx / 2,   cy: voy + posNorm * visH };
    }
  }

  function startDrag(e: React.MouseEvent, f: FittingItem) {
    e.stopPropagation();
    onSelect(f.id);
    const side = f.side;
    document.body.style.cursor = 'grabbing';

    function onMove(ev: MouseEvent) {
      const pn = getPosNorm(ev.clientX, ev.clientY, side);
      setLocalPos(prev => ({ ...prev, [f.id]: pn }));
    }
    function onUp(ev: MouseEvent) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      const pn = getPosNorm(ev.clientX, ev.clientY, side);
      moveFitting(f.id, pn);
      setLocalPos(prev => { const n = { ...prev }; delete n[f.id]; return n; });
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const strips: { side: FittingSide; x: number; y: number; w: number; h: number }[] = [
    { side: 'top',    x: vox,                 y: voy,                 w: visW,       h: autoBandPx },
    { side: 'bottom', x: vox,                 y: voy+visH-autoBandPx, w: visW,       h: autoBandPx },
    { side: 'left',   x: vox,                 y: voy+autoBandPx,      w: autoBandPx, h: visH-2*autoBandPx },
    { side: 'right',  x: vox+visW-autoBandPx, y: voy+autoBandPx,      w: autoBandPx, h: visH-2*autoBandPx },
  ];

  return <>
    {/* Кликабельные полосы рамки — открывают панель выбора типа */}
    {strips.map(s => (
      <rect key={s.side} x={s.x} y={s.y} width={s.w} height={s.h}
        fill="transparent" style={{ cursor: 'crosshair' }}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation();
          const pn = getPosNorm(e.clientX, e.clientY, s.side);
          onStripClick(s.side, pn, e.clientX, e.clientY);
          setGhost(null);
        }}
        onMouseMove={e => {
          const pn = getPosNorm(e.clientX, e.clientY, s.side);
          setGhost({ side: s.side, ...fittingPx(s.side, pn) });
        }}
        onMouseLeave={() => setGhost(null)}
      />
    ))}

    {/* Ghost при наведении */}
    {ghost && (() => {
      const isV = ghost.side === 'left' || ghost.side === 'right';
      const tf  = isV ? `rotate(90,${ghost.cx},${ghost.cy})` : undefined;
      return <image key="ghost" href={luversSrc}
        x={ghost.cx-sz/2} y={ghost.cy-sz/2} width={sz} height={sz}
        transform={tf} opacity={0.35} style={{ pointerEvents: 'none' }}/>;
    })()}

    {/* Сами люверсы/замки: drag для перемещения */}
    {fittings.map(f => {
      const posNorm = localPos[f.id] ?? f.posNorm;
      const { cx, cy } = fittingPx(f.side, posNorm);
      const isV = f.side === 'left' || f.side === 'right';
      const tf  = isV ? `rotate(90,${cx},${cy})` : undefined;
      const isSelected = f.id === selectedId;
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
  const topF  = fittings.filter(f => f.side === 'top' ).sort((a,b) => a.posNorm - b.posNorm);
  const leftF = fittings.filter(f => f.side === 'left').sort((a,b) => a.posNorm - b.posNorm);
  const hXs = [vox, ...topF.map(f  => vox + f.posNorm * visW), vox + visW];
  const vYs = [voy, ...leftF.map(f => voy + f.posNorm * visH), voy + visH];
  const hY = voy - 16, vX = vox - 20;
  return <>
    {topF.length > 0 && <>
      <line x1={vox} y1={hY} x2={vox+visW} y2={hY} stroke={lc} strokeWidth="0.8"/>
      {hXs.map((x, i) => <g key={`hr${i}`}>
        <line x1={x} y1={hY-tk} x2={x} y2={hY+tk} stroke={lc} strokeWidth="0.8"/>
        {i < hXs.length-1 && (
          <text x={(x+hXs[i+1])/2} y={hY-8} fontSize={fs} fill={tc} textAnchor="middle"
            fontFamily="system-ui,sans-serif">{((hXs[i+1]-x)/pxPerCm).toFixed(1)}</text>
        )}
      </g>)}
    </>}
    {leftF.length > 0 && <>
      <line x1={vX} y1={voy} x2={vX} y2={voy+visH} stroke={lc} strokeWidth="0.8"/>
      {vYs.map((y, i) => <g key={`vr${i}`}>
        <line x1={vX-tk} y1={y} x2={vX+tk} y2={y} stroke={lc} strokeWidth="0.8"/>
        {i < vYs.length-1 && (
          <text x={vX-8} y={(y+vYs[i+1])/2} fontSize={fs} fill={tc} textAnchor="end"
            fontFamily="system-ui,sans-serif" dominantBaseline="middle">
            {((vYs[i+1]-y)/pxPerCm).toFixed(1)}
          </text>
        )}
      </g>)}
    </>}
  </>;
}

// ─── annotations ──────────────────────────────────────────────────────────────

function Annotations({ ox, oy, shapeW, shapeH, width, height }: {
  ox:number; oy:number; shapeW:number; shapeH:number; width:number; height:number;
}) {
  const tick=8, hLX=ox+shapeW+22, wLY=oy+shapeH+24;
  return <>
    <text x={ox-13} y={oy-4} fontSize="9" fill="#94a3b8" fontWeight="600">A</text>
    <text x={ox+shapeW+4} y={oy-4} fontSize="9" fill="#94a3b8" fontWeight="600">B</text>
    <text x={ox-13} y={oy+shapeH+13} fontSize="9" fill="#94a3b8" fontWeight="600">D</text>
    <text x={ox+shapeW+4} y={oy+shapeH+13} fontSize="9" fill="#94a3b8" fontWeight="600">C</text>
    <line x1={hLX} y1={oy} x2={hLX} y2={oy+shapeH} stroke="#94a3b8" strokeWidth="1.5"/>
    <line x1={hLX-tick} y1={oy} x2={hLX+tick} y2={oy} stroke="#94a3b8" strokeWidth="1.5"/>
    <line x1={hLX-tick} y1={oy+shapeH} x2={hLX+tick} y2={oy+shapeH} stroke="#94a3b8" strokeWidth="1.5"/>
    <text x={hLX+13} y={oy+shapeH/2+5} fontSize="13" fill="#334155" fontWeight="700">{height} см</text>
    <line x1={ox} y1={wLY} x2={ox+shapeW} y2={wLY} stroke="#94a3b8" strokeWidth="1.5"/>
    <line x1={ox} y1={wLY-tick} x2={ox} y2={wLY+tick} stroke="#94a3b8" strokeWidth="1.5"/>
    <line x1={ox+shapeW} y1={wLY-tick} x2={ox+shapeW} y2={wLY+tick} stroke="#94a3b8" strokeWidth="1.5"/>
    <text x={ox+shapeW/2-22} y={wLY+18} fontSize="13" fill="#334155" fontWeight="700">{width} см</text>
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
    width, height, color, glass, shape, prodType, openingType, material,
    okantovkaTop, okantovkaBottom, okantovkaLeft, okantovkaRight, luverSpacing,
    fittings, fittingsHistory, fittingsCustomized,
    generateFittings, addFitting, undoFitting, resetFittings, moveFitting, removeFitting,
  } = useConstructorStore();
  const isDark = useThemeStore((s) => s.theme === 'dark');

  // Auto-generate fittings when settings change (only if not customized by user)
  useEffect(() => {
    if (!fittingsCustomized) generateFittings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, luverSpacing, okantovkaTop, okantovkaBottom, okantovkaLeft, okantovkaRight, openingType, generateFittings]);

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

  const PAD_T = 44, PAD_L = 56, PAD_R = 100, PAD_B = 72;
  const maxW = size.w - PAD_L - PAD_R;
  const maxH = size.h - PAD_T - PAD_B;

  const scale = Math.min(maxW / width, maxH / height);
  const shapeW = width * scale;
  const shapeH = height * scale;
  const ox = PAD_L + (maxW - shapeW) / 2;
  const oy = PAD_T + (maxH - shapeH) / 2;

  // Визуальная окантовка: 4.5% меньшей стороны, но не меньше 8px и не больше 38px.
  // Пользовательские значения (мм) влияют только на расчёт цены, не на отрисовку.
  const autoBandPx = Math.max(8, Math.min(Math.min(shapeW, shapeH) * 0.045, 38));
  const okL = autoBandPx;
  const okR = autoBandPx;
  const okT = autoBandPx;
  const okB = autoBandPx;

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
      {/* Кнопки отмены / сброса (только для rect/square) */}
      {(shape === 'rect' || shape === 'square') && (
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
            onClick={resetFittings}
            disabled={!fittingsCustomized}
            title="Сбросить к авто-расстановке"
            className="px-2 py-1 text-[11px] font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded shadow-sm transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
          >
            ✕ Сбросить
          </button>
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
        {(shape === 'rect' || shape === 'square') ? (
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
            />
            <LuverRulersFromFittings
              fittings={fittings} vox={vox} voy={voy} visW={visW} visH={visH} pxPerCm={scale}
            />
          </>
        ) : (
          <>
            <Fittings openingType={openingType} prodType={prodType} shape={shape}
              ox={vox} oy={voy} w={visW} h={visH} ix={ix} iy={iy} iw={iw} ih={ih}
              luverSpacing={luverSpacing} pxPerCm={scale} />
            <LuverRulers
              ox={vox} oy={voy} w={visW} h={visH}
              bandPx={autoBandPx} spacingPx={(luverSpacing / 10) * scale}
              pxPerCm={scale} shape={shape} />
          </>
        )}
        <Annotations ox={vox} oy={voy} shapeW={visW} shapeH={visH} width={width} height={height} />
      </svg>
    </div>
  );
}
