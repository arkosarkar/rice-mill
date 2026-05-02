/**
 * AuthContext.jsx
 * Global auth state provider. Wraps the entire app.
 * Provides: isAuthenticated, user, login(token), logout()
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const TOKEN_KEY = 'erp_token';

// Decode JWT payload without verification (server validates)
function decodeToken(t) {
  try {
    return JSON.parse(atob(t.split('.')[1]));
  } catch {
    return null;
  }
}

function isTokenExpired(decoded) {
  if (!decoded?.exp) return false;
  return decoded.exp * 1000 < Date.now();
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser]   = useState(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return null;
    const decoded = decodeToken(t);
    return isTokenExpired(decoded) ? null : decoded;
  });

  // Clear expired token on mount
  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) {
      const decoded = decodeToken(t);
      if (isTokenExpired(decoded)) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    }
  }, []);

  // Listen for 401 events from authFetch / axiosInstance
  useEffect(() => {
    function handle401() {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
    window.addEventListener('erp_unauthorized', handle401);
    return () => window.removeEventListener('erp_unauthorized', handle401);
  }, []);

  function login(newToken) {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(decodeToken(newToken));
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!token,
      user,
      token,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
