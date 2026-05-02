import React from 'react';

const StatCard = ({ title, value, unit, trend, icon: Icon, colorClass, iconBg }) => {
  // Simple sparkline mock data for visual consistency
  const mockData = [10, 15, 8, 12, 18, 14, 20];
  const max = Math.max(...mockData);
  const min = Math.min(...mockData);
  const range = max - min || 1;
  const width = 100;
  const height = 30;
  
  const points = mockData.map((d, i) => {
    const x = (i / (mockData.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const getSparklineColor = () => {
    if (colorClass.includes('indigo')) return '#4F46E5';
    if (colorClass.includes('green')) return '#10B981';
    if (colorClass.includes('orange')) return '#F59E0B';
    if (colorClass.includes('red')) return '#EF4444';
    return '#8B5CF6';
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`${iconBg} p-2.5 rounded-xl`}>
          <Icon className={`h-6 w-6 ${colorClass}`} />
        </div>
        {trend && (
          <div className="flex flex-col items-end">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              trend.startsWith('+') ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
            }`}>
              {trend}
            </span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <div className="flex items-baseline gap-x-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-xs font-semibold text-gray-400">{unit}</span>}
      </div>
      <div className="mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-24 overflow-visible">
          <polyline
            fill="none"
            stroke={getSparklineColor()}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
    </div>
  );
};

export default StatCard;
