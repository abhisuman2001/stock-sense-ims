import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Product } from '../types';
import { QrCode, X, Printer, Download, Check, ExternalLink } from 'lucide-react';

interface ProductQrModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductQrModal: React.FC<ProductQrModalProps> = ({ product, onClose }) => {
  const qrRef = useRef<HTMLDivElement>(null);

  if (!product) return null;

  // Standard inventory payload formatted as JSON string so any generic mobile camera or barcode scanner can parse it
  const qrPayload = JSON.stringify({
    app: 'StockSense IMS',
    sku: product.sku,
    id: product.id,
    name: product.name,
    category: product.category_name || 'General',
    uom: product.uom,
  });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Bin Tag - ${product.sku}</title>
          <style>
            body {
              font-family: monospace;
              padding: 24px;
              color: #000;
              margin: 0;
            }
            .tag {
              border: 2px dashed #000;
              padding: 20px;
              width: 280px;
              text-align: center;
              margin: auto;
            }
            .sku {
              font-size: 20px;
              font-weight: bold;
              margin-top: 10px;
              letter-spacing: 1px;
            }
            .name {
              font-size: 13px;
              margin: 6px 0;
              color: #333;
            }
            .details {
              font-size: 11px;
              margin-top: 8px;
              border-top: 1px solid #ccc;
              padding-top: 6px;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <div class="tag">
            <div style="font-size: 10px; font-weight: bold; letter-spacing: 2px; margin-bottom: 8px;">STOCKSENSE WAREHOUSE TAG</div>
            <div id="qr-container">${qrRef.current?.innerHTML || ''}</div>
            <div class="sku">${product.sku}</div>
            <div class="name">${product.name}</div>
            <div class="details">
              <span>UoM: ${product.uom}</span>
              <span>Reorder: ${product.reorder_point}</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadSvg = () => {
    const svgElement = qrRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_${product.sku}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#262420] border border-[#34312B] w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#34312B] flex items-center justify-between bg-[#1F1D1A]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[rgba(242,194,48,0.15)] text-[#F2C230] border border-[#F2C230]/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F3EF]">
                Warehouse Bin QR Code
              </h2>
              <p className="text-[11px] font-mono text-[#8B8478]">
                Camera Scannable Identifier & Bin Label
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

        {/* QR Code Presentation */}
        <div className="p-6 flex flex-col items-center justify-center space-y-4 bg-[#1A1816]">
          {/* Printable White Card for maximum camera contrast */}
          <div
            ref={qrRef}
            className="p-4 bg-white rounded-lg shadow-xl flex flex-col items-center justify-center border-4 border-white"
          >
            <QRCodeSVG
              value={qrPayload}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#1A1816"
              bgColor="#FFFFFF"
            />
          </div>

          <div className="text-center space-y-1">
            <div className="font-mono text-base font-bold text-[#F2C230] tracking-wide">
              {product.sku}
            </div>
            <div className="text-xs font-medium text-[#F5F3EF]">
              {product.name}
            </div>
            <div className="text-[11px] font-mono text-[#8B8478]">
              {product.category_name || 'General Inventory'} • {product.uom}
            </div>
          </div>

          <div className="w-full bg-[#262420] border border-[#34312B] p-3 text-[11px] font-mono text-[#8B8478] space-y-1">
            <div className="text-[#C8C2B7] font-semibold flex items-center gap-1.5">
              <span>Mobile Camera Compatibility:</span>
            </div>
            <p>
              Point any smartphone camera, tablet scanner, or zebra barcode reader to immediately parse SKU: <span className="text-[#F5F3EF] font-bold">{product.sku}</span>.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-[#1F1D1A] border-t border-[#34312B] flex items-center justify-between gap-2">
          <button
            onClick={handleDownloadSvg}
            className="px-3 py-1.5 bg-[#262420] hover:bg-[#34312B] border border-[#34312B] text-xs font-mono text-[#F5F3EF] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#F2C230]" />
            <span>Download SVG</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#F2C230] hover:bg-[#D9AD25] text-[#1A1816] text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bin Label</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-[#34312B] bg-[#1A1816] text-[#8B8478] hover:text-[#F5F3EF] text-xs font-mono"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
