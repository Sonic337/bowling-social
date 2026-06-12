import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitForm, getMyProfile, getGuestProfile } from '../lib/api';
import { PUNE_AREAS } from '../lib/areas';
import Logo, { LogoStacked } from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const TIMES = ['morning','afternoon','evening','night'];
const SIZES = ['small (2-4)','medium (5-8)','large (9+)','any'];

const EMPTY = {
  name:'', age:'', gender:'', area:'', whatsapp:'', email:'', occupation:'',
  interests:'', bio:'', group_size_pref:'', availability:{ days:[], times:[] }
};

function profileToForm(p) {
  return {
    name: p.name || '', age: p.age || '', gender: p.gender || '', area: p.area || '',
    whatsapp: p.whatsapp || '', email: p.email || '', occupation: p.occupation || '',
    interests: p.interests || '', bio: p.bio || '', group_size_pref: p.group_size_pref || '',
    availability: { days: p.availability?.days || [], times: p.availability?.times || [] }
  };
}

export default function IntakeForm() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    async function load() {
      try {
        if (isLoggedIn) {
          const d = await getMyProfile();
          if (d?.profile) { setForm(profileToForm(d.profile)); setHasExisting(true); }
        } else {
          const id = localStorage.getItem('profile_id');
          const key = localStorage.getItem('profile_key');
          if (id && key) {
            const d = await getGuestProfile(id, key);
            if (d?.profile) { setForm(profileToForm(d.profile)); setHasExisting(true); }
          }
        }
      } catch {
        // Saved profile no longer valid — clear and start fresh
        localStorage.removeItem('profile_id');
        localStorage.removeItem('profile_key');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function toggleAvail(type, val) {
    setForm(f => {
      const arr = f.availability[type];
      return { ...f, availability: { ...f.availability, [type]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] } };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const result = await submitForm({ ...form, age: parseInt(form.age) });
      localStorage.setItem('profile_id', result.id);
      if (result.edit_key) localStorage.setItem('profile_key', result.edit_key);
      setSubmitted(true);
      setHasExisting(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    localStorage.clear();
    window.location.href = '/login';
  }

  if (loading) return <div className="auth-page"><p>Loading…</p></div>;

  if (submitted) return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 460, textAlign: 'center' }}>
        <LogoStacked />
        <div className="success-icon">🎳</div>
        <h1>You're in, {form.name.split(' ')[0]}!</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
          We'll WhatsApp you when we find a good group for you in Pune.
        </p>
        <div className="info-note">
          ✓ Your details are saved on this device — you won't have to re-enter them.
        </div>
        {!isLoggedIn && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16 }}>
            Want your profile on any device? <a href="/signup" style={{ color: 'var(--primary)' }}>Create a free account</a>.
          </p>
        )}
        <button className="btn" style={{ marginTop: 20 }} onClick={() => setSubmitted(false)}>
          Edit my details
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px 48px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 24 }}>
          <Logo height={44} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ThemeToggle />
            {isLoggedIn
              ? <button className="btn" onClick={handleSignOut} style={{ fontSize: 13 }}>Sign Out</button>
              : <a href="/login" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 700 }}>Sign in</a>}
          </div>
        </div>

        <div className="hero">
          <h1>{hasExisting ? `Welcome back${form.name ? ', ' + form.name.split(' ')[0] : ''}!` : <>Join <span className="accent">The Bowling Circle</span></>}</h1>
          <p>{hasExisting
            ? 'Your details are saved. Update anything below and resubmit.'
            : 'Meet new people in Pune over a game of bowling. Tell us about yourself and we\u2019ll match you into a group.'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card form-section">
            <h3 className="section-title">👤 About you</h3>
            <div className="field"><label>Full Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Your name" /></div>
            <div className="two-col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div className="field"><label>Age *</label>
                <input type="number" min={16} max={80} value={form.age} onChange={e => set('age', e.target.value)} required placeholder="e.g. 25" /></div>
              <div className="field"><label>Gender *</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} required>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option>
                </select></div>
            </div>
            <div className="field"><label>Area in Pune *</label>
              <select value={form.area} onChange={e => set('area', e.target.value)} required>
                <option value="">Select your area</option>
                {PUNE_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select></div>
            <div className="field" style={{ marginBottom: 0 }}><label>Occupation</label>
              <input value={form.occupation} onChange={e => set('occupation', e.target.value)} placeholder="What do you do?" /></div>
          </div>

          <div className="card form-section">
            <h3 className="section-title">📱 Contact</h3>
            <div className="field"><label>WhatsApp Number *</label>
              <input type="tel" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} required placeholder="98XXXXXXXX" /></div>
            <div className="field" style={{ marginBottom: 0 }}><label>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="you@example.com" />
              <span className="field-hint">We use this to save your spot and send session details.</span></div>
          </div>

          <div className="card form-section">
            <h3 className="section-title">📅 Availability</h3>
            <div className="field"><label>Available Days</label>
              <div className="pill-row">
                {DAYS.map(d => (
                  <button type="button" key={d}
                    className={`pill ${form.availability.days.includes(d) ? 'active' : ''}`}
                    onClick={() => toggleAvail('days', d)}>{d.slice(0,3)}</button>
                ))}</div></div>
            <div className="field" style={{ marginBottom: 0 }}><label>Preferred Times</label>
              <div className="pill-row">
                {TIMES.map(t => (
                  <button type="button" key={t}
                    className={`pill ${form.availability.times.includes(t) ? 'active' : ''}`}
                    onClick={() => toggleAvail('times', t)}>{t}</button>
                ))}</div></div>
          </div>

          <div className="card form-section">
            <h3 className="section-title">🎳 Preferences</h3>
            <div className="field"><label>Group Size</label>
              <div className="pill-row">
                {SIZES.map(s => (
                  <button type="button" key={s}
                    className={`pill ${form.group_size_pref === s ? 'active' : ''}`}
                    onClick={() => set('group_size_pref', s)}>{s}</button>
                ))}</div></div>
            <div className="field"><label>Interests / Hobbies</label>
              <input value={form.interests} onChange={e => set('interests', e.target.value)} placeholder="Music, trekking, food…" /></div>
            <div className="field" style={{ marginBottom: 0 }}><label>Anything else to know about you?</label>
              <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} placeholder="Optional" /></div>
          </div>

          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary btn-lg" type="submit" disabled={saving} style={{ width:'100%' }}>
            {saving ? 'Saving…' : hasExisting ? 'Update my details' : 'Count me in 🎳'}
          </button>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', marginTop: 12 }}>
            Your details are saved on this device so you won't have to re-enter them.
          </p>
        </form>
      </div>
    </div>
  );
}
