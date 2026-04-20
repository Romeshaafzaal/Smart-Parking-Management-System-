import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

function Badge({ status }) {
  return <span className={`badge badge-${status?.toLowerCase()}`}>{status}</span>;
}

export default function Reservations() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [slots, setSlots] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ vehicleID: '', slotID: '', startTime: '', endTime: '' });
  const [toast, setToast] = useState(null);

  const load = async () => {
    const endpoint = user?.role === 'admin'
      ? `${API}/reservations`
      : `${API}/reservations/my/${user?.userID}`;
    const [r, s, v] = await Promise.all([
      axios.get(endpoint),
      axios.get(`${API}/slots`),
      axios.get(`${API}/vehicles`),
    ]);
    setReservations(r.data);
    setSlots(s.data.filter(s => s.status === 'Available'));
    setVehicles(user?.role === 'admin' ? v.data : v.data.filter(v => v.userID === user?.userID));
  };

  useEffect(() => { load(); }, []);

  const addRes = async () => {
    try {
      await axios.post(`${API}/reservations`, { ...form, userID: user?.userID });
      setToast({ msg: 'Reservation created!', type: 'success' });
      setShowModal(false); load();
    } catch (e) { setToast({ msg: 'Error creating reservation', type: 'error' }); }
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this reservation?')) return;
    await axios.patch(`${API}/reservations/${id}/cancel`);
    setToast({ msg: 'Reservation cancelled', type: 'success' }); load();
  };

  const fmt = dt => dt ? new Date(dt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <div>
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      <div className="page-header">
        <div><div className="page-title">Slot <span>Reservations</span></div></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Reservation</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Vehicle</th><th>Slot</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {reservations.map(r => (
                <tr key={r.reservationID}>
                  <td>{r.reservationID}</td>
                  <td>{r.plateNumber}</td>
                  <td>{r.slotNumber}</td>
                  <td>{fmt(r.startTime)}</td>
                  <td>{fmt(r.endTime)}</td>
                  <td><Badge status={r.status} /></td>
                  <td>
                    {r.status === 'Active' && (
                      <button className="btn btn-danger btn-sm" onClick={() => cancel(r.reservationID)}>Cancel</button>
                    )}
                  </td>
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
              <div className="modal-title">New Reservation</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle</label>
              <select className="form-select" value={form.vehicleID} onChange={e => setForm({...form, vehicleID: e.target.value})}>
                <option value="">Select vehicle</option>
                {vehicles.map(v => <option key={v.vehicleID} value={v.vehicleID}>{v.plateNumber} — {v.ownerName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Slot (Available only)</label>
              <select className="form-select" value={form.slotID} onChange={e => setForm({...form, slotID: e.target.value})}>
                <option value="">Select slot</option>
                {slots.map(s => <option key={s.slotID} value={s.slotID}>{s.slotNumber} — Floor {s.floorNumber}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input className="form-input" type="datetime-local"
                  value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input className="form-input" type="datetime-local"
                  value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addRes}>Reserve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}