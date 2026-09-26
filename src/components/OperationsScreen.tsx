import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  Operation,
  OperationType,
  OperationStatus,
  Product,
  Warehouse,
  Location,
  User,
} from '../types';
import { StatusBadge } from './StatusBadge';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  SlidersHorizontal,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Printer,
  CheckCircle2,
  XCircle,
  X,
  Calendar,
  UserCheck,
  Building2,
  List,
  Kanban,
  Check,
  AlertCircle,
} from 'lucide-react';

interface OperationsScreenProps {
  type: OperationType;
  selectedOpFromDashboard?: Operation | null;
  onClearSelectedOpFromDashboard?: () => void;
  currentUser: User | null;
  onStockUpdated?: () => void;
}

export const OperationsScreen: React.FC<OperationsScreenProps> = ({
  type,
  selectedOpFromDashboard,
  onClearSelectedOpFromDashboard,
  currentUser,
  onStockUpdated,
}) => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Filters & View Mode
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Selected Operation for Detail Drawer / Modal
  const [activeOp, setActiveOp] = useState<Operation | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // New Operation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(1);
  const [sourceLocationId, setSourceLocationId] = useState<number | null>(null);
  const [destLocationId, setDestLocationId] = useState<number | null>(null);
  const [contact, setContact] = useState('');
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 16));
  const [lines, setLines] = useState<{ product_id: number; quantity: number }[]>([
    { product_id: 1, quantity: 10 },
  ]);
  const [creating, setCreating] = useState(false);

  // Printable document preview state
  const [showPrintModal, setShowPrintModal] = useState(false);

  const getTitleByType = () => {
    switch (type) {
      case 'receipt':
        return { title: 'Inbound Receipts (IN)', desc: 'Vendor delivery receipts, dock check-in, and warehouse putaway' };
      case 'delivery':
        return { title: 'Delivery Orders (OUT)', desc: 'Customer dispatches, outbound picking, packing, and carrier handoff' };
      case 'internal':
        return { title: 'Internal Transfers (INT)', desc: 'Movement between locations, cold storage, and buffer zones' };
      case 'adjustment':
        return { title: 'Stock Adjustments (ADJ)', desc: 'Cycle counting discrepancies, scrap logging, and inventory corrections' };
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ops, prods, whs, locs] = await Promise.all([
        api.getOperations({
          type,
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        api.getProducts(),
        api.getWarehouses(),
        api.getLocations(),
      ]);
      setOperations(ops);
      setProducts(prods);
      setWarehouses(whs);
      setLocations(locs);

      // If activeOp is currently open, refresh it
      if (activeOp) {
        const fresh = ops.find((o) => o.id === activeOp.id);
        if (fresh) setActiveOp(fresh);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [type, statusFilter]);

  // Handle selected operation passed from dashboard
  useEffect(() => {
    if (selectedOpFromDashboard) {
      setActiveOp(selectedOpFromDashboard);
      if (onClearSelectedOpFromDashboard) onClearSelectedOpFromDashboard();
    }
  }, [selectedOpFromDashboard]);

  // Set default locations when opening modal or warehouse changes
  useEffect(() => {
    const whLocs = locations.filter((l) => l.warehouse_id === selectedWarehouseId);
    const stockLoc = whLocs.find((l) => l.short_code === 'STOCK') || whLocs[0];
    const inputLoc = whLocs.find((l) => l.short_code === 'INPUT') || whLocs[0];
    const outputLoc = whLocs.find((l) => l.short_code === 'OUTPUT') || whLocs[0];
    const scrapLoc = whLocs.find((l) => l.short_code === 'SCRAP') || whLocs[0];

    if (type === 'receipt') {
      setSourceLocationId(inputLoc ? inputLoc.id : null);
      setDestLocationId(stockLoc ? stockLoc.id : null);
    } else if (type === 'delivery') {
      setSourceLocationId(stockLoc ? stockLoc.id : null);
      setDestLocationId(outputLoc ? outputLoc.id : null);
    } else if (type === 'internal') {
      setSourceLocationId(stockLoc ? stockLoc.id : null);
      const otherStock = locations.find((l) => l.id !== stockLoc?.id);
      setDestLocationId(otherStock ? otherStock.id : null);
    } else if (type === 'adjustment') {
      setSourceLocationId(stockLoc ? stockLoc.id : null);
      setDestLocationId(scrapLoc ? scrapLoc.id : null);
    }
  }, [selectedWarehouseId, type, locations]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleValidateOperation = async (opId: number) => {
    setActionInProgress(true);
    setError(null);
    try {
      const updated = await api.validateOperation(opId);
      setActiveOp(updated);
      setActionSuccessMsg(`Operation ${updated.reference} validated! Stock quants updated atomically.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      loadData();
      if (onStockUpdated) onStockUpdated();
    } catch (err: any) {
      setError(err.message || 'Validation failed');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleMarkReady = async (opId: number) => {
    setActionInProgress(true);
    setError(null);
    try {
      const updated = await api.markOperationReady(opId);
      setActiveOp(updated);
      if (updated.status === 'waiting') {
        setError(`Insufficient stock at source location. Marked as WAITING.`);
      } else {
        setActionSuccessMsg(`Operation ${updated.reference} marked as READY.`);
        setTimeout(() => setActionSuccessMsg(null), 3000);
      }
      loadData();
    } catch (err: any) {
      setError(err.message || 'Status transition failed');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCancelOperation = async (opId: number) => {
    if (!confirm('Are you sure you want to cancel this operation document?')) return;
    setActionInProgress(true);
    setError(null);
    try {
      const updated = await api.cancelOperation(opId);
      setActiveOp(updated);
      setActionSuccessMsg(`Operation ${updated.reference} cancelled.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Cancellation failed');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCreateOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const validLines = lines.filter((l) => l.product_id && l.quantity > 0);
      if (validLines.length === 0) {
        setError('At least one item line with quantity > 0 is required');
        setCreating(false);
        return;
      }

      const newOp = await api.createOperation({
        warehouse_id: selectedWarehouseId,
        type,
        source_location_id: sourceLocationId,
        dest_location_id: destLocationId,
        contact: contact.trim() || undefined,
        schedule_date: new Date(scheduleDate).toISOString(),
        responsible_user_id: currentUser?.id || 1,
        lines: validLines,
      });

      setShowCreateModal(false);
      setContact('');
      setLines([{ product_id: products[0]?.id || 1, quantity: 10 }]);
      setActionSuccessMsg(`Operation ${newOp.reference} generated successfully in DRAFT state.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      loadData();
      setActiveOp(newOp);
    } catch (err: any) {
      setError(err.message || 'Failed to create operation document');
    } finally {
      setCreating(false);
    }
  };

  const addLine = () => {
    const firstProd = products[0]?.id || 1;
    setLines([...lines, { product_id: firstProd, quantity: 1 }]);
  };

  const updateLine = (idx: number, field: 'product_id' | 'quantity', val: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };
    setLines(updated);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const info = getTitleByType();

  // Kanban groupings
  const kanbanColumns: OperationStatus[] = ['draft', 'waiting', 'ready', 'done', 'cancelled'];

  return (
    <div className="space-y-6">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#34312B] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F3EF]">
              {info.title}
            </h1>
            <span className="text-xs font-mono uppercase bg-[#262420] text-[#8B8478] px-2 py-0.5 border border-[#34312B]">
              {operations.length} Records
            </span>
          </div>
          <p className="text-xs text-[#8B8478] font-mono mt-1">{info.desc}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 border border-[#34312B] bg-[#262420] text-[#8B8478] hover:text-[#F5F3EF] hover:border-[#8B8478] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-semibold text-xs py-2 px-3 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Operation</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-[rgba(95,168,93,0.15)] border border-[#5FA85D] text-[#5FA85D] text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-[rgba(217,83,79,0.15)] border border-[#D9534F] text-[#D9534F] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and View Toggles */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#262420] border border-[#34312B] p-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 text-[#8B8478] absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${type} reference code or contact...`}
            className="w-full bg-[#1A1816] border border-[#34312B] pl-9 pr-3 py-1.5 text-xs text-[#F5F3EF] focus:outline-none focus:border-[#F2C230] font-mono"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#1A1816] border border-[#34312B] px-3 py-1.5 text-xs text-[#F5F3EF] focus:outline-none focus:border-[#F2C230] font-mono"
          >
            <option value="">All Statuses</option>
            <option value="draft">DRAFT</option>
            <option value="waiting">WAITING</option>
            <option value="ready">READY</option>
            <option value="done">DONE</option>
            <option value="cancelled">CANCELLED</option>
          </select>

          <div className="flex border border-[#34312B]">
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 ${
                viewMode === 'list'
                  ? 'bg-[#F2C230] text-[#1A1816]'
                  : 'bg-[#1A1816] text-[#8B8478] hover:text-[#F5F3EF]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              title="Kanban Board"
              className={`p-1.5 ${
                viewMode === 'kanban'
                  ? 'bg-[#F2C230] text-[#1A1816]'
                  : 'bg-[#1A1816] text-[#8B8478] hover:text-[#F5F3EF]'
              }`}
            >
              <Kanban className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: DATA TABLE */}
      {viewMode === 'list' && (
        <div className="bg-[#262420] border border-[#34312B] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#34312B] text-[#8B8478] font-mono uppercase">
                <th className="py-3 px-4 font-medium">Reference</th>
                <th className="py-3 px-4 font-medium">Contact / Party</th>
                <th className="py-3 px-4 font-medium">Source</th>
                <th className="py-3 px-4 font-medium">Destination</th>
                <th className="py-3 px-4 font-medium">Scheduled</th>
                <th className="py-3 px-4 font-medium text-right">Items / Lines</th>
                <th className="py-3 px-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#34312B]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8B8478] font-mono">
                    Loading operation records...
                  </td>
                </tr>
              ) : operations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8B8478]">
                    No operations found for this view.
                  </td>
                </tr>
              ) : (
                operations.map((op) => (
                  <tr
                    key={op.id}
                    onClick={() => setActiveOp(op)}
                    className="hover:bg-[#2E2B26] cursor-pointer transition-colors h-12"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-[#F2C230]">
                      {op.reference}
                    </td>
                    <td className="py-3 px-4 text-[#F5F3EF]">
                      {op.contact || '—'}
                    </td>
                    <td className="py-3 px-4 text-[#8B8478]">
                      {op.source_location_name || 'Vendor / Incoming Bay'}
                    </td>
                    <td className="py-3 px-4 text-[#8B8478]">
                      {op.dest_location_name || 'Customer / Dispatch'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#8B8478]">
                      {new Date(op.schedule_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-[#F5F3EF]">
                      {op.lines.reduce((s, l) => s + l.quantity, 0)} ({op.lines.length} lines)
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={op.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {kanbanColumns.map((st) => {
            const colOps = operations.filter((o) => o.status === st);
            return (
              <div key={st} className="bg-[#262420] border border-[#34312B] p-3 flex flex-col min-h-[420px]">
                <div className="flex items-center justify-between border-b border-[#34312B] pb-2 mb-3">
                  <span className="font-mono text-xs font-bold uppercase text-[#8B8478]">
                    {st}
                  </span>
                  <span className="font-mono text-xs text-[#8B8478] bg-[#1A1816] px-1.5 py-0.5 border border-[#34312B]">
                    {colOps.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto">
                  {colOps.map((op) => (
                    <div
                      key={op.id}
                      onClick={() => setActiveOp(op)}
                      className="bg-[#1A1816] border border-[#34312B] hover:border-[#F2C230] p-3 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-medium text-xs text-[#F2C230]">
                          {op.reference}
                        </span>
                        <StatusBadge status={op.status} size="sm" />
                      </div>
                      <div className="text-xs text-[#F5F3EF] truncate mb-2">
                        {op.contact || 'Internal Move'}
                      </div>
                      <div className="text-[11px] text-[#8B8478] font-mono flex items-center justify-between">
                        <span>{op.lines.reduce((s, l) => s + l.quantity, 0)} units</span>
                        <span>{new Date(op.schedule_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}

                  {colOps.length === 0 && (
                    <div className="text-center py-8 text-[11px] font-mono text-[#8B8478]">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL / DRAWER */}
      {activeOp && (
        <div className="fixed inset-0 z-50 bg-[rgba(26,24,22,0.85)] flex items-center justify-center p-4">
          <div className="bg-[#262420] border border-[#34312B] max-w-2xl w-full p-6 shadow-none max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#34312B] mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold font-mono text-[#F2C230]">
                    {activeOp.reference}
                  </h2>
                  <StatusBadge status={activeOp.status} />
                </div>
                <div className="text-xs text-[#8B8478] uppercase font-mono">
                  Operation Type: {activeOp.type.toUpperCase()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPrintModal(true)}
                  title="Print Slip"
                  className="p-2 border border-[#34312B] bg-[#1A1816] text-[#8B8478] hover:text-[#F5F3EF]"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveOp(null)}
                  className="p-2 text-[#8B8478] hover:text-[#F5F3EF]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Attributes */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-[#1A1816] p-4 border border-[#34312B]">
              <div>
                <div className="text-[10px] font-mono text-[#8B8478] uppercase mb-0.5">
                  Contact / Partner
                </div>
                <div className="text-[#F5F3EF] font-medium">
                  {activeOp.contact || 'Standard Transfer'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-[#8B8478] uppercase mb-0.5">
                  Scheduled Execution
                </div>
                <div className="text-[#F5F3EF] font-mono">
                  {new Date(activeOp.schedule_date).toLocaleString()}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-[#8B8478] uppercase mb-0.5">
                  Source Location
                </div>
                <div className="text-[#F5F3EF]">
                  {activeOp.source_location_name || 'Vendor Inflow'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-[#8B8478] uppercase mb-0.5">
                  Destination Location
                </div>
                <div className="text-[#F5F3EF]">
                  {activeOp.dest_location_name || 'Outbound Delivery'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-[#8B8478] uppercase mb-0.5">
                  Responsible Operator
                </div>
                <div className="text-[#F5F3EF]">
                  {activeOp.responsible_user_name || 'Sarah Connor'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-[#8B8478] uppercase mb-0.5">
                  Creation Timestamp
                </div>
                <div className="text-[#8B8478] font-mono">
                  {new Date(activeOp.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-6">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#8B8478] mb-2">
                Operational Line Items ({activeOp.lines.length})
              </h3>
              <div className="border border-[#34312B] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#34312B] text-[#8B8478] font-mono uppercase bg-[#1A1816]">
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Product Description</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3">UoM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#34312B]">
                    {activeOp.lines.map((line) => (
                      <tr key={line.id} className="h-10">
                        <td className="py-2 px-3 font-mono font-medium text-[#F2C230]">
                          {line.sku}
                        </td>
                        <td className="py-2 px-3 text-[#F5F3EF]">
                          {line.product_name}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-right font-semibold text-[#F5F3EF]">
                          {line.quantity.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 font-mono text-[#8B8478]">
                          {line.uom}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions Bar adhering to single primary button rule */}
            <div className="flex items-center justify-between pt-4 border-t border-[#34312B]">
              <div className="flex items-center gap-2">
                {activeOp.status !== 'done' && activeOp.status !== 'cancelled' && (
                  <button
                    onClick={() => handleCancelOperation(activeOp.id)}
                    disabled={actionInProgress}
                    className="px-3 py-2 border border-[#34312B] bg-[#1A1816] text-[#D9534F] hover:border-[#D9534F] text-xs font-mono cursor-pointer"
                  >
                    Cancel Document
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeOp.status === 'draft' && (
                  <button
                    onClick={() => handleMarkReady(activeOp.id)}
                    disabled={actionInProgress}
                    className="px-3 py-2 border border-[#34312B] bg-[#1A1816] text-[#F5F3EF] hover:border-[#8B8478] text-xs font-mono cursor-pointer"
                  >
                    Check & Mark Ready
                  </button>
                )}

                {/* Single accent-filled primary action button */}
                {['draft', 'waiting', 'ready'].includes(activeOp.status) && (
                  <button
                    onClick={() => handleValidateOperation(activeOp.id)}
                    disabled={actionInProgress}
                    className="px-4 py-2 bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Validate & Move Stock</span>
                  </button>
                )}

                {activeOp.status === 'done' && (
                  <span className="text-xs font-mono text-[#5FA85D] flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Stock Moves Finalized & Immutable</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE OPERATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(26,24,22,0.85)] flex items-center justify-center p-4">
          <div className="bg-[#262420] border border-[#34312B] max-w-xl w-full p-6 shadow-none max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#34312B] mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F3EF]">
                New {type.toUpperCase()} Document
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#8B8478] hover:text-[#F5F3EF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOperation} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                    Warehouse Facility *
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
                    className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] focus:outline-none focus:border-[#F2C230]"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        [{w.short_code}] {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                    {type === 'receipt' ? 'Vendor / Supplier' : 'Client / Recipient'}
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder={type === 'receipt' ? 'Supplier name' : 'Customer name'}
                    className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                    Source Location
                  </label>
                  <select
                    value={sourceLocationId || ''}
                    onChange={(e) => setSourceLocationId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] focus:outline-none focus:border-[#F2C230]"
                  >
                    <option value="">Vendor / External Inbound Bay</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        [{l.warehouse_code || 'WH'}] {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                    Destination Location
                  </label>
                  <select
                    value={destLocationId || ''}
                    onChange={(e) => setDestLocationId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] focus:outline-none focus:border-[#F2C230]"
                  >
                    <option value="">Customer / Dispatch Bay</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        [{l.warehouse_code || 'WH'}] {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                  Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] font-mono focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              {/* Dynamic Line Items */}
              <div className="pt-3 border-t border-[#34312B]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-mono uppercase text-[#8B8478] tracking-wider">
                    Move Quantities
                  </div>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-xs text-[#F2C230] hover:underline flex items-center gap-1 font-mono"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {lines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={line.product_id}
                        onChange={(e) => updateLine(idx, 'product_id', Number(e.target.value))}
                        className="flex-1 bg-[#1A1816] border border-[#34312B] px-2 py-1.5 text-[#F5F3EF] text-xs focus:outline-none focus:border-[#F2C230]"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.name} ({p.uom})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                        className="w-24 bg-[#1A1816] border border-[#34312B] px-2 py-1.5 text-[#F5F3EF] font-mono text-right text-xs focus:outline-none focus:border-[#F2C230]"
                        placeholder="Qty"
                      />
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="p-1.5 text-[#8B8478] hover:text-[#D9534F]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#34312B]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#34312B] bg-[#1A1816] text-[#8B8478] hover:text-[#F5F3EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-semibold cursor-pointer"
                >
                  {creating ? 'Generating Reference...' : 'Generate Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT SLIP PREVIEW MODAL */}
      {showPrintModal && activeOp && (
        <div className="fixed inset-0 z-50 bg-[rgba(26,24,22,0.9)] flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] text-[#000000] max-w-xl w-full p-8 font-sans shadow-lg">
            <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold font-mono tracking-wider">STOCKSENSE IMS</h1>
                <p className="text-xs uppercase font-mono text-neutral-600">
                  {activeOp.type.toUpperCase()} RUN SLIP / PICK LIST
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-bold">{activeOp.reference}</div>
                <div className="text-xs font-mono">{new Date(activeOp.schedule_date).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-6">
              <div>
                <span className="font-bold">Contact / Party:</span> {activeOp.contact || 'Internal'}
              </div>
              <div>
                <span className="font-bold">Status:</span> {activeOp.status.toUpperCase()}
              </div>
              <div>
                <span className="font-bold">Source:</span> {activeOp.source_location_name || 'Vendor Inflow'}
              </div>
              <div>
                <span className="font-bold">Dest:</span> {activeOp.dest_location_name || 'Outbound'}
              </div>
            </div>

            <table className="w-full text-left text-xs mb-8 font-mono border-t border-b border-black">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-2">SKU</th>
                  <th className="py-2">Item Description</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2">Sign-off</th>
                </tr>
              </thead>
              <tbody>
                {activeOp.lines.map((l) => (
                  <tr key={l.id} className="border-b border-neutral-300">
                    <td className="py-2 font-bold">{l.sku}</td>
                    <td className="py-2">{l.product_name}</td>
                    <td className="py-2 text-right font-bold">{l.quantity} {l.uom}</td>
                    <td className="py-2">______</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-end border-t border-dashed border-neutral-400 pt-4 text-xs font-mono">
              <div>Operator: {activeOp.responsible_user_name || 'Floor Staff'}</div>
              <div>Signature: __________________________</div>
            </div>

            <div className="mt-6 flex justify-end gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-black text-white text-xs font-bold font-mono"
              >
                Print Slip
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border border-black text-xs font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
