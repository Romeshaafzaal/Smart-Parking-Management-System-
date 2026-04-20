const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

router.get('/', async (req, res) => {
  const pool = await poolPromise;
  const r = await pool.request().query(
    `SELECT f.*, v.plateNumber FROM fines f
     LEFT JOIN parking_records rc ON f.recordID = rc.recordID
     LEFT JOIN vehicles v ON rc.vehicleID = v.vehicleID
     ORDER BY f.issuedAt DESC`
  );
  res.json(r.recordset);
});

router.post('/', async (req, res) => {
  const { recordID, reason, amount } = req.body;
  const pool = await poolPromise;
  const r = await pool.request()
    .input('recordID', sql.Int, recordID)
    .input('reason', sql.NVarChar, reason)
    .input('amount', sql.Decimal, amount)
    .query('INSERT INTO fines (recordID,reason,amount) OUTPUT INSERTED.fineID VALUES (@recordID,@reason,@amount)');
  res.json({ fineID: r.recordset[0].fineID });
});

router.patch('/:id/pay', async (req, res) => {
  const pool = await poolPromise;
  await pool.request().input('id', sql.Int, req.params.id)
    .query("UPDATE fines SET status='Paid' WHERE fineID=@id");
  res.json({ message: 'Fine paid' });
});

module.exports = router;