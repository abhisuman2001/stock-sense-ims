import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DashboardKPIs, Operation } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  Boxes,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  DollarSign,
  Plus,
  RefreshCw,
  ExternalLink,
  HardHat,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface DashboardScreenProps {
  onNavigateToOperations: (subTab: 'receipts' | 'deliveries' | 'transfers' | 'adjustments') => void;
  onOpenNewOperationModal: (type: 'receipt' | 'delivery' | 'internal' | 'adjustment') => void;
  onSelectOperation: (op: Operation) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigateToOperations,
  onOpenNewOperationModal,
  onSelectOperation,
}) => {
  const [data, setData] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isOperator = data?.role === 'floor_operator';

  return (
    <div className="space-y-6">
      {/* Top Header & Role-Appropriate Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#34312B] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F3EF]">
              {isOperator ? 'Floor Workstation Terminal' : 'Warehouse Operations Command'}
            </h1>
            <span
              className={`text-[10px] font-mono uppercase px-2 py-0.5 border font-semibold ${
                isOperator
                  ? 'border-[rgba(74,144,217,0.4)] text-[#4A90D9] bg-[rgba(74,144,217,0.12)]'
                  : 'border-[rgba(242,194,48,0.4)] text-[#F2C230] bg-[rgba(242,194,48,0.12)]'
              }`}
            >
              {isOperator ? 'Floor Operator View' : 'Manager Analytics View'}
            </span>
          </div>
          <p className="text-xs text-[#8B8478] font-mono mt-1">
            {isOperator
              ? `Operational queue for ${data?.assigned_warehouse_name || 'assigned warehouse'}`
              : 'Global inventory valuation, movements across all facilities, and authorization queue'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh metrics"
            className="p-2 border border-[#34312B] bg-[#262420] text-[#8B8478] hover:text-[#F5F3EF] hover:border-[#8B8478] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* MANAGER ACTIONS: Can create Receipts and Deliveries */}
          {!isOperator ? (
            <>
              <button
                onClick={() => onOpenNewOperationModal('receipt')}
                className="bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-semibold text-xs py-2 px-3 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Receipt</span>
              </button>
              <button
                onClick={() => onOpenNewOperationModal('delivery')}
                className="border border-[#34312B] bg-[#262420] hover:border-[#8B8478] text-[#F5F3EF] text-xs py-2 px-3 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowUpFromLine className="w-4 h-4 text-[#8B8478]" />
                <span>New Delivery</span>
              </button>
            </>
          ) : (
            /* OPERATOR ACTIONS: Can create Internal Transfers and Adjustments */
            <>
              <button
                onClick={() => onOpenNewOperationModal('internal')}
                className="bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-semibold text-xs py-2 px-3 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Log Internal Transfer</span>
              </button>
              <button
                onClick={() => onOpenNewOperationModal('adjustment')}
                className="border border-[#34312B] bg-[#262420] hover:border-[#8B8478] text-[#F5F3EF] text-xs py-2 px-3 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#8B8478]" />
                <span>Log Count Discrepancy</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TASK-ORIENTED FRAMING FOR FLOOR OPERATOR */}
      {isOperator && (
        <div className="bg-[#262420] border-l-4 border-[#4A90D9] border-t border-r border-b border-[#34312B] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgba(74,144,217,0.15)] text-[#4A90D9]">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#4A90D9] font-bold">
                Assigned Floor Queue • {data?.assigned_warehouse_name}
              </div>
              <div className="text-sm font-medium text-[#F5F3EF] mt-0.5">
                {data?.task_message || 'Assigned tasks are ready for validation.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateToOperations('receipts')}
            className="px-3 py-1.5 bg-[#1A1816] border border-[#34312B] hover:border-[#4A90D9] text-[#F5F3EF] text-xs font-mono flex items-center gap-1.5"
          >
            <span>Start Putaway</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#4A90D9]" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-[rgba(217,83,79,0.15)] border border-[#D9534F] text-[#D9534F] text-xs">
          {error}
        </div>
      )}

      {/* KPI Cards Grid — Distinct Layout per Role */}
      {isOperator ? (
        /* Floor Operator: 4 Task-Oriented KPI Cards (STRICTLY NO COST / VALUATION DATA) */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#262420] border border-[#34312B] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8B8478] text-xs font-mono uppercase tracking-wider mb-2">
              <span>Station Products</span>
              <Boxes className="w-4 h-4" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#F5F3EF] tracking-tight tabular-nums">
              {loading ? '—' : data?.total_products}
            </div>
            <div className="text-[11px] text-[#8B8478] mt-1">Catalog items at station</div>
          </div>

          <div
            className={`border p-4 flex flex-col justify-between ${
              (data?.low_or_out_of_stock_count || 0) > 0
                ? 'bg-[#262420] border-[#E8A33D]'
                : 'bg-[#262420] border-[#34312B]'
            }`}
          >
            <div className="flex items-center justify-between text-[#E8A33D] text-xs font-mono uppercase tracking-wider mb-2">
              <span>Low Bay Stock</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#E8A33D] tracking-tight tabular-nums">
              {loading ? '—' : data?.low_or_out_of_stock_count}
            </div>
            <div className="text-[11px] text-[#8B8478] mt-1">Under reorder threshold</div>
          </div>

          <div
            onClick={() => onNavigateToOperations('receipts')}
            className="bg-[#262420] border border-[#34312B] hover:border-[#4A90D9] cursor-pointer p-4 flex flex-col justify-between transition-colors"
          >
            <div className="flex items-center justify-between text-[#4A90D9] text-xs font-mono uppercase tracking-wider mb-2">
              <span>Inbound to Receive</span>
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#F5F3EF] tracking-tight tabular-nums">
              {loading ? '—' : data?.assigned_receipts_to_process}
            </div>
            <div className="text-[11px] text-[#8B8478] mt-1">Awaiting dock check-in</div>
          </div>

          <div
            onClick={() => onNavigateToOperations('deliveries')}
            className="bg-[#262420] border border-[#34312B] hover:border-[#4A90D9] cursor-pointer p-4 flex flex-col justify-between transition-colors"
          >
            <div className="flex items-center justify-between text-[#4A90D9] text-xs font-mono uppercase tracking-wider mb-2">
              <span>Orders to Pick</span>
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#F5F3EF] tracking-tight tabular-nums">
              {loading ? '—' : data?.assigned_deliveries_to_process}
            </div>
            <div className="text-[11px] text-[#8B8478] mt-1">Pending pick & staging</div>
          </div>
        </div>
      ) : (
        /* Inventory Manager: Full 6 KPI Cards with FIFO Financial Stock Valuation */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#262420] border border-[#34312B] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8B8478] text-xs font-mono uppercase tracking-wider mb-2">
              <span>Global SKUs</span>
              <Boxes className="w-4 h-4" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#F5F3EF] tracking-tight tabular-nums">
              {loading ? '—' : data?.total_products}
            </div>
            <div className="text-[11px] text-[#8B8478] mt-1">All catalog items</div>
          </div>

          <div
            className={`border p-4 flex flex-col justify-between ${
              (data?.low_or_out_of_stock_count || 0) > 0
                ? 'bg-[#262420] border-[#E8A33D]'
                : 'bg-[#262420] border-[#34312B]'
            }`}
          >
            <div className="flex items-center justify-between text-[#E8A33D] text-xs font-mono uppercase tracking-wider mb-2">
              <span>Low Stock Alerts</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#E8A33D] tracking-tight tabular-nums">
              {loading ? '—' : data?.low_or_out_of_stock_count}
            </div>
            <div className="text-[11px] text-[#8B8478] mt-1">Reorder urgently</div>
          </div>

          <div
            onClick={() => onNavigateToOperations('receipts')}
            className="bg-[#262420] border border-[#34312B] hover:border-[#8B8478] cursor-pointer p-4 flex flex-col justify-between transition-colors"
          >
            <div className="flex items-center justify-between text-[#8B8478] text-xs font-mono uppercase tracking-wider mb-2">
              <span>Pending IN</span>
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#F5F3EF] tracking-tight tabular-nums">
              {loading ? '—' : data?.pending_receipts_count}
            </div>
            <div className="text-[11px] text-[#8B8478] mt-1">Vendor receipts</div>
          </div>

          <div
            onClick={() => onNavigateToOperations('deliveries')}
            className="bg-[#262420] border border-[#34312B] hover:border-[#8B8478] cursor-pointer p-4 flex flex-col justify-between transition-colors"
          >
            <div className="flex items-center justify-between text-[#8B8478] text-xs font-mono uppercase tracking-wider mb-2">
              <span>Pending OUT</span>
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#F5F3EF] tracking-tight tabular-nums">
              {loading ? '—' : data?.pending_deliveries_count}
            </div>
            <div className="text-[11px] text-[#8B8478] mt-1">Customer dispatches</div>
          </div>

          <div
            onClick={() => onNavigateToOperations('transfers')}
            className="bg-[#262420] border border-[#34312B] hover:border-[#8B8478] cursor-pointer p-4 flex flex-col justify-between transition-colors"
          >
            <div className="flex items-center justify-between text-[#8B8478] text-xs font-mono uppercase tracking-wider mb-2">
              <span>Transfers</span>
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#F5F3EF] tracking-tight tabular-nums">
              {loading ? '—' : data?.scheduled_transfers_count}
            </div>
            <div className="text-[11px] text-[#8B8478] mt-1">Inter-zone moves</div>
          </div>

          {/* FINANCIAL STOCK VALUATION CARD (MANAGERS ONLY) */}
          <div className="bg-[#262420] border border-[#34312B] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#F2C230] text-xs font-mono uppercase tracking-wider mb-2">
              <span>FIFO Valuation</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-xl font-mono font-bold text-[#F2C230] tracking-tight tabular-nums truncate">
              {loading ? '—' : `$${Number(data?.total_stock_value || 0).toLocaleString()}`}
            </div>
            <div className="text-[11px] text-[#8B8478] mt-1">Total physical value</div>
          </div>
        </div>
      )}

      {/* Two Column Quick Summaries: Receipts & Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incoming Receipts Quick Summary */}
        <div className="bg-[#262420] border border-[#34312B] p-5">
          <div className="flex items-center justify-between mb-4 border-b border-[#34312B] pb-3">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-[#F2C230]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F3EF]">
                {isOperator ? 'Assigned Inbound Shipments' : 'Recent Inbound Receipts'}
              </h2>
            </div>
            <button
              onClick={() => onNavigateToOperations('receipts')}
              className="text-xs text-[#8B8478] hover:text-[#F2C230] font-mono flex items-center gap-1"
            >
              <span>View All</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#34312B] text-[#8B8478] font-mono uppercase">
                  <th className="py-2 px-3 font-medium">Ref Code</th>
                  <th className="py-2 px-3 font-medium">Vendor / Contact</th>
                  <th className="py-2 px-3 font-medium text-right">Items</th>
                  <th className="py-2 px-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#34312B]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#8B8478] font-mono">
                      Loading inbound stream...
                    </td>
                  </tr>
                ) : data?.recent_receipts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#8B8478]">
                      No active receipts in your assigned station queue.
                    </td>
                  </tr>
                ) : (
                  data?.recent_receipts.map((op) => (
                    <tr
                      key={op.id}
                      onClick={() => onSelectOperation(op)}
                      className="hover:bg-[#2E2B26] cursor-pointer transition-colors h-11"
                    >
                      <td className="py-2 px-3 font-mono font-medium text-[#F5F3EF]">
                        {op.reference}
                      </td>
                      <td className="py-2 px-3 text-[#F5F3EF] truncate max-w-[140px]">
                        {op.contact || 'Standard Supplier'}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-right text-[#8B8478]">
                        {op.lines.reduce((s, l) => s + l.quantity, 0)} pcs
                      </td>
                      <td className="py-2 px-3 text-center">
                        <StatusBadge status={op.status} size="sm" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outgoing Deliveries Quick Summary */}
        <div className="bg-[#262420] border border-[#34312B] p-5">
          <div className="flex items-center justify-between mb-4 border-b border-[#34312B] pb-3">
            <div className="flex items-center gap-2">
              <ArrowUpFromLine className="w-4 h-4 text-[#F2C230]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F3EF]">
                {isOperator ? 'Assigned Outbound Dispatches' : 'Recent Outbound Deliveries'}
              </h2>
            </div>
            <button
              onClick={() => onNavigateToOperations('deliveries')}
              className="text-xs text-[#8B8478] hover:text-[#F2C230] font-mono flex items-center gap-1"
            >
              <span>View All</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#34312B] text-[#8B8478] font-mono uppercase">
                  <th className="py-2 px-3 font-medium">Ref Code</th>
                  <th className="py-2 px-3 font-medium">Client / Recipient</th>
                  <th className="py-2 px-3 font-medium text-right">Items</th>
                  <th className="py-2 px-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#34312B]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#8B8478] font-mono">
                      Loading outbound stream...
                    </td>
                  </tr>
                ) : data?.recent_deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#8B8478]">
                      No active deliveries in your assigned station queue.
                    </td>
                  </tr>
                ) : (
                  data?.recent_deliveries.map((op) => (
                    <tr
                      key={op.id}
                      onClick={() => onSelectOperation(op)}
                      className="hover:bg-[#2E2B26] cursor-pointer transition-colors h-11"
                    >
                      <td className="py-2 px-3 font-mono font-medium text-[#F5F3EF]">
                        {op.reference}
                      </td>
                      <td className="py-2 px-3 text-[#F5F3EF] truncate max-w-[140px]">
                        {op.contact || 'Direct Customer'}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-right text-[#8B8478]">
                        {op.lines.reduce((s, l) => s + l.quantity, 0)} pcs
                      </td>
                      <td className="py-2 px-3 text-center">
                        <StatusBadge status={op.status} size="sm" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
