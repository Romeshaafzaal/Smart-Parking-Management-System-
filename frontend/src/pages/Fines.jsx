import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

export default function Fines() {
  const { user } = useAuth();
  const [fines, setFines] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userVehicles, setUserVehicles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [issueMode, setIssueMode] = useState('direct'); // 'direct' | 'record'
  const [form, setForm] = useState({
    // direct mode
    targetUserID: '', vehicleID: '',
    // record mode
    recordID: '',
    // shared
    reason: '', amount: '',
  });
  const [toast, setToast] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payMethod, setPayMethod] = useState('Cash');
  const [paying, setPaying] = useState(false);

  const load = () => {
    const endpoint = user?.role === 'admin'
      ? `${API}/fines`
      : `${API}/fines/my/${user?.userID}`;
    axios.get(endpoint).then(r => setFines(r.data)).catch(() =>
      setToast({ msg: 'Failed to load fines', type: 'error' })
    );
  };

  const loadUsers = async () => {
    if (user?.role === 'admin') {
      try {
        const r = await axios.get(`${API}/users`);
        setAllUsers(r.data);
      } catch {}
    }
  };

  useEffect(() => { load(); loadUsers(); }, []);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }
  }, [toast]);

  // When admin selects a user in direct mode, fetch their vehicles
  useEffect(() => {
    if (issueMode === 'direct' && form.targetUserID) {
      axios.get(`${API}/vehicles/my/${form.targetUserID}`)
        .then(r => setUserVehicles(r.data))
        .catch(() => setUserVehicles([]));
    } else {
      setUserVehicles([]);
    }
  }, [form.targetUserID, issueMode]);

  const issueFine = async () => {
    if (!form.reason || !form.amount) {
      setToast({ msg: 'Reason and amount are required', type: 'error' });
      return;
    }
    try {
      const payload = { reason: form.reason, amount: form.amount };
      if (issueMode === 'record') {
        if (!form.recordID) { setToast({ msg: 'Record ID is required', type: 'error' }); return; }
        payload.recordID = form.recordID;
      } else {
        if (!form.targetUserID) { setToast({ msg: 'Please select a user', type: 'error' }); return; }
        payload.userID = form.targetUserID;
        if (form.vehicleID) payload.vehicleID = form.vehicleID;
      }

      await axios.post(`${API}/fines`, payload);
      setToast({ msg: 'Fine issued successfully', type: 'success' });
      setShowModal(false);
      resetForm();
      load();
    } catch (e) {
      setToast({ msg: e.response?.data?.error || 'Error issuing fine', type: 'error' });
    }
  };

  const resetForm = () => {
    setForm({ targetUserID: '', vehicleID: '', recordID: '', reason: '', amount: '' });
    setUserVehicles([]);
  };

  const payFine = async () => {
    if (!payModal) return;
    setPaying(true);
    try {
      await axios.patch(`${API}/fines/${payModal.fineID}/pay`, { paymentMethod: payMethod });
      setToast({ msg: `Fine paid successfully via ${payMethod}!`, type: 'success' });
      setPayModal(null);
      load();
    } catch (e) {
      setToast({ msg: e.response?.data?.error || 'Error paying fine', type: 'error' });
    } finally { setPaying(false); }
  };

  const fmt = dt => dt ? new Date(dt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const totalUnpaid = fines.filter(f => f.status === 'Unpaid').reduce((a, b) => a + (+b.amount || 0), 0);
  const totalPaid = fines.filter(f => f.status === 'Paid').reduce((a, b) => a + (+b.amount || 0), 0);

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
            {user?.role === 'admin' ? 'Issued' : 'My'} <span>Fines</span>
          </div>
          {user?.role !== 'admin' && (
            <div className="page-sub">Fines issued to your account</div>
          )}
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-danger" onClick={() => { resetForm(); setShowModal(true); }}>
            + Issue Fine
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="stat-card red">
          <div className="stat-label">Unpaid Fines</div>
          <div className="stat-value red">{fines.filter(f => f.status === 'Unpaid').length}</div>
          <div className="stat-sub">PKR {totalUnpaid.toLocaleString()} outstanding</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Paid Fines</div>
          <div className="stat-value green">{fines.filter(f => f.status === 'Paid').length}</div>
          <div className="stat-sub">PKR {totalPaid.toLocaleString()} collected</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Total Fines</div>
          <div className="stat-value blue">{fines.length}</div>
          <div className="stat-sub">All time</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                {user?.role === 'admin' && <th>User</th>}
                <th>Plate</th><th>Reason</th><th>Amount</th><th>Issued</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {fines.length === 0 ? (
                <tr><td colSpan={user?.role === 'admin' ? 8 : 7} style={{ textAlign: 'center', color: '#888' }}>
                  {user?.role === 'admin' ? 'No fines issued yet' : '🎉 No fines on your account'}
                </td></tr>
              ) : fines.map(f => (
                <tr key={f.fineID}>
                  <td>{f.fineID}</td>
                  {user?.role === 'admin' && <td>{f.userName || '—'}</td>}
                  <td>{f.plateNumber || '—'}</td>
                  <td>{f.reason}</td>
                  <td><strong>PKR {(+f.amount).toLocaleString()}</strong></td>
                  <td>{fmt(f.issuedAt)}</td>
                  <td><span className={`badge badge-${f.status?.toLowerCase()}`}>{f.status}</span></td>
                  <td>
                    {f.status === 'Unpaid' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => { setPayModal({ fineID: f.fineID, amount: f.amount }); setPayMethod('Cash'); }}
                      >
                        Pay Fine
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Fine Modal (admin only) */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title">Issue Fine</div>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                className={`btn btn-sm ${issueMode === 'direct' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setIssueMode('direct')}
              >
                By User / Vehicle
              </button>
              <button
                type="button"
                className={`btn btn-sm ${issueMode === 'record' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setIssueMode('record')}
              >
                By Parking Record ID
              </button>
            </div>

            {issueMode === 'direct' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Select User *</label>
                  <select className="form-select" value={form.targetUserID}
                    onChange={e => setForm({ ...form, targetUserID: e.target.value, vehicleID: '' })}>
                    <option value="">— Select user —</option>
                    {allUsers.filter(u => u.role !== 'admin').map(u => (
                      <option key={u.userID} value={u.userID}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                {form.targetUserID && (
                  <div className="form-group">
                    <label className="form-label">Vehicle (optional)</label>
                    <select className="form-select" value={form.vehicleID}
                      onChange={e => setForm({ ...form, vehicleID: e.target.value })}>
                      <option value="">— No specific vehicle —</option>
                      {userVehicles.map(v => (
                        <option key={v.vehicleID} value={v.vehicleID}>
                          {v.plateNumber} ({v.vehicleType})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <div className="form-group">
                <label className="form-label">Parking Record ID *</label>
                <input className="form-input" type="number" placeholder="Find from Parking Records page"
                  value={form.recordID} onChange={e => setForm({ ...form, recordID: e.target.value })} />
                <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                  Find the Record ID from the Parking Records page.
                </p>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Reason *</label>
                <input className="form-input" placeholder="e.g. Overstay, Illegal parking"
                  value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (PKR) *</label>
                <input className="form-input" type="number" placeholder="500"
                  value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
              <button className="btn btn-danger" onClick={issueFine}>Issue Fine</button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Fine Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={() => !paying && setPayModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Pay Fine</div>
              <button className="modal-close" onClick={() => !paying && setPayModal(null)}>✕</button>
            </div>

            <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#742a2a' }}>Fine Amount</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#742a2a' }}>
                PKR {(+payModal.amount).toLocaleString()}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {['Cash', 'Card', 'Online'].map(m => (
                  <label key={m} style={{
                    flex: 1, minWidth: 100, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px',
                    border: `2px solid ${payMethod === m ? '#4299e1' : '#e2e8f0'}`,
                    borderRadius: 8, cursor: 'pointer',
                    background: payMethod === m ? '#ebf8ff' : '#fff',
                    transition: 'all 0.15s'
                  }}>
                    <input type="radio" name="finePayMethod" value={m}
                      checked={payMethod === m} onChange={() => setPayMethod(m)}
                      style={{ accentColor: '#4299e1' }} />
                    {m === 'Cash' ? '💵 Cash' : m === 'Card' ? '💳 Card' : '🌐 Online'}
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setPayModal(null)} disabled={paying}>Cancel</button>
              <button className="btn btn-danger" onClick={payFine} disabled={paying}>
                {paying ? 'Processing...' : `Pay PKR ${(+payModal.amount).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}