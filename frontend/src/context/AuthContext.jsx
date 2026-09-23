import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI
        .me()
        .then((res) => {
          setUser(res.data.data);
          localStorage.setItem('user', JSON.stringify(res.data.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [logout]);

  const completeLogin = useCallback((userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    sessionStorage.removeItem('employeeResetToken');
    sessionStorage.removeItem('employeeResetUser');
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    if (res.data.mustResetPassword) {
      return res.data;
    }
    const userData = res.data.data;
    completeLogin(userData);
    return userData;
  }, [completeLogin]);

  const hasModule = useCallback(
    (moduleName) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      const userModules = user.allowedModules || [];
      return userModules.includes(moduleName);
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, login, completeLogin, logout, loading, isAuthenticated: !!user, hasModule }),
    [user, login, completeLogin, logout, loading, hasModule]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
