import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { SmartAlert, SmartAlertsResponse, User } from '../types';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  PlusCircle,
  Copy,
  Check,
  X,
  Package,
  ArrowRight,
  TrendingDown,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface SmartAlertsTrayProps {
  currentUser: User | null;
  stockUpdateCounter?: number;
  onNavigateToCatalog?: (searchSku?: string) => void;
  onNavigateToStockLedger?: () => void;
  onNavigateToReplenish?: (productId: number, sku: string) => void;
}

export const SmartAlertsTray: React.FC<SmartAlertsTrayProps> = ({
  currentUser,
  stockUpdateCounter = 0,
  onNavigateToCatalog,
  onNavigateToStockLedger,
  onNavigateToReplenish,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SmartAlertsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'warning' | 'watchlist'>('all');
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  const trayRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isManager =
    currentUser?.role === 'inventory_manager' || (currentUser?.role as any) === 'manager';

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSmartAlerts();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to scan inventory alerts');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and auto-refresh whenever stock moves occur
  useEffect(() => {
    loadAlerts();
  }, [stockUpdateCounter]);

  // Periodic polling every 45 seconds to keep alerts live
  useEffect(() => {
    const interval = setInterval(() => {
      loadAlerts();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to close tray
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        trayRef.current &&
        !trayRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Escape key to close tray
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleCopySku = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const handleAcknowledge = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filtered alert list
  const allAlerts = data?.alerts || [];
  const filteredAlerts = allAlerts.filter((a) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'critical') return a.severity === 'critical';
    if (activeFilter === 'warning') return a.severity === 'warning';
    if (activeFilter === 'watchlist') return a.severity === 'watchlist';
    return true;
  });

  const totalUrgent = (data?.summary.stockouts_count || 0) + (data?.summary.reorder_breaches_count || 0);
  const hasCriticalStockouts = (data?.summary.stockouts_count || 0) > 0;

  return (
    <div className="relative">
      {/* Navbar Notification Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Smart inventory alerts tray"
        title={
          totalUrgent > 0
            ? `Smart Alerts: ${totalUrgent} urgent stock issues detected`
            : 'Smart Alerts: Inventory healthy'
        }
        className={`relative p-2 border transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-[#2E2B26] border-[#F2C230] text-[#F2C230]'
            : totalUrgent > 0
            ? hasCriticalStockouts
              ? 'bg-[#261E1E] border-[#D9534F]/70 text-[#D9534F] hover:border-[#D9534F]'
              : 'bg-[#262420] border-[#E8A33D]/60 text-[#E8A33D] hover:border-[#E8A33D]'
            : 'bg-[#262420] border-[#34312B] text-[#8B8478] hover:text-[#F5F3EF] hover:border-[#8B8478]'
        }`}
      >
        <Bell className={`w-4 h-4 ${hasCriticalStockouts ? 'animate-bounce' : ''}`} />

        {/* Counter Badge */}
        {totalUrgent > 0 && (
          <span
            className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 text-[10px] font-mono font-bold flex items-center justify-center rounded-full shadow-md text-white ${
              hasCriticalStockouts
                ? 'bg-[#D9534F] animate-pulse ring-2 ring-[#D9534F]/30'
                : 'bg-[#E8A33D] text-[#1A1816]'
            }`}
          >
            {totalUrgent > 99 ? '99+' : totalUrgent}
          </span>
        )}
      </button>

      {/* Slide-Down / Popover Tray Panel */}
      {isOpen && (
        <div
          ref={trayRef}
          className="absolute right-0 mt-2.5 w-[360px] sm:w-[440px] md:w-[480px] max-h-[85vh] flex flex-col bg-[#201E1A] border border-[#34312B] shadow-2xl z-50 overflow-hidden text-[#F5F3EF] animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-[#34312B] bg-[#262420] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 border ${
                  hasCriticalStockouts
                    ? 'bg-[#D9534F]/10 border-[#D9534F]/40 text-[#D9534F]'
                    : totalUrgent > 0
                    ? 'bg-[#E8A33D]/10 border-[#E8A33D]/40 text-[#E8A33D]'
                    : 'bg-[#5FA85D]/10 border-[#5FA85D]/40 text-[#5FA85D]'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-[#F5F3EF]">
                    Smart Alerts
                  </h3>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 uppercase tracking-wider bg-[#1A1816] text-[#8B8478] border border-[#34312B]">
                    Real-time Scanner
                  </span>
                </div>
                <p className="text-[11px] text-[#8B8478] font-mono mt-0.5">
                  Automated reorder breaches & depletion monitor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={loadAlerts}
                disabled={loading}
                title="Re-scan inventory now"
                className="p-1.5 border border-[#34312B] bg-[#1A1816] text-[#8B8478] hover:text-[#F5F3EF] hover:border-[#8B8478] transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close tray"
                className="p-1.5 text-[#8B8478] hover:text-[#F5F3EF] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Urgent Executive KPI Ticker */}
          {data && (
            <div className="grid grid-cols-3 gap-2 p-3 bg-[#1A1816] border-b border-[#34312B] text-xs font-mono">
              <div className="p-2 border border-[#34312B] bg-[#201E1A] flex flex-col justify-between">
                <span className="text-[10px] text-[#8B8478] uppercase">Stock-Outs</span>
                <span
                  className={`text-base font-bold mt-1 ${
                    data.summary.stockouts_count > 0 ? 'text-[#D9534F]' : 'text-[#5FA85D]'
                  }`}
                >
                  {data.summary.stockouts_count}
                </span>
              </div>
              <div className="p-2 border border-[#34312B] bg-[#201E1A] flex flex-col justify-between">
                <span className="text-[10px] text-[#8B8478] uppercase">Reorder Breaches</span>
                <span
                  className={`text-base font-bold mt-1 ${
                    data.summary.reorder_breaches_count > 0 ? 'text-[#E8A33D]' : 'text-[#5FA85D]'
                  }`}
                >
                  {data.summary.reorder_breaches_count}
                </span>
              </div>
              <div className="p-2 border border-[#34312B] bg-[#201E1A] flex flex-col justify-between">
                <span className="text-[10px] text-[#8B8478] uppercase">Net Shortfall</span>
                <span className="text-base font-bold text-[#F2C230] mt-1">
                  -{data.summary.total_shortfall_units} <span className="text-[10px] text-[#8B8478]">UNITS</span>
                </span>
              </div>
            </div>
          )}

          {/* Filter Navigation Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[#34312B] bg-[#262420] text-xs font-mono overflow-x-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2 py-1 text-[11px] border transition-colors cursor-pointer shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-[#1A1816] text-[#F2C230] border-[#F2C230]'
                  : 'bg-transparent text-[#8B8478] border-transparent hover:text-[#F5F3EF]'
              }`}
            >
              All ({allAlerts.length})
            </button>
            <button
              onClick={() => setActiveFilter('critical')}
              className={`px-2 py-1 text-[11px] border transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                activeFilter === 'critical'
                  ? 'bg-[#1A1816] text-[#D9534F] border-[#D9534F]'
                  : 'bg-transparent text-[#8B8478] border-transparent hover:text-[#D9534F]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F]" />
              Stockouts ({data?.summary.stockouts_count || 0})
            </button>
            <button
              onClick={() => setActiveFilter('warning')}
              className={`px-2 py-1 text-[11px] border transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                activeFilter === 'warning'
                  ? 'bg-[#1A1816] text-[#E8A33D] border-[#E8A33D]'
                  : 'bg-transparent text-[#8B8478] border-transparent hover:text-[#E8A33D]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8A33D]" />
              Reorder Breaches ({data?.summary.reorder_breaches_count || 0})
            </button>
            <button
              onClick={() => setActiveFilter('watchlist')}
              className={`px-2 py-1 text-[11px] border transition-colors cursor-pointer shrink-0 ${
                activeFilter === 'watchlist'
                  ? 'bg-[#1A1816] text-[#4A90D9] border-[#4A90D9]'
                  : 'bg-transparent text-[#8B8478] border-transparent hover:text-[#F5F3EF]'
              }`}
            >
              Buffer Watch ({data?.summary.watchlist_count || 0})
            </button>
          </div>

          {/* Scrollable Alerts Content Area */}
          <div className="flex-1 overflow-y-auto max-h-[460px] p-3 space-y-2.5">
            {error && (
              <div className="p-3 bg-[#D9534F]/10 border border-[#D9534F] text-[#D9534F] text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {filteredAlerts.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-[#5FA85D]/10 border border-[#5FA85D]/30 text-[#5FA85D] flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#F5F3EF]">
                  All Inventory Levels Healthy
                </h4>
                <p className="text-xs text-[#8B8478] font-mono mt-1 max-w-xs mx-auto">
                  {activeFilter === 'all'
                    ? 'No stockouts or reorder point violations detected. All items have adequate operating buffers.'
                    : `No items matching the '${activeFilter}' filter criteria.`}
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isAcknowledged = acknowledgedIds.has(alert.id);
                const isStockout = alert.type === 'stockout';
                const isReorder = alert.type === 'reorder_breach';

                // Calculate buffer percent
                const pct = alert.reorder_point > 0
                  ? Math.min(100, Math.round((alert.total_on_hand / alert.reorder_point) * 100))
                  : 100;

                return (
                  <div
                    key={alert.id}
                    className={`border p-3 transition-colors relative ${
                      isAcknowledged
                        ? 'opacity-60 bg-[#1D1B18] border-[#34312B]'
                        : isStockout
                        ? 'bg-[#221B1B] border-[#D9534F]/60 hover:border-[#D9534F]'
                        : isReorder
                        ? 'bg-[#221F18] border-[#E8A33D]/60 hover:border-[#E8A33D]'
                        : 'bg-[#1C2026] border-[#4A90D9]/50 hover:border-[#4A90D9]'
                    }`}
                  >
                    {/* Top Row: Severity Tag & SKU */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isStockout ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-[#D9534F] text-white rounded-none">
                            <AlertCircle className="w-3 h-3" />
                            CRITICAL STOCKOUT
                          </span>
                        ) : isReorder ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-[#E8A33D] text-[#1A1816] rounded-none">
                            <AlertTriangle className="w-3 h-3" />
                            REORDER BREACH
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-[#4A90D9]/20 text-[#4A90D9] border border-[#4A90D9]/40 rounded-none">
                            <TrendingDown className="w-3 h-3" />
                            LOW BUFFER
                          </span>
                        )}

                        <span className="text-[10px] font-mono font-bold text-[#F5F3EF] bg-[#1A1816] px-1.5 py-0.5 border border-[#34312B]">
                          {alert.sku}
                        </span>

                        {alert.category_name && (
                          <span className="text-[10px] font-mono text-[#8B8478] bg-[#1A1816] px-1.5 py-0.5 border border-[#34312B]">
                            {alert.category_name}
                          </span>
                        )}
                      </div>

                      {/* Acknowledge Toggle */}
                      <button
                        type="button"
                        onClick={(e) => handleAcknowledge(alert.id, e)}
                        title={isAcknowledged ? 'Mark unhandled' : 'Mark acknowledged for this shift'}
                        className={`text-[10px] font-mono px-1.5 py-0.5 border transition-colors cursor-pointer ${
                          isAcknowledged
                            ? 'bg-[#262420] text-[#8B8478] border-[#34312B]'
                            : 'bg-[#1A1816] text-[#8B8478] hover:text-[#F5F3EF] border-[#34312B]'
                        }`}
                      >
                        {isAcknowledged ? 'Acknowledged' : 'Acknowledge'}
                      </button>
                    </div>

                    {/* Product Name */}
                    <div className="font-semibold text-sm text-[#F5F3EF] mb-2 leading-tight">
                      {alert.name}
                    </div>

                    {/* Stock Meter & Numbers */}
                    <div className="bg-[#1A1816] p-2 border border-[#34312B] mb-2 text-xs font-mono">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-[#8B8478]">On-Hand:</span>
                        <span
                          className={`font-bold ${
                            isStockout
                              ? 'text-[#D9534F]'
                              : isReorder
                              ? 'text-[#E8A33D]'
                              : 'text-[#F5F3EF]'
                          }`}
                        >
                          {alert.total_on_hand} {alert.uom}
                        </span>
                        <span className="text-[#8B8478] text-[10px]">
                          Target Threshold: {alert.reorder_point} {alert.uom}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-[#262420] h-1.5 rounded-none overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isStockout
                              ? 'bg-[#D9534F] w-0'
                              : isReorder
                              ? 'bg-[#E8A33D]'
                              : 'bg-[#4A90D9]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#8B8478] mt-1">
                        <span>Buffer Health: {pct}%</span>
                        <span className="text-[#F2C230] font-semibold">
                          Deficit: -{alert.shortfall} {alert.uom}
                        </span>
                      </div>
                    </div>

                    {/* Replenishment Inbound Intelligence */}
                    {alert.inbound_in_progress ? (
                      <div className="p-1.5 bg-[#5FA85D]/10 border border-[#5FA85D]/40 text-[#5FA85D] text-[11px] font-mono flex items-center justify-between gap-1 mb-2">
                        <div className="flex items-center gap-1 truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            PO Inbound: <strong>{alert.inbound_in_progress.reference}</strong> (+{alert.inbound_in_progress.quantity} {alert.uom})
                          </span>
                        </div>
                        <span className="uppercase text-[9px] px-1 py-0.2 bg-[#1A1816] text-[#5FA85D] border border-[#5FA85D]/30 shrink-0">
                          {alert.inbound_in_progress.status}
                        </span>
                      </div>
                    ) : (
                      <div className="p-1.5 bg-[#D9534F]/10 border border-[#D9534F]/30 text-[#D9534F] text-[10.5px] font-mono flex items-center gap-1.5 mb-2">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>No inbound replenishment order in progress</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-[#34312B] text-xs font-mono">
                      {/* View in Catalog Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          if (onNavigateToCatalog) {
                            onNavigateToCatalog(alert.sku);
                          }
                        }}
                        className="flex-1 py-1.5 px-2 bg-[#262420] hover:bg-[#34312B] border border-[#34312B] hover:border-[#F2C230] text-[#F5F3EF] hover:text-[#F2C230] transition-colors flex items-center justify-center gap-1 cursor-pointer text-[11px]"
                        title={`Focus SKU ${alert.sku} in Catalog`}
                      >
                        <ExternalLink className="w-3 h-3 text-[#F2C230]" />
                        <span>View in Catalog</span>
                      </button>

                      {/* Quick Replenish / Inbound PO (Manager) */}
                      {isManager && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            if (onNavigateToReplenish) {
                              onNavigateToReplenish(alert.product_id, alert.sku);
                            }
                          }}
                          className="flex-1 py-1.5 px-2 bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer text-[11px]"
                          title="Generate Inbound Goods Receipt"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Replenish</span>
                        </button>
                      )}

                      {/* Copy SKU */}
                      <button
                        type="button"
                        onClick={(e) => handleCopySku(alert.sku, e)}
                        title="Copy SKU code"
                        className="p-1.5 bg-[#1A1816] border border-[#34312B] hover:border-[#8B8478] text-[#8B8478] hover:text-[#F5F3EF] transition-colors cursor-pointer"
                      >
                        {copiedSku === alert.sku ? (
                          <Check className="w-3.5 h-3.5 text-[#5FA85D]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 border-t border-[#34312B] bg-[#262420] flex items-center justify-between text-[11px] font-mono text-[#8B8478]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#5FA85D] animate-ping" />
              <span>
                Scanned {data?.last_scanned_at ? new Date(data.last_scanned_at).toLocaleTimeString() : 'now'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onNavigateToStockLedger) {
                  onNavigateToStockLedger();
                }
              }}
              className="text-[#F2C230] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Physical Stock Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
