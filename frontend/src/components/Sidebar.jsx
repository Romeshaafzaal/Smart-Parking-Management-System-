import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItem = (to, icon, label) => (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <span>{icon}</span> {label}
    </NavLink>
  );

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🅿️</div>
        <h1>Smart Parking</h1>
        <span>Management System</span>
      </div>

      <div className="nav">
        <div className="nav-label">Overview</div>
        {navItem('/dashboard', '📊', 'Dashboard')}

        <div className="nav-label">Parking</div>
        {navItem('/slots', '🅿️', 'Parking Slots')}
        {navItem('/vehicles', '🚗', 'Vehicles')}
        {navItem('/reservations', '📅', 'Reservations')}

        {user?.role === 'admin' && <>
          <div className="nav-label">Operations</div>
          {navItem('/records', '📋', 'Parking Records')}
          {navItem('/payments', '💳', 'Payments')}
          {navItem('/fines', '⚠️', 'Fines')}

          <div className="nav-label">System</div>
          {navItem('/rates', '💰', 'Rates & Pricing')}
          {navItem('/users', '👥', 'Users')}
        </>}

        {user?.role === 'user' && <>
          <div className="nav-label">Finance</div>
          {navItem('/payments', '💳', 'My Payments')}
          {navItem('/fines', '⚠️', 'My Fines')}
        </>}
      </div>

      <div className="sidebar-user">
        <div className="user-chip">
          <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <p>{user?.name}</p>
            <span>{user?.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">⏻</button>
        </div>
      </div>
    </nav>
  );
}