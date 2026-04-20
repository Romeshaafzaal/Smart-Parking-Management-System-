const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

router.get('/', async (req, res) => {
  const pool = await poolPromise;
  const r = await pool.request().query('SELECT * FROM rates');
  res.json(r.recordset);
});

router.post('/', async (req, res) => {
  const { vehicleType, pricePerHour } = req.body;
  const pool = await poolPromise;
  const r = await pool.request()
    .input('type', sql.NVarChar, vehicleType)
    .input('price', sql.Decimal, pricePerHour)
    .query('INSERT INTO rates (vehicleType,pricePerHour) OUTPUT INSERTED.rateID VALUES (@type,@price)');
  res.json({ rateID: r.recordset[0].rateID });
});

router.delete('/:id', async (req, res) => {
  const pool = await poolPromise;
  await pool.request().input('id', sql.Int, req.params.id)
    .query('DELETE FROM rates WHERE rateID=@id');
  res.json({ message: 'Deleted' });
});

module.exports = router;