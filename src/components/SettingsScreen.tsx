import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Warehouse, Location, User } from '../types';
import {
  Building2,
  MapPin,
  Plus,
  RefreshCw,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react';

interface SettingsScreenProps {
  currentUser: User | null;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ currentUser }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Warehouse Modal
  const [showWhModal, setShowWhModal] = useState(false);
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [savingWh, setSavingWh] = useState(false);

  // New Location Modal
  const [showLocModal, setShowLocModal] = useState(false);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locWarehouseId, setLocWarehouseId] = useState<number>(1);
  const [savingLoc, setSavingLoc] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [whs, locs] = await Promise.all([api.getWarehouses(), api.getLocations()]);
      setWarehouses(whs);
      setLocations(locs);
      if (whs.length > 0) setLocWarehouseId(whs[0].id);
    } catch (err: any) {
      setError(err.message || 'Failed to load warehouse configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWh(true);
    setError(null);
    try {
      const created = await api.createWarehouse({
        name: whName.trim(),
        short_code: whCode.trim().toUpperCase(),
        address: whAddress.trim() || undefined,
      });
      setSuccessMsg(`Warehouse ${created.name} [${created.short_code}] created with default locations.`);
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowWhModal(false);
      setWhName('');
      setWhCode('');
      setWhAddress('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create warehouse');
    } finally {
      setSavingWh(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLoc(true);
    setError(null);
    try {
      const created = await api.createLocation({
        name: locName.trim(),
        short_code: locCode.trim().toUpperCase(),
        warehouse_id: locWarehouseId,
      });
      setSuccessMsg(`Location ${created.name} (${created.short_code}) registered.`);
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowLocModal(false);
      setLocName('');
      setLocCode('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create location');
    } finally {
      setSavingLoc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#34312B] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F3EF]">
            Facility & Warehouse Configuration
          </h1>
          <p className="text-xs text-[#8B8478] font-mono mt-1">
            Physical logistics infrastructure, internal zones, and terminal session parameters
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
          <button
            onClick={() => setShowWhModal(true)}
            className="bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-semibold text-xs py-2 px-3 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Warehouse</span>
          </button>
          <button
            onClick={() => setShowLocModal(true)}
            className="border border-[#34312B] bg-[#262420] hover:border-[#8B8478] text-[#F5F3EF] text-xs py-2 px-3 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Location Zone</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-[rgba(95,168,93,0.15)] border border-[#5FA85D] text-[#5FA85D] text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-[rgba(217,83,79,0.15)] border border-[#D9534F] text-[#D9534F] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Warehouses and their locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {warehouses.map((wh) => {
          const whLocs = locations.filter((l) => l.warehouse_id === wh.id);
          return (
            <div key={wh.id} className="bg-[#262420] border border-[#34312B] p-5">
              <div className="flex items-start justify-between border-b border-[#34312B] pb-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#F2C230] px-2 py-0.5 bg-[#1A1816] border border-[#34312B]">
                      {wh.short_code}
                    </span>
                    <h2 className="text-base font-bold text-[#F5F3EF]">{wh.name}</h2>
                  </div>
                  <div className="text-xs text-[#8B8478] mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#8B8478]" />
                    <span>{wh.address || 'Standard Logistics Terminal'}</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#8B8478]">
                  {whLocs.length} Zones
                </span>
              </div>

              {/* Sub-locations list */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#8B8478] mb-1">
                  Configured Storage Zones
                </div>
                <div className="divide-y divide-[#34312B] border border-[#34312B]">
                  {whLocs.map((loc) => (
                    <div
                      key={loc.id}
                      className="p-2.5 flex items-center justify-between text-xs bg-[#1A1816]"
                    >
                      <div>
                        <div className="font-medium text-[#F5F3EF]">{loc.name}</div>
                        <div className="font-mono text-[10px] text-[#8B8478]">
                          {wh.short_code}/{loc.short_code}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 bg-[#262420] text-[#8B8478] border border-[#34312B]">
                        ACTIVE
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operator Session & System Info Box */}
      <div className="bg-[#262420] border border-[#34312B] p-5">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#8B8478] mb-3">
          Active Operator Session
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-[#1A1816] p-3 border border-[#34312B]">
            <div className="text-[#8B8478] mb-1">LOGGED-IN OPERATOR</div>
            <div className="text-[#F5F3EF] font-bold">{currentUser?.full_name || 'Sarah Connor'}</div>
            <div className="text-[#8B8478] text-[11px]">{currentUser?.email || 'demo@stocksense.io'}</div>
          </div>
          <div className="bg-[#1A1816] p-3 border border-[#34312B]">
            <div className="text-[#8B8478] mb-1">ROLE CLEARANCE</div>
            <div className="text-[#F2C230] font-bold uppercase">{currentUser?.role || 'MANAGER'}</div>
            <div className="text-[#8B8478] text-[11px]">Full Approval & Stock Validation Rights</div>
          </div>
          <div className="bg-[#1A1816] p-3 border border-[#34312B]">
            <div className="text-[#8B8478] mb-1">DATABASE ATOMICITY</div>
            <div className="text-[#5FA85D] font-bold flex items-center gap-1">
              <Database className="w-3.5 h-3.5" />
              <span>ACTIVE LOCAL LEDGER</span>
            </div>
            <div className="text-[#8B8478] text-[11px]">Transactions & Sequences Guaranteed</div>
          </div>
        </div>
      </div>

      {/* CREATE WAREHOUSE MODAL */}
      {showWhModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(26,24,22,0.85)] flex items-center justify-center p-4">
          <div className="bg-[#262420] border border-[#34312B] max-w-md w-full p-6 shadow-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#34312B] mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F3EF]">
                Register New Warehouse Facility
              </h2>
              <button
                onClick={() => setShowWhModal(false)}
                className="text-[#8B8478] hover:text-[#F5F3EF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                  Warehouse Name *
                </label>
                <input
                  type="text"
                  required
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  placeholder="e.g. South Logistics Depot"
                  className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                  Short Code (1-5 chars) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={whCode}
                  onChange={(e) => setWhCode(e.target.value)}
                  placeholder="e.g. SLD"
                  className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] font-mono focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                  Facility Address
                </label>
                <input
                  type="text"
                  value={whAddress}
                  onChange={(e) => setWhAddress(e.target.value)}
                  placeholder="e.g. Gate 12, Pier 4"
                  className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#34312B]">
                <button
                  type="button"
                  onClick={() => setShowWhModal(false)}
                  className="px-4 py-2 border border-[#34312B] bg-[#1A1816] text-[#8B8478] hover:text-[#F5F3EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWh}
                  className="px-4 py-2 bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-semibold cursor-pointer"
                >
                  {savingWh ? 'Creating...' : 'Register Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE LOCATION MODAL */}
      {showLocModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(26,24,22,0.85)] flex items-center justify-center p-4">
          <div className="bg-[#262420] border border-[#34312B] max-w-md w-full p-6 shadow-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#34312B] mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F3EF]">
                Add Internal Location Zone
              </h2>
              <button
                onClick={() => setShowLocModal(false)}
                className="text-[#8B8478] hover:text-[#F5F3EF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                  Parent Warehouse *
                </label>
                <select
                  value={locWarehouseId}
                  onChange={(e) => setLocWarehouseId(Number(e.target.value))}
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
                  Location Zone Name *
                </label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  placeholder="e.g. Hazardous Materials Vault"
                  className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#8B8478] mb-1">
                  Zone Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={locCode}
                  onChange={(e) => setLocCode(e.target.value)}
                  placeholder="e.g. HAZMAT"
                  className="w-full bg-[#1A1816] border border-[#34312B] px-3 py-2 text-[#F5F3EF] font-mono focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#34312B]">
                <button
                  type="button"
                  onClick={() => setShowLocModal(false)}
                  className="px-4 py-2 border border-[#34312B] bg-[#1A1816] text-[#8B8478] hover:text-[#F5F3EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLoc}
                  className="px-4 py-2 bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-semibold cursor-pointer"
                >
                  {savingLoc ? 'Adding...' : 'Register Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
