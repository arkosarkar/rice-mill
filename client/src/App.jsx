import React, { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage       from './pages/LoginPage';
import DashboardPage   from './pages/DashboardPage';
import PaddyInwardPage from './pages/PaddyInwardPage';
import CleaningPage    from './pages/CleaningPage';
import ProductionPage  from './pages/ProductionPage';
import GodownStockPage from './pages/GodownStockPage';
import SalesPage       from './pages/SalesPage';
import ExpensesPage    from './pages/ExpensesPage';
import AccountsPage    from './pages/AccountsPage';
import PartiesPage     from './pages/PartiesPage';
import ReceiptPage     from './pages/ReceiptPage';
import ReportsPage     from './pages/ReportsPage';
import UserManagement    from './pages/UserManagement';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import NotificationToast from './components/ui/NotificationToast';

// ── Inner app — rendered only when authenticated ───────────────────────────
function ERPApp() {
  const [page, setPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const pageTitles = {
    dashboard: 'General Dashboard',
    paddy: 'Paddy Inward Management',
    cleaning: 'Grain Cleaning Process',
    production: 'Milling & Production',
    godown: 'Live Stock Inventory',
    transfer: 'Stock Transfer',
    sales: 'Sales & Invoicing',
    expenses: 'Expense Tracking',
    accounts: 'Accounts & GST Ledger',
    parties: 'Parties Master',
    receipt: 'Payment Receipts',
    reports: 'Business Reports',
    users: 'User Management'
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar currentPage={page} onNavigate={setPage} />
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header 
          title={pageTitles[page] || 'RiceMill Pro ERP'} 
          onRefresh={() => window.location.reload()} 
        />
        
        <main className="flex-1 overflow-y-auto bg-[#FAFAFA] custom-scrollbar">
          {page === 'dashboard'  && <DashboardPage />}
          {page === 'paddy'      && <PaddyInwardPage />}
          {page === 'cleaning'   && <CleaningPage />}
          {page === 'production' && <ProductionPage />}
          {page === 'godown'     && <GodownStockPage />}
          {page === 'sales'      && <SalesPage />}
          {page === 'expenses'   && <ExpensesPage />}
          {page === 'accounts'   && <AccountsPage />}
          {page === 'parties'    && <PartiesPage />}
          {page === 'receipt'    && <ReceiptPage />}
          {page === 'reports'    && <ReportsPage />}
          {page === 'users'      && <UserManagement />}
          {page === 'transfer'   && <div className="p-8 text-gray-5000">Transfer module coming soon...</div>}
        </main>
      </div>
    </div>
  );
}

// ── Root shell — switches between Login and ERP based on auth state ────────
function AppShell() {
  const { isAuthenticated } = useAuth();

  // Show login if not authenticated; ERP dashboard otherwise
  return isAuthenticated ? <ERPApp /> : <LoginPage />;
}

// ── Root — wraps everything in the AuthProvider ────────────────────────────
function App() {
  // We pass a no-op onLogout here; AuthContext handles the state internally.
  // The AppShell re-renders automatically when isAuthenticated changes.
  return (
    <AuthProvider>
      <AppShell />
      <NotificationToast />
    </AuthProvider>
  );
}

export default App;
