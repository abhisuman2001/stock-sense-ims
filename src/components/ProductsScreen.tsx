import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Product, StockQuant, Category, Warehouse, Location, User } from '../types';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Edit2,
  Check,
  X,
  Warehouse as WarehouseIcon,
} from 'lucide-react';

interface ProductsScreenProps {
  subTab: 'catalog' | 'stock';
  onSwitchSubTab: (tab: 'catalog' | 'stock') => void;
  currentUser?: User | null;
}

export const ProductsScreen: React.FC<ProductsScreenProps> = ({ subTab, onSwitchSubTab, currentUser }) => {
  const isManager =
    currentUser?.role === 'inventory_manager' || (currentUser?.role as any) === 'manager';
  const [products, setProducts] = useState<Product[]>([]);
  const [stockQuants, setStockQuants] = useState<StockQuant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

  // Inline Stock Editing state: { key: `${productId}_${locationId}`, value: number }
  const [editingQuantKey, setEditingQuantKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [savingStock, setSavingStock] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // New Product Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSku, setCreateSku] = useState('');
  const [createName, setCreateName] = useState('');
  const [createCategoryId, setCreateCategoryId] = useState<string>('');
  const [createUom, setCreateUom] = useState('Units');
  const [createReorderPoint, setCreateReorderPoint] = useState('10');
  const [createCost, setCreateCost] = useState('0');
  const [createInitialStock, setCreateInitialStock] = useState('0');
  const [createInitialLocationId, setCreateInitialLocationId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, cats, whs, locs, stks] = await Promise.all([
        api.getProducts({
          category_id: selectedCategory ? Number(selectedCategory) : undefined,
          search: search || undefined,
        }),
        api.getCategories(),
        api.getWarehouses(),
        api.getLocations(),
        api.getStock(selectedWarehouse ? Number(selectedWarehouse) : undefined),
      ]);
      setProducts(prods);
      setCategories(cats);
      setWarehouses(whs);
      setLocations(locs);
      setStockQuants(stks);
    } catch (err: any) {
      setError(err.message || 'Failed to load product data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedWarehouse]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createProduct({
        sku: createSku.trim().toUpperCase(),
        name: createName.trim(),
        category_id: createCategoryId ? Number(createCategoryId) : null,
        uom: createUom.trim(),
        reorder_point: Number(createReorderPoint) || 0,
        cost: Number(createCost) || 0,
        initial_stock: Number(createInitialStock) || 0,
        initial_location_id: createInitialLocationId ? Number(createInitialLocationId) : undefined,
      });

      setShowCreateModal(false);
      setCreateSku('');
      setCreateName('');
      setCreateCost('0');
      setCreateInitialStock('0');
      setFeedbackMsg('Product created successfully.');
      setTimeout(() => setFeedbackMsg(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  const startEditQuant = (q: StockQuant) => {
    setEditingQuantKey(`${q.product_id}_${q.location_id}`);
    setEditingValue(String(q.on_hand));
  };

  const saveEditQuant = async (productId: number, locationId: number) => {
    const val = Number(editingValue);
    if (isNaN(val) || val < 0) {
      setError('Stock on hand cannot be negative');
      return;
    }

    setSavingStock(true);
    try {
      const updated = await api.updateStockQuant(productId, locationId, val);
      setStockQuants((prev) =>
        prev.map((q) =>
          q.product_id === productId && q.location_id === locationId ? updated : q
        )
      );
      setEditingQuantKey(null);
      setFeedbackMsg(`Stock updated to ${updated.on_hand} ${updated.uom}`);
      setTimeout(() => setFeedbackMsg(null), 3000);
      // Reload products to refresh aggregate counts
      const prods = await api.getProducts();
      setProducts(prods);
    } catch (err: any) {
      setError(err.message || 'Failed to update stock');
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#34312B] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F3EF]">
              {subTab === 'catalog' ? 'Product Catalog' : 'Physical Stock Ledger'}
            </h1>
            <span className="text-xs font-mono uppercase bg-[#262420] text-[#8B8478] px-2 py-0.5 border border-[#34312B]">
              {subTab === 'catalog' ? `${products.length} Items` : `${stockQuants.length} Location Quants`}
            </span>
          </div>
          <p className="text-xs text-[#8B8478] font-mono mt-1">
            {subTab === 'catalog'
              ? 'Catalog definitions, SKU codes, minimum reorder thresholds, and unit costs'
              : 'Direct physical inventory by location — click on-hand numbers to edit inline'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 border border-[#34312B] bg-[#262420] text-[#8B8478] hover:text-[#F5F3EF] hover:border-[#8B8478] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isManager && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-semibold text-xs py-2 px-3 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Product</span>
            </button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-[rgba(95,168,93,0.15)] border border-[#5FA85D] text-[#5FA85D] text-xs font-mono">
          ✓ {feedbackMsg}
        </div>
      )}

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
            placeholder="Search by SKU or item description (Press Enter)..."
            className="w-full bg-[#1A1816] border border-[#34312B] pl-9 pr-3 py-1.5 text-xs text-[#F5F3EF] focus:outline-none focus:border-[#F2C230] font-mono"
          />
        </form>

        <div className="flex items-center gap-2">
          {subTab === 'catalog' ? (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#1A1816] border border-[#34312B] px-3 py-1.5 text-xs text-[#F5F3EF] focus:outline-none focus:border-[#F2C230] font-mono"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="bg-[#1A1816] border border-[#34312B] px-3 py-1.5 text-xs text-[#F5F3EF] focus:outline-none focus:border-[#F2C230] font-mono"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  [{w.short_code}] {w.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex border border-[#34312B]">
            <button
              onClick={() => onSwitchSubTab('catalog')}
              className={`px-3 py-1.5 text-xs font-mono uppercase ${
                subTab === 'catalog'
                  ? 'bg-[#F2C230] text-[#1A1816] font-semibold'
                  : 'bg-[#1A1816] text-[#8B8478] hover:text-[#F5F3EF]'
              }`}
            >
              Catalog
            </button>
            <button
              onClick={() => onSwitchSubTab('stock')}
              className={`px-3 py-1.5 text-xs font-mono uppercase ${
                subTab === 'stock'
                  ? 'bg-[#F2C230] text-[#1A1816] font-semibold'
                  : 'bg-[#1A1816] text-[#8B8478] hover:text-[#F5F3EF]'
              }`}
            >
              Stock Ledger
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: PRODUCT CATALOG */}
      {subTab === 'catalog' && (
        <div className="bg-[#262420] border border-[#34312B] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#34312B] text-[#8B8478] font-mono uppercase">
                <th className="py-3 px-4 font-medium">SKU</th>
                <th className="py-3 px-4 font-medium">Item Description</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">UoM</th>
                <th className="py-3 px-4 font-medium text-right">Unit Cost</th>
                <th className="py-3 px-4 font-medium text-right">Reorder Pt</th>
                <th className="py-3 px-4 font-medium text-right">Total On Hand</th>
                <th className="py-3 px-4 font-medium text-right">Free to Use</th>
                <th className="py-3 px-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#34312B]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#8B8478] font-mono">
                    Reading product catalog records...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#8B8478]">
                    No products match the selected criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.total_on_hand <= p.reorder_point;
                  return (
                    <tr key={p.id} className="hover:bg-[#2E2B26] transition-colors h-12">
                      <td className="py-3 px-4 font-mono font-medium text-[#F2C230]">
                        {p.sku}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#F5F3EF]">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-[#8B8478]">
                        {p.category_name || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#8B8478]">
                        {p.uom}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-[#F5F3EF]">
                        {p.cost !== null && p.cost !== undefined ? `$${p.cost.toFixed(2)}` : (
                          <span className="text-[10px] text-[#8B8478] font-mono">RESTRICTED</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-[#8B8478]">
                        {p.reorder_point.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right font-medium text-[#F5F3EF]">
                        {p.total_on_hand.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right font-medium text-[#F5F3EF]">
                        {p.total_free_to_use.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase font-semibold px-2 py-0.5 border border-[#E8A33D] text-[#E8A33D] bg-[rgba(232,163,61,0.12)]">
                            <AlertTriangle className="w-3 h-3" />
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] uppercase font-semibold text-[#8B8478]">
                            NORMAL
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 2: PHYSICAL STOCK LEDGER (WITH INLINE EDITING) */}
      {subTab === 'stock' && (
        <div className="bg-[#262420] border border-[#34312B] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#34312B] text-[#8B8478] font-mono uppercase">
                <th className="py-3 px-4 font-medium">SKU</th>
                <th className="py-3 px-4 font-medium">Item Name</th>
                <th className="py-3 px-4 font-medium">Facility / Warehouse</th>
                <th className="py-3 px-4 font-medium">Location</th>
                <th className="py-3 px-4 font-medium text-right">Unit Cost</th>
                <th className="py-3 px-4 font-medium text-right">
                  {isManager ? 'On Hand (Editable)' : 'On Hand (Station Count)'}
                </th>
                <th className="py-3 px-4 font-medium text-right">Reserved</th>
                <th className="py-3 px-4 font-medium text-right">Free to Use</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#34312B]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8B8478] font-mono">
                    Querying location-level stock quants...
                  </td>
                </tr>
              ) : stockQuants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8B8478]">
                    No stock quants found.
                  </td>
                </tr>
              ) : (
                stockQuants.map((q) => {
                  const key = `${q.product_id}_${q.location_id}`;
                  const isEditing = editingQuantKey === key;

                  return (
                    <tr key={key} className="hover:bg-[#2E2B26] transition-colors h-12">
                      <td className="py-3 px-4 font-mono font-medium text-[#F2C230]">
                        {q.sku}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#F5F3EF]">
                        {q.product_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#8B8478]">
                        [{q.warehouse_code}]
                      </td>
                      <td className="py-3 px-4 text-[#F5F3EF]">
                        {q.location_name}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-[#8B8478]">
                        {q.cost !== null && q.cost !== undefined ? `$${q.cost.toFixed(2)}` : (
                          <span className="text-[10px] text-[#8B8478] font-mono">RESTRICTED</span>
                        )}
                      </td>

                      {/* On Hand - Inline editable cell for managers only */}
                      <td className="py-3 px-4 font-mono tabular-nums text-right">
                        {isManager ? (
                          isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditQuant(q.product_id, q.location_id);
                                  if (e.key === 'Escape') setEditingQuantKey(null);
                                }}
                                autoFocus
                                className="w-20 bg-[#1A1816] border border-[#F2C230] px-2 py-0.5 text-xs text-right text-[#F5F3EF] font-mono focus:outline-none"
                              />
                              <button
                                onClick={() => saveEditQuant(q.product_id, q.location_id)}
                                disabled={savingStock}
                                className="p-1 bg-[#F2C230] text-[#1A1816] hover:bg-[#D9AD25]"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingQuantKey(null)}
                                className="p-1 border border-[#34312B] bg-[#1A1816] text-[#8B8478] hover:text-[#F5F3EF]"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => startEditQuant(q)}
                              className="group flex items-center justify-end gap-1.5 cursor-pointer font-semibold text-[#F5F3EF] hover:text-[#F2C230]"
                              title="Click to edit stock level"
                            >
                              <span>{q.on_hand.toFixed(1)}</span>
                              <span className="text-[10px] text-[#8B8478]">{q.uom}</span>
                              <Edit2 className="w-3 h-3 text-[#8B8478] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 font-semibold text-[#F5F3EF]">
                            <span>{q.on_hand.toFixed(1)}</span>
                            <span className="text-[10px] text-[#8B8478]">{q.uom}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono tabular-nums text-right text-[#8B8478]">
                        {q.reserved.toFixed(1)}
                      </td>

                      <td className="py-3 px-4 font-mono tabular-nums text-right font-medium text-[#F5F3EF]">
                        {q.free_to_use.toFixed(1)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(26,24,22,0.85)] flex items-center justify-center p-4">
          <div className="bg-[#262420] border border-[#34312B] max-w-lg w-full p-6 shadow-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#34312B] mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F3EF]">
                New Catalog Product Registration
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#8B8478] hover:text-[#F5F3EF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={createSku}
                    onChange={(e) => setCreateSku(e.target.value)}
                    placeholder="e.g. MTR-48V-01"
                    className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] font-mono focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                    Category
                  </label>
                  <select
                    value={createCategoryId}
                    onChange={(e) => setCreateCategoryId(e.target.value)}
                    className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] focus:outline-none focus:border-[#F2C230]"
                  >
                    <option value="">None / Unassigned</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                  Product Description / Name *
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Brushless Servo Motor 48V"
                  className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                    Unit (UoM)
                  </label>
                  <input
                    type="text"
                    required
                    value={createUom}
                    onChange={(e) => setCreateUom(e.target.value)}
                    placeholder="Units, kg, Boxes"
                    className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] font-mono focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                    Unit Cost ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={createCost}
                    onChange={(e) => setCreateCost(e.target.value)}
                    className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] font-mono text-right focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                    Reorder Point
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={createReorderPoint}
                    onChange={(e) => setCreateReorderPoint(e.target.value)}
                    className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] font-mono text-right focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
              </div>

              {/* Initial stock allocation */}
              <div className="pt-3 border-t border-[#34312B]">
                <div className="text-[11px] font-mono uppercase text-[#8B8478] mb-2 tracking-wider">
                  Initial Stock Ingestion (Optional)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#8B8478] mb-1">
                      Initial Quantity
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={createInitialStock}
                      onChange={(e) => setCreateInitialStock(e.target.value)}
                      className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] font-mono text-right focus:outline-none focus:border-[#F2C230]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#8B8478] mb-1">
                      Storage Location
                    </label>
                    <select
                      value={createInitialLocationId}
                      onChange={(e) => setCreateInitialLocationId(e.target.value)}
                      className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] focus:outline-none focus:border-[#F2C230]"
                    >
                      <option value="">Select Location</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          [{l.warehouse_code || 'WH'}] {l.name} ({l.short_code})
                        </option>
                      ))}
                    </select>
                  </div>
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
                  {creating ? 'Saving...' : 'Register Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
