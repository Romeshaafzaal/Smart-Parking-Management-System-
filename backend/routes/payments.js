const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

// GET all payments (admin) - covers both parking record payments AND reservation payments
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request().query(
      `SELECT
         p.paymentID, p.amount, p.paymentMethod, p.status, p.paymentTime,
         p.recordID, p.reservationID, p.fineID,
         COALESCE(vr.plateNumber, vres.plateNumber) AS plateNumber,
         COALESCE(ur.name, ures.name)               AS userName,
         COALESCE(ur.userID, ures.userID)            AS userID
       FROM payments p
       LEFT JOIN parking_records rc  ON p.recordID = rc.recordID
       LEFT JOIN vehicles vr         ON rc.vehicleID = vr.vehicleID
       LEFT JOIN users ur            ON vr.userID = ur.userID
       LEFT JOIN reservations rs     ON p.reservationID = rs.reservationID
       LEFT JOIN vehicles vres       ON rs.vehicleID = vres.vehicleID
       LEFT JOIN users ures          ON rs.userID = ures.userID
       ORDER BY p.paymentTime DESC`
    );
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET payments for a specific user (user-scoped) - covers record + reservation + fine payments
router.get('/my/:userID', async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request()
      .input('userID', sql.Int, req.params.userID)
      .query(
        `SELECT
           p.paymentID, p.amount, p.paymentMethod, p.status, p.paymentTime,
           p.recordID, p.reservationID, p.fineID,
           COALESCE(vr.plateNumber, vres.plateNumber) AS plateNumber,
           COALESCE(ur.name, ures.name)               AS userName
         FROM payments p
         LEFT JOIN parking_records rc  ON p.recordID = rc.recordID
         LEFT JOIN vehicles vr         ON rc.vehicleID = vr.vehicleID
         LEFT JOIN users ur            ON vr.userID = ur.userID
         LEFT JOIN reservations rs     ON p.reservationID = rs.reservationID
         LEFT JOIN vehicles vres       ON rs.vehicleID = vres.vehicleID
         LEFT JOIN users ures          ON rs.userID = ures.userID
         WHERE ur.userID = @userID OR ures.userID = @userID
         ORDER BY p.paymentTime DESC`
      );
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Mark payment as paid (admin - cash collected at desk)
router.patch('/:id/pay', async (req, res) => {
  const { paymentMethod } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('method', sql.NVarChar, paymentMethod || 'Cash')
      .query("UPDATE payments SET status='Paid', paymentMethod=@method WHERE paymentID=@id");
    res.json({ message: 'Marked as paid' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// User pays online (card/online) for a pending payment
router.patch('/:id/pay-online', async (req, res) => {
  const { paymentMethod } = req.body;
  try {
    const pool = await poolPromise;
    const check = await pool.request().input('id', sql.Int, req.params.id)
      .query("SELECT * FROM payments WHERE paymentID = @id");
    if (!check.recordset.length)
      return res.status(404).json({ error: 'Payment not found' });
    if (check.recordset[0].status === 'Paid')
      return res.status(400).json({ error: 'Already paid' });

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('method', sql.NVarChar, paymentMethod || 'Card')
      .query("UPDATE payments SET status='Paid', paymentMethod=@method WHERE paymentID=@id");
    res.json({ message: 'Payment successful' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;