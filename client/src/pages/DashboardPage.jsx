import React, { useState, useEffect } from 'react';
import authFetch from '../utils/authFetch';
import { 
  InboxArrowDownIcon, 
  ArchiveBoxIcon, 
  FireIcon, 
  SparklesIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const Sparkline = ({ data, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 30;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-24 overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const StatCard = ({ title, value, unit, trend, data, icon: Icon, colorClass, iconBg }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={iconBg + " p-2.5 rounded-xl"}>
        <Icon className={"h-6 w-6 " + colorClass} />
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">{trend}</span>
      </div>
    </div>
    <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
    <div className="flex items-baseline gap-x-1">
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      <span className="text-xs font-semibold text-gray-400">{unit}</span>
    </div>
    <div className="mt-4 flex items-center justify-between">
      <Sparkline data={data} color={colorClass.includes('indigo') ? '#4F46E5' : colorClass.includes('green') ? '#10B981' : colorClass.includes('orange') ? '#F59E0B' : '#8B5CF6'} />
    </div>
  </div>
);

function DashboardPage() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    fetchStock();
  }, []);

  async function fetchStock() {
    setLoading(true);
    try {
      const res = await authFetch('/stock');
      if (res.ok) {
        const data = await res.json();
        setStocks(data);
        setLastRefresh(new Date());
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const validStocks = stocks.filter(s => Number(s.availableWeightKg) > 0);
  
  // Logic remains same, only UI changes
  const paddyT = (validStocks.filter(s => s.type === 'Paddy').reduce((sum, s) => sum + Number(s.availableWeightKg), 0) / 1000).toFixed(2);
  const riceT = (validStocks.filter(s => s.type === 'Rice').reduce((sum, s) => sum + Number(s.availableWeightKg), 0) / 1000).toFixed(2);
  const huskT = (validStocks.filter(s => s.type === 'Husk').reduce((sum, s) => sum + Number(s.availableWeightKg), 0) / 1000).toFixed(2);
  const branT = (validStocks.filter(s => s.type === 'Bran').reduce((sum, s) => sum + Number(s.availableWeightKg), 0) / 1000).toFixed(2);

  const statusBadge = (kg) => {
    const t = Number(kg) / 1000;
    if (t > 50) return <span className="inline-flex items-center gap-x-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700"><span className="h-1.5 w-1.5 rounded-full bg-green-600" />In Stock</span>;
    if (t > 10) return <span className="inline-flex items-center gap-x-1.5 rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700"><span className="h-1.5 w-1.5 rounded-full bg-yellow-600" />Low Stock</span>;
    return <span className="inline-flex items-center gap-x-1.5 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700"><span className="h-1.5 w-1.5 rounded-full bg-red-600" />Critical</span>;
  };

  return (
    <div className="p-8 space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Gross Paddy" 
          value={paddyT} 
          unit="TONNE" 
          trend="+3.2%" 
          data={[10, 15, 8, 12, 18, 14, 20]} 
          icon={InboxArrowDownIcon}
          colorClass="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard 
          title="Net Rice Stock" 
          value={riceT} 
          unit="TONNE" 
          trend="+5.1%" 
          data={[5, 8, 12, 10, 15, 18, 22]} 
          icon={ArchiveBoxIcon}
          colorClass="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard 
          title="Husk Byproduct" 
          value={huskT} 
          unit="TONNE" 
          trend="-1.4%" 
          data={[20, 18, 15, 12, 10, 8, 7]} 
          icon={FireIcon}
          colorClass="text-orange-600"
          iconBg="bg-orange-50"
        />
        <StatCard 
          title="Rice Bran" 
          value={branT} 
          unit="TONNE" 
          trend="+0.9%" 
          data={[12, 13, 12, 14, 15, 14, 16]} 
          icon={SparklesIcon}
          colorClass="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Variety-wise Stock Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Variety-wise Stock Summary</h3>
            <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
              View all <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Variety</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Godown</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Paddy (T)</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Rice (T)</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {validStocks.slice(0, 5).map((stock, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{stock.variety}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stock.godown}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-700">
                      {stock.type === 'Paddy' ? (Number(stock.availableWeightKg) / 1000).toFixed(2) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-700">
                      {stock.type === 'Rice' ? (Number(stock.availableWeightKg) / 1000).toFixed(2) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      {statusBadge(stock.availableWeightKg)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="px-6 py-5 border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6 flex-1 space-y-6">
            <div className="flex gap-x-3">
              <div className="relative last:after:hidden after:absolute after:top-7 after:bottom-0 after:left-2 after:w-px after:bg-gray-200">
                <div className="h-4 w-4 rounded-full bg-green-500 ring-4 ring-green-50 mt-1" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 leading-tight">Sona Masuri batch B-2024-11 added to Godown A</p>
                <p className="text-xs text-gray-400 mt-1">10m ago</p>
              </div>
            </div>
            <div className="flex gap-x-3">
              <div className="relative last:after:hidden after:absolute after:top-7 after:bottom-0 after:left-2 after:w-px after:bg-gray-200">
                <div className="h-4 w-4 rounded-full bg-indigo-500 ring-4 ring-indigo-50 mt-1" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Transfer 12.50 T IR-64 → Godown B completed</p>
                <p className="text-xs text-gray-400 mt-1">42m ago</p>
              </div>
            </div>
            <div className="flex gap-x-3">
              <div className="relative last:after:hidden after:absolute after:top-7 after:bottom-0 after:left-2 after:w-px after:bg-gray-200">
                <div className="h-4 w-4 rounded-full bg-yellow-500 ring-4 ring-yellow-50 mt-1" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Cleaning process started for BPT-5204</p>
                <p className="text-xs text-gray-400 mt-1">1h ago</p>
              </div>
            </div>
            <div className="flex gap-x-3">
              <div className="relative last:after:hidden after:absolute after:top-7 after:bottom-0 after:left-2 after:w-px after:bg-gray-200">
                <div className="h-4 w-4 rounded-full bg-red-500 ring-4 ring-red-50 mt-1" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">HMT Sona stock critically low — reorder alert</p>
                <p className="text-xs text-gray-400 mt-1">3h ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
