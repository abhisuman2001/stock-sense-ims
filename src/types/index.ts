export type OperationType = 'receipt' | 'delivery' | 'internal' | 'adjustment';
export type OperationStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled';
export type UserRole = 'inventory_manager' | 'floor_operator' | 'manager' | 'staff';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  assigned_warehouse_id?: number | null;
  assigned_warehouse_code?: string | null;
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
  cost?: number | null;
  total_on_hand: number;
  total_free_to_use: number;
}

export interface StockQuant {
  product_id: number;
  product_name: string;
  sku: string;
  category_name?: string;
  uom: string;
  cost?: number | null;
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
  role: 'inventory_manager' | 'floor_operator';
  assigned_warehouse_id?: number | null;
  assigned_warehouse_name?: string | null;
  total_products: number;
  low_or_out_of_stock_count: number;
  pending_receipts_count: number;
  pending_deliveries_count: number;
  scheduled_transfers_count: number;
  total_stock_value?: number | null;
  assigned_receipts_to_process?: number;
  assigned_deliveries_to_process?: number;
  task_message?: string | null;
  recent_receipts: Operation[];
  recent_deliveries: Operation[];
}

export type AlertSeverity = 'critical' | 'warning' | 'watchlist';
export type AlertType = 'stockout' | 'reorder_breach' | 'low_buffer';

export interface SmartAlert {
  id: string;
  product_id: number;
  sku: string;
  name: string;
  category_id: number | null;
  category_name: string | null;
  uom: string;
  reorder_point: number;
  total_on_hand: number;
  shortfall: number;
  severity: AlertSeverity;
  type: AlertType;
  inbound_in_progress: {
    operation_id: number;
    reference: string;
    quantity: number;
    status: string;
  } | null;
}

export interface SmartAlertsResponse {
  summary: {
    total_urgent: number;
    stockouts_count: number;
    reorder_breaches_count: number;
    watchlist_count: number;
    total_shortfall_units: number;
  };
  alerts: SmartAlert[];
  last_scanned_at: string;
}

