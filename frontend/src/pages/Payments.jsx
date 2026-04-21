import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [toast, setToast] = useState(null);
  const [payModal, setPayModal] = useState(null); // { paymentID, amount }
  const [payMethod, setPayMethod] = useState('Card');
  const [paying, setPaying] = useState(false);
  const [markModal, setMarkModal] = useState(null); // admin: { paymentID, amount }
  const [markMethod, setMarkMethod] = useState('Cash');

  const load = () => {
    const endpoint = user?.role === 'admin'
      ? `${API}/payments`
      : `${API}/payments/my/${user?.userID}`;
    axios.get(endpoint).then(r => setPayments(r.data)).catch(() => {
      setToast({ msg: 'Failed to load payments', type: 'error' });
    });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }
  }, [toast]);

  // Admin: mark any payment as paid with method choice
  const markPaid = async () => {
    if (!markModal) return;
    try {
      await axios.patch(`${API}/payments/${markModal.paymentID}/pay`, { paymentMethod: markMethod });
      setToast({ msg: 'Payment marked as paid', type: 'success' });
      setMarkModal(null);
      load();
    } catch (e) {
      setToast({ msg: 'Error updating payment', type: 'error' });
    }
  };

  // User: pay online (card / online transfer)
  const payOnline = async () => {
    if (!payModal) return;
    setPaying(true);
    try {
      await axios.patch(`${API}/payments/${payModal.paymentID}/pay-online`, { paymentMethod: payMethod });
      setToast({ msg: `Payment of PKR ${(+payModal.amount).toLocaleString()} successful via ${payMethod}!`, type: 'success' });
      setPayModal(null);
      load();
    } catch (e) {
      setToast({ msg: e.response?.data?.error || 'Payment failed', type: 'error' });
    } finally { setPaying(false); }
  };

  const fmt = dt => dt ? new Date(dt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const paid    = payments.filter(p => p.status === 'Paid').reduce((a, b) => a + (+b.amount || 0), 0);
  const pending = payments.filter(p => p.status === 'Pending').reduce((a, b) => a + (+b.amount || 0), 0);

  // Helper: determine the "source" label of a payment
  const paymentSource = (p) => {
    if (p.fineID)        return `Fine #${p.fineID}`;
    if (p.reservationID) return `Reservation #${p.reservationID}`;
    if (p.recordID)      return `Record #${p.recordID}`;
    return '—';
  };

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
            {user?.role === 'admin' ? 'Payment' : 'My Payment'} <span>History</span>
          </div>
          {user?.role !== 'admin' && (
            <div className="page-sub">Payments for your reservations and fines</div>
          )}
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <div className="stat-card green">
          <div className="stat-label">Total Paid</div>
          <div className="stat-value green">PKR {paid.toLocaleString()}</div>
          <div className="stat-sub">{payments.filter(p => p.status === 'Paid').length} transactions</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Pending</div>
          <div className="stat-value yellow">PKR {pending.toLocaleString()}</div>
          <div className="stat-sub">{payments.filter(p => p.status === 'Pending').length} awaiting payment</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Cash Payments</div>
          <div className="stat-value blue">{payments.filter(p => p.paymentMethod === 'Cash').length}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Card / Online</div>
          <div className="stat-value red">
            {payments.filter(p => p.paymentMethod === 'Card' || p.paymentMethod === 'Online').length}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                {user?.role === 'admin' && <th>User</th>}
                <th>Plate</th>
                <th>Source</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={user?.role === 'admin' ? 9 : 8} style={{ textAlign: 'center', color: '#888' }}>
                    No payments found
                  </td>
                </tr>
              ) : payments.map(p => (
                <tr key={p.paymentID}>
                  <td>{p.paymentID}</td>
                  {user?.role === 'admin' && <td>{p.userName || '—'}</td>}
                  <td>{p.plateNumber || '—'}</td>
                  <td>
                    <span style={{ fontSize: 12, color: '#718096' }}>{paymentSource(p)}</span>
                  </td>
                  <td><strong>PKR {(+p.amount).toLocaleString()}</strong></td>
                  <td>
                    {p.paymentMethod === 'Pending'
                      ? <span style={{ color: '#a0aec0' }}>—</span>
                      : p.paymentMethod}
                  </td>
                  <td>{fmt(p.paymentTime)}</td>
                  <td>
                    <span className={`badge badge-${p.status?.toLowerCase()}`}>{p.status}</span>
                  </td>
                  <td>
                    {/* Admin: can mark as paid with method choice */}
                    {p.status === 'Pending' && user?.role === 'admin' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => { setMarkModal({ paymentID: p.paymentID, amount: p.amount }); setMarkMethod('Cash'); }}
                      >
                        Mark Paid
                      </button>
                    )}
                    {/* User: can pay online */}
                    {p.status === 'Pending' && user?.role !== 'admin' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setPayModal({ paymentID: p.paymentID, amount: p.amount }); setPayMethod('Card'); }}
                      >
                        💳 Pay Now
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin: Mark Paid Modal with method choice */}
      {markModal && (
        <div className="modal-overlay" onClick={() => setMarkModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Mark Payment as Paid</div>
              <button className="modal-close" onClick={() => setMarkModal(null)}>✕</button>
            </div>

            <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#276749' }}>Payment Amount</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#22543d' }}>
                PKR {(+markModal.amount).toLocaleString()}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method Received</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {['Cash', 'Card', 'Online'].map(m => (
                  <label key={m} style={{
                    flex: 1, minWidth: 100, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px',
                    border: `2px solid ${markMethod === m ? '#48bb78' : '#e2e8f0'}`,
                    borderRadius: 8, cursor: 'pointer',
                    background: markMethod === m ? '#f0fff4' : '#fff',
                    transition: 'all 0.15s'
                  }}>
                    <input type="radio" name="markMethod" value={m}
                      checked={markMethod === m} onChange={() => setMarkMethod(m)}
                      style={{ accentColor: '#48bb78' }} />
                    {m === 'Cash' ? '💵 Cash' : m === 'Card' ? '💳 Card' : '🌐 Online'}
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setMarkModal(null)}>Cancel</button>
              <button className="btn btn-success" onClick={markPaid}>Confirm Paid</button>
            </div>
          </div>
        </div>
      )}

      {/* User: Pay Online Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={() => !paying && setPayModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">💳 Pay Now</div>
              <button className="modal-close" onClick={() => !paying && setPayModal(null)}>✕</button>
            </div>

            <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#276749' }}>Amount to Pay</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#22543d' }}>
                PKR {(+payModal.amount).toLocaleString()}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {['Card', 'Cash', 'Online'].map(m => (
                  <label key={m} style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                    border: `2px solid ${payMethod === m ? '#4299e1' : '#e2e8f0'}`,
                    borderRadius: 8, cursor: 'pointer',
                    background: payMethod === m ? '#ebf8ff' : '#fff',
                    transition: 'all 0.15s'
                  }}>
                    <input type="radio" name="payMethod" value={m}
                      checked={payMethod === m} onChange={() => setPayMethod(m)}
                      style={{ accentColor: '#4299e1' }} />
                    {m === 'Card' ? '💳 Card' : m === 'Cash' ? '💵 Cash' : '🌐 Online'}
                  </label>
                ))}
              </div>
            </div>

            {(payMethod === 'Card' || payMethod === 'Online') && (
              <div style={{ background: '#fffbeb', border: '1px solid #f6e05e', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#744210', marginBottom: 8 }}>
                ℹ️ In production, a secure payment gateway (Stripe / PayFast / JazzCash) would process this. For this demo, clicking Confirm will mark it as paid.
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setPayModal(null)} disabled={paying}>Cancel</button>
              <button className="btn btn-primary" onClick={payOnline} disabled={paying}>
                {paying ? 'Processing...' : `Confirm — PKR ${(+payModal.amount).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}