const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const pool = require("../config/postgres");
const MigrationLog = require("../models/migrationLog");

async function getOrCreate(table, uniqueCol, uniqueVal, insertCols, insertVals) {
    const select = await pool.query(
        `SELECT * FROM ${table} WHERE ${uniqueCol} = $1`,
        [uniqueVal]
    );
    if (select.rows.length > 0) return { row: select.rows[0], created: false };

    const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(", ");
    const insert = await pool.query(
        `INSERT INTO ${table} (${insertCols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        insertVals
    );
    return { row: insert.rows[0], created: true };
}

async function runMigration(_req, res, next) {
    const startTime = Date.now();
    const csvPath = path.resolve(process.env.CSV_PATH || "./data/AM-prueba-desempeno-data_m4.csv");

    if (!fs.existsSync(csvPath)) {
        return res.status(400).json({ ok: false, error: `CSV not found: ${csvPath}` });
    }

    const rows = [];
    const errors = [];
    const counters = {
        inserted: { categories: 0, suppliers: 0, products: 0, customers: 0, orders: 0, order_items: 0 },
        skipped: { categories: 0, suppliers: 0, products: 0, customers: 0, orders: 0 },
    };

    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on("data", (row) => rows.push(row))
                .on("end", resolve)
                .on("error", reject);
        });

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            try {
                const { row: cat, created: catNew } = await getOrCreate(
                    "categories", "name", r.product_category,
                    ["name"], [r.product_category]
                );
                catNew ? counters.inserted.categories++ : counters.skipped.categories++;

                const { row: sup, created: supNew } = await getOrCreate(
                    "suppliers", "email", r.supplier_email,
                    ["name", "email"], [r.supplier_name, r.supplier_email]
                );
                supNew ? counters.inserted.suppliers++ : counters.skipped.suppliers++;

                const cleanPrice = parseFloat(r.unit_price) || 0;
                const { row: prod, created: prodNew } = await getOrCreate(
                    "products", "sku", r.product_sku,
                    ["sku", "name", "unit_price", "id_category", "id_supplier"],
                    [r.product_sku, r.product_name, cleanPrice, cat.id_category, sup.id_supplier]
                );
                prodNew ? counters.inserted.products++ : counters.skipped.products++;

                const { row: cust, created: custNew } = await getOrCreate(
                    "customers", "email", r.customer_email,
                    ["name", "email", "address", "phone"],
                    [r.customer_name, r.customer_email, r.customer_address, r.customer_phone]
                );
                custNew ? counters.inserted.customers++ : counters.skipped.customers++;

                const orderDate = r.date || new Date().toISOString().slice(0, 10);
                const { row: order, created: ordNew } = await getOrCreate(
                    "orders", "transaction_code", r.transaction_id,
                    ["transaction_code", "order_date", "id_customer"],
                    [r.transaction_id, orderDate, cust.id_customer]
                );
                ordNew ? counters.inserted.orders++ : counters.skipped.orders++;

                const qty = parseInt(r.quantity, 10) || 1;
                const totalLine = parseFloat(r.total_line_value) || cleanPrice * qty;

                await pool.query(
                    `INSERT INTO order_items (id_order, id_product, quantity, unit_price, total_line)
           VALUES ($1, $2, $3, $4, $5)`,
                    [order.id_order, prod.id_product, qty, cleanPrice, totalLine]
                );
                counters.inserted.order_items++;
            } catch (rowErr) {
                errors.push({ row: i + 2, message: rowErr.message });
            }
        }

        const duration = Date.now() - startTime;
        const status = errors.length === 0 ? "success" : errors.length < rows.length ? "partial" : "failed";

        const log = await MigrationLog.create({
            filename: path.basename(csvPath),
            total_rows: rows.length,
            inserted: counters.inserted,
            skipped_duplicates: counters.skipped,
            errors,
            duration_ms: duration,
            status,
        });

        res.status(200).json({
            ok: true,
            message: `Migration ${status}: ${rows.length} rows processed in ${duration}ms`,
            summary: { inserted: counters.inserted, skipped_duplicates: counters.skipped },
            errors_count: errors.length,
            migration_log_id: log._id,
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { runMigration };