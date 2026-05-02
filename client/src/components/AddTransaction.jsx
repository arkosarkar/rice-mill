import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import axios from 'axios';
import dayjs from 'dayjs';
import { API_URL } from '../api/config';

const AddTransaction = () => {
  const { register, handleSubmit, control, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      date: dayjs().format('YYYY-MM-DD'),
      type: 'INCOME',
      category: '',
      party: { name: '', type: 'CUSTOMER' },
      amount: { base_amount: 0, gst_applied: false, gst_rate: 0 },
      gst: { is_igst: false },
      payment_mode: 'CASH',
      is_paid: true,
      quantity: { value: 0, unit: 'kg' },
      rate_per_unit: 0
    }
  });

  const type = useWatch({ control, name: 'type' });
  const baseAmount = useWatch({ control, name: 'amount.base_amount' });
  const gstApplied = useWatch({ control, name: 'amount.gst_applied' });
  const gstRate = useWatch({ control, name: 'amount.gst_rate' });
  const isIgst = useWatch({ control, name: 'gst.is_igst' });
  const quantity = useWatch({ control, name: 'quantity.value' });
  const ratePerUnit = useWatch({ control, name: 'rate_per_unit' });

  // Auto calculate base amount from quantity and rate
  useEffect(() => {
    if (quantity && ratePerUnit) {
      setValue('amount.base_amount', quantity * ratePerUnit);
    }
  }, [quantity, ratePerUnit, setValue]);

  // Live GST calculation
  const calculateLiveGst = () => {
    if (!gstApplied) return { gst_amount: 0, total: baseAmount };
    const gst_amount = (baseAmount * gstRate) / 100;
    return {
      gst_amount,
      total: Number(baseAmount) + gst_amount,
      cgst: isIgst ? 0 : gst_amount / 2,
      sgst: isIgst ? 0 : gst_amount / 2,
      igst: isIgst ? gst_amount : 0
    };
  };

  const liveGst = calculateLiveGst();

  const onSubmit = async (data) => {
    try {
      const response = await axios.post(`${API_URL}/transactions`, data);
      if (response.data.success) {
        alert('Transaction added successfully!');
        reset();
      }
    } catch (error) {
      alert('Error adding transaction: ' + (error.response?.data?.message || error.message));
    }
  };

  const categories = {
    INCOME: ['RICE_SALE', 'RICE_SALE_LOOSE', 'BRAN_SALE', 'HUSK_SALE', 'BROKEN_RICE_SALE', 'MILLING_CHARGES', 'OTHER_INCOME'],
    EXPENSE: ['PADDY_PURCHASE', 'LABOUR', 'LABOUR_CONTRACT', 'ELECTRICITY', 'FUEL', 'MAINTENANCE', 'RENT', 'INSURANCE', 'TRANSPORT_IN', 'TRANSPORT_OUT', 'OTHER_EXPENSE'],
    EMI: ['LOAN_EMI']
  };

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '20px auto' }}>
      <div className="card-header">
        <h3 className="card-title">Add New Transaction</h3>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="p-4">
        <div className="form-grid">
          {/* Type & Date */}
          <div className="form-group">
            <label>Transaction Type</label>
            <select {...register('type')} className="form-control">
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="EMI">Loan EMI</option>
            </select>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" {...register('date')} className="form-control" />
          </div>

          {/* Category & Party */}
          <div className="form-group">
            <label>Category</label>
            <select {...register('category')} className="form-control" required>
              <option value="">Select Category</option>
              {categories[type]?.map(cat => (
                <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Party Name</label>
            <input {...register('party.name')} placeholder="Search or enter party name" className="form-control" required />
          </div>

          {/* Quantity, Rate, Base Amount */}
          <div className="form-group">
            <label>Quantity</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input type="number" {...register('quantity.value')} className="form-control" style={{ flex: 2 }} />
              <select {...register('quantity.unit')} className="form-control" style={{ flex: 1 }}>
                <option value="kg">kg</option>
                <option value="bag">bag</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Rate per Unit</label>
            <input type="number" step="0.01" {...register('rate_per_unit')} className="form-control" />
          </div>
          <div className="form-group">
            <label>Base Amount (Auto-calc)</label>
            <input type="number" {...register('amount.base_amount')} className="form-control" readOnly />
          </div>

          {/* GST Toggle & Rates */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" {...register('amount.gst_applied')} /> Apply GST
            </label>
            {gstApplied && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                <select {...register('amount.gst_rate')} className="form-control">
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                  <input type="checkbox" {...register('gst.is_igst')} /> IGST
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Live Calculation Display */}
        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>Base Amount:</span>
            <span>₹{Number(baseAmount).toLocaleString()}</span>
          </div>
          {gstApplied && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px', color: '#666' }}>
                <span>GST Amount ({gstRate}%):</span>
                <span>₹{liveGst.gst_amount.toLocaleString()}</span>
              </div>
              {!isIgst ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px', color: '#888', paddingLeft: '20px' }}>
                  <span>CGST / SGST:</span>
                  <span>₹{liveGst.cgst.toLocaleString()} / ₹{liveGst.sgst.toLocaleString()}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px', color: '#888', paddingLeft: '20px' }}>
                  <span>IGST:</span>
                  <span>₹{liveGst.igst.toLocaleString()}</span>
                </div>
              )}
            </>
          )}
          <hr />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px' }}>
            <span>Total Amount:</span>
            <span className="text-primary">₹{liveGst.total.toLocaleString()}</span>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Payment Mode</label>
            <select {...register('payment_mode')} className="form-control">
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="CREDIT">Credit (Udhari)</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" {...register('is_paid')} /> Payment Received/Paid
            </label>
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-100" style={{ marginTop: '20px' }}>
          Save Transaction
        </button>
      </form>
    </div>
  );
};

export default AddTransaction;
