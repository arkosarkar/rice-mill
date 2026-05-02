import React from 'react';
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const Header = ({ title, onRefresh, isRefreshing }) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center gap-x-4 lg:gap-x-6">
        <h1 className="text-xl font-semibold leading-7 text-gray-900 lg:text-2xl">{title}</h1>
        
        <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

        <div className="relative flex flex-1 max-w-md">
          <label htmlFor="search-field" className="sr-only">Search</label>
          <MagnifyingGlassIcon
            className="pointer-events-none absolute inset-y-0 left-3 h-full w-5 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-10 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
            placeholder="Search variety, batch, godown..."
            type="search"
            name="search"
          />
        </div>
      </div>

      <div className="flex items-center gap-x-4 lg:gap-x-6">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span className="hidden sm:inline">Refresh Stock</span>
        </button>

        <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

        {/* User Profile */}
        <div className="flex items-center gap-x-3 cursor-pointer">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-900" aria-hidden="true">
              {user?.user || 'Admin'}
            </span>
            <span className="text-xs text-gray-500 capitalize">{user?.role || 'User'}</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            {user?.user ? user.user.charAt(0).toUpperCase() : 'A'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
