const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("supabase")
        ? { rejectUnauthorized: false }
        : false,
});

pool.on("error", (err) => {
    console.error("Unexpected PostgreSQL pool error", err);
    process.exit(1);
});

(async () => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        console.log('Postgres connected successfully.');
        client.release();
    } catch (err) {
        console.error('Unable to connect to Postgres', err);
        process.exit(1);
    }
})();
module.exports = pool;