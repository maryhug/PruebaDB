require('dotenv').config();
const { pool }    = require('../src/config/postgres');
const { connect, PatientHistory } = require('../src/config/mongodb');

const reset = async () => {
    console.log('🔌 Connecting to databases...');
    await connect();
    console.log('');

    console.log('🗑️  Dropping PostgreSQL tables...');
    const client = await pool.connect();
    try {

        await client.query(`
            DROP TABLE IF EXISTS order_items CASCADE;
            DROP TABLE IF EXISTS orders     CASCADE;
            DROP TABLE IF EXISTS products   CASCADE;
            DROP TABLE IF EXISTS customers  CASCADE;
            DROP TABLE IF EXISTS suppliers  CASCADE;
            DROP TABLE IF EXISTS categories CASCADE;
    `);
        console.log('✅ PostgreSQL: all tables dropped');
    } finally {
        client.release();
        await pool.end();
    }

    console.log('🗑️  Dropping MongoDB collections...');
    await dbName.collection.drop().catch(err => {
        if (err.message === 'ns not found') {
            console.log('ℹ️  MongoDB: collection did not exist (skipping)');
        } else {
            throw err;
        }
    });
    console.log('✅ MongoDB: dbName collection dropped');

    console.log('');
    console.log('🧹 Reset complete. Both databases are clean.');
    console.log('💡 Run "npm run dev" to recreate schema automatically.');
    process.exit(0);
};

reset().catch(err => {
    console.error('❌ Reset failed:', err.message);
    process.exit(1);
});