import React from 'react';
import { User } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { StockSenseLogo } from './StockSenseLogo';
import { SmartAlertsTray } from './SmartAlertsTray';
import {
  LayoutDashboard,
  ArrowDownToLine,
  Boxes,
  History,
  Settings,
  LogOut,
  ShieldCheck,
  HardHat,
} from 'lucide-react';

export type MainNavTab = 'dashboard' | 'operations' | 'products' | 'moves' | 'settings';
export type OperationsSubTab = 'receipts' | 'deliveries' | 'transfers' | 'adjustments';
export type ProductsSubTab = 'catalog' | 'stock';

interface NavbarProps {
  currentTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  operationsSubTab: OperationsSubTab;
  onSelectOperationsSubTab: (sub: OperationsSubTab) => void;
  productsSubTab: ProductsSubTab;
  onSelectProductsSubTab: (sub: ProductsSubTab) => void;
  user: User | null;
  onLogout: () => void;
  stockUpdateCounter?: number;
  onNavigateToCatalogWithSku?: (sku: string) => void;
  onNavigateToReplenish?: (productId: number, sku: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  operationsSubTab,
  onSelectOperationsSubTab,
  productsSubTab,
  onSelectProductsSubTab,
  user,
  onLogout,
  stockUpdateCounter = 0,
  onNavigateToCatalogWithSku,
  onNavigateToReplenish,
}) => {
  const isManager =
    user?.role === 'inventory_manager' || (user?.role as any) === 'manager';

  return (
    <header className="bg-[#201E1A] border-b border-[#34312B] sticky top-0 z-40">
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onSelectTab('dashboard')}
            title="Return to Dashboard"
          >
            <StockSenseLogo variant="full" size="md" />
            <span className="hidden lg:inline text-[9px] font-mono tracking-widest px-1.5 py-0.5 bg-[#262420] text-[#8B8478] border border-[#34312B] uppercase">
              RBAC SECURED
            </span>
          </div>

          {/* Main Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                currentTab === 'dashboard'
                  ? 'border-[#F2C230] text-[#F2C230]'
                  : 'border-transparent text-[#8B8478] hover:text-[#F5F3EF]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('operations')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                currentTab === 'operations'
                  ? 'border-[#F2C230] text-[#F2C230]'
                  : 'border-transparent text-[#8B8478] hover:text-[#F5F3EF]'
              }`}
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Operations</span>
            </button>

            <button
              onClick={() => onSelectTab('products')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                currentTab === 'products'
                  ? 'border-[#F2C230] text-[#F2C230]'
                  : 'border-transparent text-[#8B8478] hover:text-[#F5F3EF]'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Products & Stock</span>
            </button>

            <button
              onClick={() => onSelectTab('moves')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                currentTab === 'moves'
                  ? 'border-[#F2C230] text-[#F2C230]'
                  : 'border-transparent text-[#8B8478] hover:text-[#F5F3EF]'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Move History</span>
            </button>

            {/* RBAC: Floor Operator does NOT see Settings in the nav at all */}
            {isManager && (
              <button
                onClick={() => onSelectTab('settings')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                  currentTab === 'settings'
                    ? 'border-[#F2C230] text-[#F2C230]'
                    : 'border-transparent text-[#8B8478] hover:text-[#F5F3EF]'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            )}
          </nav>

          {/* User Profile, Theme Toggle & Smart Alerts */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Smart Alerts Notification Tray */}
            {user && (
              <SmartAlertsTray
                currentUser={user}
                stockUpdateCounter={stockUpdateCounter}
                onNavigateToCatalog={(sku) => {
                  if (onNavigateToCatalogWithSku && sku) {
                    onNavigateToCatalogWithSku(sku);
                  } else {
                    onSelectProductsSubTab('catalog');
                    onSelectTab('products');
                  }
                }}
                onNavigateToStockLedger={() => {
                  onSelectProductsSubTab('stock');
                  onSelectTab('products');
                }}
                onNavigateToReplenish={(productId, sku) => {
                  if (onNavigateToReplenish) {
                    onNavigateToReplenish(productId, sku);
                  } else {
                    onSelectOperationsSubTab('receipts');
                    onSelectTab('operations');
                  }
                }}
              />
            )}

            {/* Dark / Light Mode Toggler */}
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-2.5">
                {/* Visible Role Badge */}
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-[#F5F3EF] leading-tight">
                    {user.full_name}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {isManager ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 bg-[rgba(242,194,48,0.15)] text-[#F2C230] border border-[rgba(242,194,48,0.4)]">
                        <ShieldCheck className="w-3 h-3" />
                        INVENTORY MANAGER
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 bg-[rgba(74,144,217,0.15)] text-[#4A90D9] border border-[rgba(74,144,217,0.4)]">
                        <HardHat className="w-3 h-3" />
                        FLOOR OPERATOR [{user.assigned_warehouse_code || 'WH'}]
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="p-2 border border-[#34312B] bg-[#262420] text-[#8B8478] hover:text-[#F5F3EF] hover:border-[#8B8478] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-xs font-mono text-[#8B8478]">UNAUTHENTICATED</div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Navigation Bar for Operations & Products */}
      {currentTab === 'operations' && (
        <div className="bg-[#1A1816] border-t border-[#34312B] px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-2 py-2 overflow-x-auto text-xs font-mono">
            <button
              onClick={() => onSelectOperationsSubTab('receipts')}
              className={`px-3 py-1.5 border uppercase transition-colors ${
                operationsSubTab === 'receipts'
                  ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                  : 'bg-transparent text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
              }`}
            >
              Receipts (IN)
            </button>
            <button
              onClick={() => onSelectOperationsSubTab('deliveries')}
              className={`px-3 py-1.5 border uppercase transition-colors ${
                operationsSubTab === 'deliveries'
                  ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                  : 'bg-transparent text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
              }`}
            >
              Delivery Orders (OUT)
            </button>
            <button
              onClick={() => onSelectOperationsSubTab('transfers')}
              className={`px-3 py-1.5 border uppercase transition-colors ${
                operationsSubTab === 'transfers'
                  ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                  : 'bg-transparent text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
              }`}
            >
              Internal Transfers (INT)
            </button>
            <button
              onClick={() => onSelectOperationsSubTab('adjustments')}
              className={`px-3 py-1.5 border uppercase transition-colors ${
                operationsSubTab === 'adjustments'
                  ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                  : 'bg-transparent text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
              }`}
            >
              Stock Adjustments (ADJ)
            </button>
          </div>
        </div>
      )}

      {currentTab === 'products' && (
        <div className="bg-[#1A1816] border-t border-[#34312B] px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-2 py-2 overflow-x-auto text-xs font-mono">
            <button
              onClick={() => onSelectProductsSubTab('catalog')}
              className={`px-3 py-1.5 border uppercase transition-colors ${
                productsSubTab === 'catalog'
                  ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                  : 'bg-transparent text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
              }`}
            >
              Product Catalog {isManager ? '' : '(Read-Only)'}
            </button>
            <button
              onClick={() => onSelectProductsSubTab('stock')}
              className={`px-3 py-1.5 border uppercase transition-colors ${
                productsSubTab === 'stock'
                  ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                  : 'bg-transparent text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
              }`}
            >
              Physical Stock Ledger {isManager ? '(Inline Edit)' : '(Station Ledger)'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
