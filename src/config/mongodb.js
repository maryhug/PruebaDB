const mongoose = require("mongoose");

async function connectMongo() {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || "perfomanceTest";

    await mongoose.connect(uri, { dbName });
    console.log(`(OK) MongoDB connected → ${dbName}`);
}

module.exports = connectMongo;
exports.connectMongo = connectMongo;


/*/*/
/*/*/

