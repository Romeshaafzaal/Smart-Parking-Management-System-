const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../db');

// Helper: SHA-256 hex string (matches HASHBYTES('SHA2_256', ...) in SQL Server)
function sha256hex(plainText) {
  return crypto.createHash('sha256').update(plainText, 'utf8').digest('hex').toUpperCase();
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields required' });
  try {
    const pool = await poolPromise;
    const exists = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT userID FROM users WHERE email = @email');
    if (exists.recordset.length)
      return res.status(400).json({ error: 'Email already registered' });
    const hashed = sha256hex(password);
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashed)
      .input('role', sql.NVarChar, 'user')
      .query('INSERT INTO users (name, email, password, role) VALUES (@name, @email, @password, @role)');
    res.json({ message: 'Account created successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });
  try {
    const pool = await poolPromise;
    const hashed = sha256hex(password);
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashed)
      .query('SELECT userID, name, email, role FROM users WHERE email = @email AND password = @password');
    if (!result.recordset.length)
      return res.status(400).json({ error: 'Invalid credentials' });
    const user = result.recordset[0];
    const token = jwt.sign(
      { userID: user.userID, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'smart_parking_secret',
      { expiresIn: '24h' }
    );
    res.json({ token, user: { userID: user.userID, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;