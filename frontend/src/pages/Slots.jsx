import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return <div className={`toast ${type}`}>{type === 'success' ? '✅' : '❌'} {msg}</div>;
}

function Badge({ status }) {
  const cls = status?.toLowerCase();
  return <span className={`badge badge-${cls}`}>{status}</span>;
}

export default function Slots() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ slotNumber: '', floorNumber: 1 });
  const [toast, setToast] = useState(null);

  const load = () => axios.get(`${API}/slots`).then(r => setSlots(r.data));
  useEffect(() => { load(); }, []);

  const filtered = slots.filter(s =>
    (!search || s.slotNumber.toLowerCase().includes(search.toLowerCase())) &&
    (!filter || s.status === filter)
  );

  const addSlot = async () => {
    if (!form.slotNumber) return;
    try {
      await axios.post(`${API}/slots`, form);
      setToast({ msg: 'Slot added!', type: 'success' });
      setShowModal(false); setForm({ slotNumber: '', floorNumber: 1 }); load();
    } catch (e) { setToast({ msg: e.response?.data?.error || 'Error', type: 'error' }); }
  };

  const deleteSlot = async (id) => {
    if (!window.confirm('Delete this slot?')) return;
    await axios.delete(`${API}/slots/${id}`);
    setToast({ msg: 'Slot deleted', type: 'success' }); load();
  };

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><div className="page-title">Parking <span>Slots</span></div></div>
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Slot</button>
        )}
      </div>
      <div className="card">
        <div className="search-bar">
          <input className="form-input" placeholder="Search slot number..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Status</option>
            <option>Available</option><option>Occupied</option><option>Reserved</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Slot ID</th><th>Number</th><th>Floor</th><th>Status</th><th>Reserved</th>
              {user?.role === 'admin' && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.slotID}>
                  <td>{s.slotID}</td>
                  <td><strong>{s.slotNumber}</strong></td>
                  <td>Floor {s.floorNumber}</td>
                  <td><Badge status={s.status} /></td>
                  <td><Badge status={s.isReserved ? 'Reserved' : 'Available'} /></td>
                  {user?.role === 'admin' && (
                    <td><button className="btn btn-danger btn-sm" onClick={() => deleteSlot(s.slotID)}>Delete</button></td>
                  )}
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
              <div className="modal-title">Add Parking Slot</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Slot Number</label>
                <input className="form-input" placeholder="e.g. A101"
                  value={form.slotNumber} onChange={e => setForm({...form, slotNumber: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Floor</label>
                <input className="form-input" type="number" min="1"
                  value={form.floorNumber} onChange={e => setForm({...form, floorNumber: +e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addSlot}>Add Slot</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}