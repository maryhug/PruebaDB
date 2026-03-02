const mongoose = require("mongoose");

// Conexión a MongoDB usando Mongoose.
// La URI y el nombre de la base de datos se obtienen de las variables de entorno.
async function connectMongo() {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || "perfomanceTest";

    await mongoose.connect(uri, { dbName });
    console.log(`(OK) MongoDB connected → ${dbName}`);
}

module.exports = connectMongo;
exports.connectMongo = connectMongo;
