import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoStacked } from '../components/Logo';

const BASE = '/api';

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

export default function ForgotPassword() {
  const [step, setStep]           = useState('email'); // email | otp | password | done
  const [email, setEmail]         = useState('');
  const [otp, setOtp]             = useState('');
  const [resetToken, setToken]    = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  async function submitEmail(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await post('/auth/forgot-password', { email }); setStep('otp'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function submitOtp(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try { const d = await post('/auth/verify-otp', { email, otp }); setToken(d.reset_token); setStep('password'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function submitPassword(e) {
    e.preventDefault(); setError(''); 
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try { await post('/auth/reset-password', { reset_token: resetToken, password }); setStep('done'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <LogoStacked />
        {step === 'email' && <>
          <h1>Forgot Password</h1>
          <p className="auth-sub">Enter your email and we'll send a 6-digit code.</p>
          <form onSubmit={submitEmail}>
            <div className="field"><label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus /></div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%' }}>
              {loading ? 'Sending…' : 'Send Code'}</button>
          </form>
        </>}

        {step === 'otp' && <>
          <h1>Enter Code</h1>
          <p className="auth-sub">We sent a 6-digit code to <strong>{email}</strong>. Check your inbox (and spam).</p>
          <form onSubmit={submitOtp}>
            <div className="field"><label>6-digit code</label>
              <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                required maxLength={6} inputMode="numeric" placeholder="000000" autoFocus
                style={{ fontSize:28, letterSpacing:8, textAlign:'center' }} /></div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading || otp.length < 6} style={{ width:'100%' }}>
              {loading ? 'Verifying…' : 'Verify Code'}</button>
          </form>
          <p className="auth-link" style={{ marginTop:12 }}>
            <button className="btn btn-ghost" style={{ width:'100%', fontSize:13 }}
              onClick={() => { setStep('email'); setOtp(''); setError(''); }}>← Try different email</button>
          </p>
        </>}

        {step === 'password' && <>
          <h1>New Password</h1>
          <p className="auth-sub">Choose a new password for <strong>{email}</strong>.</p>
          <form onSubmit={submitPassword}>
            <div className="field"><label>New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoFocus /></div>
            <div className="field"><label>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%' }}>
              {loading ? 'Saving…' : 'Set New Password'}</button>
          </form>
        </>}

        {step === 'done' && <>
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ fontSize:44, marginBottom:12 }}>✅</div>
            <h1>Password updated</h1>
            <p className="auth-sub" style={{ marginTop:8 }}>You can now sign in with your new password.</p>
            <Link to="/login"><button className="btn btn-primary" style={{ width:'100%', marginTop:20 }}>Go to Sign In</button></Link>
          </div>
        </>}

        {step !== 'done' && <p className="auth-link"><Link to="/login">← Back to Sign In</Link></p>}
      </div>
    </div>
  );
}
