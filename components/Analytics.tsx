'use client';

import { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface AnalyticsProps {
  summary: any;
}

export default function Analytics({ summary }: AnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 圓餅圖資料
  const pieData = {
    labels: summary.categories?.map((cat: any) => cat.category) || [],
    datasets: [{
      data: summary.categories?.map((cat: any) => cat.amount) || [],
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
      ]
    }]
  };

  // 長條圖資料
  const barData = {
    labels: summary.categories?.map((cat: any) => cat.category) || [],
    datasets: [{
      label: '支出金額',
      data: summary.categories?.map((cat: any) => cat.amount) || [],
      backgroundColor: '#36A2EB'
    }]
  };

  const exportReport = () => {
    const csvContent = [
      ['分類', '金額', '筆數'],
      ...summary.categories.map((cat: any) => [cat.category, cat.amount, cat.count])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${selectedYear}-${selectedMonth}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* 月份選擇器 */}
      <div className="flex space-x-4 mb-6">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="p-2 border rounded"
        >
          {[2023, 2024, 2025].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="p-2 border rounded"
        >
          {Array.from({length: 12}, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1}月</option>
          ))}
        </select>
        <button
          onClick={exportReport}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          匯出報表
        </button>
      </div>

      {/* 總覽卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">本月支出</h3>
          <p className="text-2xl font-bold text-red-600">
            ${summary.total_expense?.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">本月收入</h3>
          <p className="text-2xl font-bold text-green-600">
            ${summary.total_income?.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">淨收入</h3>
          <p className={`text-2xl font-bold ${summary.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${summary.net_income?.toLocaleString() || 0}
          </p>
        </div>
      </div>

      {/* 圖表區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 圓餅圖 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">支出分類比例</h3>
          <div className="h-64">
            <Pie data={pieData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        {/* 長條圖 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">分類支出金額</h3>
          <div className="h-64">
            <Bar data={barData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* 帳戶餘額 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">帳戶餘額</h3>
        <div className="space-y-3">
          {summary.accounts?.map((account: any) => (
            <div key={account.name} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">{account.name}</span>
              <span className={`font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${account.balance.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 分類詳細列表 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">分類詳細</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">分類</th>
                <th className="text-right py-2">金額</th>
                <th className="text-right py-2">筆數</th>
                <th className="text-right py-2">平均</th>
              </tr>
            </thead>
            <tbody>
              {summary.categories?.map((cat: any) => (
                <tr key={cat.category} className="border-b">
                  <td className="py-2">{cat.category}</td>
                  <td className="text-right py-2">${cat.amount.toLocaleString()}</td>
                  <td className="text-right py-2">{cat.count}</td>
                  <td className="text-right py-2">${(cat.amount / cat.count).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
