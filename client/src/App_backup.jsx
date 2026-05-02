import React, { useEffect, useState } from 'react';

function Sidebar({ currentPage, onNavigate }) {
  const items = [
    { id: 'paddy', label: '📥 Paddy Inward' },
    { id: 'cleaning', label: '🧹 Cleaning' },
    { id: 'production', label: '⚙️ Production' },
    { id: 'godown', label: '📦 Godown Stock' },
    { id: 'sales', label: '💰 Sales' },
    { id: 'expenses', label: '💳 Expenses' },
    { id: 'accounts', label: '📊 Accounts & GST' },
    { id: 'reports', label: '📈 Reports' },
  ];

  
  return (
    <div className="sidebar">
      <div className="logo">
        <h2>🌾 RiceMill Pro</h2>
      </div>
      <ul className="menu">
        {items.map((item) => (
          <li key={item.id} className="menu-item">
            <a
              href="#"
              className={currentPage === item.id ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.id);
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaddyInwardPage() {
  useEffect(() => {
    function toggleView(view) {
      const form = document.getElementById('entryForm');
      const list = document.getElementById('listView');

      if (form && list) {
        if (view === 'form') {
          form.style.display = 'block';
          list.style.display = 'none';
        } else {
          form.style.display = 'none';
          list.style.display = 'block';
        }
      }
    }

    window.toggleView = toggleView;

    const grossWeightInput = document.getElementById('grossWeight');
    const tareWeightInput = document.getElementById('tareWeight');
    const netWeightInput = document.getElementById('netWeight');
    const ratePerQuintalInput = document.getElementById('ratePerQuintal');
    const totalAmountInput = document.getElementById('totalAmount');
    const deductionsInput = document.getElementById('deductions');
    const advancePaidInput = document.getElementById('advancePaid');
    const balanceAmountInput = document.getElementById('balanceAmount');
    const form = document.getElementById('paddyForm');

    function calculateNet() {
      const gross = parseFloat(grossWeightInput?.value || '0') || 0;
      const tare = parseFloat(tareWeightInput?.value || '0') || 0;
      if (netWeightInput) {
        netWeightInput.value = (gross - tare).toFixed(2);
      }
      calculateAmounts();
    }

    function calculateAmounts() {
      const netWeightKg = parseFloat(netWeightInput?.value || '0') || 0;
      const ratePerKg = parseFloat(ratePerQuintalInput?.value || '0') || 0;
      const totalAmount = netWeightKg * ratePerKg;
      const deductions = parseFloat(deductionsInput?.value || '0') || 0;
      const advancePaid = parseFloat(advancePaidInput?.value || '0') || 0;

      if (totalAmountInput) {
        totalAmountInput.value = totalAmount.toFixed(2);
      }
      const payable = totalAmount - deductions;
      if (balanceAmountInput) {
        balanceAmountInput.value = (payable - advancePaid).toFixed(2);
      }
    }

    if (grossWeightInput) grossWeightInput.addEventListener('input', calculateNet);
    if (tareWeightInput) tareWeightInput.addEventListener('input', calculateNet);
    if (ratePerQuintalInput) ratePerQuintalInput.addEventListener('input', calculateAmounts);
    if (deductionsInput) deductionsInput.addEventListener('input', calculateAmounts);
    if (advancePaidInput) advancePaidInput.addEventListener('input', calculateAmounts);

    async function handleSubmit(event) {
      event.preventDefault();

      const payload = {
        entryDate: document.getElementById('entryDate')?.value || null,
        entryTime: document.getElementById('entryTime')?.value || null,
        inwardNo: document.getElementById('inwardNo')?.value || null,
        supplierName: document.getElementById('supplierName')?.value || null,
        contactNumber: document.getElementById('contactNumber')?.value || null,
        village: document.getElementById('village')?.value || null,
        paddyVariety: document.getElementById('paddyVariety')?.value || null,
        grossWeightKg: parseFloat(document.getElementById('grossWeight')?.value || '0') || 0,
        tareWeightKg: parseFloat(document.getElementById('tareWeight')?.value || '0') || 0,
        numberOfBags: parseInt(document.getElementById('numberOfBags')?.value || '0', 10),
        bagWeightKg: parseFloat(document.getElementById('bagWeight')?.value || '0') || 0,
        moisturePercent: parseFloat(document.getElementById('moisturePercent')?.value || '0') || 0,
        brokenPercent: parseFloat(document.getElementById('brokenPercent')?.value || '0') || 0,
        impurityPercent: parseFloat(document.getElementById('impurityPercent')?.value || '0') || 0,
        ratePerKg: parseFloat(document.getElementById('ratePerQuintal')?.value || '0') || 0,
        deductions: parseFloat(document.getElementById('deductions')?.value || '0') || 0,
        paymentMode: document.getElementById('paymentMode')?.value || null,
        advancePaid: parseFloat(document.getElementById('advancePaid')?.value || '0') || 0,
        vehicleNumber: document.getElementById('vehicleNumber')?.value || null,
        driverName: document.getElementById('driverName')?.value || null,
        transportCharges: parseFloat(document.getElementById('transportCharges')?.value || '0') || 0,
        godown: document.getElementById('godown')?.value || null,
        lotNumber: document.getElementById('lotNumber')?.value || null,
        stackNumber: document.getElementById('stackNumber')?.value || null,
        remarks: document.getElementById('remarks')?.value || null,
      };

      try {
        const response = await fetch('http://localhost:5011/api/paddy-inwards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          alert('Failed to save paddy inward entry.');
          return;
        }

        const data = await response.json();
        alert(
          'Paddy inward saved. Net weight: ' +
          data.inward.netWeightKg +
          ' Kg, Payable: ₹' +
          data.inward.payableAmount.toFixed(2),
        );
        toggleView('list');
      } catch (error) {
        alert('Error connecting to backend. Please check if the server is running.');
      }
    }

    if (form) {
      form.addEventListener('submit', handleSubmit);
    }

    return () => {
      if (grossWeightInput) grossWeightInput.removeEventListener('input', calculateNet);
      if (tareWeightInput) tareWeightInput.removeEventListener('input', calculateNet);
      if (ratePerQuintalInput) ratePerQuintalInput.removeEventListener('input', calculateAmounts);
      if (deductionsInput) deductionsInput.removeEventListener('input', calculateAmounts);
      if (advancePaidInput) advancePaidInput.removeEventListener('input', calculateAmounts);
      if (form) form.removeEventListener('submit', handleSubmit);
      if (window.toggleView === toggleView) {
        delete window.toggleView;
      }
    };
  }, []);

  return (
    <div className="main-content">
      <div className="header">
        <h1>📥 Paddy Inward Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (window.toggleView) window.toggleView('form');
          }}
        >
          + New Inward Entry
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-box green">
          <div className="stat-label">Today&apos;s Inward</div>
          <div className="stat-value">25.5 T</div>
        </div>
        <div className="stat-box orange">
          <div className="stat-label">This Week</div>
          <div className="stat-value">142 T</div>
        </div>
        <div className="stat-box blue">
          <div className="stat-label">This Month</div>
          <div className="stat-value">580 T</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Total Suppliers</div>
          <div className="stat-value">48</div>
        </div>
      </div>

      <div className="card" id="entryForm" style={{ display: 'none' }}>
        <div className="card-header">
          <h3 className="card-title">New Paddy Inward Entry</h3>
        </div>

        <form id="paddyForm">
          <h4 style={{ marginBottom: 15, color: '#1e3c72' }}>📋 Basic Information</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Entry Date *</label>
              <input id="entryDate" type="date" required />
            </div>
            <div className="form-group">
              <label>Inward No. *</label>
              <input id="inwardNo" type="text" defaultValue="INW-2026-0245" readOnly />
            </div>
            <div className="form-group">
              <label>Entry Time</label>
              <input id="entryTime" type="time" required />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>👤 Supplier/Farmer Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Supplier Name *</label>
              <select id="supplierName" required>
                <option value="">Select Supplier</option>
                <option>Ramesh Kumar - Village Majra</option>
                <option>Suresh Singh - Village Bhangra</option>
                <option>Kisan Cooperative Society</option>
                <option>+ Add New Supplier</option>
              </select>
            </div>
            <div className="form-group">
              <label>Contact Number</label>
              <input id="contactNumber" type="tel" placeholder="9876543210" />
            </div>
            <div className="form-group">
              <label>Village/Location</label>
              <input id="village" type="text" placeholder="Enter village name" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🌾 Paddy Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Paddy Variety *</label>
              <select id="paddyVariety" required>
                <option value="">Select Variety</option>
                <option>PR 11</option>
                <option>PR 14</option>
                <option>PR 121</option>
                <option>Basmati 1121</option>
                <option>Sona Masoori</option>
                <option>Swarna</option>
              </select>
            </div>
            <div className="form-group">
              <label>Gross Weight (Kg) *</label>
              <input id="grossWeight" type="number" step="0.01" placeholder="Enter gross weight" required />
            </div>
            <div className="form-group">
              <label>Tare Weight (Kg)</label>
              <input id="tareWeight" type="number" step="0.01" placeholder="Vehicle/bag weight" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Net Weight (Kg) *</label>
              <input id="netWeight" type="number" step="0.01" placeholder="Auto calculated" readOnly />
            </div>
            <div className="form-group">
              <label>Number of Bags</label>
              <input id="numberOfBags" type="number" placeholder="Enter bags" />
            </div>
            <div className="form-group">
              <label>Bag Weight (Kg)</label>
              <input id="bagWeight" type="number" defaultValue="50" placeholder="Avg weight per bag" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🔬 Quality Parameters</h4>
          <div className="quality-indicators">
            <div className="quality-box">
              <div className="quality-label">Moisture %</div>
              <input
                id="moisturePercent"
                type="number"
                step="0.1"
                className="quality-value"
                style={{ border: 'none', textAlign: 'center' }}
                placeholder="0.0"
              />
              <div className="quality-status" id="moistureStatus" />
            </div>
            <div className="quality-box">
              <div className="quality-label">Broken %</div>
              <input
                id="brokenPercent"
                type="number"
                step="0.1"
                className="quality-value"
                style={{ border: 'none', textAlign: 'center' }}
                placeholder="0.0"
              />
              <div className="quality-status" id="brokenStatus" />
            </div>
            <div className="quality-box">
              <div className="quality-label">Impurity %</div>
              <input
                id="impurityPercent"
                type="number"
                step="0.1"
                className="quality-value"
                style={{ border: 'none', textAlign: 'center' }}
                placeholder="0.0"
              />
              <div className="quality-status" id="impurityStatus" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Grade Classification</label>
              <select>
                <option value="">Auto Calculated</option>
                <option>Grade A - Premium</option>
                <option>Grade B - Good</option>
                <option>Grade C - Average</option>
                <option>Grade D - Below Average</option>
              </select>
            </div>
            <div className="form-group">
              <label>Quality Remarks</label>
              <input id="qualityRemarks" type="text" placeholder="Any quality observations" />
            </div>
            <div className="form-group">
              <label>Lab Test ID</label>
              <input id="labTestId" type="text" placeholder="Reference number" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>💰 Financial Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Rate per Quintal (₹) *</label>
              <input id="ratePerQuintal" type="number" step="0.01" placeholder="Enter rate" required />
            </div>
            <div className="form-group">
              <label>Total Amount (₹)</label>
              <input id="totalAmount" type="number" step="0.01" placeholder="Auto calculated" readOnly />
            </div>
            <div className="form-group">
              <label>Deductions (₹)</label>
              <input id="deductions" type="number" step="0.01" placeholder="Transport, commission etc" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Payment Mode *</label>
              <select id="paymentMode" required>
                <option value="">Select Mode</option>
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
                <option>Credit (To be paid)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Advance Paid (₹)</label>
              <input id="advancePaid" type="number" step="0.01" placeholder="If any advance given" />
            </div>
            <div className="form-group">
              <label>Balance Amount (₹)</label>
              <input id="balanceAmount" type="number" step="0.01" placeholder="Remaining payment" readOnly />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🚚 Transport Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Vehicle Number</label>
              <input id="vehicleNumber" type="text" placeholder="UP32AB1234" />
            </div>
            <div className="form-group">
              <label>Driver Name</label>
              <input id="driverName" type="text" placeholder="Enter driver name" />
            </div>
            <div className="form-group">
              <label>Transport Charges (₹)</label>
              <input id="transportCharges" type="number" step="0.01" placeholder="Freight charges" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🏭 Storage Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Godown Location *</label>
              <select id="godown" required>
                <option value="">Select Godown</option>
                <option>Godown A - Main Storage</option>
                <option>Godown B - Secondary</option>
                <option>Godown C - Premium</option>
                <option>Godown D - Temporary</option>
              </select>
            </div>
            <div className="form-group">
              <label>Bin/Lot Number</label>
              <input id="lotNumber" type="text" placeholder="Specific location in godown" />
            </div>
            <div className="form-group">
              <label>Stack Number</label>
              <input id="stackNumber" type="text" placeholder="Stack reference" />
            </div>
          </div>

          <div className="form-group">
            <label>Remarks/Notes</label>
            <textarea
              id="remarks"
              rows="3"
              placeholder="Any additional information, special instructions, etc..."
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (window.toggleView) window.toggleView('list');
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-info">
              Save &amp; Print Receipt
            </button>
            <button type="submit" className="btn btn-primary">
              Save Inward Entry
            </button>
          </div>
        </form>
      </div>

      <div className="card" id="listView">
        <div className="card-header">
          <h3 className="card-title">Paddy Inward Records</h3>
        </div>

        <div className="filter-section">
          <input type="date" placeholder="From Date" />
          <input type="date" placeholder="To Date" />
          <select>
            <option>All Varieties</option>
            <option>PR 11</option>
            <option>PR 14</option>
            <option>Basmati 1121</option>
            <option>Sona Masoori</option>
          </select>
          <select>
            <option>All Suppliers</option>
            <option>Ramesh Kumar</option>
            <option>Suresh Singh</option>
            <option>Kisan Cooperative</option>
          </select>
          <select>
            <option>All Godowns</option>
            <option>Godown A</option>
            <option>Godown B</option>
            <option>Godown C</option>
          </select>
          <button className="btn btn-info">🔍 Search</button>
          <button className="btn btn-secondary">📥 Export Excel</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Inward No.</th>
              <th>Date</th>
              <th>Supplier Name</th>
              <th>Variety</th>
              <th>Net Weight (Kg)</th>
              <th>Moisture %</th>
              <th>Grade</th>
              <th>Rate/Qt</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Godown</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>INW-0245</strong>
              </td>
              <td>09 Feb 2026</td>
              <td>Ramesh Kumar</td>
              <td>PR 11</td>
              <td>2,500</td>
              <td>14.2%</td>
              <td>
                <span className="badge success">Grade A</span>
              </td>
              <td>₹2,200</td>
              <td>₹55,000</td>
              <td>
                <span className="badge success">Paid</span>
              </td>
              <td>Godown A</td>
              <td>
                <button className="action-btn view">👁️</button>
                <button className="action-btn edit">✏️</button>
                <button className="action-btn delete">🗑️</button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>INW-0244</strong>
              </td>
              <td>09 Feb 2026</td>
              <td>Suresh Singh</td>
              <td>Basmati 1121</td>
              <td>3,200</td>
              <td>13.8%</td>
              <td>
                <span className="badge success">Grade A</span>
              </td>
              <td>₹3,500</td>
              <td>₹1,12,000</td>
              <td>
                <span className="badge warning">Pending</span>
              </td>
              <td>Godown C</td>
              <td>
                <button className="action-btn view">👁️</button>
                <button className="action-btn edit">✏️</button>
                <button className="action-btn delete">🗑️</button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>INW-0243</strong>
              </td>
              <td>08 Feb 2026</td>
              <td>Kisan Cooperative</td>
              <td>PR 14</td>
              <td>5,000</td>
              <td>15.1%</td>
              <td>
                <span className="badge warning">Grade B</span>
              </td>
              <td>₹2,100</td>
              <td>₹1,05,000</td>
              <td>
                <span className="badge success">Paid</span>
              </td>
              <td>Godown B</td>
              <td>
                <button className="action-btn view">👁️</button>
                <button className="action-btn edit">✏️</button>
                <button className="action-btn delete">🗑️</button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>INW-0242</strong>
              </td>
              <td>08 Feb 2026</td>
              <td>Mohan Lal</td>
              <td>Sona Masoori</td>
              <td>1,800</td>
              <td>14.5%</td>
              <td>
                <span className="badge success">Grade A</span>
              </td>
              <td>₹2,000</td>
              <td>₹36,000</td>
              <td>
                <span className="badge success">Paid</span>
              </td>
              <td>Godown A</td>
              <td>
                <button className="action-btn view">👁️</button>
                <button className="action-btn edit">✏️</button>
                <button className="action-btn delete">🗑️</button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>INW-0241</strong>
              </td>
              <td>07 Feb 2026</td>
              <td>Vijay Traders</td>
              <td>PR 11</td>
              <td>4,200</td>
              <td>16.2%</td>
              <td>
                <span className="badge info">Grade C</span>
              </td>
              <td>₹2,000</td>
              <td>₹84,000</td>
              <td>
                <span className="badge warning">Credit</span>
              </td>
              <td>Godown A</td>
              <td>
                <button className="action-btn view">👁️</button>
                <button className="action-btn edit">✏️</button>
                <button className="action-btn delete">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 20, textAlign: 'center', color: '#666' }}>Showing 5 of 245 entries</div>
      </div>
    </div>
  );
}

function CleaningPage() {
  useEffect(() => {
    function toggleView(view) {
      const form = document.getElementById('entryForm');
      const list = document.getElementById('listView');

      if (form && list) {
        if (view === 'form') {
          form.style.display = 'block';
          list.style.display = 'none';
        } else {
          form.style.display = 'none';
          list.style.display = 'block';
        }
      }
    }

    window.toggleView = toggleView;

    return () => {
      if (window.toggleView === toggleView) {
        delete window.toggleView;
      }
    };
  }, []);

  return (
    <div className="main-content">
      <div className="header">
        <h1>🧹 Cleaning Process Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (window.toggleView) window.toggleView('form');
          }}
        >
          + New Cleaning Entry
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-label">Today&apos;s Cleaning</div>
          <div className="stat-value">18.5 T</div>
        </div>
        <div className="stat-box blue">
          <div className="stat-label">Total Waste Removed</div>
          <div className="stat-value">2.2 T</div>
        </div>
        <div className="stat-box green">
          <div className="stat-label">Clean Paddy Output</div>
          <div className="stat-value">16.3 T</div>
        </div>
        <div className="stat-box purple">
          <div className="stat-label">Efficiency %</div>
          <div className="stat-value">88.1%</div>
        </div>
      </div>

      <div className="process-flow">
        <div className="process-step completed">
          <div className="process-icon">📥</div>
          <div className="process-title">Raw Paddy Input</div>
          <div className="process-desc">Inward paddy from godown</div>
        </div>
        <div className="process-step active">
          <div className="process-icon">🧹</div>
          <div className="process-title">Cleaning Process</div>
          <div className="process-desc">Remove impurities & stones</div>
        </div>
        <div className="process-step">
          <div className="process-icon">✅</div>
          <div className="process-title">Clean Paddy Output</div>
          <div className="process-desc">Ready for milling</div>
        </div>
      </div>

      <div className="card" id="entryForm" style={{ display: 'none' }}>
        <div className="card-header">
          <h3 className="card-title">New Cleaning Process Entry</h3>
        </div>

        <form>
          <h4 style={{ marginBottom: 15, color: '#1e3c72' }}>📋 Basic Information</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Process Date *</label>
              <input type="date" required />
            </div>
            <div className="form-group">
              <label>Cleaning Batch No. *</label>
              <input type="text" defaultValue="CLN-2026-0145" readOnly />
            </div>
            <div className="form-group">
              <label>Shift</label>
              <select>
                <option>Morning (6 AM - 2 PM)</option>
                <option>Evening (2 PM - 10 PM)</option>
                <option>Night (10 PM - 6 AM)</option>
              </select>
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>📦 Source Paddy Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Select Inward Entry *</label>
              <select required>
                <option value="">Select from inward stock</option>
                <option>INW-0245 - PR 11 - 2,500 Kg - Godown A</option>
                <option>INW-0244 - Basmati 1121 - 3,200 Kg - Godown C</option>
                <option>INW-0243 - PR 14 - 5,000 Kg - Godown B</option>
              </select>
            </div>
            <div className="form-group">
              <label>Paddy Variety</label>
              <input type="text" defaultValue="PR 11" readOnly />
            </div>
            <div className="form-group">
              <label>Source Godown</label>
              <input type="text" defaultValue="Godown A" readOnly />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>⚖️ Input Measurement</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Raw Paddy Input (Kg) *</label>
              <input type="number" step="0.01" placeholder="Enter quantity" required />
            </div>
            <div className="form-group">
              <label>Input Bags</label>
              <input type="number" placeholder="Number of bags" />
            </div>
            <div className="form-group">
              <label>Pre-Cleaning Moisture %</label>
              <input type="number" step="0.1" placeholder="Moisture content" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🔬 Pre-Cleaning Quality</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Impurity % (Before)</label>
              <input type="number" step="0.1" placeholder="Stone, dust, etc" />
            </div>
            <div className="form-group">
              <label>Foreign Material %</label>
              <input type="number" step="0.1" placeholder="Straw, husk, etc" />
            </div>
            <div className="form-group">
              <label>Visual Grade</label>
              <select>
                <option>Excellent</option>
                <option>Good</option>
                <option>Average</option>
                <option>Poor</option>
              </select>
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🔧 Machine Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Cleaning Machine *</label>
              <select required>
                <option value="">Select Machine</option>
                <option>Pre-Cleaner 1</option>
                <option>Pre-Cleaner 2</option>
                <option>Destoner Machine</option>
                <option>Aspirator Unit</option>
              </select>
            </div>
            <div className="form-group">
              <label>Operator Name</label>
              <input type="text" placeholder="Machine operator" />
            </div>
            <div className="form-group">
              <label>Processing Time (Minutes)</label>
              <input type="number" placeholder="Total time" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🗑️ Waste/Rejection Details</h4>
          <div className="waste-tracker">
            <div className="waste-box">
              <div className="waste-icon">🪨</div>
              <div className="waste-label">Stones (Kg)</div>
              <input
                type="number"
                step="0.01"
                className="waste-value"
                style={{ border: 'none', textAlign: 'center', color: '#f44336' }}
                placeholder="0.00"
              />
            </div>
            <div className="waste-box">
              <div className="waste-icon">💨</div>
              <div className="waste-label">Dust (Kg)</div>
              <input
                type="number"
                step="0.01"
                className="waste-value"
                style={{ border: 'none', textAlign: 'center', color: '#f44336' }}
                placeholder="0.00"
              />
            </div>
            <div className="waste-box">
              <div className="waste-icon">🌾</div>
              <div className="waste-label">Straw/Husk (Kg)</div>
              <input
                type="number"
                step="0.01"
                className="waste-value"
                style={{ border: 'none', textAlign: 'center', color: '#f44336' }}
                placeholder="0.00"
              />
            </div>
            <div className="waste-box">
              <div className="waste-icon">❌</div>
              <div className="waste-label">Other Waste (Kg)</div>
              <input
                type="number"
                step="0.01"
                className="waste-value"
                style={{ border: 'none', textAlign: 'center', color: '#f44336' }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Total Waste Removed (Kg)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Auto calculated"
                readOnly
                style={{ background: '#fff3e0', fontWeight: 700 }}
              />
            </div>
            <div className="form-group">
              <label>Waste % of Input</label>
              <input
                type="number"
                step="0.01"
                placeholder="Auto calculated"
                readOnly
                style={{ background: '#fff3e0', fontWeight: 700 }}
              />
            </div>
            <div className="form-group">
              <label>Waste Disposal Method</label>
              <select>
                <option>Sold as Cattle Feed</option>
                <option>Composting</option>
                <option>Discarded</option>
                <option>Other Use</option>
              </select>
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>✅ Clean Paddy Output</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Clean Paddy Output (Kg) *</label>
              <input type="number" step="0.01" placeholder="After cleaning" required />
            </div>
            <div className="form-group">
              <label>Output Bags</label>
              <input type="number" placeholder="Number of bags" />
            </div>
            <div className="form-group">
              <label>Post-Cleaning Moisture %</label>
              <input type="number" step="0.1" placeholder="Final moisture" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🔬 Post-Cleaning Quality</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Impurity % (After)</label>
              <input type="number" step="0.1" placeholder="Remaining impurity" />
            </div>
            <div className="form-group">
              <label>Cleanliness Grade</label>
              <select>
                <option>Excellent (&lt; 0.5%)</option>
                <option>Good (0.5-1%)</option>
                <option>Average (1-2%)</option>
                <option>Poor (&gt; 2%)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Ready for Milling?</label>
              <select>
                <option value="yes">Yes - Send to Production</option>
                <option value="no">No - Re-cleaning Required</option>
              </select>
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🏭 Storage Location</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Destination Godown *</label>
              <select required>
                <option value="">Select Godown</option>
                <option>Godown A - Main Storage</option>
                <option>Godown B - Secondary</option>
                <option>Production Ready Area</option>
              </select>
            </div>
            <div className="form-group">
              <label>Bin/Stack Number</label>
              <input type="text" placeholder="Storage location" />
            </div>
            <div className="form-group">
              <label>Next Process Date</label>
              <input type="date" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>👥 Labour Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Number of Workers</label>
              <input type="number" placeholder="Labour count" />
            </div>
            <div className="form-group">
              <label>Labour Cost (₹)</label>
              <input type="number" step="0.01" placeholder="Total wages" />
            </div>
            <div className="form-group">
              <label>Power Consumption (Units)</label>
              <input type="number" step="0.01" placeholder="Electricity used" />
            </div>
          </div>

          <div className="form-group">
            <label>Process Notes/Remarks</label>
            <textarea rows="3" placeholder="Quality observations, machine issues, special notes..." />
          </div>

          <div style={{ background: '#e3f2fd', padding: 20, borderRadius: 10, margin: '20px 0' }}>
            <h4 style={{ color: '#1976D2', marginBottom: 15 }}>📊 Process Summary</h4>
            <div className="comparison-section" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div>
                <div style={{ fontSize: 12, color: '#666' }}>Input Weight</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1976D2' }}>0.00 Kg</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666' }}>Total Waste</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f44336' }}>0.00 Kg</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666' }}>Clean Output</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#4CAF50' }}>0.00 Kg</div>
              </div>
            </div>
            <div style={{ marginTop: 15, textAlign: 'center', fontSize: 14, color: '#666' }}>
              Cleaning Efficiency:{' '}
              <strong style={{ color: '#1976D2', fontSize: 18 }}>0.0%</strong>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (window.toggleView) window.toggleView('list');
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-info">
              Save &amp; Send to Production
            </button>
            <button type="submit" className="btn btn-primary">
              Save Cleaning Entry
            </button>
          </div>
        </form>
      </div>

      <div className="card" id="listView">
        <div className="card-header">
          <h3 className="card-title">Cleaning Process Records</h3>
        </div>

        <div style={{ display: 'flex', gap: 15, marginBottom: 20, flexWrap: 'wrap' }}>
          <input type="date" style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }} />
          <input type="date" style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }} />
          <select style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }}>
            <option>All Varieties</option>
            <option>PR 11</option>
            <option>Basmati 1121</option>
            <option>PR 14</option>
          </select>
          <button className="btn btn-info">🔍 Search</button>
          <button className="btn btn-secondary">📥 Export Excel</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Batch No.</th>
              <th>Date</th>
              <th>Variety</th>
              <th>Input (Kg)</th>
              <th>Waste (Kg)</th>
              <th>Output (Kg)</th>
              <th>Waste %</th>
              <th>Efficiency</th>
              <th>Quality</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>CLN-0145</strong>
              </td>
              <td>09 Feb 2026</td>
              <td>PR 11</td>
              <td>2,500</td>
              <td>185</td>
              <td>2,315</td>
              <td>7.4%</td>
              <td>
                <span className="badge success">92.6%</span>
              </td>
              <td>
                <span className="badge success">Excellent</span>
              </td>
              <td>
                <span className="badge info">In Production</span>
              </td>
              <td>
                <button className="btn btn-info" style={{ padding: '6px 12px', fontSize: 12 }}>
                  View
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>CLN-0144</strong>
              </td>
              <td>09 Feb 2026</td>
              <td>Basmati 1121</td>
              <td>3,200</td>
              <td>256</td>
              <td>2,944</td>
              <td>8.0%</td>
              <td>
                <span className="badge success">92.0%</span>
              </td>
              <td>
                <span className="badge success">Good</span>
              </td>
              <td>
                <span className="badge success">Completed</span>
              </td>
              <td>
                <button className="btn btn-info" style={{ padding: '6px 12px', fontSize: 12 }}>
                  View
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>CLN-0143</strong>
              </td>
              <td>08 Feb 2026</td>
              <td>PR 14</td>
              <td>5,000</td>
              <td>450</td>
              <td>4,550</td>
              <td>9.0%</td>
              <td>
                <span className="badge warning">91.0%</span>
              </td>
              <td>
                <span className="badge warning">Average</span>
              </td>
              <td>
                <span className="badge success">Completed</span>
              </td>
              <td>
                <button className="btn btn-info" style={{ padding: '6px 12px', fontSize: 12 }}>
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsPage() {
  function handleLoadReport(reportType) {
    alert(`Loading ${reportType} report...`);
  }

  return (
    <div className="main-content">
      <div className="header">
        <h1>📈 Reports &amp; Analytics</h1>
        <p style={{ color: '#666', fontSize: 14 }}>
          Comprehensive business intelligence and performance tracking
        </p>
      </div>

      {/* Primary Analytics Row */}
      <div className="stats-row">
        <div className="stat-box blue">
          <div className="stat-label">Annual Growth</div>
          <div className="stat-value">+12.5%</div>
        </div>
        <div className="stat-box green">
          <div className="stat-label">Market Share</div>
          <div className="stat-value">24%</div>
        </div>
        <div className="stat-box purple">
          <div className="stat-label">Avg. Order Value</div>
          <div className="stat-value">₹45,200</div>
        </div>
        <div className="stat-box orange">
          <div className="stat-label">Customer Retention</div>
          <div className="stat-value">88%</div>
        </div>
      </div>

      <div className="report-sections-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 30 }}>
        {/* Operations Reports */}
        <div className="card">
          <div className="card-header" style={{ borderLeft: '4px solid #1e3c72' }}>
            <h3 className="card-title">🏭 Operations &amp; Production</h3>
          </div>
          <div className="report-list" style={{ padding: '10px 0' }}>
            <div className="report-item-link" onClick={() => handleLoadReport('production-daily')}>
              <span>Daily Production Summary</span>
              <span className="badge info">Daily</span>
            </div>
            <div className="report-item-link" onClick={() => handleLoadReport('yield-analysis')}>
              <span>Milling Yield Analysis</span>
              <span className="badge success">Quality</span>
            </div>
            <div className="report-item-link" onClick={() => handleLoadReport('machine-efficiency')}>
              <span>Machine Efficiency &amp; Downtime</span>
              <span className="badge warning">Maintenance</span>
            </div>
            <div className="report-item-link" onClick={() => handleLoadReport('cleaning-waste')}>
              <span>Cleaning Waste &amp; Recovery</span>
              <span className="badge info">Process</span>
            </div>
          </div>
        </div>

        {/* Sales & Marketing */}
        <div className="card">
          <div className="card-header" style={{ borderLeft: '4px solid #4caf50' }}>
            <h3 className="card-title">💰 Sales &amp; Revenue</h3>
          </div>
          <div className="report-list" style={{ padding: '10px 0' }}>
            <div className="report-item-link" onClick={() => handleLoadReport('sales-summary')}>
              <span>Monthly Sales Summary</span>
              <span className="badge info">Monthly</span>
            </div>
            <div className="report-item-link" onClick={() => handleLoadReport('customer-wise-sales')}>
              <span>Customer-wise Sales Performance</span>
              <span className="badge purple">B2B</span>
            </div>
            <div className="report-item-link" onClick={() => handleLoadReport('product-profitability')}>
              <span>Product Profitability Analysis</span>
              <span className="badge success">Finance</span>
            </div>
            <div className="report-item-link" onClick={() => handleLoadReport('outstanding-aging')}>
              <span>Outstanding Receivables Aging</span>
              <span className="badge danger">Critical</span>
            </div>
          </div>
        </div>

        {/* Inventory & Godown */}
        <div className="card">
          <div className="card-header" style={{ borderLeft: '4px solid #ff9800' }}>
            <h3 className="card-title">📦 Inventory &amp; Stock</h3>
          </div>
          <div className="report-list" style={{ padding: '10px 0' }}>
            <div className="report-item-link" onClick={() => handleLoadReport('stock-valuation')}>
              <span>Current Stock Valuation</span>
              <span className="badge info">Real-time</span>
            </div>
            <div className="report-item-link" onClick={() => handleLoadReport('godown-utilization')}>
              <span>Godown Capacity Utilization</span>
              <span className="badge warning">Space</span>
            </div>
            <div className="report-item-link" onClick={() => handleLoadReport('stock-movement')}>
              <span>Item-wise Stock Movement</span>
              <span className="badge info">Logistics</span>
            </div>
            <div className="report-item-link" onClick={() => handleLoadReport('paddy-aging')}>
              <span>Paddy Stock Aging Report</span>
              <span className="badge danger">Quality</span>
            </div>
          </div>
        </div>

        {/* Financial Intelligence */}
        <div className="card">
          <div className="card-header" style={{ borderLeft: '4px solid #9c27b0' }}>
            <h3 className="card-title">💹 Financial Intelligence</h3>
          </div>
          <div className="report-list" style={{ padding: '10px 0' }}>
            <div className="report-item-link" onClick={() => handleLoadReport('expense-breakdown')}>
              <span>Expense Category Breakdown</span>
              <span className="badge info">Monthly</span>
            </div>
            <div className="report-item-link" onClick={() => handleLoadReport('cash-flow')}>
              <span>Cash Flow Projection</span>
              <span className="badge success">Strategic</span>
            </div>
            <div className="report-item-link" onClick={() => handleLoadReport('gst-recon')}>
              <span>GST Input-Output Reconciliation</span>
              <span className="badge info">Compliance</span>
            </div>
            <div className="report-item-link" onClick={() => handleLoadReport('annual-comparison')}>
              <span>Year-over-Year Performance</span>
              <span className="badge purple">12Y Data</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📊 Visual Production Analysis (Sample)</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-success">📥 Download Excel</button>
            <button className="btn btn-primary">📄 Download PDF</button>
          </div>
        </div>

        <div className="filter-panel">
          <div className="filter-row">
            <div className="filter-group">
              <label>From Date</label>
              <input type="date" defaultValue="2026-02-01" />
            </div>
            <div className="filter-group">
              <label>To Date</label>
              <input type="date" defaultValue="2026-02-09" />
            </div>
            <div className="filter-group">
              <label>Variety</label>
              <select>
                <option>All Varieties</option>
                <option>PR 11</option>
                <option>Basmati 1121</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>Apply Filters</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Paddy Input</th>
              <th>Rice Output</th>
              <th>Broken Rice</th>
              <th>Bran/Husk</th>
              <th>Yield %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>09 Feb 2026</td>
              <td>12,500 Kg</td>
              <td>8,520 Kg</td>
              <td>840 Kg</td>
              <td>3,140 Kg</td>
              <td><span className="badge success">68.2%</span></td>
              <td>Optimal</td>
            </tr>
            <tr>
              <td>08 Feb 2026</td>
              <td>10,200 Kg</td>
              <td>6,830 Kg</td>
              <td>710 Kg</td>
              <td>2,660 Kg</td>
              <td><span className="badge success">67.0%</span></td>
              <td>Optimal</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductionPage() {
  useEffect(() => {
    function toggleView(view) {
      const form = document.getElementById('entryForm');
      const list = document.getElementById('listView');
      if (form && list) {
        if (view === 'form') {
          form.style.display = 'block';
          list.style.display = 'none';
        } else {
          form.style.display = 'none';
          list.style.display = 'block';
        }
      }
    }
    window.toggleView = toggleView;
    return () => {
      if (window.toggleView === toggleView) {
        delete window.toggleView;
      }
    };
  }, []);

  return (
    <div className="main-content">
      <div className="header">
        <h1>⚙️ Production Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (window.toggleView) window.toggleView('form');
          }}
        >
          + New Production Entry
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-label">Today&apos;s Production</div>
          <div className="stat-value">42.5 T</div>
        </div>
        <div className="stat-box green">
          <div className="stat-label">Rice Output</div>
          <div className="stat-value">28.9 T</div>
        </div>
        <div className="stat-box orange">
          <div className="stat-label">By-Products</div>
          <div className="stat-value">13.6 T</div>
        </div>
        <div className="stat-box purple">
          <div className="stat-label">Avg Yield %</div>
          <div className="stat-value">68%</div>
        </div>
      </div>

      <div className="card" id="entryForm" style={{ display: 'none' }}>
        <div className="card-header">
          <h3 className="card-title">New Production Entry</h3>
        </div>
        <form>
          <h4 style={{ marginBottom: 15, color: '#1e3c72' }}>📋 Basic Information</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Production Date *</label>
              <input type="date" required />
            </div>
            <div className="form-group">
              <label>Production No. *</label>
              <input type="text" defaultValue="PRD-2026-0325" readOnly />
            </div>
            <div className="form-group">
              <label>Shift</label>
              <select>
                <option>Morning</option>
                <option>Evening</option>
                <option>Night</option>
              </select>
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🌾 Input - Clean Paddy</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Select Cleaned Batch *</label>
              <select required>
                <option value="">Select from cleaned stock</option>
                <option>CLN-0145 - PR 11 - 2,315 Kg</option>
                <option>CLN-0144 - Basmati 1121 - 2,944 Kg</option>
              </select>
            </div>
            <div className="form-group">
              <label>Paddy Variety</label>
              <input type="text" defaultValue="PR 11" readOnly />
            </div>
            <div className="form-group">
              <label>Source Godown</label>
              <input type="text" defaultValue="Production Ready" readOnly />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Paddy Input (Kg) *</label>
              <input type="number" step="0.01" placeholder="Enter quantity" required />
            </div>
            <div className="form-group">
              <label>Input Bags</label>
              <input type="number" placeholder="Number of bags" />
            </div>
            <div className="form-group">
              <label>Input Moisture %</label>
              <input type="number" step="0.1" placeholder="Moisture content" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🔧 Machine Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Milling Machine *</label>
              <select required>
                <option value="">Select Machine</option>
                <option>Rice Mill 1 - Huller</option>
                <option>Rice Mill 2 - Modern</option>
                <option>Rice Mill 3 - Auto</option>
              </select>
            </div>
            <div className="form-group">
              <label>Polisher Machine</label>
              <select>
                <option>None</option>
                <option>Polisher 1</option>
                <option>Polisher 2</option>
              </select>
            </div>
            <div className="form-group">
              <label>Grader Machine</label>
              <select>
                <option>None</option>
                <option>Grader 1 - Auto</option>
                <option>Grader 2 - Manual</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Operator Name</label>
              <input type="text" placeholder="Machine operator" />
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input type="time" />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input type="time" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🍚 Rice Output - By Grade</h4>
          <div className="yield-tracker">
            <div className="yield-box">
              <div className="yield-icon">⭐</div>
              <div className="yield-label">Premium Rice (Kg)</div>
              <input
                type="number"
                step="0.01"
                className="yield-value"
                style={{ border: 'none', textAlign: 'center' }}
                placeholder="0.00"
              />
            </div>
            <div className="yield-box">
              <div className="yield-icon">🌟</div>
              <div className="yield-label">Grade A Rice (Kg)</div>
              <input
                type="number"
                step="0.01"
                className="yield-value"
                style={{ border: 'none', textAlign: 'center' }}
                placeholder="0.00"
              />
            </div>
            <div className="yield-box">
              <div className="yield-icon">✨</div>
              <div className="yield-label">Grade B Rice (Kg)</div>
              <input
                type="number"
                step="0.01"
                className="yield-value"
                style={{ border: 'none', textAlign: 'center' }}
                placeholder="0.00"
              />
            </div>
            <div className="yield-box">
              <div className="yield-icon">💔</div>
              <div className="yield-label">Broken Rice (Kg)</div>
              <input
                type="number"
                step="0.01"
                className="yield-value"
                style={{ border: 'none', textAlign: 'center', color: '#FF9800' }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Total Rice Output (Kg)</label>
              <input
                type="number"
                step="0.01"
                readOnly
                style={{ background: '#e8f5e9', fontWeight: 700 }}
              />
            </div>
            <div className="form-group">
              <label>Rice Output Bags</label>
              <input type="number" placeholder="Number of bags" />
            </div>
            <div className="form-group">
              <label>Rice Yield %</label>
              <input
                type="number"
                step="0.01"
                readOnly
                style={{ background: '#e8f5e9', fontWeight: 700 }}
              />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🌾 By-Products Output</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Rice Bran (Kg)</label>
              <input type="number" step="0.01" placeholder="Bran output" />
            </div>
            <div className="form-group">
              <label>Rice Husk (Kg)</label>
              <input type="number" step="0.01" placeholder="Husk output" />
            </div>
            <div className="form-group">
              <label>Other Waste (Kg)</label>
              <input type="number" step="0.01" placeholder="Misc waste" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Total By-Products (Kg)</label>
              <input
                type="number"
                step="0.01"
                readOnly
                style={{ background: '#fff3e0', fontWeight: 700 }}
              />
            </div>
            <div className="form-group">
              <label>By-Product %</label>
              <input
                type="number"
                step="0.01"
                readOnly
                style={{ background: '#fff3e0', fontWeight: 700 }}
              />
            </div>
            <div className="form-group">
              <label>Loss/Wastage (Kg)</label>
              <input
                type="number"
                step="0.01"
                readOnly
                style={{ background: '#ffebee', fontWeight: 700 }}
              />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🏭 Storage Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Rice Storage Godown *</label>
              <select required>
                <option>Godown A - Finished Goods</option>
                <option>Godown B - Premium Storage</option>
                <option>Godown C - Regular</option>
              </select>
            </div>
            <div className="form-group">
              <label>Bran Storage</label>
              <select>
                <option>By-Product Store A</option>
                <option>By-Product Store B</option>
              </select>
            </div>
            <div className="form-group">
              <label>Husk Storage</label>
              <select>
                <option>By-Product Store A</option>
                <option>Sold Directly</option>
              </select>
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>👥 Labour &amp; Costs</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Labour Count</label>
              <input type="number" placeholder="Number of workers" />
            </div>
            <div className="form-group">
              <label>Labour Cost (₹)</label>
              <input type="number" step="0.01" placeholder="Total wages" />
            </div>
            <div className="form-group">
              <label>Power Consumption (Units)</label>
              <input type="number" step="0.01" placeholder="Electricity" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Fuel Cost (₹)</label>
              <input type="number" step="0.01" placeholder="If diesel generator" />
            </div>
            <div className="form-group">
              <label>Maintenance Cost (₹)</label>
              <input type="number" step="0.01" placeholder="Machine maintenance" />
            </div>
            <div className="form-group">
              <label>Other Expenses (₹)</label>
              <input type="number" step="0.01" placeholder="Miscellaneous" />
            </div>
          </div>

          <div className="form-group">
            <label>Production Notes</label>
            <textarea
              rows="3"
              placeholder="Machine performance, quality issues, special observations..."
            />
          </div>

          <div style={{ background: '#e3f2fd', padding: 20, borderRadius: 10, margin: '20px 0' }}>
            <h4 style={{ color: '#1976D2', marginBottom: 15 }}>📊 Production Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15 }}>
              <div>
                <div style={{ fontSize: 12, color: '#666' }}>Paddy Input</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1976D2' }}>0.00 Kg</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666' }}>Rice Output</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#4CAF50' }}>0.00 Kg</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666' }}>By-Products</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#FF9800' }}>0.00 Kg</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666' }}>Overall Yield</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#2196F3' }}>0.0%</div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (window.toggleView) window.toggleView('list');
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-success">
              Save &amp; Update Stock
            </button>
            <button type="submit" className="btn btn-primary">
              Save Production Entry
            </button>
          </div>
        </form>
      </div>

      <div className="card" id="listView">
        <div className="card-header">
          <h3 className="card-title">Production Records</h3>
        </div>
        <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
          <input type="date" style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }} />
          <input type="date" style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }} />
          <select style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }}>
            <option>All Varieties</option>
            <option>PR 11</option>
            <option>Basmati 1121</option>
          </select>
          <button className="btn btn-primary">🔍 Search</button>
          <button className="btn btn-secondary">📥 Export</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Prod. No.</th>
              <th>Date</th>
              <th>Variety</th>
              <th>Input (Kg)</th>
              <th>Rice (Kg)</th>
              <th>Broken (Kg)</th>
              <th>Bran (Kg)</th>
              <th>Yield %</th>
              <th>Machine</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>PRD-0325</strong>
              </td>
              <td>09 Feb 2026</td>
              <td>PR 11</td>
              <td>2,315</td>
              <td>1,574</td>
              <td>185</td>
              <td>278</td>
              <td>
                <span className="badge success">68%</span>
              </td>
              <td>Mill 1</td>
              <td>
                <span className="badge success">Completed</span>
              </td>
              <td>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                  View
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>PRD-0324</strong>
              </td>
              <td>09 Feb 2026</td>
              <td>Basmati 1121</td>
              <td>2,944</td>
              <td>2,002</td>
              <td>206</td>
              <td>353</td>
              <td>
                <span className="badge success">68%</span>
              </td>
              <td>Mill 2</td>
              <td>
                <span className="badge success">Completed</span>
              </td>
              <td>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                  View
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>PRD-0323</strong>
              </td>
              <td>08 Feb 2026</td>
              <td>PR 14</td>
              <td>4,550</td>
              <td>3,096</td>
              <td>410</td>
              <td>546</td>
              <td>
                <span className="badge success">68%</span>
              </td>
              <td>Mill 1</td>
              <td>
                <span className="badge success">Completed</span>
              </td>
              <td>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GodownStockPage() {
  return (
    <div className="main-content">
      <div className="header">
        <h1>📦 Godown-wise Stock Management</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-warning">🔄 Stock Transfer</button>
          <button className="btn btn-success">🔍 Stock Audit</button>
          <button className="btn btn-primary">📥 Export Report</button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-label">Total Stock Value</div>
          <div className="stat-value">₹42.5L</div>
        </div>
        <div className="stat-box green">
          <div className="stat-label">Raw Paddy</div>
          <div className="stat-value">180 T</div>
        </div>
        <div className="stat-box orange">
          <div className="stat-label">Finished Rice</div>
          <div className="stat-value">95 T</div>
        </div>
        <div className="stat-box blue">
          <div className="stat-label">By-Products</div>
          <div className="stat-value">38 T</div>
        </div>
      </div>

      <div className="godown-grid">
        <div className="godown-card">
          <div className="godown-header">
            <div>
              <div className="godown-title">🏭 Godown A - Main Storage</div>
              <div className="godown-capacity">Capacity: 500 T | Utilized: 342 T (68%)</div>
            </div>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
              View Details
            </button>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '68%' }}></div>
          </div>
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 14, marginBottom: 10, color: '#666' }}>Current Stock</h4>
            <div className="stock-item">
              <div className="stock-name">PR 11 Paddy</div>
              <div className="stock-qty">85,000 Kg</div>
            </div>
            <div className="stock-item">
              <div className="stock-name">PR 14 Paddy</div>
              <div className="stock-qty">62,500 Kg</div>
            </div>
            <div className="stock-item">
              <div className="stock-name">Basmati 1121 Rice</div>
              <div className="stock-qty">45,200 Kg</div>
            </div>
            <div className="stock-item">
              <div className="stock-name">Sona Masoori Rice</div>
              <div className="stock-qty">38,800 Kg</div>
            </div>
            <div className="stock-item">
              <div className="stock-name">Broken Rice</div>
              <div className="stock-qty">12,500 Kg</div>
            </div>
          </div>
        </div>

        <div className="godown-card">
          <div className="godown-header">
            <div>
              <div className="godown-title">🏭 Godown B - Secondary</div>
              <div className="godown-capacity">Capacity: 300 T | Utilized: 245 T (82%)</div>
            </div>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
              View Details
            </button>
          </div>
          <div className="progress-bar">
            <div className="progress-fill warning" style={{ width: '82%' }}></div>
          </div>
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 14, marginBottom: 10, color: '#666' }}>Current Stock</h4>
            <div className="stock-item">
              <div className="stock-name">PR 11 Paddy</div>
              <div className="stock-qty">95,000 Kg</div>
            </div>
            <div className="stock-item">
              <div className="stock-name">Swarna Paddy</div>
              <div className="stock-qty">72,000 Kg</div>
            </div>
            <div className="stock-item">
              <div className="stock-name">PR 11 Rice</div>
              <div className="stock-qty">58,500 Kg</div>
            </div>
            <div className="stock-item">
              <div className="stock-name">Rice Bran</div>
              <div className="stock-qty">19,500 Kg</div>
            </div>
          </div>
        </div>

        <div className="godown-card">
          <div className="godown-header">
            <div>
              <div className="godown-title">🏭 Godown C - Premium</div>
              <div className="godown-capacity">Capacity: 200 T | Utilized: 128 T (64%)</div>
            </div>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
              View Details
            </button>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '64%' }}></div>
          </div>
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 14, marginBottom: 10, color: '#666' }}>Current Stock</h4>
            <div className="stock-item">
              <div className="stock-name">Basmati 1121 Paddy</div>
              <div className="stock-qty">65,000 Kg</div>
            </div>
            <div className="stock-item">
              <div className="stock-name">Basmati 1121 Rice</div>
              <div className="stock-qty">42,800 Kg</div>
            </div>
            <div className="stock-item">
              <div className="stock-name">Premium Grade A Rice</div>
              <div className="stock-qty">20,200 Kg</div>
            </div>
          </div>
        </div>

        <div className="godown-card">
          <div className="godown-header">
            <div>
              <div className="godown-title">🏭 By-Products Store</div>
              <div className="godown-capacity">Capacity: 150 T | Utilized: 98 T (65%)</div>
            </div>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
              View Details
            </button>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '65%' }}></div>
          </div>
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 14, marginBottom: 10, color: '#666' }}>Current Stock</h4>
            <div className="stock-item">
              <div className="stock-name">Rice Bran</div>
              <div className="stock-qty">42,000 Kg</div>
            </div>
            <div className="stock-item">
              <div className="stock-name">Rice Husk</div>
              <div className="stock-qty">35,500 Kg</div>
            </div>
            <div className="stock-item">
              <div className="stock-name">Broken Rice</div>
              <div className="stock-qty">18,200 Kg</div>
            </div>
            <div className="stock-item">
              <div className="stock-name">Mixed Waste</div>
              <div className="stock-qty">2,300 Kg</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Detailed Stock Report - All Items</h3>
        </div>

        <div className="filter-section">
          <select>
            <option>All Godowns</option>
            <option>Godown A</option>
            <option>Godown B</option>
            <option>Godown C</option>
            <option>By-Products Store</option>
          </select>
          <select>
            <option>All Categories</option>
            <option>Raw Paddy</option>
            <option>Cleaned Paddy</option>
            <option>Finished Rice</option>
            <option>By-Products</option>
          </select>
          <select>
            <option>All Varieties</option>
            <option>PR 11</option>
            <option>PR 14</option>
            <option>Basmati 1121</option>
            <option>Sona Masoori</option>
          </select>
          <input type="text" placeholder="Search by item name..." />
          <button className="btn btn-primary">🔍 Search</button>
          <button className="btn btn-secondary">📥 Export Excel</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Godown</th>
              <th>Stock Qty (Kg)</th>
              <th>Bags</th>
              <th>Rate/Kg</th>
              <th>Stock Value (₹)</th>
              <th>Stock Status</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>ITM-001</strong>
              </td>
              <td>PR 11 Paddy</td>
              <td>Raw Paddy</td>
              <td>Godown A</td>
              <td>85,000</td>
              <td>1,700</td>
              <td>₹22</td>
              <td>₹18,70,000</td>
              <td>
                <span className="badge success">Good Stock</span>
              </td>
              <td>09 Feb 2026</td>
            </tr>
            <tr>
              <td>
                <strong>ITM-002</strong>
              </td>
              <td>PR 11 Paddy</td>
              <td>Raw Paddy</td>
              <td>Godown B</td>
              <td>95,000</td>
              <td>1,900</td>
              <td>₹22</td>
              <td>₹20,90,000</td>
              <td>
                <span className="badge success">Good Stock</span>
              </td>
              <td>08 Feb 2026</td>
            </tr>
            <tr>
              <td>
                <strong>ITM-003</strong>
              </td>
              <td>Basmati 1121 Paddy</td>
              <td>Raw Paddy</td>
              <td>Godown C</td>
              <td>65,000</td>
              <td>1,300</td>
              <td>₹35</td>
              <td>₹22,75,000</td>
              <td>
                <span className="badge success">Good Stock</span>
              </td>
              <td>08 Feb 2026</td>
            </tr>
            <tr>
              <td>
                <strong>ITM-004</strong>
              </td>
              <td>Basmati 1121 Rice</td>
              <td>Finished Rice</td>
              <td>Godown A</td>
              <td>45,200</td>
              <td>904</td>
              <td>₹52</td>
              <td>₹23,50,400</td>
              <td>
                <span className="badge success">Good Stock</span>
              </td>
              <td>09 Feb 2026</td>
            </tr>
            <tr>
              <td>
                <strong>ITM-005</strong>
              </td>
              <td>PR 11 Rice</td>
              <td>Finished Rice</td>
              <td>Godown B</td>
              <td>58,500</td>
              <td>1,170</td>
              <td>₹35</td>
              <td>₹20,47,500</td>
              <td>
                <span className="badge success">Good Stock</span>
              </td>
              <td>09 Feb 2026</td>
            </tr>
            <tr>
              <td>
                <strong>ITM-006</strong>
              </td>
              <td>Rice Bran</td>
              <td>By-Product</td>
              <td>By-Prod Store</td>
              <td>42,000</td>
              <td>840</td>
              <td>₹12</td>
              <td>₹5,04,000</td>
              <td>
                <span className="badge warning">Medium</span>
              </td>
              <td>09 Feb 2026</td>
            </tr>
            <tr>
              <td>
                <strong>ITM-007</strong>
              </td>
              <td>Broken Rice</td>
              <td>By-Product</td>
              <td>Godown A</td>
              <td>12,500</td>
              <td>250</td>
              <td>₹20</td>
              <td>₹2,50,000</td>
              <td>
                <span className="badge danger">Low Stock</span>
              </td>
              <td>08 Feb 2026</td>
            </tr>
            <tr>
              <td>
                <strong>ITM-008</strong>
              </td>
              <td>Rice Husk</td>
              <td>By-Product</td>
              <td>By-Prod Store</td>
              <td>35,500</td>
              <td>710</td>
              <td>₹3</td>
              <td>₹1,06,500</td>
              <td>
                <span className="badge warning">Medium</span>
              </td>
              <td>09 Feb 2026</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 20, padding: 20, background: '#f8f9fa', borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>Total Items</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e3c72' }}>48</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>Total Quantity</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e3c72' }}>313 T</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>Total Stock Value</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e3c72' }}>₹42.5L</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>Low Stock Items</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f44336' }}>5</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">⚠️ Stock Alerts &amp; Notifications</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Alert Type</th>
              <th>Item Name</th>
              <th>Godown</th>
              <th>Current Stock</th>
              <th>Min Required</th>
              <th>Priority</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="badge danger">Low Stock</span>
              </td>
              <td>Broken Rice</td>
              <td>Godown A</td>
              <td>12,500 Kg</td>
              <td>25,000 Kg</td>
              <td>
                <span className="badge danger">High</span>
              </td>
              <td>
                <button className="btn btn-warning" style={{ padding: '6px 12px', fontSize: 12 }}>
                  Restock
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <span className="badge warning">Nearing Capacity</span>
              </td>
              <td>All Items</td>
              <td>Godown B</td>
              <td>245 T</td>
              <td>Max: 300 T</td>
              <td>
                <span className="badge warning">Medium</span>
              </td>
              <td>
                <button className="btn btn-warning" style={{ padding: '6px 12px', fontSize: 12 }}>
                  Transfer
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <span className="badge warning">Quality Check</span>
              </td>
              <td>PR 11 Paddy</td>
              <td>Godown A</td>
              <td>85,000 Kg</td>
              <td>-</td>
              <td>
                <span className="badge warning">Medium</span>
              </td>
              <td>
                <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: 12 }}>
                  Inspect
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalesPage() {
  useEffect(() => {
    function toggleView(view) {
      const form = document.getElementById('entryForm');
      const list = document.getElementById('listView');
      const backorder = document.getElementById('backorderView');
      if (form && list && backorder) {
        form.style.display = view === 'form' ? 'block' : 'none';
        list.style.display = view === 'list' ? 'block' : 'none';
        backorder.style.display = view === 'backorder' ? 'block' : 'none';
      }
    }
    window.toggleView = toggleView;
    return () => {
      if (window.toggleView === toggleView) {
        delete window.toggleView;
      }
    };
  }, []);

  return (
    <div className="main-content">
      <div className="header">
        <h1>💰 Sales Management</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-warning"
            onClick={() => {
              if (window.toggleView) window.toggleView('backorder');
            }}
          >
            📋 Backorders
          </button>
          <button className="btn btn-info">👥 Customers</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (window.toggleView) window.toggleView('form');
            }}
          >
            + New Sale Invoice
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-label">Today&apos;s Sales</div>
          <div className="stat-value">₹4.2L</div>
        </div>
        <div className="stat-box orange">
          <div className="stat-label">Pending Orders</div>
          <div className="stat-value">18</div>
        </div>
        <div className="stat-box blue">
          <div className="stat-label">This Month</div>
          <div className="stat-value">₹58.5L</div>
        </div>
        <div className="stat-box purple">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value">₹12.8L</div>
        </div>
      </div>

      <div className="card" id="entryForm" style={{ display: 'none' }}>
        <div className="card-header">
          <h3 className="card-title">Create Sales Invoice</h3>
        </div>
        <form id="salesForm">
          <h4 style={{ marginBottom: 15, color: '#1e3c72' }}>📋 Invoice Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Invoice No. *</label>
              <input id="invoiceNo" type="text" defaultValue="INV-2026-1245" readOnly />
            </div>
            <div className="form-group">
              <label>Invoice Date *</label>
              <input id="invoiceDate" type="date" required />
            </div>
            <div className="form-group">
              <label>Order Type</label>
              <select>
                <option>Fresh Order</option>
                <option>From Backorder</option>
              </select>
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>👤 Customer Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Customer Name *</label>
              <select id="customerName" required>
                <option value="">Select Customer</option>
                <option>Sharma Wholesale - Delhi</option>
                <option>Gupta Agencies - Meerut</option>
                <option>Singh Trading Co - Kanpur</option>
                <option>+ Add New Customer</option>
              </select>
            </div>
            <div className="form-group">
              <label>Contact Number</label>
              <input type="tel" placeholder="9876543210" />
            </div>
            <div className="form-group">
              <label>GST Number</label>
              <input type="text" placeholder="22AAAAA0000A1Z5" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Billing Address</label>
              <input type="text" placeholder="Enter full address" />
            </div>
            <div className="form-group">
              <label>Credit Limit</label>
              <input type="number" placeholder="₹ Available credit" readOnly />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🛒 Order Items</h4>
          <div id="itemsContainer">
            <div className="item-row">
              <div className="form-group" style={{ margin: 0 }}>
                <label>Product *</label>
                <select required>
                  <option value="">Select Product</option>
                  <option>Basmati 1121 Rice - Premium</option>
                  <option>PR 11 Rice - Grade A</option>
                  <option>Sona Masoori Rice</option>
                  <option>Broken Rice</option>
                  <option>Rice Bran</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Quantity (Kg) *</label>
                <input type="number" step="0.01" placeholder="Enter qty" required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Rate/Kg (₹) *</label>
                <input type="number" step="0.01" placeholder="Rate" required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Auto calc"
                  readOnly
                  style={{ background: '#f0f2f5' }}
                />
              </div>
              <button
                type="button"
                className="btn btn-danger"
                style={{ padding: 12, fontSize: 14 }}
              >
                🗑️
              </button>
            </div>
          </div>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }}>
            + Add Item
          </button>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>💰 Payment &amp; Charges</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Subtotal (₹)</label>
              <input
                id="subtotal"
                type="number"
                step="0.01"
                readOnly
                style={{ background: '#f0f2f5', fontWeight: 700 }}
              />
            </div>
            <div className="form-group">
              <label>Transport Charges (₹)</label>
              <input type="number" step="0.01" placeholder="Freight" />
            </div>
            <div className="form-group">
              <label>Loading Charges (₹)</label>
              <input type="number" step="0.01" placeholder="Loading cost" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Discount (₹)</label>
              <input type="number" step="0.01" placeholder="Any discount" />
            </div>
            <div className="form-group">
              <label>GST % *</label>
              <select id="gstPercent" required>
                <option value="0">0% - Non-GST</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST</option>
              </select>
            </div>
            <div className="form-group">
              <label>GST Amount (₹)</label>
              <input
                id="gstAmount"
                type="number"
                step="0.01"
                readOnly
                style={{ background: '#fff3e0', fontWeight: 700 }}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Grand Total (₹)</label>
              <input
                id="grandTotal"
                type="number"
                step="0.01"
                readOnly
                style={{ background: '#e8f5e9', fontWeight: 700, fontSize: 18 }}
              />
            </div>
            <div className="form-group">
              <label>Payment Mode *</label>
              <select id="paymentMode" required>
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
                <option>Credit</option>
              </select>
            </div>
            <div className="form-group">
              <label>Payment Status *</label>
              <select id="paymentStatus" required>
                <option>Paid</option>
                <option>Partial Payment</option>
                <option>Credit - 7 Days</option>
                <option>Credit - 15 Days</option>
                <option>Credit - 30 Days</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Amount Received (₹)</label>
              <input id="amountReceived" type="number" step="0.01" placeholder="Payment received" />
            </div>
            <div className="form-group">
              <label>Balance Due (₹)</label>
              <input
                id="balanceDue"
                type="number"
                step="0.01"
                readOnly
                style={{ background: '#ffebee', fontWeight: 700 }}
              />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🚚 Delivery Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Delivery Date</label>
              <input type="date" />
            </div>
            <div className="form-group">
              <label>Vehicle Number</label>
              <input type="text" placeholder="UP32AB1234" />
            </div>
            <div className="form-group">
              <label>Driver Name</label>
              <input type="text" placeholder="Driver name" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Delivery Status</label>
              <select>
                <option>Ready to Dispatch</option>
                <option>In Transit</option>
                <option>Delivered</option>
                <option>Backorder</option>
              </select>
            </div>
            <div className="form-group">
              <label>Source Godown</label>
              <select id="sourceGodown">
                <option>Godown A</option>
                <option>Godown B</option>
                <option>Godown C</option>
              </select>
            </div>
            <div className="form-group">
              <label>E-Way Bill No.</label>
              <input type="text" placeholder="If applicable" />
            </div>
          </div>

          <div className="form-group">
            <label>Special Instructions / Remarks</label>
            <textarea rows="3" placeholder="Quality specs, delivery notes, etc..." />
          </div>

          <div style={{ background: '#e8f5e9', padding: 20, borderRadius: 10, margin: '20px 0' }}>
            <h4 style={{ color: '#45a049', marginBottom: 15 }}>📊 Order Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15 }}>
              <div>
                <div style={{ fontSize: 12, color: '#666' }}>Total Items</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#45a049' }}>1</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666' }}>Total Quantity</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#45a049' }}>0 Kg</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666' }}>Grand Total</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#45a049' }}>₹0.00</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666' }}>Balance Due</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f44336' }}>₹0.00</div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (window.toggleView) window.toggleView('list');
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-info">
              Save as Draft
            </button>
            <button type="button" className="btn btn-warning">
              Save &amp; Print Invoice
            </button>
            <button type="submit" className="btn btn-primary">
              Save &amp; Update Stock
            </button>
          </div>
        </form>
      </div>

      <div className="card" id="backorderView" style={{ display: 'none' }}>
        <div className="card-header">
          <h3 className="card-title">📋 Backorders / Pending Orders</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Ordered Qty</th>
              <th>Pending Qty</th>
              <th>Days Pending</th>
              <th>Priority</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>BO-0045</strong>
              </td>
              <td>05 Feb 2026</td>
              <td>Sharma Wholesale</td>
              <td>Basmati 1121 Rice</td>
              <td>5,000 Kg</td>
              <td>2,000 Kg</td>
              <td>4 days</td>
              <td>
                <span className="badge danger">High</span>
              </td>
              <td>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                  Fulfill
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>BO-0044</strong>
              </td>
              <td>06 Feb 2026</td>
              <td>Gupta Agencies</td>
              <td>PR 11 Rice</td>
              <td>3,000 Kg</td>
              <td>3,000 Kg</td>
              <td>3 days</td>
              <td>
                <span className="badge warning">Medium</span>
              </td>
              <td>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                  Fulfill
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>BO-0043</strong>
              </td>
              <td>07 Feb 2026</td>
              <td>Singh Trading</td>
              <td>Broken Rice</td>
              <td>1,500 Kg</td>
              <td>1,500 Kg</td>
              <td>2 days</td>
              <td>
                <span className="badge info">Low</span>
              </td>
              <td>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                  Fulfill
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card" id="listView">
        <div className="card-header">
          <h3 className="card-title">Sales Invoices</h3>
        </div>
        <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
          <input type="date" style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }} />
          <input type="date" style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }} />
          <select style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }}>
            <option>All Customers</option>
          </select>
          <select style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }}>
            <option>All Status</option>
            <option>Paid</option>
            <option>Pending</option>
            <option>Overdue</option>
          </select>
          <button className="btn btn-primary">🔍 Search</button>
          <button className="btn btn-secondary">📥 Export</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Invoice No.</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Quantity</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>INV-1245</strong>
              </td>
              <td>09 Feb 2026</td>
              <td>Sharma Wholesale</td>
              <td>2</td>
              <td>3,500 Kg</td>
              <td>₹2,15,000</td>
              <td>₹2,15,000</td>
              <td>₹0</td>
              <td>
                <span className="badge success">Paid</span>
              </td>
              <td>
                <button className="btn btn-info" style={{ padding: '6px 12px', fontSize: 12 }}>
                  View
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>INV-1244</strong>
              </td>
              <td>09 Feb 2026</td>
              <td>Gupta Agencies</td>
              <td>1</td>
              <td>5,000 Kg</td>
              <td>₹3,20,000</td>
              <td>₹1,00,000</td>
              <td>₹2,20,000</td>
              <td>
                <span className="badge warning">Partial</span>
              </td>
              <td>
                <button className="btn btn-info" style={{ padding: '6px 12px', fontSize: 12 }}>
                  View
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>INV-1243</strong>
              </td>
              <td>08 Feb 2026</td>
              <td>Singh Trading</td>
              <td>3</td>
              <td>4,200 Kg</td>
              <td>₹1,85,000</td>
              <td>₹0</td>
              <td>₹1,85,000</td>
              <td>
                <span className="badge danger">Overdue</span>
              </td>
              <td>
                <button className="btn btn-info" style={{ padding: '6px 12px', fontSize: 12 }}>
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpensesPage() {
  useEffect(() => {
    function toggleView(view) {
      const form = document.getElementById('entryForm');
      const list = document.getElementById('listView');
      if (form && list) {
        form.style.display = view === 'form' ? 'block' : 'none';
        list.style.display = view === 'list' ? 'block' : 'none';
      }
    }
    window.toggleView = toggleView;
    return () => {
      if (window.toggleView === toggleView) {
        delete window.toggleView;
      }
    };
  }, []);

  return (
    <div className="main-content">
      <div className="header">
        <h1>💳 Expense Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (window.toggleView) window.toggleView('form');
          }}
        >
          + Add Expense
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-label">Today&apos;s Expenses</div>
          <div className="stat-value">₹45,200</div>
        </div>
        <div className="stat-box orange">
          <div className="stat-label">This Week</div>
          <div className="stat-value">₹2.8L</div>
        </div>
        <div className="stat-box blue">
          <div className="stat-label">This Month</div>
          <div className="stat-value">₹12.5L</div>
        </div>
        <div className="stat-box purple">
          <div className="stat-label">Pending Approvals</div>
          <div className="stat-value">8</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Expense Breakdown - This Month</h3>
        </div>
        <div className="expense-categories">
          <div className="category-card">
            <div className="category-icon">👥</div>
            <div className="category-name">Labour Wages</div>
            <div className="category-amount">₹3,85,000</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>31% of total</div>
          </div>
          <div className="category-card">
            <div className="category-icon">⚡</div>
            <div className="category-name">Electricity</div>
            <div className="category-amount">₹2,15,000</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>17% of total</div>
          </div>
          <div className="category-card">
            <div className="category-icon">🔧</div>
            <div className="category-name">Maintenance</div>
            <div className="category-amount">₹1,45,000</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>12% of total</div>
          </div>
          <div className="category-card">
            <div className="category-icon">🚚</div>
            <div className="category-name">Transport</div>
            <div className="category-amount">₹1,85,000</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>15% of total</div>
          </div>
          <div className="category-card">
            <div className="category-icon">🏢</div>
            <div className="category-name">Rent &amp; Admin</div>
            <div className="category-amount">₹95,000</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>8% of total</div>
          </div>
          <div className="category-card">
            <div className="category-icon">📦</div>
            <div className="category-name">Packaging</div>
            <div className="category-amount">₹1,25,000</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>10% of total</div>
          </div>
        </div>
      </div>

      <div className="card" id="entryForm" style={{ display: 'none' }}>
        <div className="card-header">
          <h3 className="card-title">Add New Expense</h3>
        </div>
        <form>
          <h4 style={{ marginBottom: 15, color: '#1e3c72' }}>📋 Basic Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Expense Date *</label>
              <input type="date" required />
            </div>
            <div className="form-group">
              <label>Voucher No. *</label>
              <input type="text" defaultValue="EXP-2026-0856" readOnly />
            </div>
            <div className="form-group">
              <label>Payment Mode *</label>
              <select required>
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
                <option>UPI</option>
              </select>
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>💰 Expense Information</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Expense Category *</label>
              <select required>
                <option value="">Select Category</option>
                <option>Labour Wages</option>
                <option>Electricity Bill</option>
                <option>Water Bill</option>
                <option>Machine Maintenance</option>
                <option>Transport Charges</option>
                <option>Fuel &amp; Diesel</option>
                <option>Packaging Material</option>
                <option>Office Supplies</option>
                <option>Rent &amp; Lease</option>
                <option>Insurance Premium</option>
                <option>License &amp; Fees</option>
                <option>Professional Fees</option>
                <option>Salary - Staff</option>
                <option>Miscellaneous</option>
              </select>
            </div>
            <div className="form-group">
              <label>Sub-Category</label>
              <input type="text" placeholder="Optional" />
            </div>
            <div className="form-group">
              <label>Amount (₹) *</label>
              <input type="number" step="0.01" placeholder="Enter amount" required />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Paid To / Vendor *</label>
              <input type="text" placeholder="Name of vendor/person" required />
            </div>
            <div className="form-group">
              <label>Contact Number</label>
              <input type="tel" placeholder="9876543210" />
            </div>
            <div className="form-group">
              <label>GST Number (if applicable)</label>
              <input type="text" placeholder="22AAAAA0000A1Z5" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>📄 Payment Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Bank Account (if transfer)</label>
              <select>
                <option>Cash</option>
                <option>SBI - Main A/C</option>
                <option>HDFC - Current A/C</option>
                <option>PNB - Savings A/C</option>
              </select>
            </div>
            <div className="form-group">
              <label>Transaction ID / Cheque No.</label>
              <input type="text" placeholder="Reference number" />
            </div>
            <div className="form-group">
              <label>Bill/Invoice Number</label>
              <input type="text" placeholder="Vendor bill no." />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Bill Date</label>
              <input type="date" />
            </div>
            <div className="form-group">
              <label>GST Amount (₹)</label>
              <input type="number" step="0.01" placeholder="If GST included" />
            </div>
            <div className="form-group">
              <label>TDS Deducted (₹)</label>
              <input type="number" step="0.01" placeholder="If applicable" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>🔄 Recurring Expense Settings</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Is Recurring?</label>
              <select>
                <option value="no">No - One Time</option>
                <option value="yes">Yes - Recurring</option>
              </select>
            </div>
            <div className="form-group" style={{ display: 'none' }}>
              <label>Frequency</label>
              <select>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Yearly</option>
              </select>
            </div>
            <div className="form-group" style={{ display: 'none' }}>
              <label>End Date</label>
              <input type="date" />
            </div>
          </div>

          <h4 style={{ margin: '25px 0 15px', color: '#1e3c72' }}>📎 Attachments &amp; Notes</h4>
          <div className="form-group">
            <label>Upload Bill/Receipt</label>
            <input type="file" accept="image/*,application/pdf" style={{ padding: 8 }} />
          </div>
          <div className="form-group">
            <label>Description / Notes</label>
            <textarea rows="3" placeholder="Purpose of expense, additional details..." />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Approval Status</label>
              <select>
                <option>Pending Approval</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>
            <div className="form-group">
              <label>Approved By</label>
              <input type="text" placeholder="Manager/Owner name" />
            </div>
            <div className="form-group">
              <label>Department/Cost Center</label>
              <select>
                <option>Production</option>
                <option>Sales</option>
                <option>Administration</option>
                <option>Warehouse</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (window.toggleView) window.toggleView('list');
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-success">
              Save &amp; Approve
            </button>
            <button type="submit" className="btn btn-primary">
              Save Expense
            </button>
          </div>
        </form>
      </div>

      <div className="card" id="listView">
        <div className="card-header">
          <h3 className="card-title">Recent Expenses</h3>
        </div>
        <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
          <input type="date" style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }} />
          <input type="date" style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }} />
          <select style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }}>
            <option>All Categories</option>
            <option>Labour Wages</option>
            <option>Electricity</option>
            <option>Maintenance</option>
          </select>
          <select style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }}>
            <option>All Status</option>
            <option>Approved</option>
            <option>Pending</option>
            <option>Rejected</option>
          </select>
          <button className="btn btn-primary">🔍 Search</button>
          <button className="btn btn-secondary">📥 Export</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Voucher No.</th>
              <th>Date</th>
              <th>Category</th>
              <th>Paid To</th>
              <th>Amount (₹)</th>
              <th>Payment Mode</th>
              <th>Status</th>
              <th>Approved By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>EXP-0856</strong>
              </td>
              <td>09 Feb 2026</td>
              <td>Labour Wages</td>
              <td>Daily Workers</td>
              <td>₹15,500</td>
              <td>Cash</td>
              <td>
                <span className="badge success">Approved</span>
              </td>
              <td>Rajesh K.</td>
              <td>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                  View
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>EXP-0855</strong>
              </td>
              <td>09 Feb 2026</td>
              <td>Electricity Bill</td>
              <td>UP Power Corp</td>
              <td>₹42,800</td>
              <td>Bank Transfer</td>
              <td>
                <span className="badge success">Approved</span>
              </td>
              <td>Rajesh K.</td>
              <td>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                  View
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>EXP-0854</strong>
              </td>
              <td>08 Feb 2026</td>
              <td>Transport</td>
              <td>Sharma Transport</td>
              <td>₹8,500</td>
              <td>Cash</td>
              <td>
                <span className="badge warning">Pending</span>
              </td>
              <td>-</td>
              <td>
                <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: 12 }}>
                  Approve
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <strong>EXP-0853</strong>
              </td>
              <td>08 Feb 2026</td>
              <td>Maintenance</td>
              <td>Machine Works</td>
              <td>₹25,000</td>
              <td>Cheque</td>
              <td>
                <span className="badge success">Approved</span>
              </td>
              <td>Rajesh K.</td>
              <td>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 20, padding: 20, background: '#f8f9fa', borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>
                Total Expenses (This Month)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f44336' }}>₹12,50,000</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>Approved</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#4CAF50' }}>₹11,85,000</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>Pending Approval</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#FF9800' }}>₹65,000</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountsPage() {
  const [activeTab, setActiveTab] = useState('ledger');

  // Dummy data for 12 years of monthly profit
  const years = Array.from({ length: 12 }, (_, i) => 2026 - i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="main-content">
      <div className="header">
        <h1>📊 Accounts &amp; GST Management</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-warning">📥 GST Returns</button>
          <button className="btn btn-success">💰 Bank Reconciliation</button>
          <button className="btn btn-primary">📑 Financial Reports</button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-box green">
          <div className="stat-label">Total Revenue (MTD)</div>
          <div className="stat-value">₹58.5L</div>
        </div>
        <div className="stat-box red">
          <div className="stat-label">Total Expenses (MTD)</div>
          <div className="stat-value">₹32.8L</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Net Profit (MTD)</div>
          <div className="stat-value">₹25.7L</div>
        </div>
        <div className="stat-box purple">
          <div className="stat-label">GST Liability</div>
          <div className="stat-value">₹3.5L</div>
        </div>
      </div>

      <div className="tab-container">
        <button
          className={`tab ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          📚 Ledger Accounts
        </button>
        <button
          className={`tab ${activeTab === 'gst' ? 'active' : ''}`}
          onClick={() => setActiveTab('gst')}
        >
          📄 GST Reports
        </button>
        <button
          className={`tab ${activeTab === 'pl' ? 'active' : ''}`}
          onClick={() => setActiveTab('pl')}
        >
          💹 P&amp;L Statement
        </button>
        <button
          className={`tab ${activeTab === 'balance' ? 'active' : ''}`}
          onClick={() => setActiveTab('balance')}
        >
          ⚖️ Balance Sheet
        </button>
        <button
          className={`tab ${activeTab === 'daybook' ? 'active' : ''}`}
          onClick={() => setActiveTab('daybook')}
        >
          📖 Day Book
        </button>
        <button
          className={`tab ${activeTab === 'monthly-profit' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly-profit')}
        >
          📈 Monthly Profit (12Y)
        </button>
      </div>

      {activeTab === 'ledger' && (
        <div className="tab-content active">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Ledger Accounts</h3>
            </div>
            <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
              <select style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8 }}>
                <option>All Account Groups</option>
                <option>Assets</option>
                <option>Liabilities</option>
                <option>Income</option>
                <option>Expenses</option>
                <option>Capital</option>
              </select>
              <input
                type="text"
                placeholder="Search account..."
                style={{ padding: 10, border: '2px solid #e1e4e8', borderRadius: 8, flex: 1 }}
              />
              <button className="btn btn-primary">+ New Account</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Account Name</th>
                  <th>Group</th>
                  <th>Opening Balance</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Closing Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Cash in Hand</strong>
                  </td>
                  <td>Assets</td>
                  <td>₹2,50,000</td>
                  <td>₹15,80,000</td>
                  <td>₹12,45,000</td>
                  <td className="summary-value credit">₹5,85,000 Dr</td>
                  <td>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                      View
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>SBI - Main Account</strong>
                  </td>
                  <td>Assets</td>
                  <td>₹18,50,000</td>
                  <td>₹42,00,000</td>
                  <td>₹38,20,000</td>
                  <td className="summary-value credit">₹22,30,000 Dr</td>
                  <td>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                      View
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Sales Revenue</strong>
                  </td>
                  <td>Income</td>
                  <td>₹0</td>
                  <td>₹0</td>
                  <td>₹58,50,000</td>
                  <td className="summary-value debit">₹58,50,000 Cr</td>
                  <td>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                      View
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Purchase Account</strong>
                  </td>
                  <td>Expenses</td>
                  <td>₹0</td>
                  <td>₹28,50,000</td>
                  <td>₹0</td>
                  <td className="summary-value credit">₹28,50,000 Dr</td>
                  <td>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                      View
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Labour Expenses</strong>
                  </td>
                  <td>Expenses</td>
                  <td>₹0</td>
                  <td>₹3,85,000</td>
                  <td>₹0</td>
                  <td className="summary-value credit">₹3,85,000 Dr</td>
                  <td>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                      View
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'gst' && (
        <div className="tab-content active">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">GST Summary - Feb 2026</h3>
            </div>
            <div className="financial-summary">
              <div className="summary-box">
                <div className="summary-title">📥 Input GST (Purchases)</div>
                <div className="summary-item">
                  <div className="summary-label">CGST @ 2.5%</div>
                  <div className="summary-value credit">₹71,250</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">SGST @ 2.5%</div>
                  <div className="summary-value credit">₹71,250</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">IGST @ 5%</div>
                  <div className="summary-value credit">₹85,500</div>
                </div>
                <div
                  className="summary-item"
                  style={{ borderTop: '2px solid #1e3c72', marginTop: 10, paddingTop: 10 }}
                >
                  <div className="summary-label">
                    <strong>Total Input GST</strong>
                  </div>
                  <div className="summary-value credit">
                    <strong>₹2,28,000</strong>
                  </div>
                </div>
              </div>
              <div className="summary-box">
                <div className="summary-title">📤 Output GST (Sales)</div>
                <div className="summary-item">
                  <div className="summary-label">CGST @ 2.5%</div>
                  <div className="summary-value debit">₹1,46,250</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">SGST @ 2.5%</div>
                  <div className="summary-value debit">₹1,46,250</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">IGST @ 5%</div>
                  <div className="summary-value debit">₹1,65,000</div>
                </div>
                <div
                  className="summary-item"
                  style={{ borderTop: '2px solid #1e3c72', marginTop: 10, paddingTop: 10 }}
                >
                  <div className="summary-label">
                    <strong>Total Output GST</strong>
                  </div>
                  <div className="summary-value debit">
                    <strong>₹4,57,500</strong>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ background: '#fff3e0', padding: 20, borderRadius: 10, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>Net GST Payable</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#f44336' }}>₹2,29,500</div>
                </div>
                <button className="btn btn-warning">Download GSTR-1</button>
                <button className="btn btn-warning">Download GSTR-3B</button>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Invoice Type</th>
                  <th>Count</th>
                  <th>Taxable Value</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>IGST</th>
                  <th>Total GST</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>B2B Sales (Intra-state)</td>
                  <td>45</td>
                  <td>₹42,50,000</td>
                  <td>₹1,06,250</td>
                  <td>₹1,06,250</td>
                  <td>₹0</td>
                  <td>₹2,12,500</td>
                </tr>
                <tr>
                  <td>B2B Sales (Inter-state)</td>
                  <td>18</td>
                  <td>₹12,80,000</td>
                  <td>₹0</td>
                  <td>₹0</td>
                  <td>₹64,000</td>
                  <td>₹64,000</td>
                </tr>
                <tr>
                  <td>B2C Sales</td>
                  <td>22</td>
                  <td>₹3,20,000</td>
                  <td>₹8,000</td>
                  <td>₹8,000</td>
                  <td>₹0</td>
                  <td>₹16,000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pl' && (
        <div className="tab-content active">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Profit &amp; Loss Statement - Feb 2026</h3>
              <button className="btn btn-primary">📥 Download PDF</button>
            </div>
            <div className="summary-box">
              <div className="summary-title">Revenue / Income</div>
              <div className="summary-item">
                <div className="summary-label">Sales - Finished Rice</div>
                <div className="summary-value credit">₹52,80,000</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Sales - By-Products</div>
                <div className="summary-value credit">₹5,70,000</div>
              </div>
              <div
                className="summary-item"
                style={{ borderTop: '2px solid #4CAF50', marginTop: 10, paddingTop: 10 }}
              >
                <div className="summary-label">
                  <strong>Total Revenue</strong>
                </div>
                <div className="summary-value credit">
                  <strong>₹58,50,000</strong>
                </div>
              </div>
            </div>

            <div className="summary-box" style={{ marginTop: 20 }}>
              <div className="summary-title">Cost of Goods Sold</div>
              <div className="summary-item">
                <div className="summary-label">Paddy Purchases</div>
                <div className="summary-value debit">₹28,50,000</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Opening Stock</div>
                <div className="summary-value credit">₹8,20,000</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Closing Stock</div>
                <div className="summary-value credit">(₹10,50,000)</div>
              </div>
              <div
                className="summary-item"
                style={{ borderTop: '2px solid #666', marginTop: 10, paddingTop: 10 }}
              >
                <div className="summary-label">
                  <strong>Total COGS</strong>
                </div>
                <div className="summary-value debit">
                  <strong>₹26,20,000</strong>
                </div>
              </div>
            </div>

            <div style={{ background: '#e8f5e9', padding: 15, borderRadius: 8, margin: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#666' }}>Gross Profit</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#4CAF50' }}>₹32,30,000</div>
              </div>
            </div>

            <div className="summary-box">
              <div className="summary-title">Operating Expenses</div>
              <div className="summary-item">
                <div className="summary-label">Labour Wages</div>
                <div className="summary-value debit">₹3,85,000</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Electricity &amp; Power</div>
                <div className="summary-value debit">₹2,15,000</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Transport &amp; Freight</div>
                <div className="summary-value debit">₹1,85,000</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Maintenance &amp; Repairs</div>
                <div className="summary-value debit">₹1,45,000</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Packaging Materials</div>
                <div className="summary-value debit">₹1,25,000</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Rent &amp; Administrative</div>
                <div className="summary-value debit">₹95,000</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Other Expenses</div>
                <div className="summary-value debit">₹75,000</div>
              </div>
              <div
                className="summary-item"
                style={{ borderTop: '2px solid #666', marginTop: 10, paddingTop: 10 }}
              >
                <div className="summary-label">
                  <strong>Total Operating Expenses</strong>
                </div>
                <div className="summary-value debit">
                  <strong>₹11,25,000</strong>
                </div>
              </div>
            </div>

            <div style={{ background: '#e3f2fd', padding: 20, borderRadius: 10, marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#666' }}>EBITDA</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#2196F3' }}>₹21,05,000</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#666' }}>Depreciation</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f44336' }}>(₹1,20,000)</div>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '3px solid #1e3c72',
                  paddingTop: 15,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3c72' }}>
                  Net Profit Before Tax
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#4CAF50' }}>₹19,85,000</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'balance' && (
        <div className="tab-content active">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Balance Sheet - As on 09 Feb 2026</h3>
            </div>
            <div className="financial-summary">
              <div className="summary-box">
                <div className="summary-title">Assets</div>
                <div className="summary-item">
                  <div className="summary-label">Cash in Hand</div>
                  <div className="summary-value">₹5,85,000</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Bank Balance</div>
                  <div className="summary-value">₹22,30,000</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Accounts Receivable</div>
                  <div className="summary-value">₹12,80,000</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Stock/Inventory</div>
                  <div className="summary-value">₹42,50,000</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Fixed Assets (Net)</div>
                  <div className="summary-value">₹85,00,000</div>
                </div>
                <div
                  className="summary-item"
                  style={{ borderTop: '2px solid #1e3c72', marginTop: 10, paddingTop: 10 }}
                >
                  <div className="summary-label">
                    <strong>Total Assets</strong>
                  </div>
                  <div className="summary-value">
                    <strong>₹1,68,45,000</strong>
                  </div>
                </div>
              </div>
              <div className="summary-box">
                <div className="summary-title">Liabilities &amp; Equity</div>
                <div className="summary-item">
                  <div className="summary-label">Accounts Payable</div>
                  <div className="summary-value">₹8,50,000</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Bank Loan</div>
                  <div className="summary-value">₹45,00,000</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Other Liabilities</div>
                  <div className="summary-value">₹3,20,000</div>
                </div>
                <div
                  className="summary-item"
                  style={{ borderTop: '1px solid #e1e4e8', marginTop: 10, paddingTop: 10 }}
                >
                  <div className="summary-label">Capital</div>
                  <div className="summary-value">₹85,00,000</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Retained Earnings</div>
                  <div className="summary-value">₹26,75,000</div>
                </div>
                <div
                  className="summary-item"
                  style={{ borderTop: '2px solid #1e3c72', marginTop: 10, paddingTop: 10 }}
                >
                  <div className="summary-label">
                    <strong>Total Liabilities &amp; Equity</strong>
                  </div>
                  <div className="summary-value">
                    <strong>₹1,68,45,000</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'daybook' && (
        <div className="tab-content active">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Day Book - 09 Feb 2026</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Voucher Type</th>
                  <th>Voucher No.</th>
                  <th>Particulars</th>
                  <th>Debit (₹)</th>
                  <th>Credit (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>10:30 AM</td>
                  <td>Receipt</td>
                  <td>RCP-245</td>
                  <td>Received from Sharma Wholesale</td>
                  <td>2,15,000</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td>11:15 AM</td>
                  <td>Payment</td>
                  <td>PAY-156</td>
                  <td>Labour Wages Paid</td>
                  <td>-</td>
                  <td>15,500</td>
                </tr>
                <tr>
                  <td>02:30 PM</td>
                  <td>Sales</td>
                  <td>INV-1245</td>
                  <td>Sales to Gupta Agencies</td>
                  <td>3,20,000</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td>03:45 PM</td>
                  <td>Purchase</td>
                  <td>PUR-325</td>
                  <td>Paddy Purchase from Ramesh</td>
                  <td>-</td>
                  <td>1,25,000</td>
                </tr>
                <tr style={{ background: '#f8f9fa', fontWeight: 700 }}>
                  <td colSpan="4" style={{ textAlign: 'right', paddingRight: 20 }}>
                    Total
                  </td>
                  <td>5,35,000</td>
                  <td>1,40,500</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'monthly-profit' && (
        <div className="tab-content active">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Monthly Profit History (Last 12 Years)</h3>
              <button className="btn btn-secondary">📥 Export Excel</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: '1200px' }}>
                <thead>
                  <tr style={{ background: '#1e3c72', color: 'white' }}>
                    <th style={{ position: 'sticky', left: 0, background: '#1e3c72', zIndex: 1 }}>Year</th>
                    {months.map(month => <th key={month}>{month}</th>)}
                    <th style={{ background: '#45a049' }}>Total Yearly</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map(year => (
                    <tr key={year}>
                      <td style={{ fontWeight: 700, position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>{year}</td>
                      {months.map(month => (
                        <td key={month} style={{ color: '#45a049', fontWeight: 500 }}>
                          ₹{(Math.random() * 5 + 1).toFixed(1)}L
                        </td>
                      ))}
                      <td style={{ fontWeight: 700, color: '#1e3c72', background: '#f0f4f8' }}>
                        ₹{(Math.random() * 20 + 30).toFixed(1)}L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [page, setPage] = useState('paddy');

  return (
    <>
      <Sidebar currentPage={page} onNavigate={setPage} />
      {page === 'paddy' && <PaddyInwardPage />}
      {page === 'cleaning' && <CleaningPage />}
      {page === 'production' && <ProductionPage />}
      {page === 'godown' && <GodownStockPage />}
      {page === 'sales' && <SalesPage />}
      {page === 'expenses' && <ExpensesPage />}
      {page === 'accounts' && <AccountsPage />}
      {page === 'reports' && <ReportsPage />}
    </>
  );
}

export default App;
