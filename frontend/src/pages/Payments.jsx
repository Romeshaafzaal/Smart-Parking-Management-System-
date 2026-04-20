import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);

  const load = () => axios.get(`${API}/payments`).then(r => setPayments(r.data));
  useEffect(() => { load(); }, []);

  const markPaid = async (id) => {
    await axios.patch(`${API}/payments/${id}/pay`); load();
  };

  const fmt = dt => dt ? new Date(dt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const paid = payments.filter(p => p.status === 'Paid').reduce((a,b) => a+(+b.amount||0), 0);
  const pending = payments.filter(p => p.status === 'Pending').reduce((a,b) => a+(+b.amount||0), 0);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Payment <span>History</span></div></div>
      </div>
      <div className="stats-grid" style={{gridTemplateColumns:'1fr 1fr 1fr 1fr'}}>
        <div className="stat-card green"><div className="stat-label">Total Paid</div><div className="stat-value green">PKR {paid.toLocaleString()}</div></div>
        <div className="stat-card yellow"><div className="stat-label">Pending</div><div className="stat-value yellow">PKR {pending.toLocaleString()}</div></div>
        <div className="stat-card blue"><div className="stat-label">Cash</div><div className="stat-value blue">{payments.filter(p=>p.paymentMethod==='Cash').length}</div></div>
        <div className="stat-card red"><div className="stat-label">Card/Online</div><div className="stat-value red">{payments.filter(p=>p.paymentMethod!=='Cash').length}</div></div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Plate</th><th>Amount</th><th>Method</th><th>Time</th><th>Status</th>
              {user?.role==='admin' && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.paymentID}>
                  <td>{p.paymentID}</td>
                  <td>{p.plateNumber || '—'}</td>
                  <td><strong>PKR {p.amount}</strong></td>
                  <td>{p.paymentMethod}</td>
                  <td>{fmt(p.paymentTime)}</td>
                  <td><span className={`badge badge-${p.status?.toLowerCase()}`}>{p.status}</span></td>
                  {user?.role==='admin' && (
                    <td>{p.status==='Pending' && <button className="btn btn-success btn-sm" onClick={()=>markPaid(p.paymentID)}>Mark Paid</button>}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}