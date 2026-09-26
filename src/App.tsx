import React, { useState, useEffect } from 'react';
import { User, Operation, OperationType } from './types';
import { getStoredUser, setStoredUser } from './lib/api';
import { Navbar, MainNavTab, OperationsSubTab, ProductsSubTab } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { LandingPage } from './components/LandingPage';
import { DashboardScreen } from './components/DashboardScreen';
import { OperationsScreen } from './components/OperationsScreen';
import { ProductsScreen } from './components/ProductsScreen';
import { MoveHistoryScreen } from './components/MoveHistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { StockSenseLogo } from './components/StockSenseLogo';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return getStoredUser();
  });

  // Pre-auth landing and auth mode state: 'landing' | 'login' | 'signup'
  const [preAuthView, setPreAuthView] = useState<'landing' | 'login' | 'signup'>('landing');

  // Navigation state
  const [currentTab, setCurrentTab] = useState<MainNavTab>('dashboard');
  const [operationsSubTab, setOperationsSubTab] = useState<OperationsSubTab>('receipts');
  const [productsSubTab, setProductsSubTab] = useState<ProductsSubTab>('catalog');

  // Cross-view state (opening a specific operation from dashboard)
  const [selectedOpFromDashboard, setSelectedOpFromDashboard] = useState<Operation | null>(null);

  // Cross-view state from Smart Alerts
  const [initialSearchSku, setInitialSearchSku] = useState<string | null>(null);
  const [initialReplenishProduct, setInitialReplenishProduct] = useState<{ id: number; sku: string } | null>(null);

  // Signal counter to trigger re-fetches across views
  const [stockUpdateCounter, setStockUpdateCounter] = useState(0);

  const isManager =
    currentUser?.role === 'inventory_manager' || (currentUser?.role as any) === 'manager';

  // If user is Floor Operator and navigates or switches to Settings, redirect to Dashboard
  useEffect(() => {
    if (!isManager && currentTab === 'settings') {
      setCurrentTab('dashboard');
    }
  }, [currentUser, currentTab, isManager]);

  const handleLogout = () => {
    setStoredUser(null);
    localStorage.removeItem('stocksense_token');
    setCurrentUser(null);
    setPreAuthView('landing');
  };

  const handleDemoLogin = (email: string) => {
    const isFloor = email === 'staff@stocksense.io';
    const demoUser: User = isFloor
      ? {
          id: 2,
          email: 'staff@stocksense.io',
          full_name: 'John Reese',
          role: 'floor_operator',
          assigned_warehouse_id: 1,
          assigned_warehouse_code: 'WH',
        }
      : {
          id: 1,
          email: 'demo@stocksense.io',
          full_name: 'Sarah Connor',
          role: 'inventory_manager',
          assigned_warehouse_id: 1,
          assigned_warehouse_code: 'WH',
        };
    localStorage.setItem('stocksense_token', `jwt_token_${demoUser.id}_${Date.now()}`);
    setStoredUser(demoUser);
    setCurrentUser(demoUser);
    setCurrentTab('dashboard');
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentTab('dashboard');
  };

  const navigateToOperations = (sub: OperationsSubTab) => {
    setOperationsSubTab(sub);
    setCurrentTab('operations');
  };

  const handleSelectOpFromDashboard = (op: Operation) => {
    const typeToSub: Record<OperationType, OperationsSubTab> = {
      receipt: 'receipts',
      delivery: 'deliveries',
      internal: 'transfers',
      adjustment: 'adjustments',
    };
    setOperationsSubTab(typeToSub[op.type] || 'receipts');
    setSelectedOpFromDashboard(op);
    setCurrentTab('operations');
  };

  const mapSubTabToType = (sub: OperationsSubTab): OperationType => {
    switch (sub) {
      case 'receipts':
        return 'receipt';
      case 'deliveries':
        return 'delivery';
      case 'transfers':
        return 'internal';
      case 'adjustments':
        return 'adjustment';
    }
  };

  if (!currentUser) {
    if (preAuthView === 'login' || preAuthView === 'signup') {
      return (
        <AuthScreen
          onSuccess={handleAuthSuccess}
          initialMode={preAuthView}
          onBackToLanding={() => setPreAuthView('landing')}
        />
      );
    }

    return (
      <LandingPage
        onSignIn={() => setPreAuthView('login')}
        onSignUp={() => setPreAuthView('signup')}
        onDemoLogin={handleDemoLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1816] text-[#F5F3EF] flex flex-col font-sans selection:bg-[#F2C230] selection:text-[#1A1816]">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        operationsSubTab={operationsSubTab}
        onSelectOperationsSubTab={setOperationsSubTab}
        productsSubTab={productsSubTab}
        onSelectProductsSubTab={setProductsSubTab}
        user={currentUser}
        onLogout={handleLogout}
        stockUpdateCounter={stockUpdateCounter}
        onNavigateToCatalogWithSku={(sku) => {
          setProductsSubTab('catalog');
          setInitialSearchSku(sku);
          setCurrentTab('products');
        }}
        onNavigateToReplenish={(productId, sku) => {
          setOperationsSubTab('receipts');
          setInitialReplenishProduct({ id: productId, sku });
          setCurrentTab('operations');
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {currentTab === 'dashboard' && (
          <DashboardScreen
            key={`dashboard_${currentUser.id}_${stockUpdateCounter}`}
            onNavigateToOperations={navigateToOperations}
            onOpenNewOperationModal={(type) => {
              const typeToSub: Record<OperationType, OperationsSubTab> = {
                receipt: 'receipts',
                delivery: 'deliveries',
                internal: 'transfers',
                adjustment: 'adjustments',
              };
              setOperationsSubTab(typeToSub[type]);
              setCurrentTab('operations');
            }}
            onSelectOperation={handleSelectOpFromDashboard}
          />
        )}

        {currentTab === 'operations' && (
          <OperationsScreen
            key={`${operationsSubTab}_${currentUser.id}_${stockUpdateCounter}`}
            type={mapSubTabToType(operationsSubTab)}
            selectedOpFromDashboard={selectedOpFromDashboard}
            onClearSelectedOpFromDashboard={() => setSelectedOpFromDashboard(null)}
            currentUser={currentUser}
            onStockUpdated={() => setStockUpdateCounter((c) => c + 1)}
            initialReplenishProduct={initialReplenishProduct}
            onClearInitialReplenishProduct={() => setInitialReplenishProduct(null)}
          />
        )}

        {currentTab === 'products' && (
          <ProductsScreen
            key={`${productsSubTab}_${currentUser.id}_${stockUpdateCounter}`}
            subTab={productsSubTab}
            onSwitchSubTab={setProductsSubTab}
            currentUser={currentUser}
            initialSearchSku={initialSearchSku}
            onClearInitialSearchSku={() => setInitialSearchSku(null)}
          />
        )}

        {currentTab === 'moves' && (
          <MoveHistoryScreen
            key={`moves_${currentUser.id}_${stockUpdateCounter}`}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'settings' && isManager && (
          <SettingsScreen currentUser={currentUser} />
        )}
      </main>

      <footer className="border-t border-[#34312B] bg-[#201E1A] py-3 text-center text-xs font-mono text-[#8B8478]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <StockSenseLogo variant="compact" size="sm" />
            <span className="text-[10px] px-1.5 py-0.2 bg-[#262420] text-[#F2C230] border border-[#34312B]">
              ROLE: {currentUser.role.toUpperCase()}
            </span>
          </div>
          <span className="text-[11px] text-[#F2C230]">All stock moves atomic & ledger-backed</span>
        </div>
      </footer>
    </div>
  );
}
