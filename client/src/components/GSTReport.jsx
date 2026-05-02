import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { API_URL } from '../api/config';

const GSTReport = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));

  useEffect(() => {
    fetchGSTReport();
  }, [month]);

  const fetchGSTReport = async () => {
    try {
      setLoading(true);
      const [year, monthNum] = month.split('-');
      const response = await axios.get(`${API_URL}/gst/report?year=${year}&month=${monthNum}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching GST report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading GST Report...</div>;
  if (!reportData) return <div>Failed to load report. Please ensure backend is running and connected to MongoDB.</div>;

  const { outputTax, inputTax, netPayable } = reportData;

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="card-title">GST Monthly Report ({dayjs(month).format('MMMM YYYY')})</h3>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="form-control"
          style={{ width: 'auto' }}
        />
      </div>

      <div className="stats-row" style={{ marginTop: '20px' }}>
        <div className="stat-box blue">
          <div className="stat-label">Total Output GST</div>
          <div className="stat-value">₹{outputTax.totalOutputGST.toFixed(2)}</div>
        </div>
        <div className="stat-box green">
          <div className="stat-label">Total ITC (Input)</div>
          <div className="stat-value">₹{inputTax.totalITC.toFixed(2)}</div>
        </div>
        <div className="stat-box orange">
          <div className="stat-label">Net GST Payable</div>
          <div className="stat-value">₹{netPayable.totalNetPayable.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
        {/* Output GST Breakdown */}
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">Output GST Breakdown (Sales)</h4>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Tax Rate</th>
                <th>Base Amount</th>
                <th>GST Amount</th>
              </tr>
            </thead>
            <tbody>
              {outputTax.breakdown.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.rate}%</td>
                  <td>₹{item.baseAmount.toFixed(2)}</td>
                  <td>₹{item.gstAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ITC Breakdown */}
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">Input Tax Credit (Expenses)</h4>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Base Amount</th>
                <th>ITC Amount</th>
              </tr>
            </thead>
            <tbody>
              {inputTax.breakdown.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.category}</td>
                  <td>₹{item.baseAmount.toFixed(2)}</td>
                  <td>₹{item.itcAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px', background: '#f8f9fa' }}>
        <div className="card-header">
          <h4 className="card-title">Net Payable Summary</h4>
        </div>
        <div style={{ padding: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>Total CGST:</span>
            <span>₹{netPayable.cgst.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>Total SGST:</span>
            <span>₹{netPayable.sgst.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>Total IGST:</span>
            <span>₹{netPayable.igst.toFixed(2)}</span>
          </div>
          <hr />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px' }}>
            <span>Total Net Payable:</span>
            <span style={{ color: netPayable.totalNetPayable > 0 ? '#d32f2f' : '#2e7d32' }}>
              ₹{netPayable.totalNetPayable.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GSTReport;
