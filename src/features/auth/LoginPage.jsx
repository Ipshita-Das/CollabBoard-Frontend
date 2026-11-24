import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, CircleAlert, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api';
import { errorMessage } from '../../api/client';

const DEMOS = [
  { role: 'admin', title: 'Admin' },
  { role: 'employee', title: 'Employee' },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, login, demoLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(null); // 'form' | 'admin' | 'employee'
  const [error, setError] = useState('');
  const [demoAvailable, setDemoAvailable] = useState(true);

  useEffect(() => {
    authApi.config().then(c => setDemoAvailable(c.demoLogin)).catch(() => { /* keep defaults */ });
  }, []);

  const run = async (key, action) => {
    setBusy(key);
    setError('');
    try {
      await action();
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not log you in. Please try again.'));
      setBusy(null);
    }
  };

  if (user) return <Navigate to="/" replace />;

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand-lockup auth-brand">
          <img src="/logo-cb.png" alt="" />
          <span>CollabBoard</span>
        </div>

        <div className="auth-box">
          <h1>Log in</h1>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><CircleAlert size={16} />{error}</div>}

          <form onSubmit={(e) => { e.preventDefault(); run('form', () => login(email, password)); }} className="auth-form">
            <div className="field">
              <label className="field-label" htmlFor="email">Email</label>
              <input id="email" className="input" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <div className="input-icon-wrap input-icon-wrap-plain">
                <input id="password" className="input" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                  required value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="input-action" onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={!!busy}>
              {busy === 'form' ? <LoaderCircle size={16} className="spin" /> : 'Log in'}
            </button>
          </form>

          {demoAvailable && (
            <div className="demo-box">
              <p>Demo accounts</p>
              <div className="demo-row">
                {DEMOS.map(({ role, title }) => (
                  <button key={role} type="button" className="btn btn-secondary" disabled={!!busy} onClick={() => run(role, () => demoLogin(role))}>
                    {busy === role && <LoaderCircle size={14} className="spin" />}{title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="auth-note">No account? Ask your manager or admin to add you.</p>
      </div>
    </main>
  );
};

export default LoginPage;
