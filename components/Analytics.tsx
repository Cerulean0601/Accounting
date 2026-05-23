'use client';

import { useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { useTheme } from './ThemeProvider';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface AnalyticsProps {
  summary: any;
}

export default function Analytics({ summary }: AnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { colors } = useTheme();

  const pieData = {
    labels: summary.categories?.map((cat: any) => cat.category) || [],
    datasets: [{
      data: summary.categories?.map((cat: any) => cat.amount) || [],
      backgroundColor: colors.chart,
      borderColor: 'var(--color-border)',
      borderWidth: 3
    }]
  };

  const barData = {
    labels: summary.categories?.map((cat: any) => cat.category) || [],
    datasets: [{
      label: '支出金額',
      data: summary.categories?.map((cat: any) => cat.amount) || [],
      backgroundColor: colors.chart,
      borderColor: 'var(--color-border)',
      borderWidth: 3
    }]
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          font: {
            family: 'Fusion Pixel, Press Start 2P',
            size: 10
          },
          color: 'var(--color-text)'
        }
      }
    }
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
    <div>
      {/* 控制面板 */}
      <div className="nes-container" style={{marginBottom: '20px'}}>
        <p className="title">分析控制</p>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <div className="nes-select">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {Array.from({length: new Date().getFullYear() - 2023 + 1}, (_, i) => 2023 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="nes-select">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}月</option>
              ))}
            </select>
          </div>
          <button
            onClick={exportReport}
            className="nes-btn is-success"
          >
            匯出
          </button>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="stats-grid">
        <div className="nes-container">
          <p>本月支出</p>
          <p style={{color: 'var(--color-expense)', fontSize: '20px', marginTop: '10px'}}>
            ${summary.total_expense?.toLocaleString() || 0}
          </p>
        </div>
        <div className="nes-container">
          <p>本月收入</p>
          <p style={{color: 'var(--color-income)', fontSize: '20px', marginTop: '10px'}}>
            ${summary.total_income?.toLocaleString() || 0}
          </p>
        </div>
        <div className="nes-container">
          <p>淨收入</p>
          <p style={{
            color: summary.net_income >= 0 ? 'var(--color-income)' : 'var(--color-expense)', 
            fontSize: '20px', 
            marginTop: '10px'
          }}>
            ${summary.net_income?.toLocaleString() || 0}
          </p>
        </div>
      </div>

      {/* 圖表 */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px'}}>
        <div className="chart-container">
          <h3 style={{marginBottom: '20px'}}>支出分類比例</h3>
          <div style={{height: '300px'}}>
            <Pie data={pieData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h3 style={{marginBottom: '20px'}}>分類支出金額</h3>
          <div style={{height: '300px'}}>
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* 帳戶餘額 */}
      <div className="nes-container">
        <p className="title">帳戶餘額</p>
        <div style={{display: 'grid', gap: '10px'}}>
          {summary.accounts?.map((account: any) => (
            <div key={account.name} className="nes-container" style={{
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <span>{account.name}</span>
              <span style={{color: account.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}}>
                ${account.balance.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 分類詳細 */}
      <div className="nes-container">
        <p className="title">分類詳細</p>
        <div className="nes-table-responsive">
          <table className="nes-table is-bordered is-centered">
            <thead>
              <tr>
                <th>分類</th>
                <th>金額</th>
                <th>筆數</th>
                <th>平均</th>
              </tr>
            </thead>
            <tbody>
              {summary.categories?.map((cat: any) => (
                <tr key={cat.category}>
                  <td>{cat.category}</td>
                  <td>${cat.amount.toLocaleString()}</td>
                  <td>{cat.count}</td>
                  <td>${(cat.amount / cat.count).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
