export type OperationType = 'receipt' | 'delivery' | 'internal' | 'adjustment';
export type OperationStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled';
export type UserRole = 'manager' | 'staff';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface Warehouse {
  id: number;
  name: string;
  short_code: string;
  address?: string;
}

export interface Location {
  id: number;
  name: string;
  short_code: string;
  warehouse_id: number;
  warehouse_code?: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category_id: number | null;
  category_name?: string | null;
  uom: string;
  reorder_point: number;
  cost: number;
  total_on_hand: number;
  total_free_to_use: number;
}

export interface StockQuant {
  product_id: number;
  product_name: string;
  sku: string;
  category_name?: string;
  uom: string;
  cost: number;
  location_id: number;
  location_name: string;
  warehouse_code: string;
  on_hand: number;
  reserved: number;
  free_to_use: number;
}

export interface OperationLine {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  uom: string;
  quantity: number;
}

export interface Operation {
  id: number;
  reference: string;
  type: OperationType;
  source_location_id: number | null;
  source_location_name?: string | null;
  dest_location_id: number | null;
  dest_location_name?: string | null;
  contact?: string | null;
  schedule_date: string;
  status: OperationStatus;
  responsible_user_id?: number | null;
  responsible_user_name?: string | null;
  created_at: string;
  lines: OperationLine[];
}

export interface StockMove {
  id: number;
  operation_id: number;
  operation_reference: string;
  operation_type: OperationType;
  product_id: number;
  product_name: string;
  sku: string;
  uom: string;
  from_location_id: number | null;
  from_location_name?: string | null;
  to_location_id: number | null;
  to_location_name?: string | null;
  quantity: number;
  moved_at: string;
}

export interface DashboardKPIs {
  total_products: number;
  low_or_out_of_stock_count: number;
  pending_receipts_count: number;
  pending_deliveries_count: number;
  scheduled_transfers_count: number;
  total_stock_value: number;
  recent_receipts: Operation[];
  recent_deliveries: Operation[];
}
