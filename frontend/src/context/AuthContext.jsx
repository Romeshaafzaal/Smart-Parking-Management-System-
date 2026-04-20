import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('parking_user');
    return u ? JSON.parse(u) : null;
  });

  const login = (userData, token) => {
    localStorage.setItem('parking_user', JSON.stringify(userData));
    localStorage.setItem('parking_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('parking_user');
    localStorage.removeItem('parking_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);