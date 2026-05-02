import React, { useState, useEffect } from 'react';

import { API_URL as API_BASE } from '../api/config';

function PartyMigrationModal({ onClose, onImportSuccess }) {
  const [previewData, setPreviewData] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchPreview();
  }, []);

  async function fetchPreview() {
    try {
      const res = await fetch(`${API_BASE}/parties/migrate/preview`);
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
        // Select all by default
        setSelectedIndices(new Set(data.map((_, i) => i)));
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  const handleToggleSelect = (index) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedIndices(newSet);
  };

  const handleToggleAll = (e) => {
    if (e.target.checked) setSelectedIndices(new Set(previewData.map((_, i) => i)));
    else setSelectedIndices(new Set());
  };

  const handleImport = async () => {
    if (selectedIndices.size === 0) return alert('No parties selected for import.');
    
    setImporting(true);
    const partiesToImport = previewData.filter((_, i) => selectedIndices.has(i));

    try {
      const res = await fetch(`${API_BASE}/parties/migrate/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parties: partiesToImport })
      });
      if (res.ok) {
        const result = await res.json();
        alert(result.message);
        onImportSuccess();
      } else {
        const err = await res.json();
        alert('Import failed: ' + err.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting during import');
    }
    setImporting(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal parties-modal" style={{ width: '800px', maxWidth: '90vw' }}>
        <div className="modal-header">
          <h2>📥 Import Existing Parties</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p>
            The system found these unique names in existing Paddy Inward and Sales records 
            that don't exist in the Parties Master yet.
          </p>
          
          {loading ? (
            <p>Loading preview...</p>
          ) : previewData.length === 0 ? (
            <p>All existing records are already in the master, no new names found.</p>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <input 
                        type="checkbox" 
                        checked={selectedIndices.size === previewData.length && previewData.length > 0} 
                        onChange={handleToggleAll} 
                      />
                    </th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Mobile</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((p, i) => (
                    <tr key={i}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedIndices.has(i)} 
                          onChange={() => handleToggleSelect(i)} 
                        />
                      </td>
                      <td>{p.name}</td>
                      <td><span className={`badge ${p.type.toLowerCase()}`}>{p.type}</span></td>
                      <td>{p.mobile_number || '-'}</td>
                      <td>{p.address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={importing}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={handleImport} 
            disabled={importing || previewData.length === 0 || selectedIndices.size === 0}
          >
            {importing ? 'Importing...' : `Import ${selectedIndices.size} Parties`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PartyMigrationModal;
