const { Pool } = require("pg");

// Crear un pool de conexiones a PostgreSQL usando la URL de conexión del entorno.
// Si la URL contiene "supabase", se habilita SSL sin verificar el certificado para compatibilidad con Supabase.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("supabase")
        ? { rejectUnauthorized: false }
        : false,
})
console.log("(OK) PostgreSQL pool created with connection string");
;

pool.on("error", (err) => {
    console.error("(AHH!) Unexpected PostgreSQL pool error", err);
    process.exit(1);
});

module.exports = pool;