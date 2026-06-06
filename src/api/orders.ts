import apiClient from './client';

export interface OrderItemDto {
  id: string;
  prodType: string;
  shape: string;
  material: string;
  color: string;
  glass: string;
  opening: string;
  width: number;
  height: number;
  moskit: boolean;
  pocket: boolean;
  install: boolean;
  extraLockType: string | null;
  extraLockCount: number | null;
  extraZipperType: string | null;
  extraZipperLen: number | null;
  extraWorkPrice: number | null;
  extraWorkDesc: string | null;
  okantovkaTop: number;
  okantovkaBottom: number;
  okantovkaLeft: number;
  okantovkaRight: number;
  totalPrice: number | null;
}

export interface OrderDto {
  id: string;
  orderNum: number;
  status: string;
  createdAt: string;
  clientId: string | null;
  item: OrderItemDto | null;
}

export async function apiGetOrders(): Promise<OrderDto[]> {
  const { data } = await apiClient.get<{ orders: OrderDto[] }>('/api/orders');
  return data.orders;
}

export async function apiCreateOrder(): Promise<OrderDto> {
  const { data } = await apiClient.post<{ order: OrderDto }>('/api/orders');
  return data.order;
}

export async function apiSaveOrderItem(
  orderId: string,
  item: Omit<OrderItemDto, 'id'>
): Promise<OrderDto> {
  const { data } = await apiClient.put<{ order: OrderDto }>(`/api/orders/${orderId}`, { item });
  return data.order;
}

export async function apiDeleteOrder(orderId: string): Promise<void> {
  await apiClient.delete(`/api/orders/${orderId}`);
}

export async function apiUpdateOrderStatus(orderId: string, status: string): Promise<OrderDto> {
  const { data } = await apiClient.patch<{ order: OrderDto }>(`/api/orders/${orderId}/status`, { status });
  return data.order;
}
