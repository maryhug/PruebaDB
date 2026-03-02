const mongoose = require("mongoose");

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