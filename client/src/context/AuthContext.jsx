import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('nn_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nn_token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem('nn_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('nn_token');
          localStorage.removeItem('nn_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('nn_token', token);
    localStorage.setItem('nn_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('nn_token');
    localStorage.removeItem('nn_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: ['admin', 'org_admin', 'editor', 'viewer'].includes(user?.role) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
