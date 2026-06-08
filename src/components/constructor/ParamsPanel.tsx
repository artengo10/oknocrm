import { useState } from 'react';
import { useConstructorStore, SHAPE_OPTIONS } from '../../store/constructorStore';
import { OPENING_OPTIONS } from '../../lib/calculator';
import type { ShapeType } from '../../store/constructorStore';
import { FRAME_COLORS } from '../../lib/calculator';
import type { FrameColor, Material, GlassType, ProdType } from '../../lib/calculator';
import { useThemeStore } from '../../store/themeStore';
import luversSrc from '../../assets/luvers.svg';
import franSrc from '../../assets/fran.png';

// ─── Mini shape SVG previews ─────────────────────────────────────────────────
function ShapePreview({ shape, prodType, active }: { shape: ShapeType; prodType: ProdType; active: boolean }) {
  const W = 72, H = 82;
  const pad = 8;
  const band = 10;
  const frameColor = active ? '#2563eb' : '#8B7355';
  const dark = useThemeStore((s) => s.theme === 'dark');
  const glassColor = dark
    ? (active ? '#1e4d7a' : '#1a3a5c')
    : (active ? '#93c5fd' : '#aed6f1');

  const ow = W - pad * 2, oh = H - pad * 2;
  const ox = pad, oy = pad;
  const ix = ox + band, iy = oy + band;
  const iw = ow - band * 2, ih = oh - band * 2;

  let outerPath = '', innerPath = '';

  if (shape === 'rect' && prodType === 'door') {
    // tall rectangle
    const dw = ow * 0.6, dh = oh;
    const dx = ox + (ow - dw) / 2;
    outerPath = `M${dx},${oy} L${dx + dw},${oy} L${dx + dw},${oy + dh} L${dx},${oy + dh} Z`;
    const b2 = band * 0.7;
    innerPath = `M${dx + b2},${oy + b2} L${dx + dw - b2},${oy + b2} L${dx + dw - b2},${oy + dh - b2} L${dx + b2},${oy + dh - b2} Z`;
  } else if (shape === 'rect') {
    // window rect — landscape (wider than tall)
    const rh = oh * 0.6;
    const ry = oy + (oh - rh) / 2;
    outerPath = `M${ox},${ry} L${ox + ow},${ry} L${ox + ow},${ry + rh} L${ox},${ry + rh} Z`;
    const b2 = band * 0.8;
    innerPath = `M${ox + b2},${ry + b2} L${ox + ow - b2},${ry + b2} L${ox + ow - b2},${ry + rh - b2} L${ox + b2},${ry + rh - b2} Z`;
  } else if (shape === 'arch') {
    const isDoor = prodType === 'door';
    const dw = isDoor ? ow * 0.65 : ow;
    const dx = ox + (ow - dw) / 2;
    // Cap arch radius so rect part is always visible
    const archR = Math.min(dw / 2, oh * 0.55);
    outerPath = `M${dx},${oy + archR} A${archR},${archR},0,0,1,${dx + dw},${oy + archR} L${dx + dw},${oy + oh} L${dx},${oy + oh} Z`;
    const b2 = band * 0.8;
    const iw2 = dw - b2 * 2;
    const ir = iw2 / 2 * (archR / (dw / 2));
    const icenterY = oy + b2 + ir;
    innerPath = `M${dx + b2},${icenterY} A${ir},${ir},0,0,1,${dx + dw - b2},${icenterY} L${dx + dw - b2},${oy + oh - b2} L${dx + b2},${oy + oh - b2} Z`;
  } else if (shape === 'triangle') {
    const cx = ox + ow / 2;
    outerPath = `M${cx},${oy} L${ox + ow},${oy + oh} L${ox},${oy + oh} Z`;
    const b2 = band * 1.2;
    innerPath = `M${cx},${oy + b2 * 1.4} L${ox + ow - b2},${oy + oh - b2 * 0.6} L${ox + b2},${oy + oh - b2 * 0.6} Z`;
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
      {outerPath && <path d={outerPath} fill={frameColor} opacity={active ? 1 : 0.75} />}
      {innerPath && <path d={innerPath} fill={glassColor} />}
    </svg>
  );
}

// ─── Step progress indicator ─────────────────────────────────────────────────
const STEPS = [
  { label: 'Издел.' },
  { label: 'Вид' },
  { label: 'Разм.' },
  { label: 'Откр.' },
];

function StepBar({ step, onGo }: { step: number; onGo: (s: number) => void }) {
  return (
    <div className="flex items-center px-4 py-3 gap-0 border-b border-[#e2e8f0] dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-900">
      {STEPS.map((s, i) => {
        const num = i + 1;
        const done = num < step;
        const active = num === step;
        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onGo(num)}
              className="flex flex-col items-center gap-0.5 flex-shrink-0"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                done ? 'bg-[#059669] text-white' :
                active ? 'bg-[#2563eb] text-white' :
                'bg-[#f1f5f9] dark:bg-slate-700 text-[#94a3b8] dark:text-slate-500'
              }`}>
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : num}
              </div>
              <span className={`text-[9px] font-medium truncate w-full text-center ${active ? 'text-[#2563eb]' : 'text-[#94a3b8] dark:text-slate-500'}`}>
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-1 mt-[-10px] ${done ? 'bg-[#059669]' : 'bg-[#e2e8f0] dark:bg-slate-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const SHAPE_LABELS: Record<ShapeType, string> = {
  rect: 'Прямоуголь.',
  square: 'Прямоуголь.',
  arch: 'Арочное',
  triangle: 'Треугол.',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-[#64748b] dark:text-slate-400 mb-3">{children}</p>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2.5 w-full py-1.5">
      <div className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${checked ? 'bg-[#2563eb]' : 'bg-[#e2e8f0] dark:bg-slate-600'}`}>
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
      <span className="text-sm text-[#0f172a] dark:text-slate-200">{label}</span>
    </button>
  );
}

const inputCls = 'w-full border border-[#e2e8f0] dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-[#0f172a] dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/10 transition-all';

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({ store, setField, setProdType }: any) {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Тип изделия */}
      <div>
        <SectionTitle>Тип изделия</SectionTitle>
        <div className="flex rounded-xl border border-[#e2e8f0] dark:border-slate-600 overflow-hidden">
          {(['window', 'door'] as ProdType[]).map((type) => (
            <button key={type} type="button" onClick={() => setProdType(type)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${store.prodType === type ? 'bg-[#2563eb] text-white' : 'bg-white dark:bg-slate-800 text-[#64748b] dark:text-slate-400 hover:bg-[#f1f5f9] dark:hover:bg-slate-700'}`}>
              {type === 'window' ? '🪟 Окно' : '🚪 Дверь'}
            </button>
          ))}
        </div>
      </div>

      {/* Форма */}
      <div>
        <SectionTitle>Выберите форму</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          {SHAPE_OPTIONS[store.prodType].map((sh) => {
            const active = store.shape === sh;
            return (
              <button key={sh} type="button" onClick={() => setField('shape', sh as ShapeType)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  active
                    ? 'border-[#2563eb] bg-[#eff6ff] dark:bg-blue-900/20'
                    : 'border-[#e2e8f0] dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-[#94a3b8]'
                }`}>
                <ShapePreview shape={sh as ShapeType} prodType={store.prodType} active={active} />
                <span className={`text-[11px] font-semibold ${active ? 'text-[#2563eb]' : 'text-[#64748b] dark:text-slate-400'}`}>
                  {SHAPE_LABELS[sh as ShapeType]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Step2({ store, setField }: any) {
  const area = ((store.width / 100) * (store.height / 100)).toFixed(2);
  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <div>
        <SectionTitle>Ширина (см)</SectionTitle>
        <div className="flex items-center gap-3">
          <input type="range" min={10} max={600} value={store.width}
            onChange={(e) => setField('width', parseInt(e.target.value))}
            className="flex-1 accent-[#2563eb]" />
          <input type="number" value={store.width} min={10} max={600}
            onChange={(e) => setField('width', Math.max(10, Math.min(600, parseInt(e.target.value) || 10)))}
            className={`${inputCls} w-20 text-center`} />
        </div>
      </div>
      <div>
        <SectionTitle>Высота (см)</SectionTitle>
        <div className="flex items-center gap-3">
          <input type="range" min={10} max={600} value={store.height}
            onChange={(e) => setField('height', parseInt(e.target.value))}
            className="flex-1 accent-[#2563eb]" />
          <input type="number" value={store.height} min={10} max={600}
            onChange={(e) => setField('height', Math.max(10, Math.min(600, parseInt(e.target.value) || 10)))}
            className={`${inputCls} w-20 text-center`} />
        </div>
      </div>
      <div className="bg-[#f8fafc] dark:bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-[#64748b] dark:text-slate-400">Площадь</span>
        <span className="text-sm font-bold text-[#0f172a] dark:text-slate-100">{area} м²</span>
      </div>
      <div>
        <SectionTitle>Быстрый выбор</SectionTitle>
        <div className="grid grid-cols-3 gap-1.5">
          {[['60×90','60','90'],['80×120','80','120'],['100×150','100','150'],['120×180','120','180'],['150×200','150','200'],['200×250','200','250']].map(([label,w,h]) => (
            <button key={label} type="button"
              onClick={() => { setField('width', parseInt(w)); setField('height', parseInt(h)); }}
              className={`py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${
                store.width === parseInt(w) && store.height === parseInt(h)
                  ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb] dark:bg-blue-900/20'
                  : 'border-[#e2e8f0] dark:border-slate-600 text-[#64748b] dark:text-slate-400 hover:border-[#94a3b8] bg-white dark:bg-slate-800'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3({ store, setField }: any) {
  const materials: { value: Material; label: string; desc: string }[] = [
    { value: 'pvc',    label: 'ПВХ',     desc: 'Прозрачный' },
    { value: 'screen', label: 'Сетка',   desc: 'Москитная' },
    { value: 'oxford', label: 'Оксфорд', desc: 'Непрозрачный' },
    { value: 'fabric', label: 'Ткань',   desc: 'Тканевая' },
  ];
  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <div>
        <SectionTitle>Материал</SectionTitle>
        <div className="flex flex-col gap-2">
          {materials.map((m) => (
            <button key={m.value} type="button" onClick={() => setField('material', m.value)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                store.material === m.value
                  ? 'border-[#2563eb] bg-[#eff6ff] dark:bg-blue-900/20'
                  : 'border-[#e2e8f0] dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-[#94a3b8]'
              }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${store.material === m.value ? 'bg-[#2563eb]' : 'bg-[#f1f5f9] dark:bg-slate-700'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="13" rx="2" stroke={store.material === m.value ? 'white' : '#94a3b8'} strokeWidth="2" />
                  <path d="M8 20h8M12 16v4" stroke={store.material === m.value ? 'white' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className={`text-sm font-semibold ${store.material === m.value ? 'text-[#2563eb]' : 'text-[#0f172a] dark:text-slate-100'}`}>{m.label}</p>
                <p className="text-[11px] text-[#94a3b8] dark:text-slate-500">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>Цвет окантовки</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {FRAME_COLORS.map((fc) => (
            <button key={fc.value} type="button" onClick={() => setField('color', fc.value as FrameColor)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                store.color === fc.value
                  ? 'border-[#2563eb] bg-[#eff6ff] dark:bg-blue-900/20'
                  : 'border-[#e2e8f0] dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-[#94a3b8]'
              }`}>
              <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" style={{ backgroundColor: fc.hex }} />
              <span className={`text-[10px] font-medium ${store.color === fc.value ? 'text-[#2563eb]' : 'text-[#64748b] dark:text-slate-400'}`}>{fc.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>Стекло</SectionTitle>
        <div className="flex rounded-xl border border-[#e2e8f0] dark:border-slate-600 overflow-hidden">
          {([['clear', 'Прозрачное', '#aed6f1'], ['tinted', 'Тонированное', '#ede3d1']] as [GlassType, string, string][]).map(([val, label, clr]) => (
            <button key={val} type="button" onClick={() => setField('glass', val)}
              className={`flex-1 flex flex-col items-center py-3 gap-1.5 transition-colors ${store.glass === val ? 'bg-[#2563eb]' : 'bg-white dark:bg-slate-800 hover:bg-[#f1f5f9] dark:hover:bg-slate-700'}`}>
              <div className="w-8 h-6 rounded border border-[#e2e8f0]" style={{ backgroundColor: clr }} />
              <span className={`text-xs font-medium ${store.glass === val ? 'text-white' : 'text-[#64748b] dark:text-slate-400'}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const LOCK_OPTIONS: Record<ProdType, { value: string; label: string; img: string; desc: string }[]> = {
  window: [
    { value: 'Поворотные скобы (пластик)',  label: 'Люверсы',           img: luversSrc, desc: 'Крепление по периметру' },
    { value: 'Французский замок (металл)',  label: 'Французский замок', img: franSrc,   desc: 'Металлический замок'    },
  ],
  door: [
    { value: '1 молния(спираль) по центру + люверсы 10 мм', label: 'Люверсы',           img: luversSrc, desc: '1 молния + люверсы' },
    { value: '2 молнии(спираль) + люверсы 10 мм',           label: 'Французский замок', img: franSrc,   desc: '2 молнии + люверсы' },
  ],
};

function Step4({ store, setField }: any) {
  const [linkedOk, setLinkedOk] = useState(true);
  const [linkedLuv, setLinkedLuv] = useState(true);
  const options = LOCK_OPTIONS[store.prodType as ProdType];

  const isWindow  = store.prodType === 'window';
  const hasZipper = store.openingType.includes('молни');

  // Базовый тип замка для окна (без учёта молнии)
  const baseType: string = isWindow
    ? (store.openingType.includes('замок') || store.openingType === 'Французский замок (металл)'
        ? 'Французский замок (металл)'
        : 'Поворотные скобы (пластик)')
    : store.openingType;

  function setWindowBaseType(val: string) {
    if (!hasZipper) {
      setField('openingType', val);
    } else {
      setField('openingType',
        val === 'Французский замок (металл)'
          ? '1 молния(спираль) + французский замок (низ)'
          : '1 молния(спираль) + поворотная скоба (низ)'
      );
    }
  }

  function toggleWindowZipper(v: boolean) {
    if (v) {
      setField('openingType',
        baseType === 'Французский замок (металл)'
          ? '1 молния(спираль) + французский замок (низ)'
          : '1 молния(спираль) + поворотная скоба (низ)'
      );
    } else {
      setField('openingType', baseType);
    }
  }

  function setOkantovka(side: 'Top' | 'Bottom' | 'Left' | 'Right', val: string) {
    const n = Math.max(0, Math.min(1000, parseInt(val) || 0));
    if (linkedOk) {
      setField('okantovkaTop', n); setField('okantovkaBottom', n);
      setField('okantovkaLeft', n); setField('okantovkaRight', n);
    } else {
      setField(`okantovka${side}` as 'okantovkaTop', n);
    }
  }

  function setLuverSpacing(side: 'Top' | 'Bottom' | 'Left' | 'Right', val: string) {
    const n = Math.max(0, Math.min(1000, parseInt(val) || 0));
    if (linkedLuv) {
      setField('luverSpacing', n);
      setField('luverSpacingTop', n); setField('luverSpacingBottom', n);
      setField('luverSpacingLeft', n); setField('luverSpacingRight', n);
    } else {
      setField(`luverSpacing${side}` as 'luverSpacingTop', n);
    }
    store.resetFittings();
  }
  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <div>
        <SectionTitle>Подвязочный ремень (см)</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-[#94a3b8] dark:text-slate-500 mb-1">Длина&nbsp;<span className="text-[#cbd5e1] dark:text-slate-600">(0 = авто)</span></p>
            <input type="number" value={store.remenLength} min={0} max={300} step={1}
              onChange={(e) => setField('remenLength', Math.max(0, parseFloat(e.target.value) || 0))}
              className={inputCls} />
          </div>
          <div>
            <p className="text-[10px] text-[#94a3b8] dark:text-slate-500 mb-1">Ширина&nbsp;<span className="text-[#cbd5e1] dark:text-slate-600">(0 = авто)</span></p>
            <input type="number" value={store.remenWidth} min={0} max={50} step={0.5}
              onChange={(e) => setField('remenWidth', Math.max(0, parseFloat(e.target.value) || 0))}
              className={inputCls} />
          </div>
        </div>
      </div>
      <div>
        <SectionTitle>Замки</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt) => {
            const active = isWindow ? baseType === opt.value : store.openingType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => isWindow ? setWindowBaseType(opt.value) : setField('openingType', opt.value)}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all ${
                  active
                    ? 'border-[#2563eb] bg-[#eff6ff] dark:bg-blue-900/20'
                    : 'border-[#e2e8f0] dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-[#94a3b8]'
                }`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-[#dbeafe] dark:bg-blue-900/30' : 'bg-[#f1f5f9] dark:bg-slate-700'}`}>
                  <img src={opt.img} alt={opt.label} className="w-9 h-9 object-contain" />
                </div>
                <div className="text-center">
                  <p className={`text-xs font-semibold leading-tight ${active ? 'text-[#2563eb]' : 'text-[#0f172a] dark:text-slate-100'}`}>{opt.label}</p>
                  <p className="text-[10px] text-[#94a3b8] dark:text-slate-500 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionTitle>Окантовка (мм)</SectionTitle>
          <button type="button" onClick={() => setLinkedOk(v => !v)}
            className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${linkedOk ? 'bg-[#2563eb]' : 'bg-[#e2e8f0] dark:bg-slate-600'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${linkedOk ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
        {linkedOk ? (
          <input type="number" value={store.okantovkaTop} min={0} max={1000}
            onChange={(e) => setOkantovka('Top', e.target.value)} className={inputCls} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(['Top','Bottom','Left','Right'] as const).map((side) => (
              <div key={side}>
                <p className="text-[10px] text-[#94a3b8] mb-1">{side === 'Top' ? 'Верх' : side === 'Bottom' ? 'Низ' : side === 'Left' ? 'Лево' : 'Право'}</p>
                <input type="number" value={store[`okantovka${side}`]} min={0} max={1000}
                  onChange={(e) => setOkantovka(side, e.target.value)} className={inputCls} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionTitle>Шаг люверсов (мм)</SectionTitle>
          <button type="button" onClick={() => setLinkedLuv(v => !v)}
            className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${linkedLuv ? 'bg-[#2563eb]' : 'bg-[#e2e8f0] dark:bg-slate-600'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${linkedLuv ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
        {linkedLuv ? (
          <input type="number" value={store.luverSpacingTop} min={0} max={1000} step={10}
            onChange={(e) => setLuverSpacing('Top', e.target.value)} className={inputCls} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(['Top', 'Bottom', 'Left', 'Right'] as const).map((side) => (
              <div key={side}>
                <p className="text-[10px] text-[#94a3b8] mb-1">
                  {side === 'Top' ? 'Верх' : side === 'Bottom' ? 'Низ' : side === 'Left' ? 'Лево' : 'Право'}
                </p>
                <input type="number" value={store[`luverSpacing${side}`]} min={0} max={1000} step={10}
                  onChange={(e) => setLuverSpacing(side, e.target.value)} className={inputCls} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <SectionTitle>Опции</SectionTitle>
        <Toggle checked={store.install} onChange={(v) => setField('install', v)} label="Монтаж" />
        {isWindow && (
          <Toggle checked={hasZipper} onChange={toggleWindowZipper} label="Добавить молнию" />
        )}
      </div>
    </div>
  );
}

function Step5({ store, setField }: any) {
  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <div>
        <SectionTitle>Дополнительный замок</SectionTitle>
        <div className="flex flex-col gap-1.5 mb-3">
          {([['none','Без замка'],['rotary','Поворотная скоба'],['french','Французский замок']] as [ExtraLockType, string][]).map(([val, label]) => (
            <button key={val} type="button" onClick={() => setField('extraLockType', val)}
              className={`text-left px-3 py-2 rounded-xl border-2 text-sm transition-all ${
                store.extraLockType === val
                  ? 'border-[#2563eb] bg-[#eff6ff] dark:bg-blue-900/20 text-[#2563eb] font-medium'
                  : 'border-[#e2e8f0] dark:border-slate-600 bg-white dark:bg-slate-800 text-[#475569] dark:text-slate-300 hover:border-[#94a3b8]'
              }`}>
              {label}
            </button>
          ))}
        </div>
        {store.extraLockType !== 'none' && (
          <div>
            <p className="text-xs text-[#64748b] dark:text-slate-400 mb-1">Количество</p>
            <input type="number" value={store.extraLockCount} min={1} max={20}
              onChange={(e) => setField('extraLockCount', Math.max(1, parseInt(e.target.value) || 1))}
              className={inputCls} />
          </div>
        )}
      </div>
      <div>
        <SectionTitle>Дополнительная молния</SectionTitle>
        <div className="flex flex-col gap-1.5 mb-3">
          {([['none','Без молнии'],['spiral','Спиральная'],['tractor','Тракторная']] as [ExtraZipperType, string][]).map(([val, label]) => (
            <button key={val} type="button" onClick={() => setField('extraZipperType', val)}
              className={`text-left px-3 py-2 rounded-xl border-2 text-sm transition-all ${
                store.extraZipperType === val
                  ? 'border-[#2563eb] bg-[#eff6ff] dark:bg-blue-900/20 text-[#2563eb] font-medium'
                  : 'border-[#e2e8f0] dark:border-slate-600 bg-white dark:bg-slate-800 text-[#475569] dark:text-slate-300 hover:border-[#94a3b8]'
              }`}>
              {label}
            </button>
          ))}
        </div>
        {store.extraZipperType !== 'none' && (
          <div>
            <p className="text-xs text-[#64748b] dark:text-slate-400 mb-1">Длина (см)</p>
            <input type="number" value={store.extraZipperLen} min={1} max={2000}
              onChange={(e) => setField('extraZipperLen', Math.max(1, parseInt(e.target.value) || 1))}
              className={inputCls} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ParamsPanel() {
  const [step, setStep] = useState(1);
  const store = useConstructorStore();
  const { setField } = store;

  function setProdType(type: ProdType) {
    setField('prodType', type);
    setField('openingType', OPENING_OPTIONS[type][0]);
    if (!SHAPE_OPTIONS[type].includes(store.shape)) setField('shape', 'rect');
  }

  const stepContent = [
    <Step1 store={store} setField={setField} setProdType={setProdType} />,
    <Step3 store={store} setField={setField} />,
    <Step2 store={store} setField={setField} />,
    <Step4 store={store} setField={setField} />,
  ];

  return (
    <div className="flex flex-col h-full">
      <StepBar step={step} onGo={setStep} />

      <div className="flex-1 overflow-y-auto">
        {stepContent[step - 1]}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0] dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#64748b] dark:text-slate-400 hover:bg-[#f1f5f9] dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Назад
        </button>

        <span className="text-xs text-[#94a3b8] dark:text-slate-500 font-medium">{step} / {STEPS.length}</span>

        {step < STEPS.length ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white transition-colors"
          >
            Далее
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#059669] hover:bg-[#047857] text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Готово
          </button>
        )}
      </div>
    </div>
  );
}
