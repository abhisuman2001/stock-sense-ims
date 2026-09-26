# StockSense — Modular Inventory Management System (IMS)

StockSense is a high-reliability, industrial inventory management system engineered for Warehouse Staff and Inventory Managers. It unifies Receipts (incoming), Delivery Orders (outgoing), Internal Transfers, and Stock Adjustments into a single, cohesive **Operation** lifecycle with an immutable **StockMove** audit ledger and location-level **StockQuant** tracking.

---

## 🏗 System Architecture & Git Repo Structure

This repository is structured for multi-person engineering collaboration:

```
├── backend/                   # Python FastAPI service & SQLAlchemy models
│   ├── database.py            # PostgreSQL engine & session lifecycle
│   ├── models.py              # Normalized relational models (Product, StockQuant, Operation, etc.)
│   ├── schemas.py             # Strict Pydantic v2 validation contracts
│   ├── seed.py                # Deterministic seed script for initial live demo data
│   └── main.py                # REST endpoints, atomic validation & sequence generator
├── migrations/                # Alembic migration management
│   ├── env.py                 # Target metadata & connection config
│   ├── script.py.mako         # Version generation template
│   └── versions/              # Applied schema revisions
│       └── 001_initial_schema.py
├── src/                       # React 19 + TypeScript + Tailwind CSS Frontend
│   ├── components/            # UI components styled per Industrial Warehouse design
│   ├── types/                 # Shared TypeScript interfaces
│   ├── App.tsx                # Master routing, navigation, modals, and screen views
│   └── index.css              # Industrial theme variables & typography
├── server.ts                  # Full-stack Node/Express dev & preview bridge
├── alembic.ini                # Alembic database configuration
└── package.json               # Node packages & scripts
```

---

## 🎨 Industrial Warehouse Design System

The UI strictly adheres to a utilitarian, high-contrast industrial palette:
- **App Background**: `#1A1816` (warm near-black)
- **Header & Nav**: `#201E1A`
- **Surface / Cards**: `#262420`
- **Borders & Dividers**: `#34312B`
- **Primary Text**: `#F5F3EF`
- **Secondary / Muted Text**: `#8B8478`
- **Primary Accent**: `#F2C230` (Safety Yellow — reserved exclusively for primary actions & active states)
- **Dedicated Status Codes** (only status indicators carry these semantic colors):
  - `Draft` → `#8B8478` (Gray)
  - `Waiting` → `#E8A33D` (Amber)
  - `Ready` → `#4A90D9` (Blue)
  - `Done` → `#5FA85D` (Green)
  - `Cancelled / Late` → `#D9534F` (Red)
- **Typography**: Inter for UI labels; JetBrains Mono for SKUs, reference numbers (`WH/IN/0001`), and tabular numeric quantities.

---

## ⚡ Setup & Local Execution (Backend + Postgres)

### 1. Database Setup (Local PostgreSQL)
Ensure PostgreSQL 14+ is installed and running locally:
```bash
# Create local database and user
createdb stocksense_db
```

Set environment variable in `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stocksense_db
```

### 2. Python Environment & Migrations
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run Alembic migrations to create tables and indexes
alembic upgrade head

# Seed initial operational data (warehouses, locations, products, initial stock)
python -m backend.seed

# Start the FastAPI server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🚀 Frontend & Dev Server
```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to interact with the full dashboard and management interface.

---

## 🔒 Atomic Inventory Lifecycle Rules

1. **Auto-Generated Sequences**: Reference numbers follow `{WAREHOUSE}/{TYPE_CODE}/{SEQUENCE}` (e.g. `WH/IN/0001`, `CS/OUT/0002`) generated from an atomic database sequence table, preventing collisions in multi-user concurrent environments.
2. **Atomic Validation**: When an operation is marked as `Done` via `/validate`:
   - Source location stock is deducted in `StockQuant`
   - Destination location stock is increased in `StockQuant`
   - An immutable `StockMove` record is written to the audit ledger
   - Operation status transitions to `Done`
   - All steps execute within a single transactional boundary (`db.commit()` with `with_for_update()`).
3. **Immutability**: Once marked `Done` or `Cancelled`, operation document lines and references cannot be altered.
