import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authApi } from '../api';
import { tokenStore } from '../api/client';

const AuthContext = createContext(null);

// Tabs of the same browser share the session. When someone logs in or out in one tab,
// the others reload so they never show one person while the server acts as another.
const SESSION_KEY = 'cb-session';
const announceSessionChange = () => {
  try { localStorage.setItem(SESSION_KEY, String(Date.now())); } catch { /* storage unavailable */ }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Sidebar badges: { unreadMessages, openIssues }
  const [counts, setCounts] = useState({ unreadMessages: 0, openIssues: 0 });

  useEffect(() => {
    let cancelled = false;
    authApi.me()
      .then(me => { if (!cancelled) setUser(me); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onStorage = (e) => { if (e.key === SESSION_KEY) window.location.reload(); };
    const onExpired = () => { tokenStore.clear(); setUser(null); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth:expired', onExpired);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth:expired', onExpired);
    };
  }, []);

  const refreshCounts = useCallback(() => {
    authApi.counts().then(setCounts).catch(() => { /* badges are best-effort */ });
  }, []);

  // Keep badges fresh while logged in
  useEffect(() => {
    if (!user) return;
    refreshCounts();
    const timer = setInterval(refreshCounts, 60000);
    return () => clearInterval(timer);
  }, [user, refreshCounts]);

  const startSession = useCallback(({ user: me, token }) => {
    tokenStore.set(token);
    setUser(me);
    announceSessionChange();
    return me;
  }, []);

  const login = useCallback(async (email, password) => startSession(await authApi.login(email, password)), [startSession]);
  const demoLogin = useCallback(async (role) => startSession(await authApi.demo(role)), [startSession]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* clear locally regardless */ }
    tokenStore.clear();
    setUser(null);
    announceSessionChange();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, demoLogin, logout, counts, refreshCounts }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
