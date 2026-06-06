import apiClient from './client';

export interface PriceListDto {
  id: string;
  materialPvc: number;
  materialScreen: number;
  materialOxford: number;
  moskit: number;
  pocket: number;
  extraLockRotary: number;
  extraLockFrench: number;
  extraZipperSpiral: number;
  extraZipperTractor: number;
  glassTint: number;
  install: number;
}

export async function apiGetPrices(): Promise<PriceListDto> {
  const { data } = await apiClient.get<{ prices: PriceListDto }>('/api/settings/prices');
  return data.prices;
}

export async function apiUpdatePrices(prices: Omit<PriceListDto, 'id'>): Promise<PriceListDto> {
  const { data } = await apiClient.put<{ prices: PriceListDto }>('/api/settings/prices', prices);
  return data.prices;
}
