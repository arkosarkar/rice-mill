import React, { useState } from 'react';
import { 
  Squares2X2Icon, 
  InboxArrowDownIcon, 
  SparklesIcon, 
  Cog6ToothIcon, 
  ArchiveBoxIcon, 
  ArrowsRightLeftIcon,
  BanknotesIcon, 
  CreditCardIcon, 
  ChartBarIcon, 
  UsersIcon, 
  DocumentTextIcon, 
  PresentationChartLineIcon,
  UserGroupIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function Sidebar({ currentPage, onNavigate }) {
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sections = [
    {
      name: 'OPERATIONS',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Squares2X2Icon },
        { id: 'paddy', label: 'Paddy Inward', icon: InboxArrowDownIcon },
        { id: 'cleaning', label: 'Cleaning', icon: SparklesIcon },
        { id: 'production', label: 'Production', icon: Cog6ToothIcon },
      ]
    },
    {
      name: 'LOGISTICS',
      items: [
        { id: 'godown', label: 'Godown Stock', icon: ArchiveBoxIcon },
        { id: 'transfer', label: 'Transfer', icon: ArrowsRightLeftIcon },
      ]
    },
    {
      name: 'ADMIN & FINANCE',
      items: [
        { id: 'sales', label: 'Sales', icon: BanknotesIcon },
        { id: 'expenses', label: 'Expenses', icon: CreditCardIcon },
        { id: 'accounts', label: 'Accounts', icon: ChartBarIcon },
        { id: 'parties', label: 'Parties', icon: UsersIcon },
        { id: 'receipt', label: 'Receipt', icon: DocumentTextIcon },
        { id: 'reports', label: 'Reports', icon: PresentationChartLineIcon },
      ]
    }
  ];

  if (user?.role === 'admin') {
    sections[2].items.push({ id: 'users', label: 'User Management', icon: UserGroupIcon });
  }

  return (
    <div className={cn(
      "flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Logo Section */}
      <div className="flex h-16 items-center border-b border-gray-100 px-6 gap-x-3">
        <div className="bg-indigo-600 p-1.5 rounded-lg">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" />
          </svg>
        </div>
        {!isCollapsed && (
          <span className="text-xl font-bold tracking-tight text-gray-900">RiceMill<span className="text-indigo-600">Pro</span></span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
        {sections.map((section) => (
          <div key={section.name} className="mb-6">
            {!isCollapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.name}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      "flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                      currentPage === item.id 
                        ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 rounded-l-none" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      currentPage === item.id ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-500",
                      !isCollapsed && "mr-3"
                    )} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle & Logout */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {isCollapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5 mr-3" />}
          {!isCollapsed && <span>Collapse Sidebar</span>}
        </button>

        <button
          onClick={logout}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors group"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5 group-hover:text-red-700" />
          {!isCollapsed && <span className="ml-3 group-hover:text-red-700">Logout</span>}
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
