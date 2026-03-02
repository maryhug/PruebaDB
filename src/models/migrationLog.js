const mongoose = require("mongoose");

// Este esquema registra los detalles de cada migración, incluyendo el nombre del archivo, el número total de filas procesadas,
// cuántas filas se insertaron por entidad, cuántas se saltaron por ser duplicados,
// cualquier error encontrado, la duración de la migración y su estado final (éxito, parcial o fallo). Esto permitirá un seguimiento detallado
const migrationLogSchema = new mongoose.Schema(
    {
        filename: { type: String, required: true },
        total_rows: { type: Number, required: true },
        inserted: {
            categories: Number,
            suppliers: Number,
            products: Number,
            customers: Number,
            orders: Number,
            order_items: Number,
        },
        skipped_duplicates: {
            categories: Number,
            suppliers: Number,
            products: Number,
            customers: Number,
            orders: Number,
        },
        errors: [{
            row: Number, message: String
        }],
        duration_ms: Number,
        status: {
            type: String,
            enum: ["success", "partial", "failed"],
            default: "success",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("MigrationLog", migrationLogSchema);