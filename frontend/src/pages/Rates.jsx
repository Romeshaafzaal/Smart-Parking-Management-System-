import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function Rates() {
  const [rates, setRates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ vehicleType: '', pricePerHour: '' });

  const load = () => axios.get(`${API}/rates`).then(r => setRates(r.data));
  useEffect(() => { load(); }, []);

  const addRate = async () => {
    await axios.post(`${API}/rates`, form); setShowModal(false); load();
  };

  const del = async (id) => {
    if (!window.confirm('Delete rate?')) return;
    await axios.delete(`${API}/rates/${id}`); load();
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Rates & <span>Pricing</span></div></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Rate</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Vehicle Type</th><th>Price Per Hour (PKR)</th><th>Actions</th></tr></thead>
            <tbody>
              {rates.map(r => (
                <tr key={r.rateID}>
                  <td>{r.rateID}</td>
                  <td><strong>{r.vehicleType}</strong></td>
                  <td>PKR {r.pricePerHour}/hr</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => del(r.rateID)}>Delete</button></td>
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
              <div className="modal-title">Add Rate</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vehicle Type</label>
                <input className="form-input" placeholder="Car"
                  value={form.vehicleType} onChange={e => setForm({...form, vehicleType: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Price Per Hour (PKR)</label>
                <input className="form-input" type="number"
                  value={form.pricePerHour} onChange={e => setForm({...form, pricePerHour: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addRate}>Add Rate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}