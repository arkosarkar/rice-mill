import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { API_URL } from '../api/config';

const Dashboard = () => {
  const [data, setData] = useState({
    cashFlow: null,
    pl: null,
    gst: null,
    backorders: null,
    upcomingEMI: null,
    outstanding: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const today = dayjs().format('YYYY-MM-DD');
        const year = dayjs().format('YYYY');
        const month = dayjs().format('MM');

        const [cashFlowRes, plRes, gstRes, boRes, emiRes] = await Promise.all([
          axios.get(`${API_URL}/transactions/daily/${today}`),
          axios.get(`${API_URL}/pl/${year}/${month}`),
          axios.get(`${API_URL}/gst/${year}/${month}`),
          axios.get(`${API_URL}/backorders/pending`),
          axios.get(`${API_URL}/loans/upcoming`)
        ]);

        setData({
          cashFlow: cashFlowRes.data,
          pl: plRes.data.data,
          gst: gstRes.data.data,
          backorders: boRes.data.data,
          upcomingEMI: emiRes.data.data,
          outstanding: 0
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div>Loading Dashboard...</div>;

  return (
    <div className="main-content">
      <div className="header">
        <h1>📊 Financial Dashboard</h1>
        <span>Last Updated: {dayjs().format('DD MMM YYYY, hh:mm A')}</span>
      </div>

      <div className="stats-row">
        {/* Today's Cash Flow Card */}
        <div className="stat-box blue">
          <div className="stat-label">Today's Cash Flow</div>
          <div className="stat-value">₹{data.cashFlow?.net_cash_flow?.toLocaleString()}</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>
            In: ₹{data.cashFlow?.cash_in_total?.toLocaleString()} | Out: ₹{data.cashFlow?.cash_out_total?.toLocaleString()}
          </div>
        </div>

        {/* Month P&L Card */}
        <div className="stat-box green">
          <div className="stat-label">Month Net Profit</div>
          <div className="stat-value">₹{data.pl?.net_profit?.toLocaleString()}</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>
            Margin: {data.pl?.total_income > 0 ? ((data.pl.net_profit / data.pl.total_income) * 100).toFixed(1) : 0}%
          </div>
        </div>

        {/* GST Payable Card */}
        <div className="stat-box orange">
          <div className="stat-label">GST Payable (Est.)</div>
          <div className="stat-value">₹{data.gst?.net_payable?.toLocaleString()}</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>
            {data.gst?.carry_forward ? 'Carry Forward' : 'Payable'}
          </div>
        </div>

        {/* Pending Backorders Card */}
        <div className="stat-box purple">
          <div className="stat-label">Pending Backorders</div>
          <div className="stat-value">{data.backorders?.length || 0}</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>
            Value: ₹{data.pl?.memo_fields?.backorder_pending_value?.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="godown-grid" style={{ marginTop: '20px' }}>
        {/* Upcoming EMIs Card */}
        <div className="godown-card">
          <div className="godown-header">
            <div className="godown-title">📅 Upcoming EMIs (30 Days)</div>
          </div>
          <div style={{ marginTop: '10px' }}>
            {data.upcomingEMI?.length > 0 ? (
              data.upcomingEMI.map((emi, index) => (
                <div key={index} className="stock-item">
                  <div className="stock-name">{emi.bank_name} ({dayjs(emi.due_date).format('DD MMM')})</div>
                  <div className="stock-qty">₹{emi.total?.toLocaleString()}</div>
                </div>
              ))
            ) : (
              <p>No upcoming EMIs</p>
            )}
          </div>
        </div>

        {/* Recent Transactions Snippet */}
        <div className="godown-card">
          <div className="godown-header">
            <div className="godown-title">💸 Recent Transactions</div>
          </div>
          <div style={{ marginTop: '10px' }}>
            {data.cashFlow?.transactions?.slice(0, 5).map((txn, index) => (
              <div key={index} className="stock-item">
                <div className="stock-name">{txn.party.name} - {txn.category}</div>
                <div className={`stock-qty ${txn.type === 'INCOME' ? 'text-success' : 'text-danger'}`}>
                  {txn.type === 'INCOME' ? '+' : '-'} ₹{txn.amount.total_amount?.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
