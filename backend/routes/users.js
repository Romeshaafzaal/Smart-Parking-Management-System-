const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { sql, poolPromise } = require('../db');

router.get('/', async (req, res) => {
  const pool = await poolPromise;
  const r = await pool.request()
    .query('SELECT userID, name, email, role, createdAt FROM users');
  res.json(r.recordset);
});

router.post('/', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const pool = await poolPromise;
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashed)
      .input('role', sql.NVarChar, role || 'user')
      .query('INSERT INTO users (name,email,password,role) VALUES (@name,@email,@password,@role)');
    res.json({ message: 'User created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  const pool = await poolPromise;
  await pool.request().input('id', sql.Int, req.params.id)
    .query('DELETE FROM users WHERE userID=@id');
  res.json({ message: 'Deleted' });
});

module.exports = router;