import React, { useState, useEffect } from 'react';
import { User, Operation, OperationType } from './types';
import { getStoredUser, setStoredUser } from './lib/api';
import { Navbar, MainNavTab, OperationsSubTab, ProductsSubTab } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { OperationsScreen } from './components/OperationsScreen';
import { ProductsScreen } from './components/ProductsScreen';
import { MoveHistoryScreen } from './components/MoveHistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';

export default function App() {
  // Current user state (starts with demo user or stored user for immediate usability)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = getStoredUser();
    if (saved) return saved;
    // Default demo user so app is immediately alive on load without forcing re-login every time
    return {
      id: 1,
      email: 'demo@stocksense.io',
      full_name: 'Sarah Connor (Inventory Manager)',
      role: 'manager',
    };
  });

  // Navigation state
  const [currentTab, setCurrentTab] = useState<MainNavTab>('dashboard');
  const [operationsSubTab, setOperationsSubTab] = useState<OperationsSubTab>('receipts');
  const [productsSubTab, setProductsSubTab] = useState<ProductsSubTab>('catalog');

  // Cross-view state (opening a specific operation from dashboard)
  const [selectedOpFromDashboard, setSelectedOpFromDashboard] = useState<Operation | null>(null);

  // Stock update signal for child components
  const [stockUpdateCounter, setStockUpdateCounter] = useState(0);

  const handleLogout = () => {
    setStoredUser(null);
    localStorage.removeItem('stocksense_token');
    setCurrentUser(null);
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
    return <AuthScreen onSuccess={handleAuthSuccess} />;
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
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardScreen
            key={`dashboard_${stockUpdateCounter}`}
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
            key={`${operationsSubTab}_${stockUpdateCounter}`}
            type={mapSubTabToType(operationsSubTab)}
            selectedOpFromDashboard={selectedOpFromDashboard}
            onClearSelectedOpFromDashboard={() => setSelectedOpFromDashboard(null)}
            currentUser={currentUser}
            onStockUpdated={() => setStockUpdateCounter((c) => c + 1)}
          />
        )}

        {currentTab === 'products' && (
          <ProductsScreen
            key={`${productsSubTab}_${stockUpdateCounter}`}
            subTab={productsSubTab}
            onSwitchSubTab={setProductsSubTab}
          />
        )}

        {currentTab === 'moves' && (
          <MoveHistoryScreen key={`moves_${stockUpdateCounter}`} />
        )}

        {currentTab === 'settings' && (
          <SettingsScreen currentUser={currentUser} />
        )}
      </main>

      <footer className="border-t border-[#34312B] bg-[#201E1A] py-3 text-center text-xs font-mono text-[#8B8478]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>STOCKSENSE IMS — Industrial Warehouse & Inventory Control Engine</span>
          <span className="text-[11px] text-[#F2C230]">All stock moves atomic & ledger-backed</span>
        </div>
      </footer>
    </div>
  );
}
