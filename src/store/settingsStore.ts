import { create } from 'zustand';
import { DEFAULT_PRICES, type CalcPrices } from '../lib/calculator';
import { apiGetPrices } from '../api/settings';

interface SettingsState {
  prices: CalcPrices;
  fetchPrices: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  prices: DEFAULT_PRICES,
  fetchPrices: async () => {
    try {
      const dto = await apiGetPrices();
      set({
        prices: {
          materialPvc:        dto.materialPvc,
          materialScreen:     dto.materialScreen,
          materialOxford:     dto.materialOxford,
          materialFabric:     dto.materialFabric,
          moskit:             dto.moskit,
          pocket:             dto.pocket,
          extraLockRotary:    dto.extraLockRotary,
          extraLockFrench:    dto.extraLockFrench,
          extraZipperSpiral:  dto.extraZipperSpiral,
          extraZipperTractor: dto.extraZipperTractor,
          glassTint:          dto.glassTint,
          install:            dto.install,
        },
      });
    } catch {}
  },
}));
