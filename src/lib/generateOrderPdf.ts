import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { TableRow } from '../store/tableStore';
import { buildWindowSvg } from './windowSvg';
import remenUrl from '../assets/remen.png';
import franUrl from '../assets/fran.png';
import luversUrl from '../assets/luvers.svg';

// ─── translation maps ─────────────────────────────────────────────────────────
const MAT_RU: Record<string, string> = { pvc: 'ПВХ 750 мкм', screen: 'Сетка', oxford: 'Оксфорд', fabric: 'Ткань' };
const COLOR_RU: Record<string, string> = {
  brown: 'Коричневый', white: 'Белый', gray: 'Серый',
  beige: 'Бежевый', black: 'Чёрный', blue: 'Синий',
};
const GLASS_RU: Record<string, string> = { clear: 'Прозрачное', tinted: 'Тонированное' };
const LOCK_RU: Record<string, string> = { rotary: 'Замок-скоба', french: 'Французкий замок' };
const ZIP_RU: Record<string, string> = { spiral: 'Молния спиральная', tractor: 'Молния тракторная' };

function ru<T extends Record<string, string>>(map: T, val: string) { return map[val] ?? val; }
function fmt(n: number) { return Math.round(n).toLocaleString('ru-RU') + ' ₽'; }
function parseSize(size: string): { h: number; w: number } {
  const p = size.split('×');
  return { h: parseFloat(p[0] ?? '0'), w: parseFloat(p[1] ?? '0') };
}

function hasFranLock(opening: string) {
  const o = opening.toLowerCase();
  return o.includes('фран') || o.includes('franc') || o.includes('french');
}
function franLockCount(wCm: number, hCm: number) {
  return Math.round((wCm + 2 * hCm) / 40);
}

// ─── base64 image loader ──────────────────────────────────────────────────────
async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

interface Assets { remen: string; fran: string; luvers: string }

// ─── SVG: material cutting diagram ───────────────────────────────────────────
// Shows outer window size and inner glass size (accounting for okantovka)
function drawCuttingRect(wCm: number, hCm: number, maxPx = 130, row?: TableRow): string {
  const sc = Math.min(maxPx / wCm, maxPx / hCm);
  const rW = Math.round(wCm * sc);
  const rH = Math.round(hCm * sc);
  const DM = 28;

  // Glass inner dimensions
  const okL = (row?.okantovkaLeft   ?? 70) / 10;
  const okR = (row?.okantovkaRight  ?? 70) / 10;
  const okT = (row?.okantovkaTop    ?? 70) / 10;
  const okB = (row?.okantovkaBottom ?? 70) / 10;
  const gW = Math.max(0, wCm - okL - okR);
  const gH = Math.max(0, hCm - okT - okB);
  const gX = Math.round(okL * sc);
  const gY = Math.round(okT * sc);
  const gRW = Math.round(gW * sc);
  const gRH = Math.round(gH * sc);

  const wLabel = `${wCm} см`;
  const hLabel = `${hCm} см`;
  const gWLabel = `${gW.toFixed(1)} см`;
  const gHLabel = `${gH.toFixed(1)} см`;

  return `<svg width="${rW + DM * 2}" height="${rH + DM * 2}" xmlns="http://www.w3.org/2000/svg" style="display:block;">
  <g transform="translate(${DM},${DM})">
    <rect x="0" y="0" width="${rW}" height="${rH}" fill="#cce5f5" stroke="#7ab8d9" stroke-width="1.5"/>
    <line x1="0" y1="0" x2="${rW}" y2="${rH}" stroke="#9ecfe8" stroke-width="0.8"/>
    ${gRW > 0 && gRH > 0 ? `<rect x="${gX}" y="${gY}" width="${gRW}" height="${gRH}" fill="none" stroke="#2563eb" stroke-width="1" stroke-dasharray="3,2"/>
    <text x="${gX + gRW/2}" y="${gY + gRH/2}" text-anchor="middle" dominant-baseline="middle" font-size="8" fill="#2563eb">${gWLabel} × ${gHLabel}</text>` : ''}
    <text x="${rW/2}" y="-10" text-anchor="middle" font-size="10" fill="#333" font-weight="600">${wLabel}</text>
    <text x="${rW/2}" y="${rH+18}" text-anchor="middle" font-size="10" fill="#333" font-weight="600">${wLabel}</text>
    <text x="-10" y="${rH/2}" text-anchor="middle" font-size="10" fill="#333" font-weight="600" transform="rotate(-90,-10,${rH/2})">${hLabel}</text>
    <text x="${rW+10}" y="${rH/2}" text-anchor="middle" font-size="10" fill="#333" font-weight="600" transform="rotate(90,${rW+10},${rH/2})">${hLabel}</text>
  </g>
</svg>`;
}

function iconImg(src: string, w = 70, h = 70) {
  return `<img src="${src}" width="${w}" height="${h}" style="display:inline-block;vertical-align:middle;object-fit:contain;"/>`;
}

// ─── real fitting counts from saved fittings ─────────────────────────────────
function getRealCounts(row: TableRow) {
  const fittings = row.fittings ?? [];
  if (fittings.length > 0) {
    return {
      nLuvers: fittings.filter(f => f.type === 'luvers').length,
      nFran:   fittings.filter(f => f.type === 'fran').length,
      nRemen:  fittings.filter(f => f.type === 'remen').length,
    };
  }
  // fallback when fittings not saved
  const { h, w } = parseSize(row.size);
  return {
    nLuvers: Math.max(2, Math.round(w / 28)),
    nFran:   (hasFranLock(row.opening) || row.extraLockType === 'french') ? franLockCount(w, h) : 0,
    nRemen:  Math.max(2, Math.round(w / 35)),
  };
}

// ─── window SVG helper ────────────────────────────────────────────────────────
function windowSvgFor(row: TableRow, assets: Assets, maxW: number, maxH: number): string {
  const { h, w } = parseSize(row.size);
  return buildWindowSvg({
    wCm: w, hCm: h,
    shape: row.shape, material: row.mat, color: row.color, glass: row.glass,
    opening: row.opening,
    fittings: row.fittings ?? [],
    okantovkaTop:    row.okantovkaTop    ?? 70,
    okantovkaBottom: row.okantovkaBottom ?? 70,
    okantovkaLeft:   row.okantovkaLeft   ?? 70,
    okantovkaRight:  row.okantovkaRight  ?? 70,
    luverSpacingTop:    row.luverSpacingTop    ?? 300,
    luverSpacingBottom: row.luverSpacingBottom ?? 300,
    luverSpacingLeft:   row.luverSpacingLeft   ?? 300,
    luverSpacingRight:  row.luverSpacingRight  ?? 300,
    remenLength: row.remenLength ?? 0,
    remenWidth:  row.remenWidth  ?? 0,
    svgMaxW: maxW,
    svgMaxH: maxH,
    assets,
  });
}

// ─── hardware block for a single window ──────────────────────────────────────
function hwBlock(row: TableRow, assets: Assets): string {
  const { nLuvers, nFran, nRemen } = getRealCounts(row);
  const showFran = nFran > 0 || row.extraLockType === 'french';

  return `
    ${showFran ? `<div class="hw-row">
      <div class="hw-icon">${iconImg(assets.fran, 60, 60)}</div>
      <div class="hw-info"><div class="hw-name">Французкий замок</div><div class="hw-count">×${nFran}</div></div>
    </div>` : ''}
    ${row.extraLockType !== 'none' && row.extraLockType !== 'french' ? `<div class="hw-row">
      <div class="hw-icon">${iconImg(assets.fran, 60, 60)}</div>
      <div class="hw-info"><div class="hw-name">${ru(LOCK_RU, row.extraLockType)}</div><div class="hw-count">×${row.extraLockCount}</div></div>
    </div>` : ''}
    ${nLuvers > 0 ? `<div class="hw-row">
      <div class="hw-icon">${iconImg(assets.luvers, 52, 52)}</div>
      <div class="hw-info"><div class="hw-name">Люверс</div><div class="hw-count">×${nLuvers}</div></div>
    </div>` : ''}
    ${nRemen > 0 ? `<div class="hw-row">
      <div class="hw-icon">${iconImg(assets.remen, 100, 42)}</div>
      <div class="hw-info"><div class="hw-name">Подвязочный ремень</div><div class="hw-count">×${nRemen}</div></div>
    </div>` : ''}
    ${row.extraZipperType !== 'none' ? `<div class="hw-row">
      <div class="hw-info"><div class="hw-name">${ru(ZIP_RU, row.extraZipperType)}</div><div class="hw-count">${row.extraZipperLen} пог.м</div></div>
    </div>` : ''}`;
}

// ─── build pages ──────────────────────────────────────────────────────────────

export interface OrderPdfData {
  orderNum: number;
  client: { fio: string; phone: string; address: string; email: string; comment?: string };
  rows: TableRow[];
}

// Compact summary info (left side)
function summaryLeftHtml(data: OrderPdfData): string {
  const { orderNum, client, rows } = data;
  const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const total = rows.reduce((s, r) => s + r.price, 0);
  return `
    <div class="company-header">
      <div class="company-name">МЯГКИЕ ОКНА</div>
      <div class="company-sub">Производство и установка</div>
    </div>
    <div class="order-number">ЗАКАЗ № ${orderNum}</div>
    <table class="info-table">
      <tr><td class="lbl">ФИО клиента:</td><td>${client.fio || '—'}</td></tr>
      <tr><td class="lbl">Телефон:</td><td>${client.phone || '—'}</td></tr>
      <tr><td class="lbl">Адрес доставки:</td><td>${client.address || '—'}</td></tr>
      ${client.email ? `<tr><td class="lbl">Email:</td><td>${client.email}</td></tr>` : ''}
      ${client.comment ? `<tr><td class="lbl">Комментарий:</td><td>${client.comment}</td></tr>` : ''}
    </table>
    <div class="footer-info">
      <div>Дата создания: ${date}</div>
      <div style="margin-top:8px;font-weight:600;font-size:16px;">ИТОГО: ${fmt(total)}</div>
    </div>`;
}

// Комплектация (right side)
function kitRightHtml(data: OrderPdfData): string {
  const { rows } = data;
  const totalArea = rows.reduce((s, r) => { const { h, w } = parseSize(r.size); return s + h * w / 10000; }, 0);

  const matMap = new Map<string, number>();
  rows.forEach((r) => {
    const { h, w } = parseSize(r.size);
    const key = `${r.mat}|${r.color}`;
    matMap.set(key, (matMap.get(key) ?? 0) + h * w / 10000);
  });
  const matList = [...matMap.entries()].map(([key, area]) => {
    const [mat, color] = key.split('|') as [string, string];
    return `<li>${ru(MAT_RU, mat)}${color !== 'white' ? ` (${ru(COLOR_RU, color)})` : ''} = ${area.toFixed(2)} м²</li>`;
  }).join('');

  const lockMap = new Map<string, number>();
  rows.forEach((r) => {
    const { nFran } = getRealCounts(r);
    if (nFran > 0) {
      lockMap.set('Французкий замок', (lockMap.get('Французкий замок') ?? 0) + nFran);
    }
    if (r.extraLockType !== 'none' && r.extraLockType !== 'french') {
      const label = ru(LOCK_RU, r.extraLockType);
      lockMap.set(label, (lockMap.get(label) ?? 0) + r.extraLockCount);
    }
  });
  const lockList = [...lockMap.entries()].map(([name, n]) => `<li>${name} = ${n} шт.</li>`).join('');

  const zipMap = new Map<string, number>();
  rows.filter((r) => r.extraZipperType !== 'none').forEach((r) =>
    zipMap.set(r.extraZipperType, (zipMap.get(r.extraZipperType) ?? 0) + r.extraZipperLen)
  );
  const zipList = [...zipMap.entries()].map(([t, l]) => `<li>${ru(ZIP_RU, t)} = ${l} пог.м</li>`).join('');

  const totalLuvers = rows.reduce((s, r) => s + getRealCounts(r).nLuvers, 0);
  const totalStraps = rows.reduce((s, r) => s + getRealCounts(r).nRemen,  0);

  const services: string[] = [];
  if (rows.some((r) => r.moskit)) services.push('Москитная сетка');
  if (rows.some((r) => r.pocket)) services.push('Юбка (карман)');
  if (rows.some((r) => r.install)) services.push('Монтаж');

  return `
    <h2>Комплектация заказа</h2>
    <div class="stat-line">Площадь: <strong>${totalArea.toFixed(2)} м²</strong> · Изделий: <strong>${rows.length}</strong></div>
    <h3>Материалы:</h3>
    <ul class="kit-list">${matList}</ul>
    <h3>Фурнитура:</h3>
    <ul class="kit-list">
      <li>Люверс = ${totalLuvers} шт.</li>
      <li>Подвязочный ремень = ${totalStraps} шт.</li>
      ${lockList}${zipList}
    </ul>
    ${services.length ? `<h3>Услуги:</h3><ul class="kit-list">${services.map((s) => `<li>${s}</li>`).join('')}</ul>` : ''}`;
}

// Single window visual section (used inside combined or pair page)
function windowVisualHtml(row: TableRow, idx: number, total: number, orderNum: number, assets: Assets, maxW: number, maxH: number): string {
  const { h, w } = parseSize(row.size);
  const matLabel = `${ru(MAT_RU, row.mat)} (${ru(COLOR_RU, row.color)})`;
  return `
  <div class="win-section">
    <div class="two-col">
      <div class="left-col">
        <div class="window-title">Окно №${idx + 1} из ${total} — Заказ ${orderNum}</div>
        <div class="window-meta">${w} × ${h} см · ${matLabel}</div>
        <div class="opening-label">Открывание: ${row.opening}</div>
        <div class="drawing-wrap">${windowSvgFor(row, assets, maxW, maxH)}</div>
      </div>
      <div class="divider-v"></div>
      <div class="right-col">
        <div class="mat-name">${ru(MAT_RU, row.mat)}:</div>
        <div class="mat-color">${ru(COLOR_RU, row.color)}</div>
        <div class="cutting-wrap">${drawCuttingRect(w, h, 160, row)}</div>
        ${hwBlock(row, assets)}
      </div>
    </div>
  </div>`;
}

// ─── PAGE BUILDERS ────────────────────────────────────────────────────────────

// 1 window → everything on one A4 page
function buildCombinedPage(data: OrderPdfData, assets: Assets): string {
  const row = data.rows[0];
  const { h, w } = parseSize(row.size);
  const matLabel = `${ru(MAT_RU, row.mat)} (${ru(COLOR_RU, row.color)})`;
  return `
  <div class="page">
    <!-- compact summary strip -->
    <div class="two-col summary-strip">
      <div class="left-col">${summaryLeftHtml(data)}</div>
      <div class="divider-v"></div>
      <div class="right-col">${kitRightHtml(data)}</div>
    </div>
    <div class="divider-h"></div>
    <!-- window visual -->
    <div class="two-col win-area">
      <div class="left-col">
        <div class="window-title">Окно №1 из 1 — Заказ ${data.orderNum}</div>
        <div class="window-meta">${w} × ${h} см · ${matLabel}</div>
        <div class="opening-label">Открывание: ${row.opening}</div>
        <div class="drawing-wrap">${windowSvgFor(row, assets, 520, 620)}</div>
      </div>
      <div class="divider-v"></div>
      <div class="right-col">
        <div class="mat-name">${ru(MAT_RU, row.mat)}:</div>
        <div class="mat-color">${ru(COLOR_RU, row.color)}</div>
        <div class="cutting-wrap">${drawCuttingRect(w, h, 160, row)}</div>
        ${hwBlock(row, assets)}
      </div>
    </div>
  </div>`;
}

// Summary-only page (for 2+ windows)
function buildSummaryPage(data: OrderPdfData): string {
  return `
  <div class="page">
    <div class="two-col" style="flex:1;">
      <div class="left-col">${summaryLeftHtml(data)}</div>
      <div class="divider-v"></div>
      <div class="right-col">${kitRightHtml(data)}</div>
    </div>
  </div>`;
}

// 1 or 2 windows per page
function buildWindowsPage(rows2: TableRow[], startIdx: number, total: number, orderNum: number, assets: Assets): string {
  const perPage = rows2.length;
  const svgH = perPage === 1 ? 620 : 360;
  const svgW = perPage === 1 ? 520 : 460;
  return `
  <div class="page">
    ${rows2.map((row, i) => `
      ${i > 0 ? '<div class="divider-h" style="margin:8px 0;"></div>' : ''}
      ${windowVisualHtml(row, startIdx + i, total, orderNum, assets, svgW, svgH)}
    `).join('')}
  </div>`;
}

function buildFullHtml(data: OrderPdfData, assets: Assets): string {
  let body = '';
  if (data.rows.length === 1) {
    body = buildCombinedPage(data, assets);
  } else {
    body = buildSummaryPage(data);
    for (let i = 0; i < data.rows.length; i += 2) {
      body += buildWindowsPage(data.rows.slice(i, i + 2), i, data.rows.length, data.orderNum, assets);
    }
  }

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size:12px; color:#0f172a; background:#fff; width:960px; }
  .page { width:960px; min-height:1357px; padding:36px 44px; display:flex; flex-direction:column; }
  .two-col { display:flex; gap:0; }
  .left-col { flex:0 0 560px; padding-right:24px; }
  .right-col { flex:1; padding-left:24px; }
  .divider-v { width:1px; background:#cbd5e1; flex-shrink:0; }
  .divider-h { height:1px; background:#e2e8f0; margin:16px 0; }
  .summary-strip { padding-bottom:0; }
  .win-area { flex:1; padding-top:0; }
  .company-header { border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:16px; }
  .company-name { font-size:24px; font-weight:900; letter-spacing:1px; color:#0f172a; }
  .company-sub { font-size:11px; color:#64748b; margin-top:3px; }
  .order-number { font-size:20px; font-weight:800; margin-bottom:14px; }
  .info-table { width:100%; border-collapse:collapse; }
  .info-table tr td { padding:3px 0; vertical-align:top; font-size:12px; }
  .info-table .lbl { width:130px; color:#64748b; }
  .footer-info { margin-top:18px; font-size:12px; color:#475569; }
  h2 { font-size:16px; font-weight:700; margin-bottom:10px; }
  h3 { font-size:12px; font-weight:700; margin:10px 0 5px 0; }
  .stat-line { font-size:12px; color:#475569; margin-bottom:10px; }
  .kit-list { list-style:none; }
  .kit-list li { padding:2px 0 2px 12px; border-bottom:1px solid #f1f5f9; font-size:11px; color:#334155; position:relative; }
  .kit-list li::before { content:"—"; position:absolute; left:0; color:#94a3b8; }
  .win-section { }
  .window-title { font-size:15px; font-weight:700; color:#1e293b; margin-bottom:3px; }
  .window-meta { font-size:11px; color:#475569; margin-bottom:2px; }
  .opening-label { font-size:10px; color:#64748b; margin-bottom:8px; }
  .drawing-wrap { margin-top:6px; }
  .mat-name { font-size:12px; font-weight:600; color:#1e293b; margin-bottom:2px; }
  .mat-color { font-size:11px; color:#e07b39; margin-bottom:8px; }
  .cutting-wrap { margin-bottom:14px; }
  .hw-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
  .hw-icon { flex-shrink:0; }
  .hw-name { font-size:13px; color:#334155; }
  .hw-count { font-size:16px; font-weight:700; color:#2563eb; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ─── main export ──────────────────────────────────────────────────────────────
export async function generateOrderPdf(data: OrderPdfData): Promise<Blob> {
  const [remenB64, franB64, luversB64] = await Promise.all([
    toBase64(remenUrl),
    toBase64(franUrl),
    toBase64(luversUrl),
  ]);
  const assets: Assets = { remen: remenB64, fran: franB64, luvers: luversB64 };

  const html = buildFullHtml(data, assets);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:0;top:0;width:960px;height:2000px;border:none;opacity:0;pointer-events:none;z-index:-1;';
  document.body.appendChild(iframe);

  await new Promise<void>((resolve) => {
    iframe.addEventListener('load', () => resolve(), { once: true });
    iframe.srcdoc = html;
  });

  await new Promise((r) => setTimeout(r, 300));

  try {
    const iframeDoc = iframe.contentDocument!;

    // Measure actual content height (not iframe viewport height)
    const pages = Array.from(iframeDoc.querySelectorAll('.page')) as HTMLElement[];
    const contentH = pages.length > 0
      ? pages[pages.length - 1].offsetTop + pages[pages.length - 1].offsetHeight
      : iframeDoc.body.scrollHeight;

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 960,
      width: 960,
      height: contentH,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const imgH = pdfW * (canvas.height / canvas.width);

    let yPos = 0;
    while (yPos < imgH) {
      if (yPos > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -yPos, pdfW, imgH);
      yPos += pdfH;
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(iframe);
  }
}

export function downloadPdf(blob: Blob, orderNum: number) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `order_${orderNum}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function sendPdfToMax(blob: Blob, orderNum: number): Promise<void> {
  await fetch(`/api/bot/send-pdf?orderNum=${orderNum}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf' },
    body: blob,
  });
}
