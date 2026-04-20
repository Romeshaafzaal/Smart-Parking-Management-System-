const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/slots',        require('./routes/slots'));
app.use('/api/vehicles',     require('./routes/vehicles'));
app.use('/api/records',      require('./routes/records'));
app.use('/api/payments',     require('./routes/payments'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/fines',        require('./routes/fines'));
app.use('/api/rates',        require('./routes/rates'));
app.use('/api/users',        require('./routes/users'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));