import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import axios from 'axios';
import { API_URL } from '../api/config';

const BackorderForm = () => {
  const [stockInfo, setStockInfo] = useState([]);
  const { register, control, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      customer: { name: '', phone: '', state: '' },
      items: [{ product_type: 'RICE', qty: 0, unit: 'kg', rate_per_unit: 0, gst_rate: 5 }],
      advance_received: 0,
      notes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const items = watch('items');

  useEffect(() => {
    // Fetch stock info to show available qty
    const fetchStock = async () => {
      try {
        const response = await axios.get(`${API_URL}/stock`);
        setStockInfo(response.data);
      } catch (error) {
        console.error('Error fetching stock:', error);
      }
    };
    fetchStock();
  }, []);

  const onSubmit = async (data) => {
    try {
      const response = await axios.post(`${API_URL}/backorders`, data);
      if (response.data.success) {
        alert('Backorder created successfully! Proforma Invoice: ' + response.data.data.proforma_invoice_no);
        reset();
      }
    } catch (error) {
      alert('Error creating backorder: ' + (error.response?.data?.message || error.message));
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.qty * item.rate_per_unit), 0);
  };

  return (
    <div className="card" style={{ maxWidth: '900px', margin: '20px auto' }}>
      <div className="card-header">
        <h3 className="card-title">Create New Backorder</h3>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="p-4">
        {/* Customer Details */}
        <h4 style={{ color: '#1e3c72', marginBottom: '15px' }}>👤 Customer Information</h4>
        <div className="form-grid">
          <div className="form-group">
            <label>Customer Name</label>
            <input {...register('customer.name')} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input {...register('customer.phone')} className="form-control" />
          </div>
          <div className="form-group">
            <label>State</label>
            <input {...register('customer.state')} className="form-control" />
          </div>
        </div>

        {/* Order Items */}
        <h4 style={{ color: '#1e3c72', margin: '25px 0 15px' }}>🛒 Order Items</h4>
        {fields.map((field, index) => (
          <div key={field.id} className="item-row" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
            <div className="form-grid">
              <div className="form-group">
                <label>Product</label>
                <select {...register(`items.${index}.product_type`)} className="form-control">
                  <option value="RICE">Rice</option>
                  <option value="BRAN">Bran</option>
                  <option value="HUSK">Husk</option>
                  <option value="BROKEN_RICE">Broken Rice</option>
                </select>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" {...register(`items.${index}.qty`)} className="form-control" required />
              </div>
              <div className="form-group">
                <label>Rate/Unit</label>
                <input type="number" step="0.01" {...register(`items.${index}.rate_per_unit`)} className="form-control" required />
              </div>
              <div className="form-group">
                <label>GST %</label>
                <select {...register(`items.${index}.gst_rate`)} className="form-control">
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                </select>
              </div>
            </div>

            {/* Live Stock Notice */}
            <div style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
              Available Stock: {
                stockInfo.find(s => s.riceType?.toUpperCase() === items[index].product_type)?.availableWeightKg || 0
              } kg
              {items[index].qty > (stockInfo.find(s => s.riceType?.toUpperCase() === items[index].product_type)?.availableWeightKg || 0) && (
                <span className="text-danger" style={{ marginLeft: '10px' }}>⚠️ Stock insufficient. Backorder will be created.</span>
              )}
            </div>

            {fields.length > 1 && (
              <button type="button" onClick={() => remove(index)} className="btn btn-danger" style={{ marginTop: '10px', padding: '5px 10px', fontSize: '12px' }}>
                Remove Item
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={() => append({ product_type: 'RICE', qty: 0, unit: 'kg', rate_per_unit: 0, gst_rate: 5 })} className="btn btn-secondary" style={{ marginBottom: '20px' }}>
          + Add Product
        </button>

        <div className="form-grid">
          <div className="form-group">
            <label>Advance Received (₹)</label>
            <input type="number" {...register('advance_received')} className="form-control" />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Notes</label>
            <textarea {...register('notes')} className="form-control" rows="2"></textarea>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: '20px', padding: '20px', borderTop: '1px solid #eee' }}>
          <h4>Total Order Value: ₹{calculateTotal().toLocaleString()}</h4>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px', width: '250px' }}>
            Create Backorder & Proforma
          </button>
        </div>
      </form>
    </div>
  );
};

export default BackorderForm;
