const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

// GET all reservations (admin)
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request().query(
      `SELECT rs.*, v.plateNumber, v.vehicleType, s.slotNumber, u.name as userName
       FROM reservations rs
       LEFT JOIN vehicles v       ON rs.vehicleID = v.vehicleID
       LEFT JOIN parking_slots s  ON rs.slotID = s.slotID
       LEFT JOIN users u          ON rs.userID = u.userID
       ORDER BY rs.startTime DESC`
    );
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET reservations for a specific user
router.get('/my/:userID', async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request()
      .input('userID', sql.Int, req.params.userID)
      .query(
        `SELECT rs.*, v.plateNumber, v.vehicleType, s.slotNumber
         FROM reservations rs
         LEFT JOIN vehicles v       ON rs.vehicleID = v.vehicleID
         LEFT JOIN parking_slots s  ON rs.slotID = s.slotID
         WHERE rs.userID = @userID
         ORDER BY rs.startTime DESC`
      );
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create reservation + auto-add vehicle if new + generate payment
router.post('/', async (req, res) => {
  const { vehicleID, slotID, userID, startTime, endTime, paymentMethod,
    // New vehicle fields (if user is adding a new vehicle inline)
    newVehicle } = req.body;

  if (!slotID || !userID || !startTime || !endTime)
    return res.status(400).json({ error: 'slotID, userID, startTime, endTime required' });

  try {
    const pool = await poolPromise;
    let resolvedVehicleID = vehicleID ? parseInt(vehicleID) : null;

    // If user provided new vehicle details instead of selecting an existing one
    if (newVehicle && newVehicle.plateNumber) {
      // Check duplicate plate
      const dup = await pool.request()
        .input('plate', sql.NVarChar, newVehicle.plateNumber)
        .query('SELECT vehicleID FROM vehicles WHERE plateNumber = @plate');
      if (dup.recordset.length) {
        resolvedVehicleID = dup.recordset[0].vehicleID;
        // If it belongs to someone else, reject
        const owner = await pool.request()
          .input('vid', sql.Int, resolvedVehicleID)
          .query('SELECT userID FROM vehicles WHERE vehicleID = @vid');
        if (owner.recordset[0]?.userID && owner.recordset[0].userID !== parseInt(userID))
          return res.status(400).json({ error: 'This plate number is registered to another user' });
      } else {
        const vr = await pool.request()
          .input('plate', sql.NVarChar, newVehicle.plateNumber)
          .input('type', sql.NVarChar, newVehicle.vehicleType || 'Car')
          .input('owner', sql.NVarChar, newVehicle.ownerName || null)
          .input('phone', sql.NVarChar, newVehicle.phone || null)
          .input('userID', sql.Int, parseInt(userID))
          .query(`INSERT INTO vehicles (plateNumber, vehicleType, ownerName, phone, userID)
                  OUTPUT INSERTED.vehicleID
                  VALUES (@plate, @type, @owner, @phone, @userID)`);
        resolvedVehicleID = vr.recordset[0].vehicleID;
      }
    }

    if (!resolvedVehicleID)
      return res.status(400).json({ error: 'vehicleID or newVehicle details required' });

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) return res.status(400).json({ error: 'End time must be after start time' });
    const hours = Math.max(1, Math.ceil((end - start) / 3600000));

    const overlap = await pool.request()
      .input('slotID', sql.Int, slotID)
      .input('startTime', sql.DateTime, start)
      .input('endTime', sql.DateTime, end)
      .query(`SELECT 1 FROM reservations 
              WHERE slotID = @slotID AND status = 'Active'
              AND @startTime < endTime AND @endTime > startTime`);
    if (overlap.recordset.length)
      return res.status(400).json({ error: 'Slot already reserved for that time period' });
    // Get vehicle type for rate lookup
    const veh = await pool.request()
      .input('vehicleID', sql.Int, resolvedVehicleID)
      .query('SELECT vehicleType FROM vehicles WHERE vehicleID = @vehicleID');
    const vehicleType = veh.recordset.length ? veh.recordset[0].vehicleType : 'Car';

    const rateRes = await pool.request()
      .input('type', sql.NVarChar, vehicleType)
      .query('SELECT TOP 1 pricePerHour FROM rates WHERE vehicleType=@type');
    const rate = rateRes.recordset.length ? rateRes.recordset[0].pricePerHour : 100;
    const fee = hours * rate;

    // Mark slot as reserved
    await pool.request().input('slotID', sql.Int, slotID)
      .query("UPDATE parking_slots SET status='Reserved', isReserved=1 WHERE slotID=@slotID");

    // Create reservation
    const r = await pool.request()
      .input('vehicleID', sql.Int, resolvedVehicleID)
      .input('slotID', sql.Int, slotID)
      .input('userID', sql.Int, parseInt(userID))
      .input('startTime', sql.DateTime, start)
      .input('endTime', sql.DateTime, end)

      .query(`
  DECLARE @ids TABLE (reservationID INT);
  INSERT INTO reservations (vehicleID, slotID, userID, startTime, endTime)
  OUTPUT INSERTED.reservationID INTO @ids
  VALUES (@vehicleID, @slotID, @userID, @startTime, @endTime);
  SELECT reservationID FROM @ids;
`);

    const reservationID = r.recordset[0].reservationID;

    // Create payment record
    const status = (paymentMethod && paymentMethod !== '') ? 'Paid' : 'Pending';
    const method = paymentMethod || 'Pending';
    await pool.request()
      .input('reservationID', sql.Int, reservationID)
      .input('amount', sql.Decimal, fee)
      .input('method', sql.NVarChar, method)
      .input('status', sql.NVarChar, status)
      .query(`INSERT INTO payments (reservationID, amount, paymentMethod, status)
              VALUES (@reservationID, @amount, @method, @status)`);

    res.json({ reservationID, vehicleID: resolvedVehicleID, fee, message: 'Reservation created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cancel reservation
router.patch('/:id/cancel', async (req, res) => {
  try {
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;