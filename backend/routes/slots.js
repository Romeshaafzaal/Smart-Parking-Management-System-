const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

router.get('/', async (req, res) => {
  const pool = await poolPromise;
  const r = await pool.request().query('SELECT * FROM parking_slots ORDER BY floorNumber, slotNumber');
  res.json(r.recordset);
});

router.post('/', async (req, res) => {
  const { slotNumber, floorNumber } = req.body;
  try {
    const pool = await poolPromise;
    const r = await pool.request()
      .input('slotNumber', sql.NVarChar, slotNumber)
      .input('floorNumber', sql.Int, floorNumber || 1)
      .query('INSERT INTO parking_slots (slotNumber,floorNumber) OUTPUT INSERTED.slotID VALUES (@slotNumber,@floorNumber)');
    res.json({ slotID: r.recordset[0].slotID, message: 'Slot added' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  const pool = await poolPromise;
  await pool.request().input('id', sql.Int, req.params.id)
    .query('DELETE FROM parking_slots WHERE slotID=@id');
  res.json({ message: 'Deleted' });
});

module.exports = router;