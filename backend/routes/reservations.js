const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

router.get('/', async (req, res) => {
  const pool = await poolPromise;
  const r = await pool.request().query(
    `SELECT rs.*, v.plateNumber, s.slotNumber, u.name as userName
     FROM reservations rs
     LEFT JOIN vehicles v ON rs.vehicleID = v.vehicleID
     LEFT JOIN parking_slots s ON rs.slotID = s.slotID
     LEFT JOIN users u ON rs.userID = u.userID
     ORDER BY rs.startTime DESC`
  );
  res.json(r.recordset);
});

router.get('/my/:userID', async (req, res) => {
  const pool = await poolPromise;
  const r = await pool.request().input('userID', sql.Int, req.params.userID).query(
    `SELECT rs.*, v.plateNumber, s.slotNumber
     FROM reservations rs
     LEFT JOIN vehicles v ON rs.vehicleID = v.vehicleID
     LEFT JOIN parking_slots s ON rs.slotID = s.slotID
     WHERE rs.userID = @userID ORDER BY rs.startTime DESC`
  );
  res.json(r.recordset);
});

router.post('/', async (req, res) => {
  const { vehicleID, slotID, userID, startTime, endTime } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request().input('slotID', sql.Int, slotID)
      .query("UPDATE parking_slots SET status='Reserved', isReserved=1 WHERE slotID=@slotID");
    const r = await pool.request()
      .input('vehicleID', sql.Int, vehicleID)
      .input('slotID', sql.Int, slotID)
      .input('userID', sql.Int, userID)
      .input('startTime', sql.DateTime, new Date(startTime))
      .input('endTime', sql.DateTime, new Date(endTime))
      .query('INSERT INTO reservations (vehicleID,slotID,userID,startTime,endTime) OUTPUT INSERTED.reservationID VALUES (@vehicleID,@slotID,@userID,@startTime,@endTime)');
    res.json({ reservationID: r.recordset[0].reservationID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/cancel', async (req, res) => {
  const pool = await poolPromise;
  const rec = await pool.request().input('id', sql.Int, req.params.id)
    .query('SELECT slotID FROM reservations WHERE reservationID=@id');
  if (rec.recordset.length) {
    await pool.request().input('slotID', sql.Int, rec.recordset[0].slotID)
      .query("UPDATE parking_slots SET status='Available', isReserved=0 WHERE slotID=@slotID");
  }
  await pool.request().input('id', sql.Int, req.params.id)
    .query("UPDATE reservations SET status='Cancelled' WHERE reservationID=@id");
  res.json({ message: 'Cancelled' });
});

module.exports = router;