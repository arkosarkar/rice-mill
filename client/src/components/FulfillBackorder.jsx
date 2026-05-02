import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { API_URL } from '../api/config';

const FulfillBackorder = () => {
  const [pendingBOs, setPendingBOs] = useState([]);
  const [selectedBO, setSelectedBO] = useState(null);
  const [deliveryData, setDeliveryData] = useState({
    item_index: 0,
    qty_to_deliver: 0,
    rate: 0,
    payment_mode: 'CASH',
    is_paid: false
  });

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const response = await axios.get(`${API_URL}/backorders/pending`);
      setPendingBOs(response.data.data);
    } catch (error) {
      console.error('Error fetching pending backorders:', error);
    }
  };

  const handleFulfill = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/backorders/${selectedBO._id}/fulfill`, deliveryData);
      if (response.data.success) {
        alert('Backorder fulfilled successfully! Invoice: ' + response.data.data.invoice.invoice_no);
        setSelectedBO(null);
        fetchPending();
      }
    } catch (error) {
      alert('Error fulfilling backorder: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="card" style={{ maxWidth: '900px', margin: '20px auto' }}>
      <div className="card-header">
        <h3 className="card-title">Deliver / Fulfill Backorder</h3>
      </div>
      <div className="p-4">
        {!selectedBO ? (
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total Value</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingBOs.map(bo => (
                <tr key={bo._id}>
                  <td>{bo.order_id}</td>
                  <td>{dayjs(bo.order_date).format('DD/MM/YYYY')}</td>
                  <td>{bo.customer.name}</td>
                  <td>{bo.items.length} Product(s)</td>
                  <td>₹{bo.total_order_value.toLocaleString()}</td>
                  <td>
                    <button onClick={() => {
                      setSelectedBO(bo);
                      setDeliveryData({
                        ...deliveryData,
                        rate: bo.items[0].rate_per_unit,
                        qty_to_deliver: bo.items[0].pending_qty
                      });
                    }} className="btn btn-primary btn-sm">Select</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <form onSubmit={handleFulfill}>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <h4>Order: {selectedBO.order_id} | Customer: {selectedBO.customer.name}</h4>
              <p>Advance Remaining: ₹{selectedBO.advance_received.toLocaleString()}</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Select Item to Deliver</label>
                <select
                  className="form-control"
                  onChange={(e) => {
                    const idx = e.target.value;
                    setDeliveryData({
                      ...deliveryData,
                      item_index: idx,
                      rate: selectedBO.items[idx].rate_per_unit,
                      qty_to_deliver: selectedBO.items[idx].pending_qty
                    });
                  }}
                >
                  {selectedBO.items.map((item, idx) => (
                    <option key={idx} value={idx}>{item.product_type} ({item.pending_qty} {item.unit} pending)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Quantity to Deliver</label>
                <input
                  type="number"
                  className="form-control"
                  value={deliveryData.qty_to_deliver}
                  onChange={(e) => setDeliveryData({ ...deliveryData, qty_to_deliver: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Rate per Unit (Confirm)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={deliveryData.rate}
                  onChange={(e) => setDeliveryData({ ...deliveryData, rate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-grid" style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>Payment Mode</label>
                <select
                  className="form-control"
                  value={deliveryData.payment_mode}
                  onChange={(e) => setDeliveryData({ ...deliveryData, payment_mode: e.target.value })}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CREDIT">Credit (Udhari)</option>
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '25px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={deliveryData.is_paid}
                    onChange={(e) => setDeliveryData({ ...deliveryData, is_paid: e.target.checked })}
                  /> Payment Received
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <button type="submit" className="btn btn-success" style={{ flex: 2 }}>Generate Tax Invoice & Deliver</button>
              <button type="button" onClick={() => setSelectedBO(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FulfillBackorder;
