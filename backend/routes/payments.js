const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

router.get('/', async (req, res) => {
  const pool = await poolPromise;
  const r = await pool.request().query(
    `SELECT p.*, v.plateNumber FROM payments p
     LEFT JOIN parking_records rc ON p.recordID = rc.recordID
     LEFT JOIN vehicles v ON rc.vehicleID = v.vehicleID
     ORDER BY p.paymentTime DESC`
  );
  res.json(r.recordset);
});

router.patch('/:id/pay', async (req, res) => {
  const pool = await poolPromise;
  await pool.request().input('id', sql.Int, req.params.id)
    .query("UPDATE payments SET status='Paid' WHERE paymentID=@id");
  res.json({ message: 'Marked as paid' });
});

module.exports = router;