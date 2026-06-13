import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, getSessions, createSession, getAccounts, setAccountRole, deleteUser, resetAccountPassword } from '../lib/api';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';

function AvailChips({ availability }) {
  const days = availability?.days || [];
  if (!days.length) return <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>;
  return (
    <div className="day-chips">
      {days.map(d => <span key={d} className="day-chip">{d.slice(0, 3)}</span>)}
    </div>
  );
}


function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="btn" style={{ fontSize:12 }} onClick={() => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }}>{copied ? 'Copied!' : 'Copy'}</button>
  );
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({ gender:'', area:'', day:'' });
  const [search, setSearch] = useState('');
  const [ageBands, setAgeBands] = useState([]);
  const AGE_BANDS = ['16-20','21-24','25-28','29-34','35+'];
  const [showModal, setShowModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({ date:'', time_slot:'', alley_name:'', lane_count:'' });
  const [error, setError] = useState('');

  useEffect(() => { loadUsers(); }, [filters, ageBands, search]);
  useEffect(() => { if (tab === 'sessions') loadSessions(); }, [tab]);
  useEffect(() => { if (tab === 'access') loadAccounts(); }, [tab]);

  async function loadUsers() {
    const params = {};
    if (filters.gender) params.gender = filters.gender;
    if (filters.area) params.area = filters.area;
    if (filters.day) params.day = filters.day;
    if (ageBands.length) params.ages = ageBands.join(',');
    if (search.trim()) params.search = search.trim();
    setUsers(await getUsers(params));
  }

  async function loadSessions() { setSessions(await getSessions()); }
  async function loadAccounts() { setAccounts(await getAccounts()); }

  function toggleSelect(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    setError('');
    try {
      await createSession({ ...sessionForm, lane_count: sessionForm.lane_count || null, user_ids: selected });
      setShowModal(false);
      setSelected([]);
      setSessionForm({ date:'', time_slot:'', alley_name:'', lane_count:'' });
      loadSessions();
      setTab('sessions');
    } catch (err) { setError(err.message); }
  }

  async function toggleRole(account) {
    const newRole = account.role === 'admin' ? 'user' : 'admin';
    try {
      const updated = await setAccountRole(account.id, newRole);
      setAccounts(a => a.map(x => x.id === updated.id ? updated : x));
    } catch (err) { alert(err.message); }
  }

  const [resetModal, setResetModal] = useState(null); // { id, email }
  const [newPwd, setNewPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');

  async function handlePasswordReset(e) {
    e.preventDefault(); setPwdError(''); setPwdSaving(true);
    try {
      await resetAccountPassword(resetModal.id, newPwd);
      setResetModal(null); setNewPwd('');
      alert('Password updated successfully.');
    } catch(err) { setPwdError(err.message); }
    finally { setPwdSaving(false); }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Delete ${u.name}, ${u.age}? This cannot be undone.`)) return;
    try {
      await deleteUser(u.id);
      setUsers(list => list.filter(x => x.id !== u.id));
      setSelected(s => s.filter(id => id !== u.id));
    } catch (err) { alert(err.message); }
  }

  function handleLogout() { localStorage.clear(); nav('/login'); }

  const statusColors = { pending:'#f59e0b', confirmed:'#10b981', completed:'#6366f1' };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      {/* Header */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', boxShadow:'var(--shadow-sm)', padding:'12px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <Logo height={46} />
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <ThemeToggle />
          <span style={{ fontSize:13, color:'var(--text-muted)', fontWeight:700 }}>Admin</span>
          <button className="btn" onClick={handleLogout} style={{ fontSize:12 }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 16px' }}>
        {/* Tabs */}
        <div className="tabs" style={{ marginBottom:24 }}>
          {['users','sessions','access'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)} style={{ textTransform:'capitalize' }}>{t}</button>
          ))}
        </div>

        {/* Users Tab */}
        {tab === 'users' && (
          <>
            <div className="filter-bar">
              <select value={filters.gender} onChange={e => setFilters(f => ({...f, gender: e.target.value}))}>
                <option value="">All Genders</option>
                <option>Male</option><option>Female</option><option>Non-binary</option>
              </select>
              <input placeholder="Filter by area…" value={filters.area}
                onChange={e => setFilters(f => ({...f, area: e.target.value}))} />
              <select value={filters.day} onChange={e => setFilters(f => ({...f, day: e.target.value}))}>
                <option value="">Any Day</option>
                {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d => (
                  <option key={d} value={d} style={{ textTransform:'capitalize' }}>{d}</option>
                ))}
              </select>
              <button className="btn" onClick={() => { setFilters({ gender:'', area:'', day:'' }); setAgeBands([]); setSearch(''); }}>Clear</button>
              <input
                placeholder="Search name, email, WhatsApp…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width:'100%', marginTop:4 }}
              />
              <div className="pill-row" style={{ width:'100%', marginTop:4 }}>
                {AGE_BANDS.map(b => (
                  <button type="button" key={b}
                    className={`pill ${ageBands.includes(b) ? 'active' : ''}`}
                    style={{ fontSize:12, padding:'5px 12px' }}
                    onClick={() => setAgeBands(a => a.includes(b) ? a.filter(x => x !== b) : [...a, b])}>
                    {b} yrs
                  </button>
                ))}
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th></th>
                  <th>Name</th><th>Age</th><th>Gender</th><th>Area</th>
                  <th>WhatsApp</th><th>Email</th><th>Availability</th><th>Joined</th><th></th>
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className={selected.includes(u.id) ? 'selected' : ''}>
                      <td><input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} /></td>
                      <td><strong>{u.name}</strong></td>
                      <td>{u.age}</td>
                      <td>{u.gender}</td>
                      <td>{u.area}</td>
                      <td>{u.whatsapp}</td>
                      <td style={{ fontSize:12 }}>{u.email || '—'}</td>
                      <td><AvailChips availability={u.availability} /></td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td><button className="btn" title="Delete entry"
                        style={{ fontSize:12, padding:'3px 9px', color:'var(--danger)' }}
                        onClick={() => handleDelete(u)}>✕</button></td>
                    </tr>
                  ))}
                  {!users.length && <tr><td colSpan={10} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No users found</td></tr>}
                </tbody>
              </table>
            </div>

            {selected.length > 0 && (
              <div className="float-bar">
                <span>{selected.length} selected</span>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                  Create Group →
                </button>
                <button className="btn" onClick={() => setSelected([])}>Clear</button>
              </div>
            )}
          </>
        )}

        {/* Sessions Tab */}
        {tab === 'sessions' && (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Date</th><th>Time</th><th>Alley</th><th>Members</th><th>Status</th>
              </tr></thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} style={{ cursor:'pointer' }} onClick={() => nav(`/admin/sessions/${s.id}`)}>
                    <td>{s.date}</td>
                    <td>{s.time_slot}</td>
                    <td>{s.alley_name}</td>
                    <td>{s.member_count}</td>
                    <td><span className="badge" style={{ background: statusColors[s.status] + '22', color: statusColors[s.status] }}>{s.status}</span></td>
                  </tr>
                ))}
                {!sessions.length && <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No sessions yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Access Tab */}
        {tab === 'access' && (
          <>
            <p style={{ color:'var(--text-muted)', marginBottom:16, fontSize:14 }}>
              Toggle admin access for any registered account. Admins can view and manage all users and sessions.
            </p>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Email</th><th>Role</th><th>Joined</th><th>Action</th>
                </tr></thead>
                <tbody>
                  {accounts.map(a => (
                    <tr key={a.id}>
                      <td>{a.email}</td>
                      <td>
                        <span className="badge" style={{
                          background: a.role === 'admin' ? '#6366f122' : '#f59e0b22',
                          color: a.role === 'admin' ? '#6366f1' : '#f59e0b'
                        }}>{a.role}</span>
                      </td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{new Date(a.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn" style={{ fontSize:12 }} onClick={() => toggleRole(a)}>
                          {a.role === 'admin' ? 'Revoke Admin' : 'Grant Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!accounts.length && <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No accounts yet</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Create Session Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create Session ({selected.length} people)</h3>
            <form onSubmit={handleCreateSession}>
              <div className="field"><label>Date *</label>
                <input type="date" value={sessionForm.date} onChange={e => setSessionForm(f => ({...f, date: e.target.value}))} required /></div>
              <div className="field"><label>Time Slot *</label>
                <input placeholder="e.g. 6:00 PM – 8:00 PM" value={sessionForm.time_slot}
                  onChange={e => setSessionForm(f => ({...f, time_slot: e.target.value}))} required /></div>
              <div className="field"><label>Bowling Alley *</label>
                <input placeholder="e.g. Smaaash, Phoenix Mall, Viman Nagar" value={sessionForm.alley_name}
                  onChange={e => setSessionForm(f => ({...f, alley_name: e.target.value}))} required /></div>
              <div className="field"><label>Lane Count</label>
                <input type="number" min={1} value={sessionForm.lane_count}
                  onChange={e => setSessionForm(f => ({...f, lane_count: e.target.value}))} /></div>
              {error && <p className="form-error">{error}</p>}
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password reset modal */}
      {resetModal && (
        <div className="modal-overlay" onClick={() => setResetModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Reset Password</h3>
            <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:16 }}>
              Setting a new password for <strong>{resetModal.email}</strong>
            </p>
            <form onSubmit={handlePasswordReset}>
              <div className="field">
                <label>New Password</label>
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  required minLength={6} autoFocus placeholder="Min 6 characters" />
              </div>
              {pwdError && <p className="form-error">{pwdError}</p>}
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
                <button type="button" className="btn" onClick={() => setResetModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={pwdSaving}>
                  {pwdSaving ? 'Saving…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
