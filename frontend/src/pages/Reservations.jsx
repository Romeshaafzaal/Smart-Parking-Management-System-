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
  const [useNewVehicle, setUseNewVehicle] = useState(false);
  const [form, setForm] = useState({
    vehicleID: '', slotID: '', startTime: '', endTime: '', paymentMethod: '',
  });
  const [newVehicleForm, setNewVehicleForm] = useState({
    plateNumber: '', vehicleType: 'Car', ownerName: '', phone: '',
  });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState(null);
  const [rates, setRates] = useState([]);

  const load = async () => {
    try {
      const endpoint = user?.role === 'admin'
        ? `${API}/reservations`
        : `${API}/reservations/my/${user?.userID}`;

      const [r, s, rt] = await Promise.all([
        axios.get(endpoint),
        axios.get(`${API}/slots`),
        axios.get(`${API}/rates`),
      ]);
      setReservations(r.data);
      setSlots(s.data.filter(sl => sl.status === 'Available'));
      setRates(rt.data);

      if (user?.role === 'admin') {
        const v = await axios.get(`${API}/vehicles`);
        setVehicles(v.data);
      } else {
        const v = await axios.get(`${API}/vehicles/my/${user?.userID}`);
        setVehicles(v.data);
      }
    } catch (e) {
      setToast({ msg: 'Failed to load data', type: 'error' });
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }
  }, [toast]);

  // Estimate fee dynamically
  useEffect(() => {
    if (!form.startTime || !form.endTime) { setEstimatedFee(null); return; }
    const hours = Math.max(1, Math.ceil((new Date(form.endTime) - new Date(form.startTime)) / 3600000));
    let vType = 'Car';
    if (useNewVehicle) {
      vType = newVehicleForm.vehicleType || 'Car';
    } else if (form.vehicleID) {
      const sel = vehicles.find(v => v.vehicleID === parseInt(form.vehicleID));
      vType = sel?.vehicleType || 'Car';
    }
    const rate = rates.find(r => r.vehicleType === vType);
    const pricePerHour = rate?.pricePerHour || 100;
    setEstimatedFee({ hours, total: hours * pricePerHour, rate: pricePerHour, vType });
  }, [form.startTime, form.endTime, form.vehicleID, useNewVehicle, newVehicleForm.vehicleType, rates, vehicles]);

  const addRes = async () => {
    if (!form.slotID || !form.startTime || !form.endTime) {
      setToast({ msg: 'Please fill all required fields', type: 'error' });
      return;
    }
    if (!useNewVehicle && !form.vehicleID) {
      setToast({ msg: 'Please select a vehicle or add a new one', type: 'error' });
      return;
    }
    if (useNewVehicle && !newVehicleForm.plateNumber) {
      setToast({ msg: 'Plate number is required for the new vehicle', type: 'error' });
      return;
    }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      setToast({ msg: 'End time must be after start time', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        slotID: parseInt(form.slotID),
        userID: user?.userID,
        startTime: form.startTime,
        endTime: form.endTime,
        paymentMethod: form.paymentMethod,
      };
      if (useNewVehicle) {
        payload.newVehicle = { ...newVehicleForm, ownerName: newVehicleForm.ownerName || user?.name };
      } else {
        payload.vehicleID = parseInt(form.vehicleID);
      }

      const { data } = await axios.post(`${API}/reservations`, payload);
      setToast({ msg: `✅ Reservation created! Fee: PKR ${data.fee}`, type: 'success' });
      setShowModal(false);
      resetForm();
      load();
    } catch (e) {
      setToast({ msg: e.response?.data?.error || 'Error creating reservation', type: 'error' });
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ vehicleID: '', slotID: '', startTime: '', endTime: '', paymentMethod: '' });
    setNewVehicleForm({ plateNumber: '', vehicleType: 'Car', ownerName: '', phone: '' });
    setUseNewVehicle(false);
    setEstimatedFee(null);
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this reservation?')) return;
    try {
      await axios.patch(`${API}/reservations/${id}/cancel`);
      setToast({ msg: 'Reservation cancelled', type: 'success' });
      load();
    } catch (e) {
      setToast({ msg: 'Error cancelling reservation', type: 'error' });
    }
  };

  const fmt = dt => dt ? new Date(dt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <div>
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}
      <div className="page-header">
        <div>
          <div className="page-title">
            {user?.role === 'admin' ? 'All' : 'My'} <span>Reservations</span>
          </div>
          {user?.role !== 'admin' && (
            <div className="page-sub">Your slot reservations and their payment status</div>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          + New Reservation
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                {user?.role === 'admin' && <th>User</th>}
                <th>Vehicle</th><th>Slot</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr><td colSpan={user?.role === 'admin' ? 8 : 7} style={{ textAlign: 'center', color: '#888' }}>
                  No reservations found
                </td></tr>
              ) : reservations.map(r => (
                <tr key={r.reservationID}>
                  <td>{r.reservationID}</td>
                  {user?.role === 'admin' && <td>{r.userName || '—'}</td>}
                  <td>{r.plateNumber || '—'}</td>
                  <td>{r.slotNumber || '—'}</td>
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
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-title">New Reservation</div>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>

            {/* Vehicle selection */}
            <div className="form-group">
              <label className="form-label">Vehicle *</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${!useNewVehicle ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setUseNewVehicle(false)}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${useNewVehicle ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setUseNewVehicle(true)}
                >
                  + Add New Vehicle
                </button>
              </div>

              {!useNewVehicle ? (
                <>
                  <select className="form-select" value={form.vehicleID}
                    onChange={e => setForm({ ...form, vehicleID: e.target.value })}>
                    <option value="">— Select your vehicle —</option>
                    {vehicles.length === 0
                      ? <option disabled>No vehicles yet — click "Add New Vehicle" above</option>
                      : vehicles.map(v => (
                        <option key={v.vehicleID} value={v.vehicleID}>
                          {v.plateNumber} — {v.vehicleType} {v.ownerName ? `(${v.ownerName})` : ''}
                        </option>
                      ))}
                  </select>
                  {vehicles.length === 0 && (
                    <p style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>
                      ⚠️ You have no registered vehicles. Click "Add New Vehicle" to register one now.
                    </p>
                  )}
                </>
              ) : (
                <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Plate Number *</label>
                      <input className="form-input" placeholder="LEA-1234"
                        value={newVehicleForm.plateNumber}
                        onChange={e => setNewVehicleForm({ ...newVehicleForm, plateNumber: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vehicle Type</label>
                      <select className="form-select" value={newVehicleForm.vehicleType}
                        onChange={e => setNewVehicleForm({ ...newVehicleForm, vehicleType: e.target.value })}>
                        <option>Car</option>
                        <option>Motorbike</option>
                        <option>Truck</option>
                        <option>Van</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Owner Name</label>
                      <input className="form-input" placeholder={user?.name}
                        value={newVehicleForm.ownerName}
                        onChange={e => setNewVehicleForm({ ...newVehicleForm, ownerName: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input className="form-input" placeholder="03001234567"
                        value={newVehicleForm.phone}
                        onChange={e => setNewVehicleForm({ ...newVehicleForm, phone: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Slot selection */}
            <div className="form-group">
              <label className="form-label">Available Slot *</label>
              <select className="form-select" value={form.slotID}
                onChange={e => setForm({ ...form, slotID: e.target.value })}>
                <option value="">— Select an available slot —</option>
                {slots.length === 0
                  ? <option disabled>No available slots at this time</option>
                  : slots.map(s => (
                    <option key={s.slotID} value={s.slotID}>
                      {s.slotNumber} — Floor {s.floorNumber}
                    </option>
                  ))}
              </select>
            </div>

            {/* Times */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Time *</label>
                <input className="form-input" type="datetime-local"
                  value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">End Time *</label>
                <input className="form-input" type="datetime-local"
                  value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>

            {/* Estimated fee */}
            {estimatedFee && (
              <div style={{ background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
                <div style={{ color: '#2b6cb0', fontWeight: 600, marginBottom: 4 }}>Estimated Parking Fee</div>
                <div style={{ color: '#2d3748' }}>
                  {estimatedFee.hours} hour(s) × PKR {estimatedFee.rate}/hr ({estimatedFee.vType})
                  = <strong>PKR {estimatedFee.total.toLocaleString()}</strong>
                </div>
              </div>
            )}

            {/* Payment method */}
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-select" value={form.paymentMethod}
                onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                <option value="">Pay Later (Pending — pay at desk)</option>
                <option value="Cash">💵 Cash (Pay Now)</option>
                <option value="Card">💳 Card (Pay Now)</option>
                <option value="Online">🌐 Online Transfer (Pay Now)</option>
              </select>
              <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                Unpaid reservations will appear in your Payments section.
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
              <button className="btn btn-primary" onClick={addRes} disabled={loading}>
                {loading ? 'Creating...' : 'Reserve Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}