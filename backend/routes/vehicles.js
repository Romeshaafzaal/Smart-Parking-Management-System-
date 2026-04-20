const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

router.get('/', async (req, res) => {
  const pool = await poolPromise;
  const r = await pool.request().query(
    `SELECT v.*, u.name as userName FROM vehicles v
     LEFT JOIN users u ON v.userID = u.userID`
  );
  res.json(r.recordset);
});

router.post('/', async (req, res) => {
  const { plateNumber, vehicleType, ownerName, phone, userID } = req.body;
  try {
    const pool = await poolPromise;
    const r = await pool.request()
      .input('plate', sql.NVarChar, plateNumber)
      .input('type', sql.NVarChar, vehicleType)
      .input('owner', sql.NVarChar, ownerName || null)
      .input('phone', sql.NVarChar, phone || null)
      .input('userID', sql.Int, userID || null)
      .query('INSERT INTO vehicles (plateNumber,vehicleType,ownerName,phone,userID) OUTPUT INSERTED.vehicleID VALUES (@plate,@type,@owner,@phone,@userID)');
    res.json({ vehicleID: r.recordset[0].vehicleID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  const pool = await poolPromise;
  await pool.request().input('id', sql.Int, req.params.id)
    .query('DELETE FROM vehicles WHERE vehicleID=@id');
  res.json({ message: 'Deleted' });
});

module.exports = router;