import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

export default function Fines() {
  const { user } = useAuth();
  const [fines, setFines] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ recordID: '', reason: '', amount: '' });

  const load = () => axios.get(`${API}/fines`).then(r => setFines(r.data));
  useEffect(() => { load(); }, []);

  const issueFine = async () => {
    await axios.post(`${API}/fines`, form); setShowModal(false); load();
  };

  const payFine = async (id) => {
    await axios.patch(`${API}/fines/${id}/pay`); load();
  };

  const fmt = dt => dt ? new Date(dt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Issued <span>Fines</span></div></div>
        {user?.role === 'admin' && (
          <button className="btn btn-danger" onClick={() => setShowModal(true)}>+ Issue Fine</button>
        )}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Plate</th><th>Reason</th><th>Amount</th><th>Issued</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {fines.map(f => (
                <tr key={f.fineID}>
                  <td>{f.fineID}</td>
                  <td>{f.plateNumber || '—'}</td>
                  <td>{f.reason}</td>
                  <td><strong>PKR {f.amount}</strong></td>
                  <td>{fmt(f.issuedAt)}</td>
                  <td><span className={`badge badge-${f.status?.toLowerCase()}`}>{f.status}</span></td>
                  <td>{f.status === 'Unpaid' && <button className="btn btn-success btn-sm" onClick={() => payFine(f.fineID)}>Pay Fine</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Issue Fine</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Parking Record ID</label>
              <input className="form-input" type="number" placeholder="Record ID"
                value={form.recordID} onChange={e => setForm({...form, recordID: e.target.value})} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Reason</label>
                <input className="form-input" placeholder="e.g. Overstay"
                  value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (PKR)</label>
                <input className="form-input" type="number" placeholder="500"
                  value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={issueFine}>Issue Fine</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}