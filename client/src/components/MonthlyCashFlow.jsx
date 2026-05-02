import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { API_URL } from '../api/config';

const MonthlyCashFlow = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    year: dayjs().format('YYYY'),
    month: dayjs().format('MM')
  });

  const fetchCashFlow = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/transactions/monthly/${filter.year}/${filter.month}`);
      setReport(response.data);
    } catch (error) {
      console.error('Error fetching cash flow:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlow();
  }, [filter]);

  if (loading) return <div>Generating Cash Flow Statement...</div>;

  return (
    <div className="card" style={{ maxWidth: '1000px', margin: '20px auto' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="card-title">Monthly Cash Flow Statement</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })} className="form-control">
            {Array.from({ length: 12 }, (_, i) => {
              const m = (i + 1).toString().padStart(2, '0');
              return <option key={m} value={m}>{dayjs().month(i).format('MMMM')}</option>;
            })}
          </select>
          <select value={filter.year} onChange={(e) => setFilter({ ...filter, year: e.target.value })} className="form-control">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="p-4">
        {/* Balance Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Opening Balance</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>₹{report.opening_balance.toLocaleString()}</div>
          </div>
          <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#2e7d32' }}>Net Cash Flow</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>₹{report.net_cash_flow.toLocaleString()}</div>
          </div>
          <div style={{ background: '#1e3c72', color: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Closing Balance</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>₹{report.closing_balance.toLocaleString()}</div>
          </div>
        </div>

        {/* Cash In Breakup */}
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ background: '#e8f5e9', padding: '10px', borderRadius: '4px' }}>Cash In (Receipts)</h4>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.cash_in_breakup).map(([cat, amt]) => (
                <tr key={cat}>
                  <td>{cat.replace(/_/g, ' ')}</td>
                  <td style={{ textAlign: 'right' }}>₹{amt.toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold' }}>
                <td>Total Cash In</td>
                <td style={{ textAlign: 'right' }}>₹{report.cash_in_total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cash Out Breakup */}
        <div>
          <h4 style={{ background: '#ffebee', padding: '10px', borderRadius: '4px' }}>Cash Out (Payments)</h4>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.cash_out_breakup).map(([cat, amt]) => (
                <tr key={cat}>
                  <td>{cat.replace(/_/g, ' ')}</td>
                  <td style={{ textAlign: 'right' }}>₹{amt.toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold' }}>
                <td>Total Cash Out</td>
                <td style={{ textAlign: 'right' }}>₹{report.cash_out_total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlyCashFlow;
