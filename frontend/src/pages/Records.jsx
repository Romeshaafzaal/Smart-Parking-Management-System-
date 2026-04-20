import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function Records() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [slots, setSlots] = useState([]);
  const [showEntry, setShowEntry] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [entryForm, setEntryForm] = useState({ vehicleID: '', slotID: '' });
  const [exitForm, setExitForm] = useState({ recordID: '', paymentMethod: 'Cash' });
  const [toast, setToast] = useState(null);

  const load = async () => {
    const [r, v, s] = await Promise.all([
      axios.get(`${API}/records`),
      axios.get(`${API}/vehicles`),
      axios.get(`${API}/slots`),
    ]);
    setRecords(r.data); setVehicles(v.data);
    setSlots(s.data.filter(sl => sl.status === 'Available'));
  };
  useEffect(() => { load(); }, []);

  const recordEntry = async () => {
    try {
      await axios.post(`${API}/records/entry`, entryForm);
      setToast({ msg: 'Entry recorded!', type: 'success' });
      setShowEntry(false); load();
    } catch (e) { setToast({ msg: 'Error', type: 'error' }); }
  };

  const recordExit = async () => {
    try {
      const { data } = await axios.post(`${API}/records/exit/${exitForm.recordID}`, { paymentMethod: exitForm.paymentMethod });
      setToast({ msg: `Exit processed! Fee: PKR ${data.fee}`, type: 'success' });
      setShowExit(false); load();
    } catch (e) { setToast({ msg: 'Error processing exit', type: 'error' }); }
  };

  const fmt = dt => dt ? new Date(dt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const duration = (entry, exit) => {
    if (!entry || !exit) return 'Active';
    const h = Math.ceil((new Date(exit) - new Date(entry)) / 3600000);
    return `${h}h`;
  };

  return (
    <div>
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      <div className="page-header">
        <div><div className="page-title">Parking <span>Records</span></div></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-primary" onClick={() => setShowEntry(true)}>+ Vehicle Entry</button>
          <button className="btn btn-outline" onClick={() => setShowExit(true)}>Vehicle Exit</button>
        </div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Plate</th><th>Type</th><th>Slot</th><th>Entry</th><th>Exit</th><th>Duration</th><th>Fee</th></tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.recordID}>
                  <td>{r.recordID}</td>
                  <td><strong>{r.plateNumber}</strong></td>
                  <td>{r.vehicleType}</td>
                  <td>{r.slotNumber}</td>
                  <td>{fmt(r.entryTime)}</td>
                  <td>{fmt(r.exitTime)}</td>
                  <td>{duration(r.entryTime, r.exitTime)}</td>
                  <td>{r.fee ? `PKR ${r.fee}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showEntry && (
        <div className="modal-overlay" onClick={() => setShowEntry(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Vehicle Entry</div>
              <button className="modal-close" onClick={() => setShowEntry(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle</label>
              <select className="form-select" value={entryForm.vehicleID} onChange={e => setEntryForm({...entryForm, vehicleID: e.target.value})}>
                <option value="">Select vehicle</option>
                {vehicles.map(v => <option key={v.vehicleID} value={v.vehicleID}>{v.plateNumber} — {v.ownerName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Available Slot</label>
              <select className="form-select" value={entryForm.slotID} onChange={e => setEntryForm({...entryForm, slotID: e.target.value})}>
                <option value="">Select slot</option>
                {slots.map(s => <option key={s.slotID} value={s.slotID}>{s.slotNumber} — Floor {s.floorNumber}</option>)}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowEntry(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={recordEntry}>Record Entry</button>
            </div>
          </div>
        </div>
      )}

      {showExit && (
        <div className="modal-overlay" onClick={() => setShowExit(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Vehicle Exit</div>
              <button className="modal-close" onClick={() => setShowExit(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Record ID</label>
              <input className="form-input" type="number" placeholder="Enter parking record ID"
                value={exitForm.recordID} onChange={e => setExitForm({...exitForm, recordID: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-select" value={exitForm.paymentMethod} onChange={e => setExitForm({...exitForm, paymentMethod: e.target.value})}>
                <option>Cash</option><option>Card</option><option>Online</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowExit(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={recordExit}>Process Exit & Pay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}