const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

// GET all fines (admin) - supports fines linked via recordID OR directly via userID
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request().query(
      `SELECT
         f.fineID, f.recordID, f.userID AS directUserID, f.vehicleID AS directVehicleID,
         f.reason, f.amount, f.status, f.issuedAt,
         COALESCE(vr.plateNumber, vd.plateNumber) AS plateNumber,
         COALESCE(ur.name, ud.name)               AS userName,
         COALESCE(ur.userID, ud.userID)            AS userID
       FROM fines f
       LEFT JOIN parking_records rc ON f.recordID = rc.recordID
       LEFT JOIN vehicles vr        ON rc.vehicleID = vr.vehicleID
       LEFT JOIN users ur           ON vr.userID = ur.userID
       -- direct vehicle/user link (when admin issues fine directly)
       LEFT JOIN vehicles vd        ON f.vehicleID = vd.vehicleID
       LEFT JOIN users ud           ON f.userID = ud.userID
       ORDER BY f.issuedAt DESC`
    );
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET fines for a specific user (user-scoped)
router.get('/my/:userID', async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request()
      .input('userID', sql.Int, req.params.userID)
      .query(
        `SELECT
           f.fineID, f.recordID, f.userID AS directUserID, f.vehicleID AS directVehicleID,
           f.reason, f.amount, f.status, f.issuedAt,
           COALESCE(vr.plateNumber, vd.plateNumber) AS plateNumber,
           COALESCE(ur.name, ud.name)               AS userName
         FROM fines f
         LEFT JOIN parking_records rc ON f.recordID = rc.recordID
         LEFT JOIN vehicles vr        ON rc.vehicleID = vr.vehicleID
         LEFT JOIN users ur           ON vr.userID = ur.userID
         LEFT JOIN vehicles vd        ON f.vehicleID = vd.vehicleID
         LEFT JOIN users ud           ON f.userID = ud.userID
         WHERE ur.userID = @userID OR f.userID = @userID
         ORDER BY f.issuedAt DESC`
      );
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Issue a fine (admin only) - can be linked to recordID or directly to userID + vehicleID
router.post('/', async (req, res) => {
  const { recordID, userID, vehicleID, reason, amount } = req.body;
  if (!reason || !amount) return res.status(400).json({ error: 'reason and amount required' });
  try {
    const pool = await poolPromise;
    const r = await pool.request()
      .input('recordID',  sql.Int,      recordID  || null)
      .input('userID',    sql.Int,      userID    || null)
      .input('vehicleID', sql.Int,      vehicleID || null)
      .input('reason',    sql.NVarChar, reason)
      .input('amount',    sql.Decimal,  amount)
      .query(`INSERT INTO fines (recordID, userID, vehicleID, reason, amount)
              OUTPUT INSERTED.fineID
              VALUES (@recordID, @userID, @vehicleID, @reason, @amount)`);
    res.json({ fineID: r.recordset[0].fineID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Pay a fine (user or admin)
router.patch('/:id/pay', async (req, res) => {
  const { paymentMethod } = req.body;
  try {
    const pool = await poolPromise;
    const fine = await pool.request().input('id', sql.Int, req.params.id)
      .query('SELECT * FROM fines WHERE fineID = @id');
    if (!fine.recordset.length)
      return res.status(404).json({ error: 'Fine not found' });
    if (fine.recordset[0].status === 'Paid')
      return res.status(400).json({ error: 'Already paid' });

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query("UPDATE fines SET status='Paid' WHERE fineID=@id");

    // Insert into payments table so it shows in payment history
    const fineData = fine.recordset[0];
    await pool.request()
      .input('recordID',  sql.Int,      fineData.recordID  || null)
      .input('userID',    sql.Int,      fineData.userID    || null)
      .input('vehicleID', sql.Int,      fineData.vehicleID || null)
      .input('amount',    sql.Decimal,  fineData.amount)
      .input('method',    sql.NVarChar, paymentMethod || 'Cash')
      .input('fineID',    sql.Int,      req.params.id)
      .query(`INSERT INTO payments (recordID, amount, paymentMethod, status, fineID)
              VALUES (@recordID, @amount, @method, 'Paid', @fineID)`);

    res.json({ message: 'Fine paid' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;