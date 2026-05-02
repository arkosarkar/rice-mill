import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { API_URL } from '../api/config';

const MonthlyPL = () => {
  const [report, setPLReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    year: dayjs().format('YYYY'),
    month: dayjs().format('MM')
  });

  const fetchPL = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/pl/${filter.year}/${filter.month}`);
      setPLReport(response.data.data);
    } catch (error) {
      console.error('Error fetching P&L:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPL();
  }, [filter]);

  if (loading) return <div>Generating P&L Statement...</div>;

  const profitMargin = report?.total_income > 0 ? ((report.net_profit / report.total_income) * 100).toFixed(2) : 0;

  return (
    <div className="card" style={{ maxWidth: '1000px', margin: '20px auto' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="card-title">Profit & Loss Statement</h3>
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
        {/* Revenue Section */}
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Revenue (Income)</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <span>Total Sales & Other Income (Excl. GST)</span>
            <span className="text-success" style={{ fontWeight: 'bold' }}>₹{report.total_income.toLocaleString()}</span>
          </div>
        </div>

        {/* Direct Costs */}
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Direct Costs</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <span>Paddy Purchase + Transport In + Packaging</span>
            <span className="text-danger">₹{report.direct_cost.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', background: '#f8f9fa', padding: '10px', fontWeight: 'bold' }}>
            <span>GROSS PROFIT</span>
            <span className={report.gross_profit >= 0 ? 'text-success' : 'text-danger'}>
              ₹{report.gross_profit.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Operating Expenses */}
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Operating Expenses</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <span>Labour + Electricity + Fuel + Maintenance + Rent</span>
            <span className="text-danger">₹{report.operating_expenses.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', background: '#f8f9fa', padding: '10px', fontWeight: 'bold' }}>
            <span>OPERATING PROFIT</span>
            <span className={report.operating_profit >= 0 ? 'text-success' : 'text-danger'}>
              ₹{report.operating_profit.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Financial Expenses */}
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Financial Expenses</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <span>Loan Interest Component</span>
            <span className="text-danger">₹{report.financial_expenses.toLocaleString()}</span>
          </div>
        </div>

        {/* Net Profit Summary */}
        <div style={{ background: '#1e3c72', color: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>NET PROFIT / LOSS</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0' }}>
            ₹{report.net_profit.toLocaleString()}
          </div>
          <div style={{ fontSize: '18px' }}>
            Net Profit Margin: {profitMargin}%
          </div>
        </div>

        {/* Memo Fields */}
        <div style={{ marginTop: '20px', padding: '15px', border: '1px dashed #ccc', borderRadius: '8px', fontSize: '14px', color: '#666' }}>
          <strong>Memo Field:</strong> Total value of pending backorders: ₹{report.memo_fields.backorder_pending_value.toLocaleString()}
          <br />
          <small>* This is informational and not included in current P&L totals.</small>
        </div>
      </div>
    </div>
  );
};

export default MonthlyPL;
