import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, StockQuant, Operation } from '../types';

/**
 * Universal browser trigger to force direct file download via Blob URL.
 * Works flawlessly in sandboxed iframes without relying on window.open or popups.
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Generates and directly triggers download of a real PDF for the Product Catalog or Stock Ledger.
 */
export function downloadCatalogPdf(
  subTab: 'catalog' | 'stock',
  products: Product[],
  stockQuants: StockQuant[],
  operatorName: string = 'Sarah Connor',
  scopeDescription: string = 'All Active Records'
) {
  const isCatalog = subTab === 'catalog';
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const formattedDate = now.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // --- BRANDING & HEADER ---
  // Top header banner background
  doc.setFillColor(26, 24, 22); // #1A1816
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Amber accent bar
  doc.setFillColor(242, 194, 48); // #F2C230
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Brand Badge (Isometric Network Cube)
  doc.setFillColor(38, 39, 52);
  doc.roundedRect(14, 5, 18, 18, 2, 2, 'F');
  doc.setFillColor(0, 229, 153);
  doc.circle(18, 17, 1.8, 'F');
  doc.setFillColor(129, 140, 248);
  doc.circle(27, 10, 1.8, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(20, 9, 1.4, 'F');
  doc.setDrawColor(0, 229, 153);
  doc.setLineWidth(0.6);
  doc.line(18, 17, 27, 10);

  // Title: Stock (White) Sense (Lavender) [IMS]
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Stock', 37, 13);
  doc.setTextColor(129, 140, 248);
  doc.text('Sense', 50, 13);
  doc.setFillColor(35, 35, 44);
  doc.roundedRect(66, 8, 12, 6, 1, 1, 'F');
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(7);
  doc.text('IMS', 68.5, 12.2);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(170, 165, 155);
  const reportType = isCatalog
    ? 'Product Catalog & Inventory Valuation Ledger'
    : 'Physical Stock Ledger & Location Bin Breakdown';
  doc.text(reportType, 37, 18);
  doc.text(`Scope: ${scopeDescription}`, 37, 23);

  // Right-aligned run metadata
  doc.setFontSize(8);
  doc.setTextColor(200, 195, 185);
  doc.text(`Generated: ${formattedDate}`, pageWidth - 14, 11, { align: 'right' });
  doc.text(`Operator: ${operatorName}`, pageWidth - 14, 16, { align: 'right' });
  doc.text('Classification: CONFIDENTIAL WAREHOUSE RECORD', pageWidth - 14, 21, { align: 'right' });

  // --- EXECUTIVE SUMMARY KPIS ---
  let startY = 36;

  const totalSKUs = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.total_on_hand, 0);
  const totalValuation = products.reduce((sum, p) => sum + (p.cost || 0) * p.total_on_hand, 0);
  const lowStockCount = products.filter((p) => p.total_on_hand <= p.reorder_point).length;

  const kpis = [
    { label: 'ACTIVE CATALOG SKUS', val: `${totalSKUs} Items`, alert: false },
    { label: 'TOTAL PHYSICAL UNITS', val: totalUnits.toLocaleString('en-US', { maximumFractionDigits: 1 }), alert: false },
    { label: 'INVENTORY VALUATION', val: `$${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, alert: false },
    { label: 'REORDER BREACHES', val: `${lowStockCount} Items`, alert: lowStockCount > 0 },
  ];

  const cardWidth = (pageWidth - 28 - 9) / 4;
  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    doc.setFillColor(kpi.alert ? 255 : 248, kpi.alert ? 245 : 246, kpi.alert ? 235 : 243);
    doc.setDrawColor(kpi.alert ? 232 : 216, kpi.alert ? 163 : 210, kpi.alert ? 61 : 197);
    doc.setLineWidth(0.3);
    doc.rect(x, startY, cardWidth, 14, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.alert ? 180 : 100, kpi.alert ? 90 : 95, kpi.alert ? 20 : 90);
    doc.text(kpi.label, x + 3, startY + 4.5);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.alert ? 198 : 26, kpi.alert ? 40 : 24, kpi.alert ? 40 : 22);
    doc.text(kpi.val, x + 3, startY + 11);
  });

  startY += 18;

  // --- TABLE DATA ---
  if (isCatalog) {
    const headers = [
      '#',
      'SKU',
      'Product Description',
      'Category',
      'UoM',
      'Unit Cost',
      'Reorder Pt',
      'On Hand',
      'Free Stock',
      'Valuation ($)',
      'Status',
    ];

    const body = products.map((p, idx) => {
      const isCritical = p.total_on_hand === 0;
      const isLow = p.total_on_hand <= p.reorder_point;
      const val = ((p.cost || 0) * p.total_on_hand).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const costStr = p.cost !== null && p.cost !== undefined ? `$${p.cost.toFixed(2)}` : '—';
      const status = isCritical ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'HEALTHY';

      return [
        String(idx + 1),
        p.sku,
        p.name,
        p.category_name || 'Unassigned',
        p.uom,
        costStr,
        p.reorder_point.toFixed(1),
        p.total_on_hand.toFixed(1),
        p.total_free_to_use.toFixed(1),
        `$${val}`,
        status,
      ];
    });

    autoTable(doc, {
      startY,
      head: [headers],
      body,
      margin: { left: 14, right: 14, bottom: 25 },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: [220, 215, 205],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [38, 36, 32],
        textColor: [245, 243, 239],
        fontSize: 8,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [250, 248, 244],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { fontStyle: 'bold', cellWidth: 26 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 28 },
        4: { halign: 'center', cellWidth: 14 },
        5: { halign: 'right', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 20 },
        7: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
        8: { halign: 'right', cellWidth: 20 },
        9: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
        10: { halign: 'center', cellWidth: 25 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 10) {
          const val = String(data.cell.raw);
          if (val === 'OUT OF STOCK') {
            data.cell.styles.textColor = [198, 40, 40];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'LOW STOCK') {
            data.cell.styles.textColor = [217, 119, 6];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [46, 125, 50];
          }
        }
      },
    });
  } else {
    // Stock ledger view
    const headers = [
      '#',
      'WH',
      'Bin Location',
      'SKU',
      'Product Name',
      'UoM',
      'On Hand',
      'Reserved',
      'Free Stock',
      'Unit Cost',
      'Location Val ($)',
    ];

    const body = stockQuants.map((q, idx) => {
      const val = ((q.cost || 0) * q.on_hand).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const costStr = q.cost !== null && q.cost !== undefined ? `$${q.cost.toFixed(2)}` : '—';

      return [
        String(idx + 1),
        q.warehouse_code,
        q.location_name,
        q.sku,
        q.product_name,
        q.uom,
        q.on_hand.toFixed(1),
        q.reserved.toFixed(1),
        q.free_to_use.toFixed(1),
        costStr,
        `$${val}`,
      ];
    });

    autoTable(doc, {
      startY,
      head: [headers],
      body,
      margin: { left: 14, right: 14, bottom: 25 },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: [220, 215, 205],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [38, 36, 32],
        textColor: [245, 243, 239],
        fontSize: 8,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [250, 248, 244],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
        2: { fontStyle: 'bold', cellWidth: 38 },
        3: { fontStyle: 'bold', cellWidth: 26 },
        4: { cellWidth: 'auto' },
        5: { halign: 'center', cellWidth: 14 },
        6: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
        7: { halign: 'right', cellWidth: 20 },
        8: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
        9: { halign: 'right', cellWidth: 22 },
        10: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
      },
    });
  }

  // --- FOOTER & SIGNATURE ON ALL PAGES ---
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Bottom border
    doc.setDrawColor(216, 210, 197);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 115, 105);
    doc.text(
      'STOCKSENSE IMS - VALIDATED ELECTRONIC LEDGER - CONFIDENTIAL INVENTORY RECORD',
      14,
      pageHeight - 7
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }

  // Generate binary Blob and initiate instant download
  const blob = doc.output('blob');
  const filename = isCatalog
    ? `StockSense_Inventory_Catalog_${dateStr}.pdf`
    : `StockSense_Stock_Ledger_${dateStr}.pdf`;
  triggerFileDownload(blob, filename);
}

/**
 * Generates and directly triggers download of a real PDF for an Operation Document
 * (Goods Receipt Note, Delivery Note / Packing Slip, Transfer Note, Adjustment Voucher).
 */
export function downloadOperationPdf(op: Operation, currentUserName: string = 'Staff') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const formattedDate = now.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const typeConfig: Record<string, { title: string; subtitle: string; codePrefix: string }> = {
    receipt: {
      title: 'GOODS RECEIPT SLIP & INWARD DOCK MANIFEST',
      subtitle: 'Supplier Inbound Freight & Warehouse Inspection Note',
      codePrefix: 'GRN',
    },
    delivery: {
      title: 'OUTBOUND DELIVERY NOTE & PACKING SLIP',
      subtitle: 'Customer Dispatch & Freight Verification Manifest',
      codePrefix: 'DEL',
    },
    internal: {
      title: 'INTERNAL STOCK TRANSFER AUTHORIZATION',
      subtitle: 'Warehouse Inter-Facility Movement Document',
      codePrefix: 'XFER',
    },
    adjustment: {
      title: 'PHYSICAL INVENTORY ADJUSTMENT VOUCHER',
      subtitle: 'Stock Reconciliation & Physical Discrepancy Record',
      codePrefix: 'ADJ',
    },
  };

  const config = typeConfig[op.type] || {
    title: 'WAREHOUSE OPERATION DOCUMENT',
    subtitle: 'Standard Operations Voucher',
    codePrefix: 'DOC',
  };

  // --- HEADER BANNER ---
  doc.setFillColor(26, 24, 22);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setFillColor(242, 194, 48);
  doc.rect(0, 32, pageWidth, 2, 'F');

  // Brand Badge (Isometric Network Cube)
  doc.setFillColor(38, 39, 52);
  doc.roundedRect(14, 6, 18, 18, 2, 2, 'F');
  doc.setFillColor(0, 229, 153);
  doc.circle(18, 18, 1.8, 'F');
  doc.setFillColor(129, 140, 248);
  doc.circle(27, 11, 1.8, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(20, 10, 1.4, 'F');
  doc.setDrawColor(0, 229, 153);
  doc.setLineWidth(0.6);
  doc.line(18, 18, 27, 11);

  // Brand Name: Stock (White) Sense (Lavender) [IMS]
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Stock', 37, 15);
  doc.setTextColor(129, 140, 248);
  doc.text('Sense', 51, 15);
  doc.setFillColor(35, 35, 44);
  doc.roundedRect(68, 9.5, 13, 7, 1, 1, 'F');
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(7.5);
  doc.text('IMS', 71, 14.5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(170, 165, 155);
  doc.text('Industrial Logistics & Warehouse Management System', 37, 20);

  // Document Heading & Reference in Header
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(242, 194, 48);
  doc.text(op.reference, pageWidth - 14, 14, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 243, 239);
  doc.text(`STATUS: ${op.status.toUpperCase()}`, pageWidth - 14, 21, { align: 'right' });

  // Document Title Bar below header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 24, 22);
  doc.text(config.title, 14, 42);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 95, 90);
  doc.text(config.subtitle, 14, 47);

  // --- METADATA GRID BOX ---
  const metaY = 52;
  doc.setFillColor(250, 248, 245);
  doc.setDrawColor(216, 210, 197);
  doc.setLineWidth(0.3);
  doc.rect(14, metaY, pageWidth - 28, 30, 'FD');

  const col1 = 18;
  const col2 = 105;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 115, 105);
  doc.text('PARTY / CONTACT:', col1, metaY + 7);
  doc.text('SOURCE LOCATION:', col1, metaY + 16);
  doc.text('ASSIGNED OPERATOR:', col1, metaY + 25);

  doc.text('SCHEDULED DATE:', col2, metaY + 7);
  doc.text('DESTINATION LOCATION:', col2, metaY + 16);
  doc.text('TRANSACTION TIMESTAMP:', col2, metaY + 25);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(26, 24, 22);
  doc.text(op.contact || 'Direct Warehouse Handling', col1 + 35, metaY + 7);
  doc.text(op.source_location_name || 'Vendor Inbound Bay', col1 + 35, metaY + 16);
  doc.text(op.responsible_user_name || currentUserName, col1 + 35, metaY + 25);

  doc.text(
    new Date(op.schedule_date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    col2 + 42,
    metaY + 7
  );
  doc.text(op.dest_location_name || 'Customer Dispatch Bay', col2 + 42, metaY + 16);
  doc.text(new Date(op.created_at).toLocaleString(), col2 + 42, metaY + 25);

  // --- LINE ITEMS TABLE ---
  const tableY = metaY + 36;
  const tableHeaders = ['#', 'SKU', 'Product Description', 'Quantity', 'UoM', 'Verification'];
  const totalUnits = op.lines.reduce((sum, l) => sum + l.quantity, 0);

  const tableBody = op.lines.map((l, idx) => [
    String(idx + 1),
    l.sku,
    l.product_name,
    l.quantity.toFixed(1),
    l.uom,
    '[   ] Passed',
  ]);

  autoTable(doc, {
    startY: tableY,
    head: [tableHeaders],
    body: tableBody,
    margin: { left: 14, right: 14, bottom: 45 },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      lineColor: [220, 215, 205],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [38, 36, 32],
      textColor: [245, 243, 239],
      fontSize: 9,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 248, 244],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold', cellWidth: 32 },
      2: { cellWidth: 'auto' },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 30 },
    },
  });

  // Get table end position
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : tableY + 50;

  // Summary box
  doc.setFillColor(244, 241, 234);
  doc.setDrawColor(26, 24, 22);
  doc.rect(pageWidth - 75, finalY, 61, 14, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 95, 90);
  doc.text('TOTAL MANIFEST UNITS:', pageWidth - 71, finalY + 5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 24, 22);
  doc.text(`${totalUnits.toFixed(1)} Units`, pageWidth - 71, finalY + 11);

  // Signatures at bottom
  const sigY = pageHeight - 38;
  const sigColWidth = (pageWidth - 28 - 20) / 2;

  // Left Signature
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.3);
  doc.line(14, sigY + 16, 14 + sigColWidth, sigY + 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('DISPATCH / PICKING OPERATOR:', 14, sigY + 4);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature & ID Badge / Date', 14, sigY + 20);

  // Right Signature
  const rightSigX = 14 + sigColWidth + 20;
  doc.line(rightSigX, sigY + 16, rightSigX + sigColWidth, sigY + 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIVING & QUALITY VERIFICATION:', rightSigX, sigY + 4);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signature / Date', rightSigX, sigY + 20);

  // Footer stamp
  doc.setDrawColor(216, 210, 197);
  doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
  doc.setFontSize(6.5);
  doc.setTextColor(140, 135, 125);
  doc.text(
    `STOCKSENSE IMS FORM 402 - LEGAL LOGISTICS CHAIN OF CUSTODY - GENERATED: ${formattedDate}`,
    14,
    pageHeight - 6
  );
  doc.text('IMMUTABLE WAREHOUSE VOUCHER', pageWidth - 14, pageHeight - 6, { align: 'right' });

  // Direct Blob download
  const blob = doc.output('blob');
  const filename = `StockSense_${op.reference}_Document.pdf`;
  triggerFileDownload(blob, filename);
}
