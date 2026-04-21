const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

// GET all vehicles (admin)
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request().query(
      `SELECT v.*, u.name as userName FROM vehicles v
       LEFT JOIN users u ON v.userID = u.userID`
    );
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET vehicles for a specific user (includes vehicles added via reservations)
router.get('/my/:userID', async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request()
      .input('userID', sql.Int, req.params.userID)
      .query(
        `SELECT v.*, u.name as userName FROM vehicles v
         LEFT JOIN users u ON v.userID = u.userID
         WHERE v.userID = @userID`
      );
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add vehicle (admin or user adding their own)
router.post('/', async (req, res) => {
  const { plateNumber, vehicleType, ownerName, phone, userID } = req.body;
  if (!plateNumber) return res.status(400).json({ error: 'Plate number required' });
  try {
    const pool = await poolPromise;
    // Check for duplicate plate
    const dup = await pool.request()
      .input('plate', sql.NVarChar, plateNumber)
      .query('SELECT vehicleID FROM vehicles WHERE plateNumber = @plate');
    if (dup.recordset.length)
      return res.status(400).json({ error: 'A vehicle with this plate number already exists' });

    const r = await pool.request()
      .input('plate',   sql.NVarChar, plateNumber)
      .input('type',    sql.NVarChar, vehicleType || 'Car')
      .input('owner',   sql.NVarChar, ownerName || null)
      .input('phone',   sql.NVarChar, phone || null)
      .input('userID',  sql.Int,      userID || null)
      .query(`INSERT INTO vehicles (plateNumber, vehicleType, ownerName, phone, userID)
              OUTPUT INSERTED.vehicleID
              VALUES (@plate, @type, @owner, @phone, @userID)`);
    res.json({ vehicleID: r.recordset[0].vehicleID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete vehicle
router.delete('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    await pool.request().input('id', sql.Int, req.params.id)
      .query('DELETE FROM vehicles WHERE vehicleID=@id');
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;