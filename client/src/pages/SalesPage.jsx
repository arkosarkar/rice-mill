import React, { useEffect, useMemo, useState } from 'react';
import {
  PlusIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  BanknotesIcon,
  PencilSquareIcon,
  TrashIcon,
  PrinterIcon,
  CurrencyRupeeIcon,
  UserCircleIcon,
  ShoppingCartIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import authFetch from '../utils/authFetch';
import PartyModal from '../components/PartyModal';
import StatCard from '../components/ui/StatCard';
import { PageContainer, SectionCard, ModernTable } from '../components/ui/Layout';
import Modal from '../components/ui/Modal';

import { API_URL } from '../api/config';

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function newInvoiceNo() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `INV-${yyyy}${mm}${dd}-${rand}`;
}

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function amountInWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const toWords = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + toWords(n % 100);
    if (n < 100000) return toWords(Math.floor(n / 1000)) + 'Thousand ' + toWords(n % 1000);
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + 'Lakh ' + toWords(n % 100000);
    return toWords(Math.floor(n / 10000000)) + 'Crore ' + toWords(n % 10000000);
  };
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = 'Rupees ' + toWords(rupees).trim();
  if (paise > 0) words += ' and ' + toWords(paise).trim() + ' Paise';
  return words + ' Only';
}

const DEFAULT_MILL = {
  name: 'Your Rice Mill Name',
  gstin: 'XXXXXXXXXXXXXXXXXXXX',
  address: 'Village/Town, District, State — PIN',
  phone: '+91 XXXXX XXXXX',
  email: 'youremail@example.com',
  state: 'West Bengal',
  stateCode: '19',
};

// ─── EMPTY FORM ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  invoiceNo: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  customerName: '',
  contactNumber: '',
  address: '',
  gstNumber: '',
  productId: '',
  quantityKg: '',
  ratePerKg: '',
  bags: '',
  taxPercent: '0',
  paymentMode: 'Cash',
  paymentStatus: 'Paid',
  amountReceived: '',
  deliveryDate: '',
  vehicleNumber: '',
  driverName: '',
  deliveryStatus: 'Ready to Dispatch',
  sourceGodown: '',
  remarks: '',
  customerState: 'West Bengal',
  saleType: 'Rice (Goods)',
  hsnSac: '1006',
  isRcm: false,
  billingAddress: '',
  shippingAddress: '',
};

// ─── INVOICE PREVIEW ──────────────────────────────────────────────────────────
function InvoicePreview({ mill, sale }) {
  const taxable = toNumber(sale.taxable_value || sale.taxableValue || sale.totalAmount || sale.total_amount);
  const isLocal = (sale.customerState || sale.customer_state || 'West Bengal').trim().toLowerCase() === 'west bengal';
  const gstRate = toNumber(sale.taxPercent || sale.tax_percent);
  const gst = toNumber(sale.taxAmount || sale.tax_amount || (taxable * gstRate / 100));
  
  const cgst = sale.cgst_amount !== undefined ? toNumber(sale.cgst_amount) : (sale.cgst !== undefined ? toNumber(sale.cgst) : (isLocal ? gst / 2 : 0));
  const sgst = sale.sgst_amount !== undefined ? toNumber(sale.sgst_amount) : (sale.sgst !== undefined ? toNumber(sale.sgst) : (isLocal ? gst / 2 : 0));
  const igst = sale.igst_amount !== undefined ? toNumber(sale.igst_amount) : (sale.igst !== undefined ? toNumber(sale.igst) : (isLocal ? 0 : gst));
  const isRcm = sale.isRcm || sale.is_rcm || false;
  const grandTotal = toNumber(sale.grandTotal || sale.grand_total);
  const invNo = sale.invoiceNo || sale.invoice_no;
  const invDate = sale.invoiceDate || sale.invoice_date;
  const custName = sale.customerName || sale.customer_name;
  const balanceDue = toNumber(sale.balanceDue || sale.balance_due);

  return (
    <div id="invoice-print-area" style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#222', background: '#fff', padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #1565c0', paddingBottom: 16, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'inline-block', background: '#1565c0', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, marginBottom: 8 }}>TAX INVOICE</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1565c0', margin: '0 0 4px' }}>{mill.name}</h1>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.7 }}>
            {mill.address}<br />📞 {mill.phone} | ✉ {mill.email}<br />
            <strong>GSTIN:</strong> {mill.gstin} | <strong>State:</strong> {mill.state} ({mill.stateCode})
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#1565c0' }}>{sale.invoiceNo}</div>
          <div style={{ fontSize: 13, color: '#555', marginTop: 6 }}>Date: {sale.invoiceDate ? new Date(sale.invoiceDate).toLocaleDateString('en-IN') : '-'}</div>
          <div id="triplicate-label" style={{ marginTop: 8, fontSize: 11, background: '#fff3e0', padding: '4px 10px', borderRadius: 6, color: '#e65100', fontWeight: 700 }}>Original for Recipient</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#f5f6fa', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1565c0', marginBottom: 6, fontSize: 12, textTransform: 'uppercase' }}>Bill To (Buyer)</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{sale.customerName || 'Cash Customer'}</div>
          <div style={{ color: '#555', marginTop: 4, fontSize: 12, lineHeight: 1.6 }}>
            {sale.address || 'Address not provided'}<br />📞 {sale.contactNumber || '-'}<br />GSTIN: {sale.gstNumber || 'Unregistered'}
          </div>
        </div>
        <div style={{ background: '#f5f6fa', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontWeight: 700, color: '#1565c0', marginBottom: 6, fontSize: 12, textTransform: 'uppercase' }}>Invoice Details</div>
          <table style={{ width: '100%', fontSize: 12 }}>
            <tbody>
              {[['Invoice No', invNo], ['Date', invDate ? new Date(invDate).toLocaleDateString('en-IN') : '-'], ['Payment Mode', sale.paymentMode || sale.payment_mode || 'Cash'], ['Reverse Charge (RCM)', isRcm ? 'YES' : 'NO'], ['Place of Supply', sale.customerState || sale.customer_state || 'West Bengal']].map(([k, v]) => (
                <tr key={k}><td style={{ padding: '3px 0', color: '#666' }}>{k}</td><td style={{ padding: '3px 0', fontWeight: 600, textAlign: 'right' }}>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>{['#', 'Description', 'HSN', 'Qty (Kg)', 'Bags', 'Rate/Kg', 'Taxable Amt'].map((h, i) => (
            <th key={h} style={{ background: '#1565c0', color: '#fff', padding: '10px 12px', textAlign: i > 2 ? 'right' : 'left', fontSize: 12, fontWeight: 700 }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #e0e0e0' }}>1</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #e0e0e0' }}><strong>{sale.variety || ''} {sale.riceType || sale.saleType || sale.sale_type || 'Rice'}</strong></td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #e0e0e0' }}>{sale.hsnSac || sale.hsn_sac || '1006'}</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #e0e0e0', textAlign: 'right' }}>{toNumber(sale.quantityKg).toFixed(2)}</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #e0e0e0', textAlign: 'right' }}>{sale.bags || '-'}</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #e0e0e0', textAlign: 'right' }}>{fmt(sale.ratePerKg)}</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 600 }}>{fmt(taxable)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6, textTransform: 'uppercase' }}>Tax Breakup ({isLocal ? 'CGST + SGST' : 'IGST'})</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: '#f5f6fa' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#555' }}>HSN</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#555' }}>Taxable</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#555' }}>Rate</th>
              {isLocal ? (
                  <>
                    <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#555' }}>CGST</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#555' }}>SGST</th>
                  </>
              ) : (
                  <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#555' }}>IGST</th>
              )}
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#555' }}>Total</th>
            </tr></thead>
            <tbody>
              <tr>
                <td style={{ padding: '6px 8px' }}>{sale.hsnSac || sale.hsn_sac || '1006'}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmt(taxable)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{gstRate}%</td>
                {isLocal ? (
                    <>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmt(cgst)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmt(sgst)}</td>
                    </>
                ) : (
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmt(igst)}</td>
                )}
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{fmt(gst)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ background: '#e8f5e9', border: '2px solid #4caf50', borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}><span style={{ color: '#555' }}>Subtotal</span><span style={{ fontWeight: 600 }}>{fmt(taxable)}</span></div>
          {isLocal ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}><span style={{ color: '#555' }}>CGST @ {gstRate / 2}%</span><span style={{ fontWeight: 600 }}>{fmt(cgst)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}><span style={{ color: '#555' }}>SGST @ {gstRate / 2}%</span><span style={{ fontWeight: 600 }}>{fmt(sgst)}</span></div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}><span style={{ color: '#555' }}>IGST @ {gstRate}%</span><span style={{ fontWeight: 600 }}>{fmt(igst)}</span></div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #4caf50', paddingTop: 10, marginTop: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>GRAND TOTAL</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: '#2e7d32' }}>{fmt(grandTotal)}</span>
          </div>
          {balanceDue > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '6px 10px', background: '#ffebee', borderRadius: 6 }}>
              <span style={{ color: '#c62828', fontWeight: 700 }}>Balance Due</span>
              <span style={{ color: '#c62828', fontWeight: 700 }}>{fmt(balanceDue)}</span>
            </div>
          )}
          <div style={{ fontSize: 11, color: '#888', marginTop: 8, fontStyle: 'italic' }}>{amountInWords(grandTotal)}</div>
        </div>
      </div>

      {(sale.vehicleNumber || sale.driverName || sale.deliveryDate) && (
        <div style={{ background: '#f5f6fa', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 12 }}>
          <div style={{ fontWeight: 700, color: '#1565c0', marginBottom: 6, textTransform: 'uppercase', fontSize: 11 }}>Delivery Details</div>
          <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
            {sale.deliveryDate && <span><strong>Date:</strong> {new Date(sale.deliveryDate).toLocaleDateString('en-IN')}</span>}
            {sale.vehicleNumber && <span><strong>Vehicle:</strong> {sale.vehicleNumber}</span>}
            {sale.driverName && <span><strong>Driver:</strong> {sale.driverName}</span>}
            {sale.deliveryStatus && <span><strong>Status:</strong> {sale.deliveryStatus}</span>}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div style={{ fontSize: 11, color: '#777', background: '#f9f9f9', padding: 12, borderRadius: 8 }}>
          <strong>Declaration:</strong><br />We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
        </div>
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          <div style={{ marginBottom: 40, color: '#555' }}>For <strong>{mill.name}</strong></div>
          <div style={{ borderTop: '1px solid #888', paddingTop: 6, color: '#555' }}>Authorised Signature</div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid #ddd', paddingTop: 10, marginTop: 16, fontSize: 11, color: '#888', textAlign: 'center' }}>
        This is a computer generated invoice. | Powered by RiceMill Pro — Mitelogix
      </div>
    </div>
  );
}

// ─── INVOICE MODAL ────────────────────────────────────────────────────────────
function InvoiceModal({ sale, millInfo, onClose }) {
  const mill = { ...DEFAULT_MILL, ...(millInfo || {}) };
  const [downloading, setDownloading] = useState(false);
  const [invoiceType, setInvoiceType] = useState('Original for Recipient');

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = resolve; script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      if (!window.jspdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          script.onload = resolve; script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const element = document.getElementById('invoice-print-area');
      const existingLabel = document.getElementById('triplicate-label');
      if (existingLabel) existingLabel.innerText = invoiceType;
      
      const canvas = await window.html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save(`${sale.invoiceNo} - ${invoiceType}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
      window.print();
    }
    setDownloading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 3000, overflowY: 'auto', padding: '20px 0' }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 800, margin: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', gap: '15px', padding: '15px 20px', background: '#f5f6fa', borderBottom: '1px solid #ddd', borderRadius: '12px 12px 0 0', alignItems: 'center', justifyContent: 'flex-end' }}>
           <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
               <div style={{ color: '#1565c0', fontWeight: 800, fontSize: 16 }}>📄 GST Tax Invoice — {sale.invoiceNo}</div>
           </div>
           <select style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', fontWeight: 'bold', color: '#1565c0' }} value={invoiceType} onChange={e => setInvoiceType(e.target.value)}>
              <option value="Original for Recipient">Original for Recipient</option>
              <option value="Duplicate for Transporter">Duplicate for Transporter</option>
              <option value="Triplicate for Supplier">Triplicate for Supplier</option>
           </select>
           <button onClick={handleDownloadPDF} disabled={downloading} style={{ padding: '9px 20px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              {downloading ? '⏳ Generating...' : '⬇️ Download PDF'}
           </button>
           <button onClick={onClose} style={{ padding: '9px 20px', background: 'transparent', color: '#777', border: '2px solid #ccc', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕ Close</button>
        </div>
        <div style={{ padding: 20 }}>
            <InvoicePreview mill={mill} sale={sale} />
        </div>
      </div>
    </div>
  );
}

// ─── SALES FORM COMPONENT ─────────────────────────────────────────────────────
function SalesForm({ initialForm, editingSale, saleableProducts, onSubmit, onCancel, saving, parties = [], onAddNewCustomer }) {
  const [form, setForm] = useState(initialForm);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const quantityKg    = toNumber(form.quantityKg);
  const ratePerKg     = toNumber(form.ratePerKg);
  const subtotal      = quantityKg * ratePerKg;
  const taxPercent    = toNumber(form.taxPercent);
  const taxAmount     = subtotal * (taxPercent / 100);
  const grandTotal    = subtotal + taxAmount;

  const amountReceived = toNumber(form.amountReceived);
  const balanceDue = Math.max(grandTotal - amountReceived, 0);

  const selectedProduct = useMemo(() => {
    return saleableProducts.find(p => p._id === String(form.productId)) || null;
  }, [saleableProducts, form.productId]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.customerName) { alert('Please select customer.'); return; }
    if (!form.productId) { alert('Please select product.'); return; }
    if (quantityKg <= 0) { alert('Please enter quantity.'); return; }
    if (ratePerKg <= 0) { alert('Please enter rate/kg.'); return; }
    if (!form.customerState) { alert('Please select Customer State for GST calculation.'); return; }
    if (!form.gstNumber || form.gstNumber.trim().length < 15) { alert('A valid 15-digit GSTIN is required to generate a Tax Invoice.'); return; }

    const saleDate = new Date(form.invoiceDate);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    const fyStart = new Date(`${fyStartYear}-04-01`);
    const fyEnd = new Date(`${fyStartYear + 1}-03-31`);
    
    if (saleDate < fyStart || saleDate > fyEnd) {
      alert(`Invoice Date must fall within the current Financial Year (April 1, ${fyStartYear} - March 31, ${fyStartYear + 1}).`);
      return;
    }

    const payload = {
      invoiceNo:      form.invoiceNo,
      invoiceDate:    form.invoiceDate.split('T')[0],
      customerName:   form.customerName,
      contactNumber:  form.contactNumber || null,
      address:        form.address || null,
      gstNumber:      form.gstNumber || null,
      productId:      Number(form.productId),
      variety:        selectedProduct?.variety || null,
      riceType:       selectedProduct?.riceType || null,
      quantityKg,
      bags:           toNumber(form.bags),
      ratePerKg,
      totalAmount:    subtotal,
      taxPercent,
      taxAmount,
      cgst:           taxAmount / 2,
      sgst:           taxAmount / 2,
      grandTotal,
      amountReceived,
      balanceDue,
      paymentMode:    form.paymentMode,
      paymentStatus:  balanceDue <= 0 ? 'Paid' : form.paymentStatus,
      hsnCode:        '1006',
      deliveryDate:   form.deliveryDate || null,
      vehicleNumber:  form.vehicleNumber || null,
      driverName:     form.driverName || null,
      deliveryStatus: form.deliveryStatus || null,
      sourceGodown:   form.sourceGodown || selectedProduct?.godown || null,
      customerState:  form.customerState || 'West Bengal',
      saleType:       form.saleType || 'Rice (Goods)',
      hsnSac:         form.hsnSac || '1006',
      isRcm:          form.isRcm === true,
      billingAddress: form.billingAddress || null,
      shippingAddress: form.shippingAddress || null,
      remarks:        form.remarks || null,
    };
    onSubmit(payload);
  };

  useEffect(() => {
    if (form.customerName) setCustomerSearch(form.customerName);
  }, [form.customerName]);

  useEffect(() => {
    if (form.productId) {
      const p = saleableProducts.find(x => x._id === String(form.productId));
      if (p) setProductSearch(p._label || '');
    } else {
      setProductSearch('');
    }
  }, [form.productId, saleableProducts]);

  return (
    <div className="font-sans">
      <form id="salesForm" onSubmit={handleSubmit} className="space-y-8">
        <SectionCard title="📋 Invoice Registry">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice No.</label>
              <input type="text" value={form.invoiceNo} readOnly className="w-full bg-slate-100 border-none rounded-2xl px-5 py-3.5 text-sm font-black text-slate-500 italic shadow-inner outline-none cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Date *</label>
              <input type="date" required value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Type</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 outline-none appearance-none">
                <option>Fresh Order</option><option>From Backorder</option>
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="👤 Customer Profile">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Name *</label>
              <div className="flex gap-3 relative">
                <div className="flex-1 relative">
                  <input
                    type="text" required value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); if (!e.target.value) set('customerName', ''); }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                    placeholder="Search customer..."
                    className="w-full bg-indigo-50/50 border border-indigo-100 rounded-2xl px-5 py-4 text-sm font-black text-indigo-700 focus:bg-white outline-none transition-all"
                  />
                  {showCustomerDropdown && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/50 max-h-56 overflow-y-auto">
                      {parties.filter(p => p.name.toLowerCase().includes((customerSearch || '').toLowerCase())).map(p => (
                        <div key={p.id} onMouseDown={() => {
                            setForm(prev => ({ ...prev, customerName: p.name, partyId: p.id, contactNumber: p.mobile_number || prev.contactNumber, address: p.address || prev.address, gstNumber: p.gst_number || prev.gstNumber, customerState: p.state || prev.customerState || 'West Bengal' }));
                            setCustomerSearch(p.name); setShowCustomerDropdown(false);
                          }}
                          className="px-5 py-3.5 flex justify-between items-center cursor-pointer hover:bg-indigo-50 border-b border-slate-50 last:border-0 transition-colors"
                        >
                          <span className="font-black text-slate-900 text-sm">{p.name}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase">{p.mobile_number}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={onAddNewCustomer} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all whitespace-nowrap">
                  + New
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer State *</label>
              <select value={form.customerState} onChange={e => set('customerState', e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 outline-none">
                <option>West Bengal</option><option>Bihar</option><option>Odisha</option><option>Jharkhand</option><option>Assam</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
              <input type="tel" value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 outline-none" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GSTIN *</label>
              <input type="text" value={form.gstNumber} onChange={e => set('gstNumber', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 outline-none uppercase tracking-widest" placeholder="15-digit GSTIN" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Address</label>
              <textarea value={form.billingAddress || form.address || ''} onChange={e => {set('billingAddress', e.target.value); set('address', e.target.value);}} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 outline-none resize-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shipping Address</label>
              <textarea value={form.shippingAddress} onChange={e => set('shippingAddress', e.target.value)} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 outline-none resize-none" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="🛒 Order Items">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="space-y-2 col-span-2 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Selection *</label>
              <div className="relative">
                <input
                  type="text" required value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); if (!e.target.value) set('productId', ''); }}
                  onFocus={() => setShowProductDropdown(true)}
                  onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                  placeholder="Search rice, bran, husk..."
                  className="w-full bg-indigo-50/50 border border-indigo-100 rounded-2xl px-5 py-4 text-sm font-black text-indigo-700 focus:bg-white outline-none transition-all"
                />
                {showProductDropdown && (
                  <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/50 max-h-64 overflow-y-auto custom-scrollbar">
                    {saleableProducts
                      .filter(p => !productSearch || p._label.toLowerCase().includes(productSearch.toLowerCase()) || p.variety?.toLowerCase().includes(productSearch.toLowerCase()))
                      .map(p => (
                        <div key={p.id} onMouseDown={() => {
                            setForm(prev => ({ 
                              ...prev, 
                              productId: p._id, 
                              variety: p.variety, 
                              riceType: p.riceType || p.type, 
                              sourceGodown: p.godown,
                              ratePerKg: prev.ratePerKg || (p.type === 'Rice' ? 45 : 15) // suggested rates if empty
                            }));
                            setProductSearch(p._label);
                            setShowProductDropdown(false);
                          }}
                          className="px-5 py-4 flex flex-col cursor-pointer hover:bg-indigo-50 border-b border-slate-50 last:border-0 transition-colors"
                        >
                          <div className="flex justify-between items-center mb-1">
                             <span className="font-black text-slate-900 text-sm tracking-tight">{p.type}: {p.variety}</span>
                             <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">{toNumber(p.availableWeightKg).toFixed(0)} KG</span>
                          </div>
                          <div className="flex justify-between items-center opacity-60">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{p.riceType}</span>
                             <span className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-1">📍 {p.godown}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qty (Kg) *</label>
              <input type="number" step="0.01" required value={form.quantityKg} onChange={e => set('quantityKg', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-black text-slate-900 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rate/Kg *</label>
              <input type="number" step="0.01" required value={form.ratePerKg} onChange={e => set('ratePerKg', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-black text-slate-900 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bags</label>
              <input type="number" value={form.bags} onChange={e => set('bags', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-black text-slate-900 outline-none" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="💰 Payment & GST">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subtotal</label>
              <div className="bg-slate-100 rounded-2xl px-5 py-3.5 text-lg font-black text-slate-700 shadow-inner">₹{subtotal.toFixed(2)}</div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GST %</label>
              <select value={form.taxPercent} onChange={e => set('taxPercent', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-black text-slate-900 outline-none">
                <option value="0">0% (Nil)</option><option value="5">5%</option><option value="18">18%</option><option value="40">40%</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">GST Amount</label>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3.5 text-lg font-black text-amber-700 shadow-inner">₹{taxAmount.toFixed(2)}</div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Grand Total</label>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3.5 text-2xl font-black text-emerald-700 shadow-inner">₹{grandTotal.toFixed(2)}</div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Mode</label>
              <select value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-black text-slate-900 outline-none">
                <option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>Credit</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Status</label>
              <select value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-black text-slate-900 outline-none">
                <option>Paid</option><option>Partial Payment</option><option>Unpaid</option><option value="Credit - 7 Days">Credit - 7 Days</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount Received</label>
              <input type="number" step="0.01" value={form.amountReceived} onChange={e => set('amountReceived', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Balance Due</label>
              <div className="bg-rose-50 border border-rose-100 rounded-2xl px-5 py-3.5 text-lg font-black text-rose-600 shadow-inner">₹{balanceDue.toFixed(2)}</div>
            </div>
          </div>
        </SectionCard>
      </form>
    </div>
  );
}

// ─── MAIN SALES PAGE ───────────────────────────────────────────────────────────
function SalesPage() {
  const [view, setView]           = useState('list');
  const [stocks, setStocks]       = useState([]);
  const [salesList, setSalesList] = useState([]);
  const [saving, setSaving]       = useState(false);
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [editingSale, setEditingSale] = useState(null);
  const [collectSale, setCollectSale] = useState(null);
  const [collectForm, setCollectForm] = useState({ amount: '', paymentMode: 'Cash', date: new Date().toISOString().split('T')[0], note: '' });
  const [formInit, setFormInit]   = useState({ ...EMPTY_FORM, invoiceNo: newInvoiceNo() });
  
  const [parties, setParties] = useState([]);
  const [showAddParty, setShowAddParty] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('All Customers');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 10;

  const loadData = async () => {
    try {
      const [stockRes, salesRes, partiesRes] = await Promise.all([
        authFetch('/stock'),
        authFetch('/sales'),
        authFetch('/parties?type=Customer')
      ]);
      if (stockRes.ok) setStocks(await stockRes.json());
      
      const salesQuery = `/sales?page=${currentPage}&limit=${itemsPerPage}&customer=${filterCustomer}&status=${filterStatus}`;
      const salesResFetched = await authFetch(salesQuery);
      if (salesResFetched.ok) {
        const result = await salesResFetched.json();
        if (result.data) {
          setSalesList(result.data);
          setTotalRecords(result.total);
        } else {
          setSalesList(Array.isArray(result) ? result : []);
          setTotalRecords(Array.isArray(result) ? result.length : 0);
        }
      }
      
      if (partiesRes.ok) setParties(await partiesRes.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadData(); }, []);

  const handleNewSale = () => { setEditingSale(null); setFormInit({ ...EMPTY_FORM, invoiceNo: newInvoiceNo() }); setView('form'); };
  const handleCancel = () => { setView('list'); };

  const handleEditSale = (sale) => {
    setEditingSale(sale);
    setFormInit({
      ...sale,
      invoiceNo:      sale.invoice_no || sale.invoiceNo,
      invoiceDate:    (sale.invoice_date || sale.invoiceDate || '').split('T')[0],
      customerName:   sale.customer_name || sale.customerName,
      contactNumber:  sale.contact_number || sale.contactNumber,
      address:        sale.address,
      gstNumber:      sale.gst_number || sale.gstNumber,
      productId:      sale.product_id || sale.productId,
      quantityKg:     sale.quantity_kg || sale.quantityKg,
      ratePerKg:      sale.rate_per_kg || sale.ratePerKg,
      bags:           sale.bags,
      taxPercent:     sale.tax_percent || sale.taxPercent,
      paymentMode:    sale.payment_mode || sale.paymentMode,
      paymentStatus:  sale.payment_status || sale.paymentStatus,
      amountReceived: sale.amount_received || sale.amountReceived,
      deliveryDate:   (sale.delivery_date || sale.deliveryDate || '').split('T')[0],
      vehicleNumber:  sale.vehicle_number || sale.vehicleNumber,
      driverName:     sale.driver_name || sale.driverName,
      deliveryStatus: sale.delivery_status || sale.deliveryStatus,
      sourceGodown:   sale.source_godown || sale.sourceGodown,
      remarks:        sale.remarks,
      customerState:  sale.customer_state || sale.customerState,
      saleType:       sale.sale_type || sale.saleType,
      hsnSac:         sale.hsn_sac || sale.hsnSac,
      isRcm:          sale.is_rcm || sale.isRcm,
      billingAddress: sale.billing_address || sale.billingAddress,
      shippingAddress: sale.shipping_address || sale.shippingAddress,
    });
    setView('form');
  };

  const handleDeleteSale = async (sale) => {
    const isConfirmed = window.confirm(
      `⚠️ WARNING: DELETE SALES INVOICE\n\n` +
      `Are you sure you want to PERMANENTLY delete this invoice?\n\n` +
      `Invoice No: ${sale.invoiceNo}\n` +
      `Amount: ${fmt(sale.grandTotal)}\n\n` +
      `This will reverse stock and ledger entries.\n` +
      `THIS ACTION CANNOT BE UNDONE.`
    );
    if (!isConfirmed) return;
    try {
      const res = await authFetch(`/sales/${sale.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) { alert('Deleted successfully'); loadData(); }
      else { alert('Delete failed: ' + (data.message || res.statusText)); }
    } catch (err) { alert('Error connecting to server'); }
  };

  const handleFormSubmit = async (payload) => {
    setSaving(true);
    try {
      const url = editingSale ? `/sales/${editingSale.id}` : `/sales`;
      const method = editingSale ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Saved successfully');
        loadData();
        setView('list');
      } else {
        const err = await res.json();
        alert('Save failed: ' + (err.message || 'Unknown error'));
      }
    } catch (err) { alert('Error connecting to server'); }
    setSaving(false);
  };

  const handleCollectPayment = async (e) => {
    e.preventDefault();
    try {
        const newAmount = toNumber(collectSale.amountReceived) + toNumber(collectForm.amount);
        const res = await authFetch(`/sales/${collectSale.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amountReceived: newAmount, paymentStatus: (toNumber(collectSale.grandTotal) - newAmount <= 0) ? 'Paid' : 'Partial Payment' })
        });
        if (res.ok) { alert('Payment collected'); setCollectSale(null); loadData(); }
    } catch (err) { alert('Payment failed'); }
  };

  const handlePartySaved = (newParty) => {
    setFormInit(prev => ({
        ...prev,
        customerName: newParty.name,
        contactNumber: newParty.mobile_number || prev.contactNumber,
        address: newParty.address || prev.address,
        gstNumber: newParty.gst_number || prev.gstNumber,
        customerState: newParty.state || prev.customerState || 'West Bengal'
    }));
    setShowAddParty(false);
    loadData();
  };

  const saleableProducts = useMemo(() => {
    const totals = {};
    stocks.forEach(s => {
      const key = `${s.type}-${s.variety}-${s.riceType}`;
      totals[key] = (totals[key] || 0) + toNumber(s.availableWeightKg);
    });

    return stocks
      .filter(s => ['Rice', 'Husk', 'Bran'].includes(s.type))
      .filter(s => toNumber(s.availableWeightKg) > 0)
      .map(s => {
        const key = `${s.type}-${s.variety}-${s.riceType}`;
        const totalVal = totals[key];
        const label = `${s.type} - ${s.variety} (${s.riceType}) [Stock: ${toNumber(s.availableWeightKg).toFixed(0)} Kg in ${s.godown}] (Total: ${totalVal.toFixed(0)} Kg)`;
        return { ...s, _id: String(s.id), _label: label };
      });
  }, [stocks]);

  const statusBadge = (s) => {
    const map = { Paid: '#4caf50', 'Partial Payment': '#ff9800', Overdue: '#f44336', Unpaid: '#f44336' };
    const color = map[s] || '#2196f3';
    return <span style={{ padding: '3px 10px', background: color + '22', color, borderRadius: 12, fontWeight: 700, fontSize: 11 }}>{s}</span>;
  };

  useEffect(() => {
    setCurrentPage(1);
    loadData();
  }, [filterCustomer, filterStatus]);

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  const totalRevenue = salesList.reduce((s, x) => s + toNumber(x.grand_total || x.grandTotal), 0);
  const totalPaid    = salesList.reduce((s, x) => s + toNumber(x.amount_received || x.amountReceived), 0);
  const totalDue     = salesList.reduce((s, x) => s + toNumber(x.balance_due || x.balanceDue), 0);

  return (
    <PageContainer>
      {invoiceSale && <InvoiceModal sale={invoiceSale} onClose={() => setInvoiceSale(null)} />}

      {/* Collect Payment Modal */}
      {collectSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setCollectSale(null)}>
          <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-[0_48px_96px_-12px_rgba(0,0,0,0.3)] font-sans" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 px-10 py-10 text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl" />
              <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10"><CurrencyRupeeIcon className="h-8 w-8 text-indigo-400" /></div>
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Collect Payment</h3>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2 opacity-80">{collectSale.invoiceNo}</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleCollectPayment} className="p-10 space-y-6">
              <div className="bg-slate-50 rounded-2xl p-5 flex justify-between items-center border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Due</span>
                <span className="text-2xl font-black text-rose-500 italic">{fmt(collectSale.balanceDue)}</span>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount Collecting</label>
                <input type="number" required max={collectSale.balanceDue} value={collectForm.amount} onChange={e => setCollectForm({...collectForm, amount: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xl font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="0.00" />
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setCollectSale(null)} className="flex-1 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-900 uppercase text-[10px] tracking-widest border border-slate-200 transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-indigo-600 uppercase text-[10px] tracking-widest transition-all shadow-xl active:scale-95">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {view === 'form' && (
        <Modal
          isOpen={view === 'form'}
          onClose={handleCancel}
          title={editingSale ? 'Amend Invoice' : 'Create Invoice'}
          formId="salesForm"
          submitText="Save Invoice"
          isSaving={saving}
        >
          <SalesForm 
            initialForm={formInit} 
            editingSale={editingSale} 
            saleableProducts={saleableProducts} 
            onSubmit={handleFormSubmit} 
            onCancel={handleCancel} 
            saving={saving} 
            parties={parties} 
            onAddNewCustomer={() => setShowAddParty(true)} 
          />
        </Modal>
      )}

      <>
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight">Sales Management</h1>
            <p className="text-sm text-slate-500 mt-1 italic">Issue invoices, track payments, and manage customer accounts.</p>
          </div>
          <button onClick={handleNewSale} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 transform active:scale-95 uppercase text-xs tracking-widest">
            <PlusIcon className="h-5 w-5" /> New Sale Invoice
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Invoices" value={salesList.length} unit="ORDERS" trend="ISSUED" icon={DocumentTextIcon} colorClass="text-indigo-600" iconBg="bg-indigo-50" />
          <StatCard title="Gross Revenue" value={'₹' + (totalRevenue/1000).toFixed(1) + 'K'} unit="BILLED" trend="TOTAL" icon={ChartBarIcon} colorClass="text-emerald-600" iconBg="bg-emerald-50" />
          <StatCard title="Amount Collected" value={'₹' + (totalPaid/1000).toFixed(1) + 'K'} unit="RECEIVED" trend="PAID" icon={BanknotesIcon} colorClass="text-indigo-600" iconBg="bg-blue-50" />
          <StatCard title="Outstanding Due" value={'₹' + (totalDue/1000).toFixed(1) + 'K'} unit="PENDING" trend="UNPAID" icon={CurrencyRupeeIcon} colorClass="text-rose-500" iconBg="bg-rose-50" />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
          <SectionCard title="Invoice Registry">
            <div className="flex gap-4 mb-6 flex-wrap">
              <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-black text-slate-700 outline-none">
                <option>All Customers</option>
                {parties.map(p => <option key={p.id}>{p.name}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-black text-slate-700 outline-none">
                <option>All Status</option><option>Paid</option><option>Partial Payment</option><option>Unpaid</option>
              </select>
            </div>
            <>
              <ModernTable headers={['Invoice No.', 'Date', 'Customer', 'Product', 'Qty (Kg)', 'Total', 'Collected', 'Status', 'Actions']}>
                {salesList.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 group transition-all duration-200">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="text-sm font-black text-indigo-600 italic tracking-tighter flex items-center gap-2">
                        <DocumentTextIcon className="h-4 w-4" />{s.invoice_no || s.invoiceNo}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500 font-bold">{(s.invoice_date || s.invoiceDate) ? new Date(s.invoice_date || s.invoiceDate).toLocaleDateString('en-IN') : '-'}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-slate-900">{s.customer_name || s.customerName}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-xs font-black text-slate-500 uppercase italic">{s.variety}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-slate-900 tabular-nums text-right">{toNumber(s.quantity_kg || s.quantityKg).toFixed(2)}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-slate-900 tabular-nums">{fmt(s.grand_total || s.grandTotal)}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-emerald-600 tabular-nums">{fmt(s.amount_received || s.amountReceived)}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {statusBadge(s.payment_status || s.paymentStatus)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <button className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-white hover:shadow-xl rounded-xl" onClick={() => handleEditSale(s)}><PencilSquareIcon className="h-4 w-4" /></button>
                        <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-xl rounded-xl" onClick={() => setInvoiceSale(s)}><PrinterIcon className="h-4 w-4" /></button>
                        {toNumber(s.balance_due || s.balanceDue) > 0 && <button className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-white hover:shadow-xl rounded-xl" onClick={() => setCollectSale(s)}><BanknotesIcon className="h-4 w-4" /></button>}
                        <button className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-xl rounded-xl" onClick={() => handleDeleteSale(s)}><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </ModernTable>
              {/* Pagination UI */}
              {totalPages > 1 && (
                <div className="px-8 py-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">
                        Showing {((currentPage - 1) * itemsPerPage) + 1}—{Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        currentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      Prev
                    </button>
                    <div className="flex items-center gap-1 mx-2">
                      {[...Array(Number.isFinite(totalPages) ? totalPages : 0)].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`h-8 w-8 rounded-lg text-[10px] font-black transition-all ${
                            currentPage === i + 1
                              ? 'bg-indigo-600 text-white shadow-lg'
                              : 'text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        currentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          </SectionCard>
        </div>
      </>

      {showAddParty && (
        <PartyModal isOpen={showAddParty} defaultType="Customer" onClose={() => setShowAddParty(false)} onSave={handlePartySaved} />
      )}
    </PageContainer>
  );
}

export default SalesPage;
