const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { sql, poolPromise } = require('../db');

function sha256hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex').toUpperCase();
}

// GET all users (admin)
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request()
      .query('SELECT userID, name, email, role, createdAt FROM users ORDER BY userID');
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create user (admin)
router.post('/', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email, password required' });
  try {
    const pool = await poolPromise;
    const hashed = sha256hex(password);
    const r = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashed)
      .input('role', sql.NVarChar, role || 'user')
      .query('INSERT INTO users (name, email, password, role) OUTPUT INSERTED.userID VALUES (@name, @email, @password, @role)');
    res.json({ userID: r.recordset[0].userID, message: 'User created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM users WHERE userID = @id');
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;