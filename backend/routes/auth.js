const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../db');

// SIGNUP
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
    const hashed = await bcrypt.hash(password, 10);
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashed)
      .query("INSERT INTO users (name,email,password,role) VALUES (@name,@email,@password,'user')");
    res.json({ message: 'Account created successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email');
    if (!result.recordset.length)
      return res.status(400).json({ error: 'Invalid credentials' });
    const user = result.recordset[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { userID: user.userID, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { userID: user.userID, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;