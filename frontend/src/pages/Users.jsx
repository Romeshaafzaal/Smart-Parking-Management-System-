import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'user' });

  const load = () => axios.get(`${API}/users`).then(r => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const addUser = async () => {
    try {
      await axios.post(`${API}/users`, form); setShowModal(false); load();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete user?')) return;
    await axios.delete(`${API}/users/${id}`); load();
  };

  const fmt = dt => dt ? new Date(dt).toLocaleDateString() : '—';

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">System <span>Users</span></div></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add User</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.userID}>
                  <td>{u.userID}</td>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td>{fmt(u.createdAt)}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => del(u.userID)}>Delete</button></td>
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
              <div className="modal-title">Add User</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="Full name"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password"
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addUser}>Add User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}