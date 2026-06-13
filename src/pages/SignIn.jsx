import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../lib/api';
import { LogoStacked } from '../components/Logo';

export default function SignIn() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (localStorage.getItem('token')) {
    const role = localStorage.getItem('role');
    nav(role === 'admin' ? '/admin' : '/', { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      nav(data.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function continueAsGuest() {
    localStorage.setItem('guest_ok', '1');
    nav('/');
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <LogoStacked />
        <h1>Welcome Back</h1>
        <p className="auth-sub">Meet new people in Pune over a game of bowling.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div style={{ textAlign:'right', marginBottom:8 }}><Link to="/forgot-password" style={{ fontSize:13, color:'var(--text-muted)' }}>Forgot password?</Link></div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div className="auth-divider"><span>or</span></div>
        <button className="btn btn-ghost" onClick={continueAsGuest} style={{ width: '100%' }}>
          Continue without signing in →
        </button>
        <p className="auth-link">No account? <Link to="/signup">Sign up</Link></p>
      </div>
    </div>
  );
}
