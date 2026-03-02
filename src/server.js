require('dotenv').config();

const app= require('./app.js');

const { initSchema } = require('./config/postgres.js');

const { connect: connectMongo } = require('./config/mongodb.js');

const { PORT }       = require('./config/env.js');

const start = async () => {
    try {
        await connectMongo();
        await initSchema();
        app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
    } catch (err) {
        console.error('❌ Startup error:', err.message);
        process.exit(1);
    }
};

start();