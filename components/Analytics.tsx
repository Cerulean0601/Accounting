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

  const nesColors = [
    '#ff6b6b', '#51cf66', '#339af0', '#ffd43b', 
    '#ff8cc8', '#74c0fc', '#ffa8a8', '#d0bfff'
  ];

  const pieData = {
    labels: summary.categories?.map((cat: any) => cat.category) || [],
    datasets: [{
      data: summary.categories?.map((cat: any) => cat.amount) || [],
      backgroundColor: nesColors,
      borderColor: '#212529',
      borderWidth: 3
    }]
  };

  const barData = {
    labels: summary.categories?.map((cat: any) => cat.category) || [],
    datasets: [{
      label: '支出金額',
      data: summary.categories?.map((cat: any) => cat.amount) || [],
      backgroundColor: '#51cf66',
      borderColor: '#212529',
      borderWidth: 3
    }]
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          font: {
            family: 'Press Start 2P',
            size: 8
          },
          color: '#fff'
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
      <div className="nes-container with-title" style={{marginBottom: '20px'}}>
        <p className="title">分析控制</p>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <div className="nes-select">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {[2023, 2024, 2025].map(year => (
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
        <div className="nes-container is-dark">
          <p>本月支出</p>
          <p style={{color: '#ff6b6b', fontSize: '20px', marginTop: '10px'}}>
            ${summary.total_expense?.toLocaleString() || 0}
          </p>
        </div>
        <div className="nes-container is-dark">
          <p>本月收入</p>
          <p style={{color: '#51cf66', fontSize: '20px', marginTop: '10px'}}>
            ${summary.total_income?.toLocaleString() || 0}
          </p>
        </div>
        <div className="nes-container is-dark">
          <p>淨收入</p>
          <p style={{
            color: summary.net_income >= 0 ? '#51cf66' : '#ff6b6b', 
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
          <h3 style={{marginBottom: '20px', color: '#212529'}}>支出分類比例</h3>
          <div style={{height: '300px'}}>
            <Pie data={pieData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h3 style={{marginBottom: '20px', color: '#212529'}}>分類支出金額</h3>
          <div style={{height: '300px'}}>
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* 帳戶餘額 */}
      <div className="nes-container with-title">
        <p className="title">帳戶餘額</p>
        <div style={{display: 'grid', gap: '10px'}}>
          {summary.accounts?.map((account: any) => (
            <div key={account.name} className="nes-container is-dark" style={{
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <span>{account.name}</span>
              <span style={{color: account.balance >= 0 ? '#51cf66' : '#ff6b6b'}}>
                ${account.balance.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 分類詳細 */}
      <div className="nes-container with-title">
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
