import React, { useState, useEffect } from 'react';
import authFetch from '../utils/authFetch';

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", 
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const PartyModal = ({ isOpen, onClose, onSave, initialData, defaultType = 'Farmer' }) => {
  const [activeTab, setActiveTab] = useState('gst');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    mobile_number: '',
    type: defaultType,
    gst_number: '',
    
    // Trade & Address
    gst_status: 'Unregistered',
    state: '',
    email: '',
    address: '', // Billing Address
    shipping_address: '',
    
    // Credit & Balance
    opening_balance: 0,
    opening_balance_date: new Date().toISOString().split('T')[0],
    credit_limit: 0,
    
    // Additional
    note: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          ...initialData,
          opening_balance: initialData.opening_balance || 0,
          opening_balance_date: initialData.opening_balance_date ? initialData.opening_balance_date.split('T')[0] : new Date().toISOString().split('T')[0],
          credit_limit: initialData.credit_limit || 0,
        });
      } else {
        setForm({
          name: '',
          mobile_number: '',
          type: defaultType,
          gst_number: '',
          gst_status: 'Unregistered',
          state: '',
          email: '',
          address: '',
          shipping_address: '',
          opening_balance: 0,
          opening_balance_date: new Date().toISOString().split('T')[0],
          credit_limit: 0,
          note: ''
        });
      }
      setActiveTab('gst');
      setError('');
    }
  }, [isOpen, initialData, defaultType]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError(''); // Clear error on change
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Party Name is required.');
      return;
    }
    if (!form.mobile_number.trim()) {
      setError('Mobile Number is required and must be unique.');
      return;
    }

    if (form.gst_number && form.gst_number.trim().length > 0 && form.gst_number.trim().length !== 15) {
      setError('A valid 15-digit GSTIN is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const method = initialData?.id ? 'PUT' : 'POST';
      const url = initialData?.id ? `/parties/${initialData.id}` : `/parties`;
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      if (res.ok) {
        onSave(data); // Pass back the saved party
      } else {
        setError(data.error || 'Failed to save party');
      }
    } catch (err) {
      console.error(err);
      setError(`Error connecting to backend: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'gst', label: 'GST & Address' },
    { id: 'credit', label: 'Credit & Balance' },
    { id: 'additional', label: 'Additional Fields' }
  ];

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="modal-content" style={{
        background: 'white', borderRadius: '8px', width: '90%', maxWidth: '750px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             {initialData ? 'Edit Party' : 'Add Party'}
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Setting Icon / Close Icon */}
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>×</button>
          </div>
        </div>

        {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 24px', fontSize: '14px' }}>{error}</div>}

        <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
          
          {/* Top Always Visible Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
             <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#1976d2', fontWeight: '600', marginBottom: '4px' }}>Party Name *</label>
                <input type="text" name="name" value={form.name} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #1976d2', borderRadius: '4px', outline: 'none' }} placeholder="Enter Business/Party Name" />
             </div>
             <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>GSTIN</label>
                <input type="text" name="gst_number" value={form.gst_number} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }} placeholder="27XXXX" />
             </div>
             <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Mobile Number *</label>
                <input type="text" name="mobile_number" value={form.mobile_number} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }} placeholder="9876543210" />
             </div>
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: '1px solid #e0e0e0', display: 'flex', gap: '24px', marginBottom: '24px' }}>
            {tabs.map(tab => (
              <div 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ 
                  paddingBottom: '8px', 
                  cursor: 'pointer', 
                  fontSize: '14px', 
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  color: activeTab === tab.id ? '#1976d2' : '#666',
                  borderBottom: activeTab === tab.id ? '2px solid #1976d2' : '2px solid transparent'
                }}
              >
                {tab.label}
              </div>
            ))}
          </div>

          {/* Tab Contents */}
          {activeTab === 'gst' && (
            <div style={{ display: 'flex', gap: '32px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div>
                   <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>GST Type</label>
                   <select name="gst_status" value={form.gst_status} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                     <option value="Unregistered">Unregistered/Consumer</option>
                     <option value="Registered">Registered Business</option>
                   </select>
                 </div>
                 <div>
                   <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>State</label>
                   <select name="state" value={form.state} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                     <option value="">Select State</option>
                     {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                 </div>
                 <div>
                   <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Email ID</label>
                   <input type="email" name="email" value={form.email} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} placeholder="email@example.com" />
                 </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div>
                   <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Billing Address</label>
                   <textarea name="address" value={form.address} onChange={handleInputChange} rows={3} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', resize: 'none' }} placeholder="Billing Address"></textarea>
                 </div>
              </div>
               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div>
                   <label style={{ display: 'block', fontSize: '12px', color: '#1976d2', marginBottom: '4px' }}>+ Enable Shipping Address</label>
                   <textarea name="shipping_address" value={form.shipping_address} onChange={handleInputChange} rows={3} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', resize: 'none' }} placeholder="Shipping Address"></textarea>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'credit' && (
            <div style={{ display: 'flex', gap: '32px' }}>
               <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Opening Balance</label>
                  <input type="number" step="0.01" name="opening_balance" value={form.opening_balance} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
               </div>
               <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>As Of Date</label>
                  <input type="date" name="opening_balance_date" value={form.opening_balance_date} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
               </div>
               <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Credit Limit (₹)</label>
                  <input type="number" step="0.01" name="credit_limit" value={form.credit_limit} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} placeholder="0 for no limit" />
               </div>
            </div>
          )}

          {activeTab === 'additional' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
               <div>
                 <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Party Type</label>
                 <select name="type" value={form.type} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                   <option value="Farmer">Farmer / Supplier</option>
                   <option value="Customer">Customer</option>
                   <option value="Both">Both</option>
                 </select>
                 <small style={{ color: '#888', display: 'block', marginTop: '4px' }}>Determines if they are a creditor or debtor by default.</small>
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Internal Note</label>
                 <textarea name="note" value={form.note} onChange={handleInputChange} rows={3} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', resize: 'none' }} placeholder="Optional notes..."></textarea>
               </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#fafafa', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: 'white', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={isSubmitting} style={{ padding: '8px 24px', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PartyModal;
