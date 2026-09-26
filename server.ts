import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';

// --- DATA TYPES ---
export type OperationType = 'receipt' | 'delivery' | 'internal' | 'adjustment';
export type OperationStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled';
export type UserRole = 'manager' | 'staff';

interface User {
  id: number;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

interface OTPRecord {
  id: number;
  email: string;
  otpCode: string;
  expiresAt: number;
  isUsed: boolean;
}

interface Warehouse {
  id: number;
  name: string;
  shortCode: string;
  address?: string;
}

interface Location {
  id: number;
  name: string;
  shortCode: string;
  warehouseId: number;
}

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  categoryId: number | null;
  uom: string;
  reorderPoint: number;
  cost: number;
}

interface StockQuant {
  productId: number;
  locationId: number;
  onHand: number;
  reserved: number;
  freeToUse: number;
}

interface OperationLine {
  id: number;
  operationId: number;
  productId: number;
  quantity: number;
}

interface Operation {
  id: number;
  reference: string;
  type: OperationType;
  sourceLocationId: number | null;
  destLocationId: number | null;
  contact?: string;
  scheduleDate: string;
  status: OperationStatus;
  responsibleUserId: number;
  createdAt: string;
  lines: OperationLine[];
}

interface StockMove {
  id: number;
  operationId: number;
  productId: number;
  fromLocationId: number | null;
  toLocationId: number | null;
  quantity: number;
  movedAt: string;
}

// In-Memory Database store initialized with realistic seed data
const DB = {
  users: [
    {
      id: 1,
      email: 'demo@stocksense.io',
      passwordHash: 'Password123!',
      fullName: 'Sarah Connor (Inventory Manager)',
      role: 'manager' as UserRole,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      email: 'staff@stocksense.io',
      passwordHash: 'Password123!',
      fullName: 'Alex Vance (Floor Operator)',
      role: 'staff' as UserRole,
      createdAt: new Date().toISOString(),
    },
  ] as User[],

  otps: [] as OTPRecord[],

  warehouses: [
    { id: 1, name: 'Main Central Facility', shortCode: 'WH', address: 'Dock 4B, Industrial Zone West' },
    { id: 2, name: 'Cold Storage Annex', shortCode: 'CS', address: 'Sector 7, North Logistics Park' },
  ] as Warehouse[],

  locations: [
    { id: 1, name: 'General Stock Storage', shortCode: 'STOCK', warehouseId: 1 },
    { id: 2, name: 'Incoming Goods Bay', shortCode: 'INPUT', warehouseId: 1 },
    { id: 3, name: 'Outbound Dispatch Dock', shortCode: 'OUTPUT', warehouseId: 1 },
    { id: 4, name: 'Damaged / Scrap Hold', shortCode: 'SCRAP', warehouseId: 1 },
    { id: 5, name: 'Cold Room Vault', shortCode: 'STOCK', warehouseId: 2 },
    { id: 6, name: 'Chilled Inbound Bay', shortCode: 'INPUT', warehouseId: 2 },
    { id: 7, name: 'Reefer Staging Dock', shortCode: 'OUTPUT', warehouseId: 2 },
  ] as Location[],

  categories: [
    { id: 1, name: 'Raw Materials & Metals' },
    { id: 2, name: 'Electronics & Sensors' },
    { id: 3, name: 'Hardware & Fasteners' },
    { id: 4, name: 'Finished Assemblies' },
  ] as Category[],

  products: [
    { id: 1, sku: 'STL-ROD-12', name: 'Steel Rod 12mm Cold-Rolled', categoryId: 1, uom: 'Meters', cost: 18.5, reorderPoint: 60.0 },
    { id: 2, sku: 'SEN-MOD-42', name: 'Infrared Sensor Module V2', categoryId: 2, uom: 'Units', cost: 7.2, reorderPoint: 30.0 },
    { id: 3, sku: 'LTH-BAT-24', name: 'Lithium-Ion Battery Pack 24V', categoryId: 2, uom: 'Units', cost: 85.0, reorderPoint: 20.0 },
    { id: 4, sku: 'SCR-HEX-M8', name: 'Hex Bolt M8x40mm High-Tensile (Box 100)', categoryId: 3, uom: 'Boxes', cost: 14.5, reorderPoint: 45.0 },
    { id: 5, sku: 'MOT-BLDC-48', name: 'Brushless DC Motor 48V 750W', categoryId: 4, uom: 'Units', cost: 125.0, reorderPoint: 15.0 },
    { id: 6, sku: 'PNE-VLV-10', name: 'Pneumatic Directional Solenoid Valve', categoryId: 4, uom: 'Units', cost: 46.0, reorderPoint: 25.0 },
  ] as Product[],

  stockQuants: [
    { productId: 1, locationId: 1, onHand: 120.0, reserved: 20.0, freeToUse: 100.0 },
    { productId: 2, locationId: 1, onHand: 22.0, reserved: 0.0, freeToUse: 22.0 }, // LOW
    { productId: 3, locationId: 1, onHand: 8.0, reserved: 8.0, freeToUse: 0.0 },   // CRITICAL LOW
    { productId: 4, locationId: 1, onHand: 95.0, reserved: 15.0, freeToUse: 80.0 },
    { productId: 5, locationId: 1, onHand: 35.0, reserved: 0.0, freeToUse: 35.0 },
    { productId: 6, locationId: 1, onHand: 14.0, reserved: 0.0, freeToUse: 14.0 }, // LOW
    { productId: 3, locationId: 5, onHand: 24.0, reserved: 0.0, freeToUse: 24.0 },
  ] as StockQuant[],

  sequences: {
    'WH_receipt': 4,
    'WH_delivery': 3,
    'WH_internal': 2,
    'WH_adjustment': 2,
    'CS_receipt': 2,
    'CS_delivery': 1,
    'CS_internal': 1,
    'CS_adjustment': 1,
  } as Record<string, number>,

  operations: [
    {
      id: 1,
      reference: 'WH/IN/0001',
      type: 'receipt',
      sourceLocationId: 2,
      destLocationId: 1,
      contact: 'Nippon Steel Supplies Corp',
      scheduleDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      status: 'done',
      responsibleUserId: 1,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      lines: [{ id: 1, operationId: 1, productId: 1, quantity: 50.0 }],
    },
    {
      id: 2,
      reference: 'WH/IN/0002',
      type: 'receipt',
      sourceLocationId: 2,
      destLocationId: 1,
      contact: 'Sensirion Tech Ltd',
      scheduleDate: new Date(Date.now() + 6 * 3600000).toISOString(),
      status: 'ready',
      responsibleUserId: 2,
      createdAt: new Date(Date.now() - 10 * 3600000).toISOString(),
      lines: [{ id: 2, operationId: 2, productId: 2, quantity: 40.0 }],
    },
    {
      id: 3,
      reference: 'WH/IN/0003',
      type: 'receipt',
      sourceLocationId: 2,
      destLocationId: 1,
      contact: 'Apex Fasteners GmbH',
      scheduleDate: new Date(Date.now() + 24 * 3600000).toISOString(),
      status: 'draft',
      responsibleUserId: 1,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      lines: [{ id: 3, operationId: 3, productId: 4, quantity: 25.0 }],
    },
    {
      id: 4,
      reference: 'WH/OUT/0001',
      type: 'delivery',
      sourceLocationId: 1,
      destLocationId: 3,
      contact: 'Tesla Gigafactory Assembly Bay 9',
      scheduleDate: new Date(Date.now() + 24 * 3600000).toISOString(),
      status: 'waiting',
      responsibleUserId: 1,
      createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
      lines: [{ id: 4, operationId: 4, productId: 3, quantity: 16.0 }],
    },
    {
      id: 5,
      reference: 'WH/OUT/0002',
      type: 'delivery',
      sourceLocationId: 1,
      destLocationId: 3,
      contact: 'RoboDrive Dynamics Inc',
      scheduleDate: new Date(Date.now() + 4 * 3600000).toISOString(),
      status: 'ready',
      responsibleUserId: 2,
      createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      lines: [
        { id: 5, operationId: 5, productId: 1, quantity: 20.0 },
        { id: 6, operationId: 5, productId: 4, quantity: 15.0 },
      ],
    },
    {
      id: 6,
      reference: 'WH/INT/0001',
      type: 'internal',
      sourceLocationId: 1,
      destLocationId: 5,
      contact: 'Cold Storage Redistribution Transfer',
      scheduleDate: new Date(Date.now() + 12 * 3600000).toISOString(),
      status: 'ready',
      responsibleUserId: 1,
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      lines: [{ id: 7, operationId: 6, productId: 3, quantity: 4.0 }],
    },
    {
      id: 7,
      reference: 'WH/ADJ/0001',
      type: 'adjustment',
      sourceLocationId: 1,
      destLocationId: 4,
      contact: 'Q3 Cycle Count Correction (2 damaged)',
      scheduleDate: new Date(Date.now() - 4 * 86400000).toISOString(),
      status: 'done',
      responsibleUserId: 1,
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      lines: [{ id: 8, operationId: 7, productId: 5, quantity: 2.0 }],
    },
  ] as Operation[],

  stockMoves: [
    {
      id: 1,
      operationId: 1,
      productId: 1,
      fromLocationId: 2,
      toLocationId: 1,
      quantity: 50.0,
      movedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 2,
      operationId: 7,
      productId: 5,
      fromLocationId: 1,
      toLocationId: 4,
      quantity: 2.0,
      movedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
  ] as StockMove[],
};

function getNextReference(warehouseId: number, type: OperationType): string {
  const wh = DB.warehouses.find((w) => w.id === warehouseId);
  const whCode = wh ? wh.shortCode.toUpperCase() : 'WH';

  const typeMap: Record<OperationType, string> = {
    receipt: 'IN',
    delivery: 'OUT',
    internal: 'INT',
    adjustment: 'ADJ',
  };
  const typeCode = typeMap[type] || 'OP';

  const key = `${whCode}_${type}`;
  const currentSeq = DB.sequences[key] || 1;
  DB.sequences[key] = currentSeq + 1;

  const paddedSeq = String(currentSeq).padStart(4, '0');
  return `${whCode}/${typeCode}/${paddedSeq}`;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- AUTH ROUTES ---
  app.post('/api/auth/signup', (req: Request, res: Response) => {
    const { email, password, full_name, role } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ detail: 'Email, password, and full name are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const existing = DB.users.find((u) => u.email === cleanEmail);
    if (existing) {
      return res.status(400).json({ detail: 'User with this email already exists' });
    }

    const newUser: User = {
      id: DB.users.length + 1,
      email: cleanEmail,
      passwordHash: password,
      fullName: full_name.trim(),
      role: role || 'staff',
      createdAt: new Date().toISOString(),
    };
    DB.users.push(newUser);

    return res.json({
      access_token: `jwt_token_${newUser.id}_${Date.now()}`,
      token_type: 'bearer',
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.fullName,
        role: newUser.role,
      },
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = DB.users.find((u) => u.email === cleanEmail && u.passwordHash === password);
    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password credentials' });
    }

    return res.json({
      access_token: `jwt_token_${user.id}_${Date.now()}`,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
      },
    });
  });

  app.post('/api/auth/request-otp', (req: Request, res: Response) => {
    const { email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = DB.users.find((u) => u.email === cleanEmail);

    if (!user) {
      return res.json({ message: 'If an account exists, a 6-digit OTP code has been issued.' });
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    DB.otps.push({
      id: DB.otps.length + 1,
      email: cleanEmail,
      otpCode,
      expiresAt: Date.now() + 15 * 60 * 1000,
      isUsed: false,
    });

    return res.json({
      message: 'OTP sent to registered email.',
      debug_otp: otpCode, // Convenient for hackathon demo
    });
  });

  app.post('/api/auth/verify-otp-reset', (req: Request, res: Response) => {
    const { email, otp_code, new_password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp_code || '').trim();

    const record = DB.otps.find(
      (o) => o.email === cleanEmail && o.otpCode === cleanOtp && !o.isUsed && o.expiresAt > Date.now()
    );

    if (!record) {
      return res.status(400).json({ detail: 'Invalid or expired OTP code' });
    }

    const user = DB.users.find((u) => u.email === cleanEmail);
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    user.passwordHash = new_password;
    record.isUsed = true;
    return res.json({ message: 'Password reset successfully. You may now login.' });
  });

  // --- WAREHOUSE & LOCATION ROUTES ---
  app.get('/api/warehouses', (_req: Request, res: Response) => {
    return res.json(DB.warehouses);
  });

  app.post('/api/warehouses', (req: Request, res: Response) => {
    const { name, short_code, address } = req.body;
    if (!name || !short_code) {
      return res.status(400).json({ detail: 'Warehouse name and short code are required' });
    }
    const code = short_code.trim().toUpperCase();
    if (DB.warehouses.some((w) => w.shortCode === code)) {
      return res.status(400).json({ detail: `Warehouse code '${code}' already exists` });
    }

    const newWh: Warehouse = {
      id: DB.warehouses.length + 1,
      name: name.trim(),
      shortCode: code,
      address,
    };
    DB.warehouses.push(newWh);

    // Auto-create standard Stock, Input, Output locations
    DB.locations.push(
      { id: DB.locations.length + 1, name: 'General Stock', shortCode: 'STOCK', warehouseId: newWh.id },
      { id: DB.locations.length + 2, name: 'Inbound Receiving Bay', shortCode: 'INPUT', warehouseId: newWh.id },
      { id: DB.locations.length + 3, name: 'Outbound Dispatch Bay', shortCode: 'OUTPUT', warehouseId: newWh.id }
    );

    return res.json(newWh);
  });

  app.get('/api/locations', (req: Request, res: Response) => {
    const { warehouse_id } = req.query;
    let list = DB.locations;
    if (warehouse_id) {
      list = list.filter((l) => l.warehouseId === Number(warehouse_id));
    }
    const formatted = list.map((l) => {
      const wh = DB.warehouses.find((w) => w.id === l.warehouseId);
      return {
        id: l.id,
        name: l.name,
        short_code: l.shortCode,
        warehouse_id: l.warehouseId,
        warehouse_code: wh ? wh.shortCode : null,
      };
    });
    return res.json(formatted);
  });

  app.post('/api/locations', (req: Request, res: Response) => {
    const { name, short_code, warehouse_id } = req.body;
    if (!name || !short_code || !warehouse_id) {
      return res.status(400).json({ detail: 'Name, short_code, and warehouse_id are required' });
    }
    const code = short_code.trim().toUpperCase();
    const existing = DB.locations.find((l) => l.warehouseId === Number(warehouse_id) && l.shortCode === code);
    if (existing) {
      return res.status(400).json({ detail: `Location '${code}' already exists in this warehouse` });
    }

    const newLoc: Location = {
      id: DB.locations.length + 1,
      name: name.trim(),
      shortCode: code,
      warehouseId: Number(warehouse_id),
    };
    DB.locations.push(newLoc);

    const wh = DB.warehouses.find((w) => w.id === newLoc.warehouseId);
    return res.json({
      id: newLoc.id,
      name: newLoc.name,
      short_code: newLoc.shortCode,
      warehouse_id: newLoc.warehouseId,
      warehouse_code: wh ? wh.shortCode : null,
    });
  });

  // --- CATEGORIES ---
  app.get('/api/categories', (_req: Request, res: Response) => {
    return res.json(DB.categories);
  });

  app.post('/api/categories', (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ detail: 'Category name is required' });
    }
    const cleanName = name.trim();
    if (DB.categories.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      return res.status(400).json({ detail: 'Category name already exists' });
    }
    const newCat: Category = {
      id: DB.categories.length + 1,
      name: cleanName,
    };
    DB.categories.push(newCat);
    return res.json(newCat);
  });

  // --- PRODUCTS ---
  app.get('/api/products', (req: Request, res: Response) => {
    const { category_id, search } = req.query;
    let list = DB.products;
    if (category_id) {
      list = list.filter((p) => p.categoryId === Number(category_id));
    }
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }

    const formatted = list.map((p) => {
      const cat = DB.categories.find((c) => c.id === p.categoryId);
      const quants = DB.stockQuants.filter((q) => q.productId === p.id);
      const totalOnHand = quants.reduce((sum, q) => sum + q.onHand, 0);
      const totalFree = quants.reduce((sum, q) => sum + q.freeToUse, 0);
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category_id: p.categoryId,
        category_name: cat ? cat.name : null,
        uom: p.uom,
        reorder_point: p.reorderPoint,
        cost: p.cost,
        total_on_hand: totalOnHand,
        total_free_to_use: totalFree,
      };
    });
    return res.json(formatted);
  });

  app.post('/api/products', (req: Request, res: Response) => {
    const { sku, name, category_id, uom, reorder_point, cost, initial_stock, initial_location_id } = req.body;
    if (!sku || !name) {
      return res.status(400).json({ detail: 'SKU and product name are required' });
    }
    const cleanSku = sku.trim().toUpperCase();
    if (DB.products.some((p) => p.sku === cleanSku)) {
      return res.status(400).json({ detail: `SKU '${cleanSku}' already exists` });
    }

    const newProd: Product = {
      id: DB.products.length + 1,
      sku: cleanSku,
      name: name.trim(),
      categoryId: category_id ? Number(category_id) : null,
      uom: uom || 'Units',
      reorderPoint: Number(reorder_point) || 10.0,
      cost: Number(cost) || 0.0,
    };
    DB.products.push(newProd);

    // Initial stock quant
    if (initial_stock && Number(initial_stock) > 0 && initial_location_id) {
      DB.stockQuants.push({
        productId: newProd.id,
        locationId: Number(initial_location_id),
        onHand: Number(initial_stock),
        reserved: 0.0,
        freeToUse: Number(initial_stock),
      });
    }

    const cat = DB.categories.find((c) => c.id === newProd.categoryId);
    const quants = DB.stockQuants.filter((q) => q.productId === newProd.id);
    const totalOnHand = quants.reduce((sum, q) => sum + q.onHand, 0);
    const totalFree = quants.reduce((sum, q) => sum + q.freeToUse, 0);

    return res.json({
      id: newProd.id,
      sku: newProd.sku,
      name: newProd.name,
      category_id: newProd.categoryId,
      category_name: cat ? cat.name : null,
      uom: newProd.uom,
      reorder_point: newProd.reorderPoint,
      cost: newProd.cost,
      total_on_hand: totalOnHand,
      total_free_to_use: totalFree,
    });
  });

  // --- STOCK QUANTS ---
  app.get('/api/stock', (req: Request, res: Response) => {
    const { warehouse_id } = req.query;
    let list = DB.stockQuants;
    if (warehouse_id) {
      const whId = Number(warehouse_id);
      const locIds = DB.locations.filter((l) => l.warehouseId === whId).map((l) => l.id);
      list = list.filter((q) => locIds.includes(q.locationId));
    }

    const formatted = list.map((q) => {
      const p = DB.products.find((prod) => prod.id === q.productId);
      const loc = DB.locations.find((l) => l.id === q.locationId);
      const wh = loc ? DB.warehouses.find((w) => w.id === loc.warehouseId) : null;
      const cat = p ? DB.categories.find((c) => c.id === p.categoryId) : null;

      return {
        product_id: q.productId,
        product_name: p ? p.name : 'Unknown',
        sku: p ? p.sku : 'N/A',
        category_name: cat ? cat.name : 'Uncategorized',
        uom: p ? p.uom : 'Units',
        cost: p ? p.cost : 0.0,
        location_id: q.locationId,
        location_name: loc ? loc.name : 'Unknown Location',
        warehouse_code: wh ? wh.shortCode : 'N/A',
        on_hand: q.onHand,
        reserved: q.reserved,
        free_to_use: q.freeToUse,
      };
    });

    return res.json(formatted);
  });

  app.put('/api/stock/:productId/:locationId', (req: Request, res: Response) => {
    const pId = Number(req.params.productId);
    const locId = Number(req.params.locationId);
    const { on_hand } = req.body;

    if (on_hand === undefined || Number(on_hand) < 0) {
      return res.status(400).json({ detail: 'Quantity must be non-negative' });
    }

    let quant = DB.stockQuants.find((q) => q.productId === pId && q.locationId === locId);
    if (!quant) {
      quant = {
        productId: pId,
        locationId: locId,
        onHand: Number(on_hand),
        reserved: 0.0,
        freeToUse: Number(on_hand),
      };
      DB.stockQuants.push(quant);
    } else {
      quant.onHand = Number(on_hand);
      quant.freeToUse = Math.max(0, quant.onHand - quant.reserved);
    }

    const p = DB.products.find((prod) => prod.id === quant.productId);
    const loc = DB.locations.find((l) => l.id === quant.locationId);
    const wh = loc ? DB.warehouses.find((w) => w.id === loc.warehouseId) : null;
    const cat = p ? DB.categories.find((c) => c.id === p.categoryId) : null;

    return res.json({
      product_id: quant.productId,
      product_name: p ? p.name : 'Unknown',
      sku: p ? p.sku : 'N/A',
      category_name: cat ? cat.name : 'Uncategorized',
      uom: p ? p.uom : 'Units',
      cost: p ? p.cost : 0.0,
      location_id: quant.locationId,
      location_name: loc ? loc.name : 'Unknown Location',
      warehouse_code: wh ? wh.shortCode : 'N/A',
      on_hand: quant.onHand,
      reserved: quant.reserved,
      free_to_use: quant.freeToUse,
    });
  });

  // --- OPERATIONS (UNIFIED LIFECYCLE) ---
  function formatOp(op: Operation) {
    const src = DB.locations.find((l) => l.id === op.sourceLocationId);
    const dst = DB.locations.find((l) => l.id === op.destLocationId);
    const user = DB.users.find((u) => u.id === op.responsibleUserId);

    return {
      id: op.id,
      reference: op.reference,
      type: op.type,
      source_location_id: op.sourceLocationId,
      source_location_name: src ? src.name : null,
      dest_location_id: op.destLocationId,
      dest_location_name: dst ? dst.name : null,
      contact: op.contact || null,
      schedule_date: op.scheduleDate,
      status: op.status,
      responsible_user_id: op.responsibleUserId,
      responsible_user_name: user ? user.fullName : null,
      created_at: op.createdAt,
      lines: op.lines.map((line) => {
        const prod = DB.products.find((p) => p.id === line.productId);
        return {
          id: line.id,
          product_id: line.productId,
          product_name: prod ? prod.name : 'Product',
          sku: prod ? prod.sku : 'SKU',
          uom: prod ? prod.uom : 'Units',
          quantity: line.quantity,
        };
      }),
    };
  }

  app.get('/api/operations', (req: Request, res: Response) => {
    const { type, status, search } = req.query;
    let list = [...DB.operations];

    if (type) {
      list = list.filter((op) => op.type === type);
    }
    if (status) {
      list = list.filter((op) => op.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(
        (op) =>
          op.reference.toLowerCase().includes(q) ||
          (op.contact && op.contact.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json(list.map(formatOp));
  });

  app.get('/api/operations/:id', (req: Request, res: Response) => {
    const op = DB.operations.find((o) => o.id === Number(req.params.id));
    if (!op) {
      return res.status(404).json({ detail: 'Operation not found' });
    }
    return res.json(formatOp(op));
  });

  app.post('/api/operations', (req: Request, res: Response) => {
    const { warehouse_id, type, source_location_id, dest_location_id, contact, schedule_date, lines, responsible_user_id } = req.body;

    if (!warehouse_id || !type || !lines || lines.length === 0) {
      return res.status(400).json({ detail: 'Warehouse, type, and at least one operation line are required' });
    }

    if (type === 'receipt' && !dest_location_id) {
      return res.status(400).json({ detail: 'Destination location is required for receipts' });
    }
    if (type === 'delivery' && !source_location_id) {
      return res.status(400).json({ detail: 'Source location is required for deliveries' });
    }
    if ((type === 'internal' || type === 'adjustment') && (!source_location_id || !dest_location_id)) {
      return res.status(400).json({ detail: 'Both source and destination locations are required' });
    }

    // Generate reference sequence WH/IN/0001
    const reference = getNextReference(Number(warehouse_id), type as OperationType);

    const opId = DB.operations.length + 1;
    const opLines: OperationLine[] = lines.map((l: any, idx: number) => {
      const q = Number(l.quantity);
      if (isNaN(q) || q <= 0) {
        throw new Error('Quantity must be strictly greater than zero');
      }
      return {
        id: opId * 100 + idx,
        operationId: opId,
        productId: Number(l.product_id),
        quantity: q,
      };
    });

    const newOp: Operation = {
      id: opId,
      reference,
      type: type as OperationType,
      sourceLocationId: source_location_id ? Number(source_location_id) : null,
      destLocationId: dest_location_id ? Number(dest_location_id) : null,
      contact: contact ? contact.trim() : undefined,
      scheduleDate: schedule_date || new Date().toISOString(),
      status: 'draft',
      responsibleUserId: responsible_user_id ? Number(responsible_user_id) : 1,
      createdAt: new Date().toISOString(),
      lines: opLines,
    };

    DB.operations.push(newOp);
    return res.json(formatOp(newOp));
  });

  app.post('/api/operations/:id/mark-ready', (req: Request, res: Response) => {
    const op = DB.operations.find((o) => o.id === Number(req.params.id));
    if (!op) {
      return res.status(404).json({ detail: 'Operation not found' });
    }
    if (op.status === 'done' || op.status === 'cancelled') {
      return res.status(400).json({ detail: `Operation is already ${op.status}` });
    }

    // If delivery, check for sufficient stock
    if (op.type === 'delivery') {
      let insufficient = false;
      for (const line of op.lines) {
        const quant = DB.stockQuants.find(
          (q) => q.productId === line.productId && q.locationId === op.sourceLocationId
        );
        const free = quant ? quant.freeToUse : 0;
        if (free < line.quantity) {
          insufficient = true;
          break;
        }
      }
      if (insufficient) {
        op.status = 'waiting';
        return res.json(formatOp(op));
      }
    }

    op.status = 'ready';
    return res.json(formatOp(op));
  });

  // ATOMIC VALIDATION: updates StockQuant + writes StockMove ledger + status 'done'
  app.post('/api/operations/:id/validate', (req: Request, res: Response) => {
    const op = DB.operations.find((o) => o.id === Number(req.params.id));
    if (!op) {
      return res.status(404).json({ detail: 'Operation not found' });
    }
    if (op.status === 'done') {
      return res.status(400).json({ detail: 'Operation has already been validated and is immutable' });
    }
    if (op.status === 'cancelled') {
      return res.status(400).json({ detail: 'Cannot validate a cancelled operation' });
    }

    const movedAt = new Date().toISOString();

    // Perform atomic stock moves
    for (const line of op.lines) {
      // 1. Decrement source if applicable
      if (op.sourceLocationId) {
        let srcQuant = DB.stockQuants.find(
          (q) => q.productId === line.productId && q.locationId === op.sourceLocationId
        );
        if (!srcQuant) {
          srcQuant = {
            productId: line.productId,
            locationId: op.sourceLocationId,
            onHand: 0.0,
            reserved: 0.0,
            freeToUse: 0.0,
          };
          DB.stockQuants.push(srcQuant);
        }
        srcQuant.onHand -= line.quantity;
        srcQuant.freeToUse = Math.max(0, srcQuant.onHand - srcQuant.reserved);
      }

      // 2. Increment destination if applicable
      if (op.destLocationId) {
        let dstQuant = DB.stockQuants.find(
          (q) => q.productId === line.productId && q.locationId === op.destLocationId
        );
        if (!dstQuant) {
          dstQuant = {
            productId: line.productId,
            locationId: op.destLocationId,
            onHand: 0.0,
            reserved: 0.0,
            freeToUse: 0.0,
          };
          DB.stockQuants.push(dstQuant);
        }
        dstQuant.onHand += line.quantity;
        dstQuant.freeToUse = Math.max(0, dstQuant.onHand - dstQuant.reserved);
      }

      // 3. Insert into StockMove audit ledger
      DB.stockMoves.push({
        id: DB.stockMoves.length + 1,
        operationId: op.id,
        productId: line.productId,
        fromLocationId: op.sourceLocationId,
        toLocationId: op.destLocationId,
        quantity: line.quantity,
        movedAt,
      });
    }

    op.status = 'done';
    return res.json(formatOp(op));
  });

  app.post('/api/operations/:id/cancel', (req: Request, res: Response) => {
    const op = DB.operations.find((o) => o.id === Number(req.params.id));
    if (!op) {
      return res.status(404).json({ detail: 'Operation not found' });
    }
    if (op.status === 'done') {
      return res.status(400).json({ detail: 'Cannot cancel an already completed operation' });
    }
    op.status = 'cancelled';
    return res.json(formatOp(op));
  });

  // --- MOVE HISTORY AUDIT LEDGER ---
  app.get('/api/moves', (req: Request, res: Response) => {
    const { operation_type, product_id, search } = req.query;
    let list = [...DB.stockMoves];

    if (operation_type) {
      list = list.filter((m) => {
        const op = DB.operations.find((o) => o.id === m.operationId);
        return op && op.type === operation_type;
      });
    }

    if (product_id) {
      list = list.filter((m) => m.productId === Number(product_id));
    }

    const formatted = list.map((m) => {
      const op = DB.operations.find((o) => o.id === m.operationId);
      const prod = DB.products.find((p) => p.id === m.productId);
      const fromLoc = DB.locations.find((l) => l.id === m.fromLocationId);
      const toLoc = DB.locations.find((l) => l.id === m.toLocationId);

      return {
        id: m.id,
        operation_id: m.operationId,
        operation_reference: op ? op.reference : 'N/A',
        operation_type: op ? op.type : 'receipt',
        product_id: m.productId,
        product_name: prod ? prod.name : 'Unknown Product',
        sku: prod ? prod.sku : 'N/A',
        uom: prod ? prod.uom : 'Units',
        from_location_id: m.fromLocationId,
        from_location_name: fromLoc ? fromLoc.name : 'External Vendor / Receiving',
        to_location_id: m.toLocationId,
        to_location_name: toLoc ? toLoc.name : 'Customer / Scrap Output',
        quantity: m.quantity,
        moved_at: m.movedAt,
      };
    });

    if (search) {
      const q = String(search).toLowerCase();
      return res.json(
        formatted.filter(
          (m) =>
            m.operation_reference.toLowerCase().includes(q) ||
            m.product_name.toLowerCase().includes(q) ||
            m.sku.toLowerCase().includes(q)
        )
      );
    }

    formatted.sort((a, b) => new Date(b.moved_at).getTime() - new Date(a.moved_at).getTime());
    return res.json(formatted);
  });

  // --- DASHBOARD KPIS & AGGREGATION ---
  app.get('/api/dashboard', (_req: Request, res: Response) => {
    let lowOrOutCount = 0;
    let totalStockValue = 0;

    for (const p of DB.products) {
      const quants = DB.stockQuants.filter((q) => q.productId === p.id);
      const totalOnHand = quants.reduce((s, q) => s + q.onHand, 0);
      totalStockValue += totalOnHand * p.cost;
      if (totalOnHand <= p.reorderPoint) {
        lowOrOutCount++;
      }
    }

    const pendingReceipts = DB.operations.filter(
      (o) => o.type === 'receipt' && ['draft', 'waiting', 'ready'].includes(o.status)
    ).length;

    const pendingDeliveries = DB.operations.filter(
      (o) => o.type === 'delivery' && ['draft', 'waiting', 'ready'].includes(o.status)
    ).length;

    const scheduledTransfers = DB.operations.filter(
      (o) => o.type === 'internal' && ['draft', 'ready'].includes(o.status)
    ).length;

    const recentReceipts = DB.operations
      .filter((o) => o.type === 'receipt')
      .slice(-5)
      .reverse()
      .map(formatOp);

    const recentDeliveries = DB.operations
      .filter((o) => o.type === 'delivery')
      .slice(-5)
      .reverse()
      .map(formatOp);

    return res.json({
      total_products: DB.products.length,
      low_or_out_of_stock_count: lowOrOutCount,
      pending_receipts_count: pendingReceipts,
      pending_deliveries_count: pendingDeliveries,
      scheduled_transfers_count: scheduledTransfers,
      total_stock_value: Math.round(totalStockValue * 100) / 100,
      recent_receipts: recentReceipts,
      recent_deliveries: recentDeliveries,
    });
  });

  // In development, mount Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  const port = process.env.PORT || 3000;
  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`StockSense Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
