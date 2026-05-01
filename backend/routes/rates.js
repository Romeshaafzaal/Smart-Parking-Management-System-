const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request().query('SELECT * FROM rates ORDER BY vehicleType');
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { vehicleType, pricePerHour } = req.body;
  if (!vehicleType || !pricePerHour)
    return res.status(400).json({ error: 'vehicleType and pricePerHour required' });
  try {
    const pool = await poolPromise;
    const r = await pool.request()
      .input('type', sql.NVarChar, vehicleType)
      .input('price', sql.Decimal, pricePerHour)
      .query('INSERT INTO rates (vehicleType, pricePerHour) OUTPUT INSERTED.rateID VALUES (@type, @price)');
    res.json({ rateID: r.recordset[0].rateID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', async (req, res) => {
  const { pricePerHour } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('price', sql.Decimal, pricePerHour)
      .query('UPDATE rates SET pricePerHour = @price WHERE rateID = @id');
    res.json({ message: 'Rate updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM rates WHERE rateID = @id');
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;