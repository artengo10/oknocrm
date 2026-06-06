import { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { ParamsPanel } from '../components/constructor/ParamsPanel';
import { WindowVisualizer } from '../components/constructor/WindowVisualizer';
import { ResultsBlock } from '../components/constructor/ResultsBlock';
import { apiGetPrices } from '../api/settings';
import { DEFAULT_PRICES, type CalcPrices } from '../lib/calculator';

function ConstructorContent({ prices }: { prices: CalcPrices }) {
  return (
    <main className="flex-1 flex overflow-hidden">
      {/* Left: params */}
      <div className="w-[272px] flex-shrink-0 border-r border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <ParamsPanel />
      </div>

      {/* Center: SVG visualizer */}
      <div className="flex-1 bg-[#f8fafc] dark:bg-slate-950 flex items-center justify-center overflow-hidden">
        <WindowVisualizer />
      </div>

      {/* Right: price breakdown */}
      <div className="w-[252px] flex-shrink-0 border-l border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <ResultsBlock prices={prices} />
      </div>
    </main>
  );
}

export function ConstructorPage() {
  const [prices, setPrices] = useState<CalcPrices>(DEFAULT_PRICES);

  useEffect(() => {
    apiGetPrices()
      .then((dto) => {
        setPrices({
          materialPvc: dto.materialPvc,
          materialScreen: dto.materialScreen,
          materialOxford: dto.materialOxford,
          moskit: dto.moskit,
          pocket: dto.pocket,
          extraLockRotary: dto.extraLockRotary,
          extraLockFrench: dto.extraLockFrench,
          extraZipperSpiral: dto.extraZipperSpiral,
          extraZipperTractor: dto.extraZipperTractor,
          glassTint: dto.glassTint,
          install: dto.install,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <AppLayout>
      <ConstructorContent prices={prices} />
    </AppLayout>
  );
}
