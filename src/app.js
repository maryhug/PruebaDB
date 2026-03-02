require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectMongo = require("./config/mongodb");
const errorHandler = require("./middleware/errorHandler");

const migrationRoutes = require("./routes/migration");
// const productRoutes   = require("./routes/products");
// const reportRoutes    = require("./routes/reports");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({ ok: true, message: "MegaStore Global API is running" });
});

app.use("/api/migration", migrationRoutes);
// app.use("/api/products",  productRoutes);
// app.use("/api/reports",   reportRoutes);

app.use(errorHandler);

async function start() {
    try {
        await connectMongo();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}

start();