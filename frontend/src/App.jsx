import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Slots from './pages/Slots';
import Vehicles from './pages/Vehicles';
import Records from './pages/Records';
import Payments from './pages/Payments';
import Reservations from './pages/Reservations';
import Fines from './pages/Fines';
import Rates from './pages/Rates';
import Users from './pages/Users';
import Sidebar from './components/Sidebar';

function Layout({ children, adminOnly }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" />;
  return (
    <div>
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/slots" element={<Layout><Slots /></Layout>} />
          <Route path="/vehicles" element={<Layout><Vehicles /></Layout>} />
          <Route path="/records" element={<Layout adminOnly><Records /></Layout>} />
          <Route path="/payments" element={<Layout><Payments /></Layout>} />
          <Route path="/reservations" element={<Layout><Reservations /></Layout>} />
          <Route path="/fines" element={<Layout><Fines /></Layout>} />
          <Route path="/rates" element={<Layout adminOnly><Rates /></Layout>} />
          <Route path="/users" element={<Layout adminOnly><Users /></Layout>} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;