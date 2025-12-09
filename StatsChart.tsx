import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface StatsChartProps {
  data: {
    excellent: number; // 9-10
    good: number;      // 7-8
    average: number;   // 5-6
    poor: number;      // < 5
  }
}

export const StatsChart: React.FC<StatsChartProps> = ({ data }) => {
  const chartData = [
    { name: 'Excellent', value: data.excellent, color: '#10b981' }, // emerald-500
    { name: 'Good', value: data.good, color: '#3b82f6' },      // blue-500
    { name: 'Average', value: data.average, color: '#f59e0b' },   // amber-500
    { name: 'Poor', value: data.poor, color: '#ef4444' },      // red-500
  ].filter(d => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
      {/* Pie Chart */}
      <div className="relative">
        <h4 className="text-center text-xs font-semibold text-gray-500 mb-2">DISTRIBUTION</h4>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
               contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Text */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-2">
           <span className="text-2xl font-bold text-gray-700">
             {chartData.reduce((acc, curr) => acc + curr.value, 0)}
           </span>
           <span className="block text-xs text-gray-500">Students</span>
        </div>
      </div>

      {/* Bar Chart */}
      <div>
        <h4 className="text-center text-xs font-semibold text-gray-500 mb-2">PERFORMANCE</h4>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 10}} />
            <Tooltip cursor={{fill: 'transparent'}} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};