import React from 'react';

export const PageContainer = ({ children, className = "" }) => (
  <div className={`p-8 space-y-8 animate-in fade-in duration-500 ${className}`}>
    {children}
  </div>
);

export const SectionCard = ({ title, actions, children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
    {(title || actions) && (
      <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
        {title && <h3 className="text-lg font-bold text-gray-900">{title}</h3>}
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

export const ModernTable = ({ headers, children, className = "" }) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {headers.map((header, idx) => (
            <th 
              key={idx} 
              className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {children}
      </tbody>
    </table>
  </div>
);
