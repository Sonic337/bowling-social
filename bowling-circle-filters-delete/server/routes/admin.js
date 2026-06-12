const router = require('express').Router();
const pool = require('../db/pool');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.use(verifyToken, requireAdmin);

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { gender, area, day, sort = 'created_at', order = 'desc' } = req.query;
    const allowed = ['created_at', 'name', 'age', 'area'];
    const col = allowed.includes(sort) ? sort : 'created_at';
    const dir = order === 'asc' ? 'ASC' : 'DESC';
    const conditions = [];
    const values = [];
    if (gender) { conditions.push(`gender = $${values.length + 1}`); values.push(gender); }
    if (area) { conditions.push(`area ILIKE $${values.length + 1}`); values.push(`%${area}%`); }
    if (day) { conditions.push(`availability->'days' @> $${values.length + 1}::jsonb`); values.push(JSON.stringify([day])); }
    if (req.query.ages) {
      const bands = String(req.query.ages).split(',').map(b => b.trim()).filter(Boolean);
      const clauses = [];
      for (const band of bands) {
        if (band.endsWith('+')) {
          const min = parseInt(band);
          if (!isNaN(min)) { clauses.push(`age >= $${values.length + 1}`); values.push(min); }
        } else {
          const [lo, hi] = band.split('-').map(Number);
          if (!isNaN(lo) && !isNaN(hi)) {
            clauses.push(`(age BETWEEN $${values.length + 1} AND $${values.length + 2})`);
            values.push(lo, hi);
          }
        }
      }
      if (clauses.length) conditions.push('(' + clauses.join(' OR ') + ')');
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(`SELECT * FROM users ${where} ORDER BY ${col} ${dir}`, values);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/admin/accounts
router.get('/accounts', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, email, role, created_at FROM accounts ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/admin/accounts/:id/role
router.patch('/accounts/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  // Prevent revoking own admin
  if (parseInt(req.params.id) === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'Cannot revoke your own admin access' });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE accounts SET role = $1 WHERE id = $2 RETURNING id, email, role',
      [role, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Sessions routes
router.post('/sessions', async (req, res) => {
  const { date, time_slot, alley_name, lane_count, user_ids } = req.body;
  if (!date || !time_slot || !alley_name || !user_ids?.length) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [session] } = await client.query(
      'INSERT INTO sessions (date, time_slot, alley_name, lane_count) VALUES ($1,$2,$3,$4) RETURNING *',
      [date, time_slot, alley_name, lane_count || null]
    );
    for (const uid of user_ids) {
      await client.query(
        'INSERT INTO session_members (session_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [session.id, uid]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(session);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err); res.status(500).json({ error: 'Server error' });
  } finally { client.release(); }
});

router.get('/sessions', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, COUNT(sm.user_id)::int AS member_count
      FROM sessions s LEFT JOIN session_members sm ON s.id = sm.session_id
      GROUP BY s.id ORDER BY s.date DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/sessions/:id', async (req, res) => {
  try {
    const { rows: [session] } = await pool.query('SELECT * FROM sessions WHERE id = $1', [req.params.id]);
    if (!session) return res.status(404).json({ error: 'Not found' });
    const { rows: members } = await pool.query(
      'SELECT u.* FROM users u JOIN session_members sm ON u.id = sm.user_id WHERE sm.session_id = $1',
      [req.params.id]
    );
    res.json({ ...session, members });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/sessions/:id', async (req, res) => {
  const fields = ['date','time_slot','alley_name','lane_count','status'];
  const updates = Object.entries(req.body).filter(([k]) => fields.includes(k));
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  const set = updates.map(([k], i) => `${k} = $${i + 1}`).join(', ');
  const values = [...updates.map(([, v]) => v), req.params.id];
  try {
    const { rows } = await pool.query(`UPDATE sessions SET ${set} WHERE id = $${values.length} RETURNING *`, values);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/admin/users/:id — permanent
router.delete('/users/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
