import { Product, StockQuant, Operation } from '../types';

/**
 * Print an HTML document via an invisible iframe without opening pop-up windows.
 * Directly triggers the browser print dialog where users can select "Save as PDF" or print.
 */
export function printHtmlViaIframe(documentTitle: string, htmlContent: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', documentTitle);
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('Unable to access print frame document');
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Allow styling and fonts to render before invoking print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Print dialog failed:', err);
    } finally {
      // Clean up after print window has initiated
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  }, 250);
}

/**
 * Generates official PDF report HTML for Products Catalog or Stock Ledger
 */
export function generateCatalogReportHtml(
  subTab: 'catalog' | 'stock',
  products: Product[],
  stockQuants: StockQuant[],
  operatorName: string = 'Authorized Operator',
  filterDescription: string = 'All Active Records'
): string {
  const generatedDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const isCatalog = subTab === 'catalog';
  const reportTitle = isCatalog
    ? 'Official Inventory Catalog & Valuation Report'
    : 'Physical Stock Ledger & Location Audit';

  // Compute key executive totals
  const totalItems = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.total_on_hand, 0);
  const totalValuation = products.reduce(
    (sum, p) => sum + (p.cost || 0) * p.total_on_hand,
    0
  );
  const lowStockCount = products.filter((p) => p.total_on_hand <= p.reorder_point).length;

  let tableHtml = '';

  if (isCatalog) {
    const rows = products
      .map((p, idx) => {
        const isLow = p.total_on_hand <= p.reorder_point;
        const isCritical = p.total_on_hand === 0;
        const val = ((p.cost || 0) * p.total_on_hand).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const unitCost =
          p.cost !== null && p.cost !== undefined
            ? `$${p.cost.toFixed(2)}`
            : '—';

        let statusText = 'HEALTHY';
        let statusStyle = 'color: #2e7d32; border-color: #2e7d32;';
        if (isCritical) {
          statusText = 'OUT OF STOCK';
          statusStyle = 'color: #c62828; border-color: #c62828; font-weight: bold;';
        } else if (isLow) {
          statusText = 'BELOW REORDER';
          statusStyle = 'color: #e65100; border-color: #e65100;';
        }

        return `
          <tr style="${isCritical ? 'background: #fff8f8;' : isLow ? 'background: #fffdf5;' : ''}">
            <td style="text-align: center; color: #888;">${idx + 1}</td>
            <td class="mono font-bold" style="color: #000;">${p.sku}</td>
            <td><strong>${p.name}</strong></td>
            <td>${p.category_name || 'Unassigned'}</td>
            <td class="mono text-center">${p.uom}</td>
            <td class="mono text-right">${unitCost}</td>
            <td class="mono text-right" style="color: #666;">${p.reorder_point.toFixed(1)}</td>
            <td class="mono text-right font-bold" style="${isLow ? 'color: #c62828;' : ''}">${p.total_on_hand.toFixed(1)}</td>
            <td class="mono text-right">${p.total_free_to_use.toFixed(1)}</td>
            <td class="mono text-right font-bold">$${val}</td>
            <td class="text-center">
              <span class="status-badge" style="${statusStyle}">${statusText}</span>
            </td>
          </tr>
        `;
      })
      .join('');

    tableHtml = `
      <table>
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th style="width: 80px;">SKU</th>
            <th>Item Description</th>
            <th style="width: 100px;">Category</th>
            <th style="width: 45px; text-align: center;">UoM</th>
            <th style="width: 65px; text-align: right;">Unit Cost</th>
            <th style="width: 65px; text-align: right;">Reorder Pt</th>
            <th style="width: 65px; text-align: right;">On Hand</th>
            <th style="width: 65px; text-align: right;">Free Stock</th>
            <th style="width: 80px; text-align: right;">Valuation</th>
            <th style="width: 90px; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  } else {
    // Stock ledger view
    const rows = stockQuants
      .map((q, idx) => {
        const val = ((q.cost || 0) * q.on_hand).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const unitCost =
          q.cost !== null && q.cost !== undefined
            ? `$${q.cost.toFixed(2)}`
            : '—';

        return `
          <tr>
            <td style="text-align: center; color: #888;">${idx + 1}</td>
            <td class="mono font-bold" style="color: #000;">[${q.warehouse_code}]</td>
            <td style="font-weight: 600;">${q.location_name}</td>
            <td class="mono font-bold">${q.sku}</td>
            <td>${q.product_name}</td>
            <td class="mono text-center">${q.uom}</td>
            <td class="mono text-right font-bold">${q.on_hand.toFixed(1)}</td>
            <td class="mono text-right" style="color: #666;">${q.reserved.toFixed(1)}</td>
            <td class="mono text-right font-bold" style="color: #2e7d32;">${q.free_to_use.toFixed(1)}</td>
            <td class="mono text-right">${unitCost}</td>
            <td class="mono text-right font-bold">$${val}</td>
          </tr>
        `;
      })
      .join('');

    tableHtml = `
      <table>
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th style="width: 45px;">WH</th>
            <th style="width: 120px;">Location Name</th>
            <th style="width: 80px;">SKU</th>
            <th>Product Name</th>
            <th style="width: 45px; text-align: center;">UoM</th>
            <th style="width: 65px; text-align: right;">On Hand</th>
            <th style="width: 65px; text-align: right;">Reserved</th>
            <th style="width: 65px; text-align: right;">Free to Use</th>
            <th style="width: 65px; text-align: right;">Unit Cost</th>
            <th style="width: 80px; text-align: right;">Location Val</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${reportTitle}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 12mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1a1816;
            background: #ffffff;
            margin: 0;
            padding: 10px;
            font-size: 10px;
            line-height: 1.35;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #1a1816;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .brand-box {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .brand-logo {
            width: 26px;
            height: 26px;
            background: #1a1816;
            color: #f2c230;
            font-weight: 800;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: monospace;
          }
          .brand-title {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 1px;
            color: #1a1816;
          }
          .brand-sub {
            font-size: 8.5px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .report-heading {
            font-size: 16px;
            font-weight: 800;
            color: #1a1816;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 2px 0 0 0;
          }
          .meta-text {
            font-size: 9px;
            color: #555;
            text-align: right;
            font-family: monospace;
          }
          .kpi-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 12px;
          }
          .kpi-card {
            border: 1px solid #d8d2c5;
            background: #fbf9f5;
            padding: 8px 10px;
          }
          .kpi-card.alert {
            background: #fff8f0;
            border-color: #e8a33d;
          }
          .kpi-title {
            font-size: 8px;
            text-transform: uppercase;
            font-weight: 700;
            color: #777;
            letter-spacing: 0.5px;
          }
          .kpi-num {
            font-size: 15px;
            font-weight: 800;
            color: #1a1816;
            margin-top: 2px;
            font-family: "Courier New", monospace;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
          }
          th {
            background: #f4f1ea;
            color: #1a1816;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 8.5px;
            letter-spacing: 0.5px;
            padding: 6px 6px;
            border-top: 1px solid #1a1816;
            border-bottom: 1.5px solid #1a1816;
            text-align: left;
          }
          td {
            padding: 5px 6px;
            border-bottom: 1px solid #e8e4dc;
            vertical-align: middle;
          }
          tr:nth-child(even) {
            background: #faf8f5;
          }
          .mono {
            font-family: "Courier New", monospace;
          }
          .font-bold {
            font-weight: 700;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .status-badge {
            font-size: 7.5px;
            font-family: monospace;
            padding: 2px 4px;
            border: 1px solid;
            display: inline-block;
            white-space: nowrap;
          }
          .footer-section {
            margin-top: 20px;
            page-break-inside: avoid;
          }
          .sig-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 24px;
            margin-top: 25px;
          }
          .sig-box {
            border-top: 1px solid #666;
            padding-top: 4px;
            font-size: 8.5px;
            color: #444;
          }
          .doc-stamp {
            font-size: 8px;
            color: #888;
            margin-top: 15px;
            text-align: center;
            border-top: 1px dashed #ccc;
            padding-top: 6px;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand-box">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <path d="M20 2 L37 11.5 L20 21 L3 11.5 Z" fill="#282936" stroke="#3E4052" stroke-width="1.2" />
              <path d="M3 11.5 L20 21 L20 38 L3 28.5 Z" fill="#1C1D26" stroke="#3E4052" stroke-width="1.2" />
              <path d="M20 21 L37 11.5 L37 28.5 L20 38 Z" fill="#14151D" stroke="#3E4052" stroke-width="1.2" />
              <line x1="9" y1="26" x2="28" y2="17" stroke="#00E599" stroke-width="2.2" stroke-linecap="round" />
              <circle cx="16" cy="10" r="2.2" fill="#FFFFFF" />
              <circle cx="9" cy="26" r="2.8" fill="#00E599" />
              <circle cx="28" cy="17" r="2.8" fill="#818CF8" />
            </svg>
            <div>
              <div class="brand-title"><strong>Stock</strong> <span style="color: #6366F1;">Sense</span> <span style="font-size: 9px; background: #23232C; color: #9CA3AF; padding: 2px 5px; border-radius: 3px; font-family: monospace;">IMS</span></div>
              <div class="brand-sub">Modular Inventory Control & Physical Ledger</div>
              <div class="report-heading">${reportTitle}</div>
            </div>
          </div>
          <div class="meta-text">
            <div><strong>Report Run:</strong> ${generatedDate}</div>
            <div><strong>Scope:</strong> ${filterDescription}</div>
            <div><strong>Operator:</strong> ${operatorName}</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-title">Total Active SKUs</div>
            <div class="kpi-num">${totalItems} Items</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Total Physical Units</div>
            <div class="kpi-num">${totalUnits.toLocaleString('en-US', { maximumFractionDigits: 1 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Catalog Inventory Valuation</div>
            <div class="kpi-num">$${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card ${lowStockCount > 0 ? 'alert' : ''}">
            <div class="kpi-title">Reorder Breaches / Low Stock</div>
            <div class="kpi-num" style="${lowStockCount > 0 ? 'color: #c62828;' : ''}">${lowStockCount} Items</div>
          </div>
        </div>

        ${tableHtml}

        <div class="footer-section">
          <div class="sig-row">
            <div class="sig-box">
              <strong>Prepared By (Auditor / Staff):</strong>
              <div style="margin-top: 20px;">Signature: _______________________ Date: _________</div>
            </div>
            <div class="sig-box">
              <strong>Warehouse Operations Manager:</strong>
              <div style="margin-top: 20px;">Signature: _______________________ Date: _________</div>
            </div>
            <div class="sig-box">
              <strong>Finance / Inventory Controller:</strong>
              <div style="margin-top: 20px;">Signature: _______________________ Date: _________</div>
            </div>
          </div>
          <div class="doc-stamp">
            CONFIDENTIAL - STOCKSENSE PHYSICAL INVENTORY AUDIT RECORD - VALIDATED ELECTRONIC LEDGER
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates official PDF document HTML for Warehouse Operations
 * (Goods Receipt Note, Delivery Packing Slip, Transfer Note, Adjustment Voucher)
 */
export function generateOperationDocumentHtml(
  op: Operation,
  currentUserName: string = 'Staff'
): string {
  const generatedDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const typeLabels: Record<string, { title: string; subtitle: string; codePrefix: string }> = {
    receipt: {
      title: 'GOODS RECEIPT SLIP & INWARD DOCK MANIFEST',
      subtitle: 'Supplier Inbound Freight & Warehouse Inspection',
      codePrefix: 'GRN',
    },
    delivery: {
      title: 'OUTBOUND DELIVERY NOTE & PACKING SLIP',
      subtitle: 'Customer Dispatch & Freight Verification',
      codePrefix: 'DEL',
    },
    internal: {
      title: 'INTERNAL STOCK TRANSFER AUTHORIZATION',
      subtitle: 'Warehouse Inter-Facility Movement Document',
      codePrefix: 'XFER',
    },
    adjustment: {
      title: 'PHYSICAL INVENTORY ADJUSTMENT VOUCHER',
      subtitle: 'Stock Reconciliation & Discrepancy Record',
      codePrefix: 'ADJ',
    },
  };

  const docConfig = typeLabels[op.type] || {
    title: 'WAREHOUSE OPERATION DOCUMENT',
    subtitle: 'Standard Operations Voucher',
    codePrefix: 'DOC',
  };

  const statusColors: Record<string, { border: string; bg: string; text: string }> = {
    draft: { border: '#8b8478', bg: '#f5f5f5', text: '#555' },
    waiting: { border: '#e8a33d', bg: '#fffbf0', text: '#b45309' },
    ready: { border: '#4a90d9', bg: '#f0f7ff', text: '#1d4ed8' },
    done: { border: '#5fa85d', bg: '#f0fdf4', text: '#15803d' },
    cancelled: { border: '#d9534f', bg: '#fef2f2', text: '#b91c1c' },
  };

  const currentStatus = statusColors[op.status] || statusColors.draft;
  const totalQuantity = op.lines.reduce((sum, l) => sum + l.quantity, 0);

  const linesHtml = op.lines
    .map(
      (line, idx) => `
      <tr>
        <td style="text-align: center; color: #888;">${idx + 1}</td>
        <td class="mono font-bold" style="color: #000;">${line.sku}</td>
        <td><strong>${line.product_name}</strong></td>
        <td class="mono text-right font-bold" style="font-size: 11px;">${line.quantity.toFixed(1)}</td>
        <td class="mono text-center">${line.uom}</td>
        <td class="mono text-center" style="border-left: 1px dashed #ccc;">[ &nbsp; &nbsp; &nbsp; ]</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${op.reference} - ${docConfig.title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1a1816;
            background: #ffffff;
            margin: 0;
            padding: 8px;
            font-size: 10.5px;
            line-height: 1.4;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #1a1816;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .brand-logo {
            width: 28px;
            height: 28px;
            background: #1a1816;
            color: #f2c230;
            font-weight: 800;
            font-size: 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-family: monospace;
            margin-right: 8px;
            vertical-align: middle;
          }
          .brand-title {
            font-size: 16px;
            font-weight: 900;
            letter-spacing: 1px;
            color: #1a1816;
            display: inline-block;
            vertical-align: middle;
          }
          .brand-sub {
            font-size: 9px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 2px;
          }
          .doc-heading {
            font-size: 17px;
            font-weight: 800;
            text-transform: uppercase;
            color: #1a1816;
            margin-top: 6px;
            letter-spacing: 0.5px;
          }
          .doc-subtitle {
            font-size: 9.5px;
            color: #666;
            text-transform: uppercase;
          }
          .badge-box {
            text-align: right;
          }
          .ref-number {
            font-size: 18px;
            font-weight: 800;
            font-family: "Courier New", monospace;
            color: #1a1816;
            letter-spacing: 1px;
          }
          .status-tag {
            display: inline-block;
            margin-top: 4px;
            padding: 3px 8px;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            font-family: monospace;
            border: 1.5px solid ${currentStatus.border};
            background: ${currentStatus.bg};
            color: ${currentStatus.text};
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 16px;
            border: 1px solid #d8d2c5;
            background: #faf8f5;
            padding: 10px 14px;
          }
          .meta-item {
            display: flex;
            flex-direction: column;
          }
          .meta-label {
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
            color: #777;
            letter-spacing: 0.5px;
          }
          .meta-val {
            font-size: 11px;
            font-weight: 600;
            color: #1a1816;
            margin-top: 2px;
          }
          .mono {
            font-family: "Courier New", monospace;
          }
          .font-bold {
            font-weight: 700;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 10px;
          }
          th {
            background: #f4f1ea;
            color: #1a1816;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.5px;
            padding: 7px 8px;
            border-top: 1.5px solid #1a1816;
            border-bottom: 1.5px solid #1a1816;
            text-align: left;
          }
          td {
            padding: 7px 8px;
            border-bottom: 1px solid #e8e4dc;
          }
          tr:nth-child(even) {
            background: #fcfbf9;
          }
          .summary-row {
            margin-top: 14px;
            display: flex;
            justify-content: flex-end;
          }
          .summary-card {
            border: 1px solid #1a1816;
            background: #f4f1ea;
            padding: 8px 16px;
            text-align: right;
          }
          .sig-section {
            margin-top: 36px;
            page-break-inside: avoid;
          }
          .sig-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .sig-line {
            border-top: 1px solid #1a1816;
            padding-top: 6px;
            margin-top: 35px;
            font-size: 9px;
            color: #333;
          }
          .doc-footer {
            margin-top: 25px;
            border-top: 1px dashed #ccc;
            padding-top: 6px;
            text-align: center;
            font-size: 8px;
            color: #888;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                <path d="M20 2 L37 11.5 L20 21 L3 11.5 Z" fill="#282936" stroke="#3E4052" stroke-width="1.2" />
                <path d="M3 11.5 L20 21 L20 38 L3 28.5 Z" fill="#1C1D26" stroke="#3E4052" stroke-width="1.2" />
                <path d="M20 21 L37 11.5 L37 28.5 L20 38 Z" fill="#14151D" stroke="#3E4052" stroke-width="1.2" />
                <line x1="9" y1="26" x2="28" y2="17" stroke="#00E599" stroke-width="2.2" stroke-linecap="round" />
                <circle cx="16" cy="10" r="2.2" fill="#FFFFFF" />
                <circle cx="9" cy="26" r="2.8" fill="#00E599" />
                <circle cx="28" cy="17" r="2.8" fill="#818CF8" />
              </svg>
              <div class="brand-title"><strong>Stock</strong> <span style="color: #6366F1;">Sense</span> <span style="font-size: 9px; background: #23232C; color: #9CA3AF; padding: 2px 5px; border-radius: 3px; font-family: monospace;">IMS</span></div>
            </div>
            <div class="brand-sub">Industrial Logistics & Warehouse Management</div>
            <div class="doc-heading">${docConfig.title}</div>
            <div class="doc-subtitle">${docConfig.subtitle}</div>
          </div>
          <div class="badge-box">
            <div class="ref-number">${op.reference}</div>
            <div><span class="status-tag">${op.status}</span></div>
            <div style="font-size: 8.5px; color: #666; margin-top: 4px; font-family: monospace;">Printed: ${generatedDate}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Party / Contact Name</span>
            <span class="meta-val">${op.contact || 'Direct Warehouse Handling'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Scheduled Execution Date</span>
            <span class="meta-val mono">${new Date(op.schedule_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Source Location / Origin</span>
            <span class="meta-val">${op.source_location_name || 'Vendor Inbound Dock'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Destination Location / Target</span>
            <span class="meta-val">${op.dest_location_name || 'Customer Dispatch Bay'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Assigned Operator</span>
            <span class="meta-val">${op.responsible_user_name || currentUserName}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">System Transaction Timestamp</span>
            <span class="meta-val mono">${new Date(op.created_at).toLocaleString()}</span>
          </div>
        </div>

        <h3 style="font-size: 11px; text-transform: uppercase; margin: 16px 0 6px 0; letter-spacing: 0.5px;">
          Document Manifest Line Items (${op.lines.length} Lines)
        </h3>

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th style="width: 100px;">SKU</th>
              <th>Product Description</th>
              <th style="width: 80px; text-align: right;">Quantity</th>
              <th style="width: 60px; text-align: center;">UoM</th>
              <th style="width: 70px; text-align: center;">Checked</th>
            </tr>
          </thead>
          <tbody>
            ${linesHtml}
          </tbody>
        </table>

        <div class="summary-row">
          <div class="summary-card">
            <div style="font-size: 8.5px; text-transform: uppercase; color: #555; font-weight: 700;">Total Manifest Units</div>
            <div class="mono font-bold" style="font-size: 16px; margin-top: 2px;">${totalQuantity.toFixed(1)} Units</div>
          </div>
        </div>

        <div class="sig-section">
          <div class="sig-grid">
            <div>
              <div style="font-size: 9.5px; font-weight: 700;">PICKING / DISPATCH INSPECTION</div>
              <div class="sig-line">
                Operator Signature & ID: ___________________________________ Date: _________
              </div>
            </div>
            <div>
              <div style="font-size: 9.5px; font-weight: 700;">RECEIVING & QUALITY SIGN-OFF</div>
              <div class="sig-line">
                Authorized Signature: _______________________________________ Date: _________
              </div>
            </div>
          </div>
          <div class="doc-footer">
            STOCKSENSE IMS FORM 402 - LEGAL LOGISTICS CHAIN OF CUSTODY VOUCHER - IMMUTABLE RECORD
          </div>
        </div>
      </body>
    </html>
  `;
}
