import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

export default function Vehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ plateNumber: '', vehicleType: 'Car', ownerName: '', phone: '', userID: '' });
  const [toast, setToast] = useState(null);

  const load = async () => {
    try {
      if (user?.role === 'admin') {
        const [v, u] = await Promise.all([
          axios.get(`${API}/vehicles`),
          axios.get(`${API}/users`),
        ]);
        setVehicles(v.data);
        setUsers(u.data);
      } else {
        // Regular user sees only their own vehicles (incl. those added via reservations)
        const v = await axios.get(`${API}/vehicles/my/${user?.userID}`);
        setVehicles(v.data);
        setUsers([]);
      }
    } catch (e) {
      setToast({ msg: 'Failed to load vehicles', type: 'error' });
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = vehicles.filter(v =>
    !search ||
    v.plateNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.ownerName?.toLowerCase().includes(search.toLowerCase())
  );

  // Admin only: add vehicle
  const addVehicle = async () => {
    if (!form.plateNumber) {
      setToast({ msg: 'Plate number is required', type: 'error' });
      return;
    }
    try {
      await axios.post(`${API}/vehicles`, form);
      setToast({ msg: 'Vehicle added!', type: 'success' });
      setShowModal(false);
      setForm({ plateNumber: '', vehicleType: 'Car', ownerName: '', phone: '', userID: '' });
      load();
    } catch (e) {
      setToast({ msg: e.response?.data?.error || 'Error adding vehicle', type: 'error' });
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return;
    try {
      await axios.delete(`${API}/vehicles/${id}`);
      setToast({ msg: 'Vehicle deleted', type: 'success' });
      load();
    } catch (e) {
      setToast({ msg: 'Error deleting vehicle', type: 'error' });
    }
  };

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }
  }, [toast]);

  return (
    <div>
      {toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.msg}</div>}
      <div className="page-header">
        <div>
          <div className="page-title">
            {user?.role === 'admin' ? 'Registered' : 'My'} <span>Vehicles</span>
          </div>
          {user?.role !== 'admin' && (
            <div className="page-sub">Vehicles registered under your account (added via Reservations)</div>
          )}
        </div>
        {/* Only admin can add vehicles from this page */}
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Vehicle</button>
        )}
      </div>

      <div className="card">
        <div className="search-bar">
          <input className="form-input" placeholder="Search plate or owner..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Info banner for regular users */}
        {user?.role !== 'admin' && (
          <div style={{ background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: 8, padding: '10px 14px', margin: '0 0 12px 0', fontSize: 13, color: '#2b6cb0' }}>
            💡 To add a vehicle, go to <strong>Reservations</strong> and create a new reservation — your vehicle will be registered automatically.
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Plate</th><th>Type</th><th>Owner</th><th>Phone</th>
                {user?.role === 'admin' && <th>User</th>}
                {user?.role === 'admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={user?.role === 'admin' ? 7 : 5} style={{ textAlign: 'center', color: '#888' }}>
                  {user?.role === 'admin'
                    ? 'No vehicles found'
                    : 'No vehicles found. Make a reservation to register your first vehicle.'}
                </td></tr>
              ) : filtered.map(v => (
                <tr key={v.vehicleID}>
                  <td>{v.vehicleID}</td>
                  <td><strong>{v.plateNumber}</strong></td>
                  <td><span className={`badge badge-${v.vehicleType?.toLowerCase()}`}>{v.vehicleType}</span></td>
                  <td>{v.ownerName || '—'}</td>
                  <td>{v.phone || '—'}</td>
                  {user?.role === 'admin' && <td>{v.userName || '—'}</td>}
                  {user?.role === 'admin' && (
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => del(v.vehicleID)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vehicle Modal - Admin only */}
      {showModal && user?.role === 'admin' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add Vehicle</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Plate Number *</label>
                <input className="form-input" placeholder="LEA-1234"
                  value={form.plateNumber} onChange={e => setForm({ ...form, plateNumber: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })}>
                  <option>Car</option><option>Motorbike</option><option>Truck</option><option>Van</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Owner Name</label>
                <input className="form-input" placeholder="Full name"
                  value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" placeholder="03001234567"
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Assign User</label>
              <select className="form-select" value={form.userID} onChange={e => setForm({ ...form, userID: e.target.value })}>
                <option value="">None</option>
                {users.map(u => <option key={u.userID} value={u.userID}>{u.name} ({u.email})</option>)}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addVehicle}>Add Vehicle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}