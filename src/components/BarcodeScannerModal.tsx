import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import {
  Scan,
  Barcode,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Volume2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
}) => {
  const [scanInput, setScanInput] = useState('');
  const [activeScan, setActiveScan] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scanHistory, setScanHistory] = useState<{ sku: string; name: string; time: string; match: boolean }[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode scan input on open
  useEffect(() => {
    if (isOpen) {
      setScanInput('');
      setScannedProduct(null);
      setStatusMessage('Scanner ready. Enter SKU or tap quick barcode below.');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Sound effect simulation via Web Audio API beep (no external audio assets required)
  const playBeep = (success: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = success ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(success ? 880 : 220, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (success ? 0.15 : 0.35));
      osc.start();
      osc.stop(audioCtx.currentTime + (success ? 0.15 : 0.35));
    } catch {
      // AudioContext might be blocked before first interaction
    }
  };

  const handleProcessScan = (codeToScan: string) => {
    const term = codeToScan.trim();
    if (!term) return;

    setActiveScan(true);
    const nowTime = new Date().toLocaleTimeString();

    // Exact SKU match first, then case-insensitive prefix/sub match
    const found = products.find(
      (p) => p.sku.toLowerCase() === term.toLowerCase()
    ) || products.find(
      (p) => p.sku.toLowerCase().includes(term.toLowerCase()) || p.name.toLowerCase().includes(term.toLowerCase())
    );

    setTimeout(() => {
      setActiveScan(false);
      if (found) {
        setScannedProduct(found);
        setStatusMessage(`Match confirmed: ${found.sku} - ${found.name}`);
        playBeep(true);
        setScanHistory((prev) => [
          { sku: found.sku, name: found.name, time: nowTime, match: true },
          ...prev.slice(0, 4),
        ]);
      } else {
        setScannedProduct(null);
        setStatusMessage(`No item registered for barcode / SKU: "${term}"`);
        playBeep(false);
        setScanHistory((prev) => [
          { sku: term, name: 'Item Not In System', time: nowTime, match: false },
          ...prev.slice(0, 4),
        ]);
      }
    }, 180);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessScan(scanInput);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#262420] border border-[#F2C230]/40 w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Scanner Title Bar */}
        <div className="p-4 border-b border-[#34312B] flex items-center justify-between bg-[#1F1D1A]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[rgba(242,194,48,0.15)] text-[#F2C230] border border-[#F2C230]/30">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F5F3EF] flex items-center gap-2">
                <span>Optical Barcode & SKU Scanner</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#1A1816] text-[#5FA85D] border border-[#5FA85D]/40">
                  ONLINE
                </span>
              </h2>
              <p className="text-[11px] font-mono text-[#8B8478]">
                Standard HID Barcode Reader & Keyboard Wedge Compatible
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8B8478] hover:text-[#F5F3EF] hover:bg-[#34312B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Simulation with Laser Line */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="relative bg-[#121110] border-2 border-dashed border-[#34312B] rounded-lg p-6 flex flex-col items-center justify-center min-h-[160px] overflow-hidden group">
            {/* Animated Laser Scan Bar */}
            <div className={`absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#D9534F] to-transparent shadow-[0_0_12px_#D9534F] pointer-events-none transition-all duration-300 ${
              activeScan ? 'top-1/2 opacity-100 scale-y-150' : 'top-1/3 opacity-70 animate-bounce'
            }`} />

            {/* Corner Framing Marks */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#F2C230]" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#F2C230]" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#F2C230]" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#F2C230]" />

            <Barcode className="w-16 h-16 text-[#8B8478]/50 mb-2 group-hover:text-[#F2C230]/70 transition-colors" />

            <div className="text-center">
              <span className="text-xs font-mono font-semibold text-[#F5F3EF]">
                Scan Physical Barcode or Enter SKU Below
              </span>
              <p className="text-[11px] font-mono text-[#8B8478] mt-0.5">
                Laser sensor active. Ready for USB/Bluetooth laser or manual keypad entry.
              </p>
            </div>
          </div>

          {/* Scanner Input Wedge */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#F2C230] font-semibold">
              Barcode / SKU Wedge Input:
            </label>
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scan or type SKU (e.g. STL-ROD-12, SEN-MOD-42)..."
                className="w-full bg-[#1A1816] border-2 border-[#F2C230] px-3.5 py-2.5 text-sm font-mono text-[#F5F3EF] focus:outline-none focus:ring-2 focus:ring-[#F2C230]/50 placeholder:text-[#5B554D]"
              />
              <button
                type="button"
                onClick={() => handleProcessScan(scanInput)}
                disabled={activeScan || !scanInput.trim()}
                className="absolute right-1.5 px-3 py-1.5 bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] font-mono text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {activeScan ? 'Reading...' : 'SCAN'}
              </button>
            </div>
          </div>

          {/* Quick-Scan Preset Chips for Immediate Demo Testing */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[#8B8478]">
              <span>Quick Test Barcodes:</span>
              <span className="text-[#F2C230]">Click to simulate laser read</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {products.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setScanInput(p.sku);
                    handleProcessScan(p.sku);
                  }}
                  className="px-2 py-1 bg-[#1A1816] hover:bg-[#34312B] border border-[#34312B] hover:border-[#F2C230] text-[11px] font-mono text-[#F5F3EF] flex items-center gap-1.5 transition-colors"
                >
                  <Barcode className="w-3.5 h-3.5 text-[#F2C230]" />
                  <span>{p.sku}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scanned Result Card */}
          {scannedProduct ? (
            <div className="p-4 bg-[rgba(95,168,93,0.12)] border border-[#5FA85D] rounded space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#F2C230]">
                      {scannedProduct.sku}
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-[#5FA85D]/20 text-[#5FA85D] px-2 py-0.5 border border-[#5FA85D]/40 font-bold">
                      VERIFIED
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#F5F3EF] mt-1">
                    {scannedProduct.name}
                  </h3>
                  <div className="text-xs text-[#8B8478] font-mono mt-0.5">
                    Category: {scannedProduct.category_name || 'Unassigned'} • UoM: {scannedProduct.uom}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-[#8B8478]">Current Stock</div>
                  <div className={`text-xl font-bold font-mono ${
                    scannedProduct.total_on_hand <= scannedProduct.reorder_point
                      ? 'text-[#E8A33D]'
                      : 'text-[#5FA85D]'
                  }`}>
                    {scannedProduct.total_on_hand.toFixed(1)}{' '}
                    <span className="text-xs font-normal text-[#8B8478]">{scannedProduct.uom}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#34312B] flex items-center justify-between">
                <div className="text-[11px] font-mono text-[#C8C2B7]">
                  Reorder Threshold: <span className="font-bold text-[#F5F3EF]">{scannedProduct.reorder_point}</span> • Available: <span className="font-bold text-[#F5F3EF]">{scannedProduct.total_free_to_use}</span>
                </div>
                <button
                  onClick={() => {
                    onSelectProduct(scannedProduct);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] text-xs font-bold font-mono flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Filter in Catalog</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : statusMessage && (
            <div className={`p-3 text-xs font-mono border ${
              statusMessage.includes('No item')
                ? 'bg-[rgba(217,83,79,0.15)] border-[#D9534F] text-[#D9534F]'
                : 'bg-[#1A1816] border-[#34312B] text-[#8B8478]'
            }`}>
              {statusMessage}
            </div>
          )}

          {/* Recent Scan History */}
          {scanHistory.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[#34312B]">
              <div className="text-[10px] font-mono uppercase text-[#8B8478]">
                Recent Scans This Session:
              </div>
              <div className="space-y-1">
                {scanHistory.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-2.5 py-1 bg-[#1A1816] text-xs font-mono border border-[#34312B]"
                  >
                    <div className="flex items-center gap-2">
                      <span className={h.match ? 'text-[#5FA85D]' : 'text-[#D9534F]'}>
                        {h.match ? '✓' : '✗'}
                      </span>
                      <span className="font-bold text-[#F5F3EF]">{h.sku}</span>
                      <span className="text-[#8B8478] truncate max-w-[200px]">{h.name}</span>
                    </div>
                    <span className="text-[10px] text-[#5B554D]">{h.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#1F1D1A] border-t border-[#34312B] flex items-center justify-between text-xs font-mono text-[#8B8478]">
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-[#F2C230]" />
            <span>Audio feedback enabled</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#1A1816] hover:bg-[#34312B] border border-[#34312B] text-[#F5F3EF] text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
