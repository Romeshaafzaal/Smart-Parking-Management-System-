import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

function Badge({ status }) {
  const cls = status?.toLowerCase().replace(' ', '-');
  return <span className={`badge badge-${cls}`}>{status}</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [payments, setPayments] = useState([]);
  const [records, setRecords] = useState([]);
  const [floor, setFloor] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/slots`),
      axios.get(`${API}/vehicles`),
      axios.get(`${API}/payments`),
      axios.get(`${API}/records`),
    ]).then(([s, v, p, r]) => {
      setSlots(s.data); setVehicles(v.data);
      setPayments(p.data); setRecords(r.data);
      setLoading(false);
    });
  }, []);

  const avail = slots.filter(s => s.status === 'Available').length;
  const occ   = slots.filter(s => s.status === 'Occupied').length;
  const rev   = payments.filter(p => p.status === 'Paid').reduce((a, b) => a + (+b.amount || 0), 0);
  const floors = [...new Set(slots.map(s => s.floorNumber))].sort();
  const floorSlots = slots.filter(s => s.floorNumber === floor);

  const fmt = (dt) => dt ? new Date(dt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  if (loading) return <div className="loading"><div className="spinner"></div>Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard <span>Overview</span></div>
          <div className="page-sub">Welcome back, {user?.name}</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-label">Available Slots</div>
          <div className="stat-value green">{avail}</div>
          <div className="stat-sub">Ready to park</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Occupied Slots</div>
          <div className="stat-value red">{occ}</div>
          <div className="stat-sub">Currently parked</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value yellow">PKR {rev.toLocaleString()}</div>
          <div className="stat-sub">From payments</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Total Vehicles</div>
          <div className="stat-value blue">{vehicles.length}</div>
          <div className="stat-sub">Registered</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Live Parking Map</div>
          <div className="floor-tabs">
            {floors.map(f => (
              <button key={f} className={`floor-tab ${f === floor ? 'active' : ''}`} onClick={() => setFloor(f)}>
                Floor {f}
              </button>
            ))}
          </div>
        </div>
        <div className="slot-grid">
          {floorSlots.map(s => (
            <div key={s.slotID} className={`slot slot-${s.status.toLowerCase()}`} title={`${s.slotNumber} — ${s.status}`}>
              🚗<span style={{fontSize:9}}>{s.slotNumber}</span>
            </div>
          ))}
        </div>
        <div className="legend">
          <div className="legend-item"><div className="legend-dot" style={{background:'#9ae6b4'}}></div>Available</div>
          <div className="legend-item"><div className="legend-dot" style={{background:'#feb2b2'}}></div>Occupied</div>
          <div className="legend-item"><div className="legend-dot" style={{background:'#faf089'}}></div>Reserved</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">Recent Entries</div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Vehicle</th><th>Slot</th><th>Entry</th><th>Fee</th></tr></thead>
              <tbody>
                {records.slice(0,5).map(r => (
                  <tr key={r.recordID}>
                    <td>{r.plateNumber}</td><td>{r.slotNumber}</td>
                    <td>{fmt(r.entryTime)}</td>
                    <td>{r.fee ? `PKR ${r.fee}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Recent Payments</div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Time</th></tr></thead>
              <tbody>
                {payments.slice(0,5).map(p => (
                  <tr key={p.paymentID}>
                    <td><strong>PKR {p.amount}</strong></td>
                    <td>{p.paymentMethod}</td>
                    <td><Badge status={p.status} /></td>
                    <td>{fmt(p.paymentTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}