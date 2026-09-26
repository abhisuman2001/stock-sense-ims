import {
  DashboardKPIs,
  Operation,
  Product,
  StockQuant,
  StockMove,
  Warehouse,
  Location,
  Category,
  User,
  SmartAlertsResponse,
} from '../types';

export const API_BASE = '/api';

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('stocksense_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null) {
  if (user) {
    localStorage.setItem('stocksense_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('stocksense_user');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = localStorage.getItem('stocksense_token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data?.detail || data?.message || 'Server request failed';
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (email: string, password: string, full_name: string, role = 'staff') =>
    request<{ access_token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, role }),
    }),

  getMe: () => request<User>('/auth/me'),

  requestOtp: (email: string) =>
    request<{ message: string; debug_otp?: string }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyOtpReset: (email: string, otp_code: string, new_password: string) =>
    request<{ message: string }>('/auth/verify-otp-reset', {
      method: 'POST',
      body: JSON.stringify({ email, otp_code, new_password }),
    }),

  // Dashboard
  getDashboard: () => request<DashboardKPIs>('/dashboard'),

  // Warehouses & Locations
  getWarehouses: () => request<Warehouse[]>('/warehouses'),
  createWarehouse: (data: { name: string; short_code: string; address?: string }) =>
    request<Warehouse>('/warehouses', { method: 'POST', body: JSON.stringify(data) }),

  getLocations: (warehouse_id?: number) =>
    request<Location[]>(`/locations${warehouse_id ? `?warehouse_id=${warehouse_id}` : ''}`),
  createLocation: (data: { name: string; short_code: string; warehouse_id: number }) =>
    request<Location>('/locations', { method: 'POST', body: JSON.stringify(data) }),

  // Categories
  getCategories: () => request<Category[]>('/categories'),
  createCategory: (name: string) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify({ name }) }),

  // Products
  getProducts: (params?: { category_id?: number; search?: string }) => {
    const sp = new URLSearchParams();
    if (params?.category_id) sp.set('category_id', String(params.category_id));
    if (params?.search) sp.set('search', params.search);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request<Product[]>(`/products${qs}`);
  },

  getProduct: (id: number) => request<Product>(`/products/${id}`),

  getProductBySku: (sku: string) =>
    request<Product & { location_quants?: any[] }>(`/products/sku/${encodeURIComponent(sku.trim())}`),

  createProduct: (data: {
    sku: string;
    name: string;
    category_id?: number | null;
    uom?: string;
    reorder_point?: number;
    cost?: number;
    initial_stock?: number;
    initial_location_id?: number;
  }) => request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),

  updateProduct: (id: number, data: Partial<Product>) =>
    request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Stock Quants
  getStock: (warehouse_id?: number) =>
    request<StockQuant[]>(`/stock${warehouse_id ? `?warehouse_id=${warehouse_id}` : ''}`),

  updateStockQuant: (productId: number, locationId: number, on_hand: number) =>
    request<StockQuant>(`/stock/${productId}/${locationId}`, {
      method: 'PUT',
      body: JSON.stringify({ on_hand }),
    }),

  logDiscrepancy: (data: { product_id: number; location_id: number; physical_count: number; reason?: string }) =>
    request<{ message: string; operation_reference: string; new_on_hand: number }>('/stock/discrepancy', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Operations
  getOperations: (params?: { type?: string; status?: string; search?: string; warehouse_id?: number }) => {
    const sp = new URLSearchParams();
    if (params?.type) sp.set('type', params.type);
    if (params?.status) sp.set('status', params.status);
    if (params?.search) sp.set('search', params.search);
    if (params?.warehouse_id) sp.set('warehouse_id', String(params.warehouse_id));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request<Operation[]>(`/operations${qs}`);
  },

  getOperation: (id: number) => request<Operation>(`/operations/${id}`),

  createOperation: (data: {
    warehouse_id: number;
    type: string;
    source_location_id?: number | null;
    dest_location_id?: number | null;
    contact?: string;
    schedule_date?: string;
    responsible_user_id?: number;
    lines: { product_id: number; quantity: number }[];
  }) => request<Operation>('/operations', { method: 'POST', body: JSON.stringify(data) }),

  updateOperation: (id: number, data: Partial<Operation>) =>
    request<Operation>(`/operations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  markOperationReady: (id: number) => request<Operation>(`/operations/${id}/mark-ready`, { method: 'POST' }),

  validateOperation: (id: number) => request<Operation>(`/operations/${id}/validate`, { method: 'POST' }),

  cancelOperation: (id: number) => request<Operation>(`/operations/${id}/cancel`, { method: 'POST' }),

  // Move History
  getMoves: (params?: { operation_type?: string; product_id?: number; search?: string }) => {
    const sp = new URLSearchParams();
    if (params?.operation_type) sp.set('operation_type', params.operation_type);
    if (params?.product_id) sp.set('product_id', String(params.product_id));
    if (params?.search) sp.set('search', params.search);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request<StockMove[]>(`/moves${qs}`);
  },

  // Smart Alerts
  getSmartAlerts: () => request<SmartAlertsResponse>('/smart-alerts'),

  // Users & Health
  getUsers: () => request<User[]>('/users'),
  getHealth: () => request<{ status: string; uptime_seconds: number; version: string; database: any }>('/health'),
  resetDatabase: () => request<{ message: string }>('/database/reset', { method: 'POST' }),
};
