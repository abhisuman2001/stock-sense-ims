import React, { useState } from 'react';
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
  Menu,
  X,
  ChevronRight,
  User as UserIcon,
  SunMoon,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isManager =
    user?.role === 'inventory_manager' || (user?.role as any) === 'manager';

  const handleTabClick = (tab: MainNavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const handleOperationsSubTabClick = (sub: OperationsSubTab) => {
    onSelectOperationsSubTab(sub);
    onSelectTab('operations');
    setMobileMenuOpen(false);
  };

  const handleProductsSubTabClick = (sub: ProductsSubTab) => {
    onSelectProductsSubTab(sub);
    onSelectTab('products');
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-[#201E1A] border-b border-[#34312B] sticky top-0 z-40">
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
            onClick={() => handleTabClick('dashboard')}
            title="Return to Dashboard"
          >
            {/* Show compact logo on extremely small screens (<380px) and full on sm+ */}
            <div className="hidden xs:block">
              <StockSenseLogo variant="full" size="md" />
            </div>
            <div className="block xs:hidden">
              <StockSenseLogo variant="compact" size="sm" />
            </div>

            <span className="hidden xl:inline text-[9px] font-mono tracking-widest px-1.5 py-0.5 bg-[#262420] text-[#8B8478] border border-[#34312B] uppercase">
              RBAC SECURED
            </span>
          </div>

          {/* Main Navigation Tabs — Desktop (md+) */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => handleTabClick('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'border-[#F2C230] text-[#F2C230]'
                  : 'border-transparent text-[#8B8478] hover:text-[#F5F3EF]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleTabClick('operations')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                currentTab === 'operations'
                  ? 'border-[#F2C230] text-[#F2C230]'
                  : 'border-transparent text-[#8B8478] hover:text-[#F5F3EF]'
              }`}
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Operations</span>
            </button>

            <button
              onClick={() => handleTabClick('products')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                currentTab === 'products'
                  ? 'border-[#F2C230] text-[#F2C230]'
                  : 'border-transparent text-[#8B8478] hover:text-[#F5F3EF]'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Products & Stock</span>
            </button>

            <button
              onClick={() => handleTabClick('moves')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                currentTab === 'moves'
                  ? 'border-[#F2C230] text-[#F2C230]'
                  : 'border-transparent text-[#8B8478] hover:text-[#F5F3EF]'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Move History</span>
            </button>

            {/* RBAC: Floor Operator does NOT see Settings */}
            {isManager && (
              <button
                onClick={() => handleTabClick('settings')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
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

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Smart Alerts Notification Tray (Accessible directly on all viewports) */}
            {user && (
              <SmartAlertsTray
                currentUser={user}
                stockUpdateCounter={stockUpdateCounter}
                onNavigateToCatalog={(sku) => {
                  setMobileMenuOpen(false);
                  if (onNavigateToCatalogWithSku && sku) {
                    onNavigateToCatalogWithSku(sku);
                  } else {
                    onSelectProductsSubTab('catalog');
                    onSelectTab('products');
                  }
                }}
                onNavigateToStockLedger={() => {
                  setMobileMenuOpen(false);
                  onSelectProductsSubTab('stock');
                  onSelectTab('products');
                }}
                onNavigateToReplenish={(productId, sku) => {
                  setMobileMenuOpen(false);
                  if (onNavigateToReplenish) {
                    onNavigateToReplenish(productId, sku);
                  } else {
                    onSelectOperationsSubTab('receipts');
                    onSelectTab('operations');
                  }
                }}
              />
            )}

            {/* Desktop-Only Tools (ThemeToggle + User Profile + Logout) */}
            <div className="hidden md:flex items-center gap-3">
              {/* Dark / Light Mode Toggler */}
              <ThemeToggle />

              {user ? (
                <div className="flex items-center gap-2.5">
                  {/* Visible Role Badge */}
                  <div className="text-right">
                    <div className="text-xs font-semibold text-[#F5F3EF] leading-tight truncate max-w-[150px]">
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
                          FLOOR [{user.assigned_warehouse_code || 'WH'}]
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={onLogout}
                    title="Sign out"
                    className="p-2 border border-[#34312B] bg-[#262420] text-[#8B8478] hover:text-[#F5F3EF] hover:border-[#8B8478] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-xs font-mono text-[#8B8478]">UNAUTHENTICATED</div>
              )}
            </div>

            {/* Hamburger Button (Mobile / Reduced Screen Size Only: md:hidden) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className={`p-2 border transition-colors md:hidden flex items-center justify-center cursor-pointer ${
                mobileMenuOpen
                  ? 'bg-[#2E2B26] border-[#F2C230] text-[#F2C230]'
                  : 'bg-[#262420] border-[#34312B] text-[#8B8478] hover:text-[#F5F3EF] hover:border-[#8B8478]'
              }`}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Hamburger Drawer Menu (< md) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#34312B] bg-[#201E1A] shadow-2xl animate-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-4 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* User Profile Card in Hamburger */}
            {user && (
              <div className="p-3 bg-[#262420] border border-[#34312B] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-none bg-[#1A1816] border border-[#34312B] flex items-center justify-center text-[#F2C230] shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#F5F3EF] truncate">
                      {user.full_name}
                    </div>
                    <div className="text-[10px] font-mono text-[#8B8478] truncate">
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {isManager ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 bg-[rgba(242,194,48,0.15)] text-[#F2C230] border border-[rgba(242,194,48,0.4)]">
                      <ShieldCheck className="w-3 h-3" />
                      MANAGER
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 bg-[rgba(74,144,217,0.15)] text-[#4A90D9] border border-[rgba(74,144,217,0.4)]">
                      <HardHat className="w-3 h-3" />
                      OPERATOR [{user.assigned_warehouse_code || 'WH'}]
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Mobile Navigation Links */}
            <div className="space-y-1 font-mono text-xs">
              <div className="text-[10px] uppercase font-bold text-[#8B8478] px-2 mb-1.5">
                Navigation
              </div>

              {/* Dashboard */}
              <button
                onClick={() => handleTabClick('dashboard')}
                className={`w-full flex items-center justify-between p-2.5 border transition-colors cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                    : 'bg-transparent text-[#F5F3EF] border-transparent hover:bg-[#262420]'
                }`}
              >
                <div className="flex items-center gap-2.5 font-sans font-medium">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard Overview</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8B8478]" />
              </button>

              {/* Operations & Sub-links */}
              <div className="border border-[#34312B] bg-[#1A1816] p-2 space-y-1">
                <button
                  onClick={() => handleTabClick('operations')}
                  className={`w-full flex items-center justify-between p-2 transition-colors cursor-pointer ${
                    currentTab === 'operations'
                      ? 'text-[#F2C230] font-bold'
                      : 'text-[#F5F3EF] hover:text-[#F2C230]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 font-sans font-medium">
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Warehouse Operations</span>
                  </div>
                  <span className="text-[9px] font-mono text-[#8B8478] uppercase">MAIN</span>
                </button>

                {/* Sub-Operations Quick Actions */}
                <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-[#34312B] text-[11px]">
                  <button
                    onClick={() => handleOperationsSubTabClick('receipts')}
                    className={`p-1.5 border text-left cursor-pointer transition-colors ${
                      currentTab === 'operations' && operationsSubTab === 'receipts'
                        ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                        : 'bg-[#201E1A] text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
                    }`}
                  >
                    • Receipts (IN)
                  </button>
                  <button
                    onClick={() => handleOperationsSubTabClick('deliveries')}
                    className={`p-1.5 border text-left cursor-pointer transition-colors ${
                      currentTab === 'operations' && operationsSubTab === 'deliveries'
                        ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                        : 'bg-[#201E1A] text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
                    }`}
                  >
                    • Deliveries (OUT)
                  </button>
                  <button
                    onClick={() => handleOperationsSubTabClick('transfers')}
                    className={`p-1.5 border text-left cursor-pointer transition-colors ${
                      currentTab === 'operations' && operationsSubTab === 'transfers'
                        ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                        : 'bg-[#201E1A] text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
                    }`}
                  >
                    • Internal (INT)
                  </button>
                  <button
                    onClick={() => handleOperationsSubTabClick('adjustments')}
                    className={`p-1.5 border text-left cursor-pointer transition-colors ${
                      currentTab === 'operations' && operationsSubTab === 'adjustments'
                        ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                        : 'bg-[#201E1A] text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
                    }`}
                  >
                    • Adjustments (ADJ)
                  </button>
                </div>
              </div>

              {/* Products & Stock & Sub-links */}
              <div className="border border-[#34312B] bg-[#1A1816] p-2 space-y-1">
                <button
                  onClick={() => handleTabClick('products')}
                  className={`w-full flex items-center justify-between p-2 transition-colors cursor-pointer ${
                    currentTab === 'products'
                      ? 'text-[#F2C230] font-bold'
                      : 'text-[#F5F3EF] hover:text-[#F2C230]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 font-sans font-medium">
                    <Boxes className="w-4 h-4" />
                    <span>Products & Stock</span>
                  </div>
                  <span className="text-[9px] font-mono text-[#8B8478] uppercase">MAIN</span>
                </button>

                <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-[#34312B] text-[11px]">
                  <button
                    onClick={() => handleProductsSubTabClick('catalog')}
                    className={`p-1.5 border text-left cursor-pointer transition-colors ${
                      currentTab === 'products' && productsSubTab === 'catalog'
                        ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                        : 'bg-[#201E1A] text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
                    }`}
                  >
                    • Catalog
                  </button>
                  <button
                    onClick={() => handleProductsSubTabClick('stock')}
                    className={`p-1.5 border text-left cursor-pointer transition-colors ${
                      currentTab === 'products' && productsSubTab === 'stock'
                        ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                        : 'bg-[#201E1A] text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
                    }`}
                  >
                    • Stock Ledger
                  </button>
                </div>
              </div>

              {/* Move History */}
              <button
                onClick={() => handleTabClick('moves')}
                className={`w-full flex items-center justify-between p-2.5 border transition-colors cursor-pointer ${
                  currentTab === 'moves'
                    ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                    : 'bg-transparent text-[#F5F3EF] border-transparent hover:bg-[#262420]'
                }`}
              >
                <div className="flex items-center gap-2.5 font-sans font-medium">
                  <History className="w-4 h-4" />
                  <span>Move History (Audit Ledger)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8B8478]" />
              </button>

              {/* Settings (Manager Only) */}
              {isManager && (
                <button
                  onClick={() => handleTabClick('settings')}
                  className={`w-full flex items-center justify-between p-2.5 border transition-colors cursor-pointer ${
                    currentTab === 'settings'
                      ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                      : 'bg-transparent text-[#F5F3EF] border-transparent hover:bg-[#262420]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 font-sans font-medium">
                    <Settings className="w-4 h-4" />
                    <span>System Settings & Warehouses</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8B8478]" />
                </button>
              )}
            </div>

            {/* Mobile Navbar Tools Section: Theme Toggler & Sign Out */}
            <div className="pt-2 border-t border-[#34312B] space-y-2">
              <div className="text-[10px] uppercase font-bold text-[#8B8478] px-2 mb-1">
                Navbar Tools
              </div>

              {/* Theme Toggler Row */}
              <div className="p-2.5 bg-[#262420] border border-[#34312B] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-[#F5F3EF]">
                  <SunMoon className="w-4 h-4 text-[#F2C230]" />
                  <span>Display Theme:</span>
                </div>
                <ThemeToggle showLabels={true} />
              </div>

              {/* Sign out button */}
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full p-2.5 bg-[#261E1E] hover:bg-[#2D2020] border border-[#D9534F]/40 text-[#D9534F] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Workstation</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Navigation Bar for Operations & Products (with smooth mobile horizontal scrolling) */}
      {currentTab === 'operations' && (
        <div className="bg-[#1A1816] border-t border-[#34312B] px-3 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1.5 sm:gap-2 py-2 overflow-x-auto text-[11px] sm:text-xs font-mono no-scrollbar">
            <button
              onClick={() => onSelectOperationsSubTab('receipts')}
              className={`px-2.5 sm:px-3 py-1.5 border uppercase whitespace-nowrap transition-colors cursor-pointer ${
                operationsSubTab === 'receipts'
                  ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                  : 'bg-transparent text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
              }`}
            >
              Receipts (IN)
            </button>
            <button
              onClick={() => onSelectOperationsSubTab('deliveries')}
              className={`px-2.5 sm:px-3 py-1.5 border uppercase whitespace-nowrap transition-colors cursor-pointer ${
                operationsSubTab === 'deliveries'
                  ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                  : 'bg-transparent text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
              }`}
            >
              Deliveries (OUT)
            </button>
            <button
              onClick={() => onSelectOperationsSubTab('transfers')}
              className={`px-2.5 sm:px-3 py-1.5 border uppercase whitespace-nowrap transition-colors cursor-pointer ${
                operationsSubTab === 'transfers'
                  ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                  : 'bg-transparent text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
              }`}
            >
              Transfers (INT)
            </button>
            <button
              onClick={() => onSelectOperationsSubTab('adjustments')}
              className={`px-2.5 sm:px-3 py-1.5 border uppercase whitespace-nowrap transition-colors cursor-pointer ${
                operationsSubTab === 'adjustments'
                  ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                  : 'bg-transparent text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
              }`}
            >
              Adjustments (ADJ)
            </button>
          </div>
        </div>
      )}

      {currentTab === 'products' && (
        <div className="bg-[#1A1816] border-t border-[#34312B] px-3 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1.5 sm:gap-2 py-2 overflow-x-auto text-[11px] sm:text-xs font-mono no-scrollbar">
            <button
              onClick={() => onSelectProductsSubTab('catalog')}
              className={`px-2.5 sm:px-3 py-1.5 border uppercase whitespace-nowrap transition-colors cursor-pointer ${
                productsSubTab === 'catalog'
                  ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                  : 'bg-transparent text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
              }`}
            >
              Product Catalog {isManager ? '' : '(Read-Only)'}
            </button>
            <button
              onClick={() => onSelectProductsSubTab('stock')}
              className={`px-2.5 sm:px-3 py-1.5 border uppercase whitespace-nowrap transition-colors cursor-pointer ${
                productsSubTab === 'stock'
                  ? 'bg-[#262420] text-[#F2C230] border-[#F2C230]'
                  : 'bg-transparent text-[#8B8478] border-[#34312B] hover:text-[#F5F3EF]'
              }`}
            >
              Stock Ledger {isManager ? '(Inline Edit)' : '(Station Ledger)'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
