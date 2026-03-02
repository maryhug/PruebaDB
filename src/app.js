const express = require('express');
const cors    = require('cors');
const migrationRoutes = require("./routes/migration");


const app = express();

app.use(cors());

app.use(express.json());

/*
// Monta los routers de cada módulo bajo un prefijo /api.
// Cada archivo en routes/* organiza los endpoints de un dominio específico.
app.use('/api/simulacro',   require('./routes/simulacro'));
app.use('/api/doctors',     require('./routes/doctors'));
app.use('/api/reports',     require('./routes/reports'));
app.use('/api/patients',    require('./routes/patients'));
app.use('/api/treatments',  require('./routes/treatments'));
app.use('/api/insurances',  require('./routes/insurances'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/status', require('./routes/status'));
*/

app.use("/api/migration", migrationRoutes);


app.use((req, res) => res.status(404).json({ ok: false, error: 'Route not found' }));

module.exports = app;