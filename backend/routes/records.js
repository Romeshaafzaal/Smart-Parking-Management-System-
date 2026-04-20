const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

router.get('/', async (req, res) => {
  const pool = await poolPromise;
  const r = await pool.request().query(
    `SELECT rc.*, v.plateNumber, v.vehicleType, s.slotNumber
     FROM parking_records rc
     LEFT JOIN vehicles v ON rc.vehicleID = v.vehicleID
     LEFT JOIN parking_slots s ON rc.slotID = s.slotID
     ORDER BY rc.entryTime DESC`
  );
  res.json(r.recordset);
});

router.post('/entry', async (req, res) => {
  const { vehicleID, slotID } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request().input('slotID', sql.Int, slotID)
      .query("UPDATE parking_slots SET status='Occupied' WHERE slotID=@slotID");
    const r = await pool.request()
      .input('vehicleID', sql.Int, vehicleID)
      .input('slotID', sql.Int, slotID)
      .query('INSERT INTO parking_records (vehicleID,slotID) OUTPUT INSERTED.recordID VALUES (@vehicleID,@slotID)');
    res.json({ recordID: r.recordset[0].recordID, message: 'Entry recorded' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/exit/:id', async (req, res) => {
  const { paymentMethod } = req.body;
  try {
    const pool = await poolPromise;
    const rec = await pool.request().input('id', sql.Int, req.params.id).query(
      `SELECT rc.*, v.vehicleType FROM parking_records rc
       JOIN vehicles v ON rc.vehicleID = v.vehicleID
       WHERE rc.recordID = @id`
    );
    if (!rec.recordset.length) return res.status(404).json({ error: 'Record not found' });
    const record = rec.recordset[0];
    const now = new Date();
    const hours = Math.max(1, Math.ceil((now - new Date(record.entryTime)) / 3600000));
    const rateRes = await pool.request().input('type', sql.NVarChar, record.vehicleType)
      .query('SELECT TOP 1 pricePerHour FROM rates WHERE vehicleType=@type');
    const rate = rateRes.recordset.length ? rateRes.recordset[0].pricePerHour : 100;
    const fee = hours * rate;
    await pool.request()
      .input('now', sql.DateTime, now)
      .input('fee', sql.Decimal, fee)
      .input('id', sql.Int, req.params.id)
      .query('UPDATE parking_records SET exitTime=@now, fee=@fee WHERE recordID=@id');
    await pool.request().input('slotID', sql.Int, record.slotID)
      .query("UPDATE parking_slots SET status='Available' WHERE slotID=@slotID");
    await pool.request()
      .input('recordID', sql.Int, req.params.id)
      .input('amount', sql.Decimal, fee)
      .input('method', sql.NVarChar, paymentMethod || 'Cash')
      .query("INSERT INTO payments (recordID,amount,paymentMethod,status) VALUES (@recordID,@amount,@method,'Paid')");
    res.json({ fee, message: 'Exit processed' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;