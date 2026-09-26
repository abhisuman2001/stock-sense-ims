import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { StockMove, OperationType } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  Boxes,
  Calendar,
} from 'lucide-react';

export const MoveHistoryScreen: React.FC = () => {
  const [moves, setMoves] = useState<StockMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const loadMoves = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMoves({
        operation_type: typeFilter || undefined,
        search: search || undefined,
      });
      setMoves(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock move audit history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMoves();
  }, [typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMoves();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#34312B] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F3EF]">
              Stock Move Audit Ledger
            </h1>
            <span className="text-xs font-mono uppercase bg-[#262420] text-[#8B8478] px-2 py-0.5 border border-[#34312B]">
              {moves.length} Executed Moves
            </span>
          </div>
          <p className="text-xs text-[#8B8478] font-mono mt-1">
            Immutable physical stock ledger recording every validated unit movement
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadMoves}
            title="Refresh"
            className="p-2 border border-[#34312B] bg-[#262420] text-[#8B8478] hover:text-[#F5F3EF] hover:border-[#8B8478] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[rgba(217,83,79,0.15)] border border-[#D9534F] text-[#D9534F] text-xs">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#262420] border border-[#34312B] p-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 text-[#8B8478] absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by operation reference, SKU, or product..."
            className="w-full bg-[#1A1816] border border-[#34312B] pl-9 pr-3 py-1.5 text-xs text-[#F5F3EF] focus:outline-none focus:border-[#F2C230] font-mono"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#1A1816] border border-[#34312B] px-3 py-1.5 text-xs text-[#F5F3EF] focus:outline-none focus:border-[#F2C230] font-mono"
          >
            <option value="">All Operation Types</option>
            <option value="receipt">RECEIPT (IN)</option>
            <option value="delivery">DELIVERY (OUT)</option>
            <option value="internal">INTERNAL (INT)</option>
            <option value="adjustment">ADJUSTMENT (ADJ)</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-[#262420] border border-[#34312B] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#34312B] text-[#8B8478] font-mono uppercase">
              <th className="py-3 px-4 font-medium">Operation Ref</th>
              <th className="py-3 px-4 font-medium">Type</th>
              <th className="py-3 px-4 font-medium">Product / SKU</th>
              <th className="py-3 px-4 font-medium">Source Origin</th>
              <th className="py-3 px-4 font-medium">Destination</th>
              <th className="py-3 px-4 font-medium text-right">Quantity Moved</th>
              <th className="py-3 px-4 font-medium text-right">Execution Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#34312B]">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#8B8478] font-mono">
                  Reading immutable audit moves...
                </td>
              </tr>
            ) : moves.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#8B8478]">
                  No stock moves recorded yet. Validate an operation to generate ledger entries.
                </td>
              </tr>
            ) : (
              moves.map((m) => (
                <tr key={m.id} className="hover:bg-[#2E2B26] transition-colors h-12">
                  <td className="py-3 px-4 font-mono font-medium text-[#F2C230]">
                    {m.operation_reference}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[10px] uppercase font-semibold text-[#8B8478] bg-[#1A1816] px-2 py-0.5 border border-[#34312B]">
                      {m.operation_type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#F5F3EF]">{m.product_name}</div>
                    <div className="font-mono text-[10px] text-[#8B8478]">{m.sku}</div>
                  </td>
                  <td className="py-3 px-4 text-[#8B8478]">
                    {m.from_location_name || 'External / Inbound'}
                  </td>
                  <td className="py-3 px-4 text-[#F5F3EF]">
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="w-3 h-3 text-[#F2C230]" />
                      <span>{m.to_location_name || 'Customer / Outbound'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right font-bold text-[#5FA85D]">
                    +{m.quantity.toFixed(1)} {m.uom}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right text-[#8B8478]">
                    {new Date(m.moved_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
