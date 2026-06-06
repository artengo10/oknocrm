import { useState, useRef, useEffect } from 'react';
import { useTableStore, type TableRow } from '../../store/tableStore';
import { useOrdersStore } from '../../store/ordersStore';
import { useConstructorStore, type ShapeType } from '../../store/constructorStore';
import { calculateCost, type CalcPrices, type ProdType, type Material, type GlassType, type ExtraLockType, type ExtraZipperType, type FrameColor } from '../../lib/calculator';
import { useSettingsStore } from '../../store/settingsStore';

// ─── translation maps ─────────────────────────────────────────────────────────

const PROD_RU: Record<string, string> = { window: 'Мягкое окно', door: 'Мягкая дверь' };
const MAT_RU: Record<string, string> = { pvc: 'ПВХ', screen: 'Сетка', oxford: 'Оксфорд', fabric: 'Ткань' };
const COLOR_RU: Record<string, string> = {
  brown: 'Коричневый', white: 'Белый', gray: 'Серый',
  beige: 'Бежевый', black: 'Чёрный', blue: 'Синий',
};
const GLASS_RU: Record<string, string> = { clear: 'Прозрачное', tinted: 'Тонированное' };
const LOCK_RU: Record<string, string> = { none: '—', rotary: 'Скоба', french: 'Фр. замок' };
const ZIP_RU: Record<string, string> = { none: '—', spiral: 'Спираль', tractor: 'Трактор' };

const OPENING_OPTIONS: Record<string, string[]> = {
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
    '2 молнии(спираль) + французский замок (низ)',
    '2 молнии(спираль) + поворотная скоба (низ)',
    '2 молнии(трактор) + французский замок (низ)',
    '2 молнии(трактор) + поворотная скоба (низ)',
  ],
};

function ru<T extends Record<string, string>>(map: T, val: string): string {
  return map[val] ?? val;
}

// ─── column definitions ───────────────────────────────────────────────────────

const COLS: { key: keyof TableRow | 'idx'; label: string; w: number }[] = [
  { key: 'idx',            label: '№',              w: 44  },
  { key: 'prodType',       label: 'Изделие',        w: 128 },
  { key: 'size',           label: 'Размер',         w: 100 },
  { key: 'mat',            label: 'Материал',       w: 96  },
  { key: 'color',          label: 'Цвет',           w: 118 },
  { key: 'glass',          label: 'Стекло',         w: 116 },
  { key: 'opening',        label: 'Открывание',     w: 240 },
  { key: 'moskit',         label: 'Москитка',       w: 88  },
  { key: 'pocket',         label: 'Юбка',           w: 70  },
  { key: 'install',        label: 'Монтаж',         w: 82  },
  { key: 'extraLockType',  label: 'Доп.замки',      w: 110 },
  { key: 'extraLockCount', label: 'Кол-во',         w: 70  },
  { key: 'extraZipperType',label: 'Молния',         w: 96  },
  { key: 'extraZipperLen', label: 'Дл.молн.',       w: 84  },
  { key: 'materialCost',   label: 'Мат.₽',          w: 96  },
  { key: 'fittingsCost',   label: 'Фурн.₽',         w: 96  },
  { key: 'moskitCost',     label: 'Москит.₽',       w: 98  },
  { key: 'pocketCost',     label: 'Юбка₽',          w: 84  },
  { key: 'extraLockCost',  label: 'Замки₽',         w: 84  },
  { key: 'extraZipperCost',label: 'Мол.₽',          w: 80  },
  { key: 'glassSurcharge', label: 'Тонир.₽',        w: 90  },
  { key: 'installCost',    label: 'Монт.₽',         w: 84  },
  { key: 'extraWorkPrice', label: 'Доп.₽',          w: 84  },
  { key: 'extraWorkDesc',  label: 'Описание',       w: 174 },
  { key: 'price',          label: 'Цена',           w: 110 },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (!n && n !== 0) return '';
  return Math.round(n).toLocaleString('ru-RU') + ' ₽';
}

function cellView(key: keyof TableRow | 'idx', row: TableRow, idx: number): string {
  if (key === 'idx') return String(idx + 1);
  const v = (row as Record<string, unknown>)[key as string];
  switch (key) {
    case 'prodType':       return ru(PROD_RU, v as string);
    case 'mat':            return ru(MAT_RU, v as string);
    case 'color':          return ru(COLOR_RU, v as string);
    case 'glass':          return ru(GLASS_RU, v as string);
    case 'moskit':
    case 'pocket':
    case 'install':        return (v as boolean) ? 'Да' : 'Нет';
    case 'extraLockType':  return ru(LOCK_RU, v as string);
    case 'extraZipperType':return ru(ZIP_RU, v as string);
    case 'extraLockCount':
    case 'extraZipperLen': return (v as number) > 0 ? String(v) : '';
    case 'materialCost':
    case 'fittingsCost':
    case 'moskitCost':
    case 'pocketCost':
    case 'extraLockCost':
    case 'extraZipperCost':
    case 'glassSurcharge':
    case 'installCost':
    case 'extraWorkPrice': return fmtPrice(v as number);
    case 'price':          return fmtPrice(v as number);
    default:               return v == null ? '' : String(v);
  }
}

function recalcRow(row: TableRow, prices: CalcPrices): TableRow {
  const parts = row.size.split('×');
  const h = parseFloat(parts[0] ?? '') || 100;
  const w = parseFloat(parts[1] ?? '') || 100;
  const result = calculateCost({
    prodType: row.prodType as ProdType,
    width: w, height: h,
    material: row.mat as Material,
    glass: row.glass as GlassType,
    openingType: row.opening,
    moskit: row.moskit,
    pocket: row.pocket,
    install: row.install,
    extraLockType: row.extraLockType as ExtraLockType,
    extraLockCount: row.extraLockCount,
    extraZipperType: row.extraZipperType as ExtraZipperType,
    extraZipperLen: row.extraZipperLen,
    extraWorkPrice: row.extraWorkPrice,
  }, prices);
  return {
    ...row,
    materialCost:    result.materialCost,
    fittingsCost:    result.fittingsCost,
    moskitCost:      result.moskitCost,
    pocketCost:      result.pocketCost,
    extraLockCost:   result.extraLockCost,
    extraZipperCost: result.extraZipperCost,
    glassSurcharge:  result.glassSurcharge,
    installCost:     result.installCost,
    extraWorkPrice:  result.extraWorkPrice,
    price:           result.finalTotal,
  };
}

// ─── TXT export ───────────────────────────────────────────────────────────────

function exportTxt(rows: TableRow[], orderNum?: number) {
  let txt = 'ЗАКАЗ\n\n';
  txt += 'Состав заказа:\n\n';

  rows.forEach((row, i) => {
    const lines: string[] = [];
    lines.push(`${i + 1}. ${ru(PROD_RU, row.prodType)}`);
    if (row.mat)    lines.push(`Материал: ${ru(MAT_RU, row.mat)}`);
    if (row.color)  lines.push(`Цвет окантовки: ${ru(COLOR_RU, row.color)}`);
    if (row.glass)  lines.push(`Стекло: ${ru(GLASS_RU, row.glass)}`);
    if (row.opening) lines.push(`Открывание: ${row.opening}`);
    if (row.size)   lines.push(`Размеры: ${row.size.replace('×', ' x ')} см`);
    if (row.materialCost)    lines.push(`Материал (₽): ${row.materialCost.toFixed(2)} ₽`);
    if (row.fittingsCost)    lines.push(`Фурнитура (₽): ${row.fittingsCost.toFixed(2)} ₽`);
    if (row.moskitCost)      lines.push(`Москитная сетка (₽): ${row.moskitCost.toFixed(2)} ₽`);
    if (row.pocketCost)      lines.push(`Юбка (₽): ${row.pocketCost.toFixed(2)} ₽`);
    if (row.extraLockType && row.extraLockType !== 'none') {
      const cnt = row.extraLockCount > 0 ? ` (${row.extraLockCount} шт.)` : '';
      lines.push(`Доп. замки: ${ru(LOCK_RU, row.extraLockType)}${cnt}`);
    }
    if (row.extraLockCost)    lines.push(`Замки (₽): ${row.extraLockCost.toFixed(2)} ₽`);
    if (row.extraZipperType && row.extraZipperType !== 'none') {
      const len = row.extraZipperLen > 0 ? ` (${row.extraZipperLen} см)` : '';
      lines.push(`Доп. молния: ${ru(ZIP_RU, row.extraZipperType)}${len}`);
    }
    if (row.extraZipperCost)  lines.push(`Молния (₽): ${row.extraZipperCost.toFixed(2)} ₽`);
    if (row.glassSurcharge)   lines.push(`Тонировка (₽): ${row.glassSurcharge.toFixed(2)} ₽`);
    if (row.installCost)      lines.push(`Монтаж (₽): ${row.installCost.toFixed(2)} ₽`);
    if (row.extraWorkPrice)   lines.push(`Доп. работы (₽): ${row.extraWorkPrice.toFixed(2)} ₽`);
    if (row.extraWorkDesc)    lines.push(`Описание: ${row.extraWorkDesc}`);
    lines.push(`Итого: ${row.price.toFixed(2)} ₽`);
    txt += lines.join('\n') + '\n\n';
  });

  const total = rows.reduce((s, r) => s + (r.price || 0), 0);
  txt += `Итого: ${total.toFixed(2)} ₽\n`;

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `order_${orderNum ?? 'new'}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── TXT import ───────────────────────────────────────────────────────────────

function reverseMap(map: Record<string, string>, val: string): string {
  return Object.entries(map).find(([, v]) => v === val)?.[0] ?? '';
}

function importTxt(text: string): TableRow[] {
  const pos = text.indexOf('Состав заказа:');
  if (pos === -1) return [];

  const lines = text.slice(pos + 'Состав заказа:'.length).split('\n');
  const blocks: string[][] = [];
  let cur: string[] = [];

  for (const line of lines) {
    if (/^\s*\d+\.\s/.test(line)) {
      if (cur.length) blocks.push(cur);
      cur = [line];
    } else if (line.trim()) {
      cur.push(line);
    }
  }
  if (cur.length) blocks.push(cur);

  return blocks.map((block): TableRow | null => {
    const row: Partial<TableRow> = {
      id: String(Date.now()) + Math.random(),
      extraWorkPrice: 0, extraWorkDesc: '',
      extraLockType: 'none', extraLockCount: 0,
      extraZipperType: 'none', extraZipperLen: 0,
      moskit: false, pocket: false, install: false,
      materialCost: 0, fittingsCost: 0, moskitCost: 0,
      pocketCost: 0, extraLockCost: 0, extraZipperCost: 0,
      glassSurcharge: 0, installCost: 0, price: 0,
    };

    for (const l of block) {
      const t = l.trim();
      const m = t.match(/^(\d+)\.\s+(.+)/);
      if (m) { row.prodType = reverseMap(PROD_RU, m[2]) || 'window'; continue; }

      if (/^Материал \(₽\):/.test(t))      { row.materialCost    = parseFloat(t.replace(/[^\d.]/g, '')) || 0; }
      else if (/^Материал:/.test(t))         { row.mat = reverseMap(MAT_RU, t.replace(/^Материал:/, '').trim()) || 'pvc'; }
      else if (/^Цвет окантовки:/.test(t))   { row.color = reverseMap(COLOR_RU, t.replace(/^Цвет окантовки:/, '').trim()) || 'brown'; }
      else if (/^Стекло:/.test(t))           { row.glass = reverseMap(GLASS_RU, t.replace(/^Стекло:/, '').trim()) || 'clear'; }
      else if (/^Открывание:/.test(t))       { row.opening = t.replace(/^Открывание:/, '').trim(); }
      else if (/^Размеры:/.test(t))          { row.size = t.replace(/^Размеры:/, '').replace(/см$/i, '').trim().replace(' x ', '×'); }
      else if (/^Фурнитура \(₽\):/.test(t))  { row.fittingsCost   = parseFloat(t.replace(/[^\d.]/g, '')) || 0; }
      else if (/^Москитная сетка \(₽\):/.test(t)) { row.moskitCost = parseFloat(t.replace(/[^\d.]/g, '')) || 0; }
      else if (/^Юбка \(₽\):/.test(t))       { row.pocketCost     = parseFloat(t.replace(/[^\d.]/g, '')) || 0; }
      else if (/^Доп\. замки:/.test(t)) {
        const content = t.replace(/^Доп\. замки:/, '').trim();
        const cnt = content.match(/\((\d+)\s*шт\.\)/);
        row.extraLockCount = cnt ? parseInt(cnt[1]) : 1;
        const name = content.replace(/\(.*?\)/, '').trim();
        row.extraLockType = reverseMap(LOCK_RU, name) || 'none';
      }
      else if (/^Замки \(₽\):/.test(t))      { row.extraLockCost   = parseFloat(t.replace(/[^\d.]/g, '')) || 0; }
      else if (/^Доп\. молния:/.test(t)) {
        const content = t.replace(/^Доп\. молния:/, '').trim();
        const len = content.match(/\((\d+)\s*см\)/);
        row.extraZipperLen = len ? parseInt(len[1]) : 0;
        const name = content.replace(/\(.*?\)/, '').trim();
        row.extraZipperType = reverseMap(ZIP_RU, name) || 'none';
      }
      else if (/^Молния \(₽\):/.test(t))     { row.extraZipperCost = parseFloat(t.replace(/[^\d.]/g, '')) || 0; }
      else if (/^Тонировка \(₽\):/.test(t))  { row.glassSurcharge  = parseFloat(t.replace(/[^\d.]/g, '')) || 0; }
      else if (/^Монтаж \(₽\):/.test(t))     { row.installCost     = parseFloat(t.replace(/[^\d.]/g, '')) || 0; }
      else if (/^Доп\. работы \(₽\):/.test(t)){ row.extraWorkPrice = parseFloat(t.replace(/[^\d.]/g, '')) || 0; }
      else if (/^Описание:/.test(t))          { row.extraWorkDesc   = t.replace(/^Описание:/, '').trim(); }
      else if (/^Итого:/.test(t))             { row.price           = parseFloat(t.replace(/[^\d.]/g, '')) || 0; }
    }

    if (!row.prodType) return null;
    row.shape = row.shape ?? 'rect';
    row.size  = row.size  ?? '100×100';
    row.color = row.color ?? 'brown';
    return row as TableRow;
  }).filter(Boolean) as TableRow[];
}

// ─── edit cell ────────────────────────────────────────────────────────────────

function EditCell({
  col, row, onChange,
}: {
  col: typeof COLS[number];
  row: TableRow;
  onChange: (field: keyof TableRow, val: unknown) => void;
}) {
  const key = col.key as keyof TableRow;
  const v = (row as Record<string, unknown>)[key as string];

  const cls = 'w-full text-[10px] px-1 py-0.5 rounded border border-[#e2e8f0] dark:border-slate-600 bg-white dark:bg-slate-800 text-[#0f172a] dark:text-slate-100 outline-none focus:border-[#2563eb]';

  if (key === 'prodType') return (
    <select className={cls} value={v as string} onChange={(e) => onChange(key, e.target.value)}>
      {Object.entries(PROD_RU).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
    </select>
  );
  if (key === 'mat') return (
    <select className={cls} value={v as string} onChange={(e) => onChange(key, e.target.value)}>
      {Object.entries(MAT_RU).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
    </select>
  );
  if (key === 'color') return (
    <select className={cls} value={v as string} onChange={(e) => onChange(key, e.target.value)}>
      {Object.entries(COLOR_RU).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
    </select>
  );
  if (key === 'glass') return (
    <select className={cls} value={v as string} onChange={(e) => onChange(key, e.target.value)}>
      {Object.entries(GLASS_RU).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
    </select>
  );
  if (key === 'opening') return (
    <select className={cls} value={v as string} onChange={(e) => onChange(key, e.target.value)}>
      {(OPENING_OPTIONS[row.prodType] ?? OPENING_OPTIONS.window).map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
  if (key === 'moskit' || key === 'pocket' || key === 'install') return (
    <select className={cls} value={(v as boolean) ? 'yes' : 'no'} onChange={(e) => onChange(key, e.target.value === 'yes')}>
      <option value="yes">Да</option>
      <option value="no">Нет</option>
    </select>
  );
  if (key === 'extraLockType') return (
    <select className={cls} value={v as string} onChange={(e) => onChange(key, e.target.value)}>
      {Object.entries(LOCK_RU).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
    </select>
  );
  if (key === 'extraZipperType') return (
    <select className={cls} value={v as string} onChange={(e) => onChange(key, e.target.value)}>
      {Object.entries(ZIP_RU).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
    </select>
  );
  if (key === 'extraLockCount' || key === 'extraZipperLen' || key === 'extraWorkPrice') return (
    <input
      type="number" min={0} className={cls}
      value={(v as number) || ''}
      onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
    />
  );
  // auto-calculated cost columns — read-only in edit mode
  if (['materialCost','fittingsCost','moskitCost','pocketCost','extraLockCost',
       'extraZipperCost','glassSurcharge','installCost','price'].includes(key as string)) {
    return <span className="text-[13px] text-[#94a3b8] tabular-nums">{fmtPrice(v as number)}</span>;
  }
  // size, extraWorkDesc, shape — free text
  return (
    <input
      type="text" className={cls}
      value={(v as string) ?? ''}
      onChange={(e) => onChange(key, e.target.value)}
    />
  );
}

// stable fallback — must be outside component to keep reference identity
const EMPTY_ROWS: TableRow[] = [];

// ─── main component ───────────────────────────────────────────────────────────

export function OrderTable() {
  const prices = useSettingsStore((s) => s.prices);
  const [editMode, setEditMode] = useState(false);
  const [editRows, setEditRows] = useState<TableRow[]>([]);
  const [addFlash, setAddFlash] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { activeOrderId, orders } = useOrdersStore();
  const { addRow, removeRow, updateRows } = useTableStore();
  const savedRows = useTableStore((s) => s.rows[activeOrderId ?? ''] ?? EMPTY_ROWS);
  const constructor = useConstructorStore();

  const activeOrder = orders.find((o) => o.id === activeOrderId) ?? null;

  // reset on order change
  useEffect(() => { setEditMode(false); setActiveRowId(null); }, [activeOrderId]);

  const rows = editMode ? editRows : savedRows;
  const total = rows.reduce((s, r) => s + (r.price || 0), 0);

  // ── add row from constructor ─────────────────────────────────────────────────
  function handleAdd() {
    if (!activeOrderId) return;
    const input = constructor.toCalcInput();
    const result = calculateCost(input, prices);
    const row: TableRow = {
      id: String(Date.now()) + Math.random(),
      prodType:        input.prodType,
      shape:           constructor.shape,
      size:            `${input.height}×${input.width}`,
      mat:             input.material,
      color:           constructor.color,
      glass:           input.glass,
      opening:         input.openingType,
      moskit:          input.moskit,
      pocket:          input.pocket,
      install:         input.install,
      extraLockType:   input.extraLockType,
      extraLockCount:  input.extraLockCount,
      extraZipperType: input.extraZipperType,
      extraZipperLen:  input.extraZipperLen,
      materialCost:    result.materialCost,
      fittingsCost:    result.fittingsCost,
      moskitCost:      result.moskitCost,
      pocketCost:      result.pocketCost,
      extraLockCost:   result.extraLockCost,
      extraZipperCost: result.extraZipperCost,
      glassSurcharge:  result.glassSurcharge,
      installCost:     result.installCost,
      extraWorkPrice:  result.extraWorkPrice,
      extraWorkDesc:   '',
      price:           result.finalTotal,
    };
    addRow(activeOrderId, row);
    setAddFlash(true);
    setTimeout(() => setAddFlash(false), 1200);
  }

  // ── edit mode ────────────────────────────────────────────────────────────────
  function enterEdit() {
    setEditRows([...savedRows]);
    setEditMode(true);
  }

  function updateEditRow(rowId: string, field: keyof TableRow, val: unknown) {
    setEditRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [field]: val };
        return recalcRow(updated, prices);
      });
      return next;
    });
  }

  function saveEdit() {
    if (!activeOrderId) return;
    updateRows(activeOrderId, editRows);
    setEditMode(false);
    // sync active row back to constructor so visualizer + steps update
    const updated = activeRowId ? editRows.find(r => r.id === activeRowId) : editRows[0];
    if (updated) loadRowToConstructor(updated);
  }

  function cancelEdit() { setEditMode(false); }

  function loadRowToConstructor(row: TableRow) {
    const parts = row.size.split('×');
    const h = parseFloat(parts[0]) || 100;
    const w = parseFloat(parts[1]) || 100;
    const sf = constructor.setField;
    sf('prodType', row.prodType as ProdType);
    sf('shape',    row.shape    as ShapeType);
    sf('height',   h);
    sf('width',    w);
    sf('material', row.mat      as Material);
    sf('color',    row.color    as FrameColor);
    sf('glass',    row.glass    as GlassType);
    sf('openingType',     row.opening);
    sf('moskit',          row.moskit);
    sf('pocket',          row.pocket);
    sf('install',         row.install);
    sf('extraLockType',   row.extraLockType   as ExtraLockType);
    sf('extraLockCount',  row.extraLockCount);
    sf('extraZipperType', row.extraZipperType as ExtraZipperType);
    sf('extraZipperLen',  row.extraZipperLen);
    sf('extraWorkPrice',  row.extraWorkPrice);
    setActiveRowId(row.id);
  }

  function deleteRow(rowId: string) {
    if (editMode) {
      setEditRows((prev) => prev.filter((r) => r.id !== rowId));
    } else if (activeOrderId) {
      removeRow(activeOrderId, rowId);
    }
  }

  // ── TXT import ───────────────────────────────────────────────────────────────
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeOrderId) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const imported = importTxt(text);
      if (!imported.length) { alert('Позиции не найдены в файле'); return; }
      updateRows(activeOrderId, imported);
      alert(`Импортировано позиций: ${imported.length}`);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  // ─────────────────────────────────────────────────────────────────────────────

  function handleScrollDragStart(e: React.MouseEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el) return;
    const startX = e.clientX;
    const startLeft = el.scrollLeft;
    function onMove(ev: MouseEvent) {
      el.scrollLeft = startLeft - (ev.clientX - startX) * 2.2;
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const colsWithDelete = [...COLS];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-t border-[#e2e8f0] dark:border-slate-700">

      {/* toolbar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#e2e8f0] dark:border-slate-700 flex-shrink-0 flex-wrap">
        <span className="text-sm font-semibold text-[#0f172a] dark:text-slate-100 mr-1">
          Состав заказа
          {activeOrder && (
            <span className="ml-1.5 text-[#94a3b8] dark:text-slate-500 font-normal">
              №{activeOrder.orderNum}
            </span>
          )}
        </span>

        <button
          onClick={handleAdd}
          disabled={!activeOrderId}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            addFlash
              ? 'bg-[#059669] text-white'
              : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-30 disabled:cursor-not-allowed'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          {addFlash ? 'Добавлено!' : 'Добавить позицию'}
        </button>

        <div className="flex items-center gap-2 ml-auto">
          {!editMode ? (
            <button
              onClick={enterEdit}
              disabled={savedRows.length === 0}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Редактировать
            </button>
          ) : (
            <>
              <button
                onClick={saveEdit}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#059669] text-white hover:bg-[#047857] transition-colors"
              >
                Сохранить
              </button>
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-[#e2e8f0] dark:border-slate-600 text-[#64748b] dark:text-slate-400 hover:bg-[#f1f5f9] dark:hover:bg-slate-800 transition-colors"
              >
                Отмена
              </button>
            </>
          )}

          <button
            onClick={() => exportTxt(savedRows, activeOrder?.orderNum)}
            disabled={savedRows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 16l-4-4h3V4h2v8h3l-4 4z" fill="currentColor"/>
              <path d="M4 20h16v-2H4v2z" fill="currentColor"/>
            </svg>
            Экспорт TXT
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            disabled={!activeOrderId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 8l4 4h-3v8h-2v-8H8l4-4z" fill="currentColor"/>
              <path d="M4 4h16v2H4V4z" fill="currentColor"/>
            </svg>
            Импорт TXT
          </button>
          <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* table */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto min-h-0"
        style={{ cursor: 'grab' }}
        onMouseDown={handleScrollDragStart}
      >
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[#94a3b8] dark:text-slate-600">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 9h18M9 9v12M3 15h18" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <p className="text-xs">
              {activeOrderId ? 'Нажмите «Добавить позицию» чтобы заполнить таблицу' : 'Выберите заказ'}
            </p>
          </div>
        ) : (
          <table className="text-[13px] border-collapse" style={{ minWidth: colsWithDelete.reduce((s, c) => s + c.w, 0) + 40 }}>
            <thead className="sticky top-0 z-10">
              <tr>
                {colsWithDelete.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.w, minWidth: col.w }}
                    className="px-2.5 py-2 text-left bg-[#f1f5f9] dark:bg-slate-800 text-[#64748b] dark:text-slate-400 font-semibold border border-[#e2e8f0] dark:border-slate-700 whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
                <th
                  style={{ width: 36, minWidth: 36 }}
                  className="px-1 py-2 bg-[#f1f5f9] dark:bg-slate-800 border border-[#e2e8f0] dark:border-slate-700"
                />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  onClick={() => !editMode && loadRowToConstructor(row)}
                  className={`group transition-colors ${
                    !editMode ? 'cursor-pointer' : ''
                  } ${
                    activeRowId === row.id
                      ? 'bg-[#eff6ff] dark:bg-blue-900/20'
                      : 'hover:bg-[#f8fafc] dark:hover:bg-slate-800/50'
                  }`}
                >
                  {colsWithDelete.map((col) => (
                    <td
                      key={col.key}
                      style={{ width: col.w, minWidth: col.w }}
                      className={`px-2.5 py-1.5 border border-[#e2e8f0] dark:border-slate-700 whitespace-nowrap overflow-hidden text-ellipsis align-middle ${
                        col.key === 'price' ? 'font-semibold text-[#2563eb] dark:text-blue-400' : 'text-[#334155] dark:text-slate-300'
                      } ${col.key === 'idx' ? 'text-center text-[#94a3b8] dark:text-slate-500' : ''}`}
                    >
                      {editMode && col.key !== 'idx' ? (
                        <EditCell
                          col={col}
                          row={row}
                          onChange={(field, val) => updateEditRow(row.id, field, val)}
                        />
                      ) : (
                        cellView(col.key, row, idx)
                      )}
                    </td>
                  ))}
                  <td className="border border-[#e2e8f0] dark:border-slate-700 text-center align-middle px-1">
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="w-5 h-5 rounded flex items-center justify-center text-[#94a3b8] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                      title="Удалить строку"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#f8fafc] dark:bg-slate-800/60">
                <td
                  colSpan={colsWithDelete.length}
                  className="px-3 py-1.5 text-right text-[11px] font-semibold text-[#0f172a] dark:text-slate-100 border border-[#e2e8f0] dark:border-slate-700"
                >
                  Общая стоимость:
                </td>
                <td className="px-2 py-1.5 text-[11px] font-bold text-[#2563eb] dark:text-blue-400 border border-[#e2e8f0] dark:border-slate-700 whitespace-nowrap tabular-nums">
                  {fmtPrice(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
