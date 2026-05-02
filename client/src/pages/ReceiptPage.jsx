import React, { useState } from 'react';
import {
  PlusIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  PrinterIcon,
  ReceiptPercentIcon,
  BanknotesIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import StatCard from '../components/ui/StatCard';
import { PageContainer, SectionCard, ModernTable } from '../components/ui/Layout';

// ── Utilities ─────────────────────────────────────────────────────────────
function toNumber(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
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
  name: 'Your Rice Mill Name', gstin: 'XXXXXXXXXXXXXXXXXXXX',
  address: 'Village/Town, District, State — PIN', phone: '+91 XXXXX XXXXX',
  email: 'youremail@example.com', state: 'West Bengal', stateCode: '19',
};

// ── Receipt Print Preview (unchanged) ────────────────────────────────────
function ReceiptPreview({ mill, receipt }) {
  const amount = toNumber(receipt.amount);
  return (
    <div id="receipt-print-area" style={{ fontFamily: 'Arial, sans-serif', fontSize: 14, color: '#222', background: '#fff', padding: 40, maxWidth: 600, margin: '0 auto', border: '1px solid #ddd' }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1565c0', paddingBottom: 20, marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1565c0', margin: '0 0 8px' }}>{mill.name}</h1>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
          {mill.address}<br />📞 {mill.phone} | ✉ {mill.email}<br />
        </div>
        <div style={{ marginTop: 16, display: 'inline-block', background: '#1565c0', color: '#fff', fontSize: 16, fontWeight: 800, padding: '6px 20px', borderRadius: 4, letterSpacing: 1 }}>CASH / BANK RECEIPT</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, fontSize: 13 }}>
        <div><strong>Receipt No:</strong> {receipt.receiptNo || `#${receipt.id}`}</div>
        <div><strong>Date:</strong> {receipt.date ? new Date(receipt.date).toLocaleDateString('en-IN') : '-'}</div>
      </div>
      <div style={{ lineHeight: 2, fontSize: 15, marginBottom: 30 }}>
        <div>Received with thanks from <strong>{receipt.from}</strong>,</div>
        <div>the sum of <strong>{amountInWords(amount)}</strong></div>
        <div>by <strong>{receipt.method.toUpperCase()}</strong> {receipt.note ? `(${receipt.note})` : ''}</div>
        <div>on account of full / partial payment.</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40 }}>
        <div style={{ background: '#f5f6fa', padding: '12px 24px', borderRadius: 8, border: '2px solid #1565c0', fontSize: 20, fontWeight: 800, color: '#1565c0' }}>{fmt(amount)}</div>
        <div style={{ textAlign: 'center', width: 200 }}>
          <div style={{ borderBottom: '1px solid #222', marginBottom: 8 }}></div>
          <div style={{ fontSize: 12, color: '#555' }}>Authorised Signatory</div>
        </div>
      </div>
      <div style={{ marginTop: 40, fontSize: 11, color: '#888', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 10 }}>
        This is a computer generated receipt. | Powered by RiceMill Pro — Mitelogix
      </div>
    </div>
  );
}

// ── Receipt Modal (print/download logic unchanged) ────────────────────────
function ReceiptModal({ receipt, millInfo, onClose }) {
  const mill = { ...DEFAULT_MILL, ...(millInfo || {}) };
  const [downloading, setDownloading] = useState(false);

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
      const element = document.getElementById('receipt-print-area');
      const canvas = await window.html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save(`Receipt_${receipt.receiptNo || receipt.id}.pdf`);
    } catch (err) { console.error('PDF error:', err); window.print(); }
    setDownloading(false);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-print-area').innerHTML;
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write('<html><head><title>Print Receipt</title>');
    iframeDoc.write('<style>body{font-family:Arial,sans-serif;margin:0;padding:20px;} @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style>');
    iframeDoc.write('</head><body>');
    iframeDoc.write(printContent);
    iframeDoc.write('</body></html>');
    iframeDoc.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-8 bg-slate-900/70 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-[0_48px_96px_-12px_rgba(0,0,0,0.35)] font-sans" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-900 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-2xl border border-white/10"><CurrencyRupeeIcon className="h-6 w-6 text-indigo-400" /></div>
            <div>
              <h3 className="text-lg font-black italic uppercase tracking-tighter text-white leading-none">Receipt Preview</h3>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">{receipt.receiptNo || `#${receipt.id}`}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePrint} className="px-5 py-2.5 bg-white/10 border border-white/10 text-white text-xs font-black rounded-xl hover:bg-white/20 transition-all inline-flex items-center gap-2">
              <PrinterIcon className="h-4 w-4" /> Print
            </button>
            <button onClick={handleDownloadPDF} disabled={downloading} className="px-5 py-2.5 bg-emerald-500 text-white text-xs font-black rounded-xl hover:bg-emerald-400 transition-all inline-flex items-center gap-2 disabled:opacity-60">
              <ArrowDownTrayIcon className="h-4 w-4" /> {downloading ? 'Generating...' : 'Download PDF'}
            </button>
            <button onClick={onClose} className="px-5 py-2.5 bg-transparent border border-white/20 text-white text-xs font-black rounded-xl hover:bg-white/10 transition-all">✕</button>
          </div>
        </div>
        <div className="p-6 bg-slate-50">
          <ReceiptPreview mill={mill} receipt={receipt} />
        </div>
      </div>
    </div>
  );
}

const customers = ['Mohan Traders', 'Sri Ram Agency', 'Cash Customer'];
const farmers   = ['Ram Singh Farmer', 'Suresh Yadav Farmer', 'Mohan Lal Farmer'];
const METHOD_COLORS = {
  cash:  'bg-emerald-50 text-emerald-700 border-emerald-100',
  bank:  'bg-indigo-50  text-indigo-700  border-indigo-100',
  upi:   'bg-violet-50  text-violet-700  border-violet-100',
};

// ── Main Receipt Page ─────────────────────────────────────────────────────
function ReceiptPage() {
  const [showModal, setShowModal]       = useState(false);
  const [toast, setToast]               = useState({ show: false, message: '', type: 'success' });
  const [receipts, setReceipts]         = useState([]);
  const today = new Date().toISOString().split('T')[0];
  const emptyReceipt = { receiptNo: '', from: '', amount: '', method: 'cash', date: today, note: '' };
  const [receiptForm, setReceiptForm]   = useState(emptyReceipt);
  const [editingId, setEditingId]       = useState(null);
  const [previewReceipt, setPreviewReceipt] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleReceipt = () => {
    if (!receiptForm.from || !receiptForm.amount) { showToast('Please fill all fields', 'error'); return; }
    if (editingId) {
      setReceipts(receipts.map(r => r.id === editingId ? { ...receiptForm, id: editingId } : r));
      showToast('✓ Receipt updated!');
    } else {
      const newId = receipts.length ? Math.max(...receipts.map(r => r.id)) + 1 : 1;
      setReceipts([...receipts, { ...receiptForm, id: newId }]);
      showToast('✓ Receipt recorded!');
    }
    setShowModal(false); setReceiptForm(emptyReceipt); setEditingId(null);
  };

  const handleEdit   = (r)  => { setReceiptForm(r); setEditingId(r.id); setShowModal(true); };
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
      setReceipts(receipts.filter(r => r.id !== id));
      showToast('Receipt deleted', 'error');
    }
  };

  const totalCollected = receipts.reduce((s, r) => s + toNumber(r.amount), 0);

  return (
    <PageContainer>
      {previewReceipt && <ReceiptModal receipt={previewReceipt} onClose={() => setPreviewReceipt(null)} />}

      {toast.show && (
        <div className={`fixed top-6 right-6 z-[9999] px-6 py-4 rounded-2xl text-white font-black text-sm shadow-2xl animate-in slide-in-from-top-2 duration-300 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight">Receipts</h1>
          <p className="text-sm text-slate-500 mt-1 italic font-medium">Record and manage incoming cash and bank collections.</p>
        </div>
        <button
          onClick={() => { setReceiptForm(emptyReceipt); setEditingId(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 transform active:scale-95 uppercase text-xs tracking-widest"
        >
          <PlusIcon className="h-5 w-5" /> Add Receipt
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard title="Total Receipts"   value={receipts.length}                                    unit="RECORDS"   trend="LOGGED"   icon={ReceiptPercentIcon} colorClass="text-indigo-600"  iconBg="bg-indigo-50" />
        <StatCard title="Total Collected"  value={'₹' + (totalCollected / 1000).toFixed(1) + 'K'}    unit="RECEIVED"  trend="ALL TIME" icon={BanknotesIcon}      colorClass="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="Avg. Receipt"     value={'₹' + (receipts.length ? (totalCollected / receipts.length).toFixed(0) : 0)} unit="AVG VALUE" trend="PER TX" icon={CurrencyRupeeIcon}  colorClass="text-amber-600"   iconBg="bg-amber-50" />
      </div>

      {/* Entry Form (slide-in when modal open) */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-[0_48px_96px_-12px_rgba(0,0,0,0.3)] font-sans" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 px-10 py-10 text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl" />
              <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10"><CurrencyRupeeIcon className="h-8 w-8 text-indigo-400" /></div>
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{editingId ? 'Edit Receipt' : 'New Receipt'}</h3>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2 opacity-80">Record incoming payment</p>
                </div>
              </div>
            </div>
            <div className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receipt No.</label>
                  <input type="text" placeholder="REC-001" value={receiptForm.receiptNo} onChange={e => setReceiptForm({ ...receiptForm, receiptNo: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input type="date" value={receiptForm.date} onChange={e => setReceiptForm({ ...receiptForm, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Received From *</label>
                <select value={receiptForm.from} onChange={e => setReceiptForm({ ...receiptForm, from: e.target.value })} className="w-full bg-indigo-50/50 border border-indigo-100 rounded-2xl px-5 py-4 text-sm font-black text-indigo-700 outline-none">
                  <option value="">Select Party</option>
                  {[...customers, ...farmers].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹) *</label>
                <input type="number" placeholder="0.00" value={receiptForm.amount} onChange={e => setReceiptForm({ ...receiptForm, amount: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xl font-black text-slate-900 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                <div className="flex gap-3">
                  {['cash', 'bank', 'upi'].map(m => (
                    <button key={m} onClick={() => setReceiptForm({ ...receiptForm, method: m })} className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${receiptForm.method === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Note / Cheque No.</label>
                <input type="text" placeholder="Optional reference..." value={receiptForm.note} onChange={e => setReceiptForm({ ...receiptForm, note: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 outline-none" />
              </div>
              <div className="flex gap-4 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-900 uppercase text-[10px] tracking-widest border border-slate-200">Cancel</button>
                <button onClick={handleReceipt} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-indigo-600 uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">
                  {editingId ? 'Update' : 'Save Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
        <SectionCard title="Receipt Ledger">
          {receipts.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <CheckCircleIcon className="h-16 w-16 text-slate-200" />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">No receipts recorded yet</p>
            </div>
          ) : (
            <ModernTable headers={['Receipt No.', 'Date', 'Received From', 'Method', 'Note', 'Amount', 'Actions']}>
              {receipts.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50 group transition-all duration-200">
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-indigo-600 italic">{r.receiptNo || `#${r.id}`}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-500">{r.date}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-slate-900">{r.from}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${METHOD_COLORS[r.method] || 'bg-slate-50 text-slate-500 border-slate-100'}`}>{r.method}</span>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-400 font-medium italic">{r.note || '—'}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-emerald-600 tabular-nums">₹{parseFloat(r.amount).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                      <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-xl rounded-xl" onClick={() => setPreviewReceipt(r)}><ArrowDownTrayIcon className="h-4 w-4" /></button>
                      <button className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-white hover:shadow-xl rounded-xl" onClick={() => handleEdit(r)}><PencilSquareIcon className="h-4 w-4" /></button>
                      <button className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-xl rounded-xl" onClick={() => handleDelete(r.id)}><TrashIcon className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </ModernTable>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}

export default ReceiptPage;
