import { useState } from 'react';
import { ParamsPanel } from '../constructor/ParamsPanel';
import { WindowVisualizer } from '../constructor/WindowVisualizer';
import { OrderTable } from '../constructor/OrderTable';

const TABLE_DEFAULT = 300;
const TABLE_MIN = 80;
const TABLE_MAX = 560;

function useVerticalResize(initial: number): [number, (e: React.MouseEvent) => void] {
  const [height, setHeight] = useState(initial);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = height;

    function onMove(ev: MouseEvent) {
      // drag down → table shrinks, drag up → table grows
      const next = Math.max(TABLE_MIN, Math.min(TABLE_MAX, startH - (ev.clientY - startY)));
      setHeight(next);
    }

    function onUp() {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  return [height, startDrag];
}

export function MainContent() {
  const [tableHeight, startTableDrag] = useVerticalResize(TABLE_DEFAULT);

  return (
    <main className="flex-1 flex flex-col overflow-hidden min-w-0">

      {/* Top: constructor + visualizer — takes remaining height */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="w-[280px] flex-shrink-0 border-r border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <ParamsPanel />
        </div>
        <div className="flex-1 bg-[#f8fafc] dark:bg-slate-950 overflow-hidden min-w-0">
          <WindowVisualizer />
        </div>
      </div>

      {/* Vertical resize handle */}
      <div
        onMouseDown={startTableDrag}
        className="relative h-1 flex-shrink-0 cursor-row-resize group z-10"
      >
        <div className="absolute inset-x-0 -top-1 -bottom-1" />
        <div className="absolute inset-x-0 top-0 bottom-0 bg-[#e2e8f0] dark:bg-slate-700 group-hover:bg-[#2563eb] transition-colors duration-150" />
        {/* drag indicator dots */}
        <div className="absolute inset-0 flex items-center justify-center gap-0.5 pointer-events-none">
          <div className="w-6 h-0.5 rounded-full bg-[#cbd5e1] dark:bg-slate-600 group-hover:bg-[#93c5fd] transition-colors" />
        </div>
      </div>

      {/* Bottom: order table — fixed height, resizable */}
      <div className="flex-shrink-0 overflow-hidden" style={{ height: tableHeight }}>
        <OrderTable />
      </div>

    </main>
  );
}
