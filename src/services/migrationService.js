// src/services/migrationService.js

// Módulos nativos para trabajar con el sistema de archivos y rutas.
const fs = require('fs');
const path = require('path');

// csv-parse/sync permite leer el CSV completo de forma síncrona y obtener un arreglo de objetos.
const { parse } = require('csv-parse/sync');

// Funciones y pool de PostgreSQL: ejecutar queries, inicializar el esquema y manejar la conexión.
const { initSchema, pool } = require('../config/postgres');

// Modelo de MongoDB donde se guardan los historiales (desnormalizado) por cliente.
const { customerHistory } = require('../config/mongodb');

// Ruta del CSV definida en variables de entorno/configuración.
const { CSV_PATH } = require('../config/env');

// Función utilitaria para capitalizar nombres (cada palabra con primera letra en mayúscula).
const capitalize = (str) =>
    str
        ? str
            .trim()
            .split(' ')
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ')
        : '';

/**
 * Migración principal: lee el CSV y pobla PostgreSQL (3NF) + MongoDB (historial desnormalizado).
 *
 * Asume un CSV con (al menos) estas columnas (puedes ajustar nombres si tu CSV difiere):
 * - customer_name, customer_last_name, customer_email, customer_phone, customer_address
 * - category_name
 * - supplier_name, supplier_email
 * - product_sku, product_name, product_price
 * - transaction_date, transaction_code
 * - quantity
 *
 * Nota: total_line_price se calcula como quantity * product_price.
 */

const migrate = async ({ clearBefore = false } = {}) => {
    // Resuelve la ruta absoluta del archivo CSV.
    const csvPath = path.resolve(CSV_PATH);
    if (!fs.existsSync(csvPath)) throw new Error(`CSV not found at: ${csvPath}`);

    // Lee el contenido del archivo y lo parsea a filas con cabeceras (columns: true).
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

    // Se asegura de que el esquema de PostgreSQL exista antes de insertar datos.
    // IMPORTANTE: tu initSchema actualmente hace DROP TABLE ... y luego CREATE TABLE.
    // Eso ya limpia datos, incluso si clearBefore=false.
    await initSchema();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (clearBefore) {
            // Limpieza previa (por si más adelante cambias initSchema a "solo CREATE TABLE IF NOT EXISTS")
            // Respeta orden de dependencias (FKs).
            await client.query('DELETE FROM transaction_details');
            await client.query('DELETE FROM transactions');
            await client.query('DELETE FROM product_suppliers');
            await client.query('DELETE FROM products');
            await client.query('DELETE FROM suppliers');
            await client.query('DELETE FROM product_category');
            await client.query('DELETE FROM customers');

            // Limpia también los historiales en MongoDB.
            await customerHistory.deleteMany({});
            console.log('🗑️  Previous data cleared');
        }

        // ── Extraer entidades únicas del CSV ─────────────────────────────

        const customersMap = new Map(); // key: email
        const categoriesMap = new Map(); // key: category_name
        const suppliersMap = new Map(); // key: supplier_email
        const productsMap = new Map(); // key: product_sku
        const productSupplierPairs = new Map(); // key: `${sku}::${supplierEmail}`
        const transactionsMap = new Map(); // key: transaction_code
        const transactionDetailsMap = new Map(); // key: `${transaction_code}::${sku}::${supplierEmail}`

        for (const row of rows) {
            // Customers
            const cEmail = (row.customer_email || '').toLowerCase().trim();
            if (cEmail && !customersMap.has(cEmail)) {
                customersMap.set(cEmail, {
                    name: capitalize(row.customer_name),
                    last_name: capitalize(row.customer_last_name),
                    email: cEmail,
                    phone: row.customer_phone?.trim() || null,
                    address: row.customer_address?.trim() || null,
                });
            }

            // Category
            const categoryName = row.category_name?.trim();
            if (categoryName && !categoriesMap.has(categoryName)) {
                categoriesMap.set(categoryName, { category_name: categoryName });
            }

            // Supplier
            const sEmail = (row.supplier_email || '').toLowerCase().trim();
            if (sEmail && !suppliersMap.has(sEmail)) {
                suppliersMap.set(sEmail, {
                    name: capitalize(row.supplier_name),
                    email: sEmail,
                });
            }

            // Product
            const sku = row.product_sku?.trim();
            if (sku && !productsMap.has(sku)) {
                productsMap.set(sku, {
                    product_sku: sku,
                    product_name: row.product_name?.trim() || '',
                    product_price: parseFloat(row.product_price) || 0,
                    category_name: categoryName || null,
                });
            }

            // Product-Supplier pair
            if (sku && sEmail) {
                const psKey = `${sku}::${sEmail}`;
                if (!productSupplierPairs.has(psKey)) {
                    productSupplierPairs.set(psKey, { product_sku: sku, supplier_email: sEmail });
                }
            }

            // Transaction
            const tCode = row.transaction_code?.trim();
            if (tCode && !transactionsMap.has(tCode)) {
                transactionsMap.set(tCode, {
                    transaction_code: tCode,
                    transaction_date: row.transaction_date,
                    customer_email: cEmail,
                });
            }

            // Transaction details (uniqueness aligned with DB constraint:
            // UNIQUE (transaction_id, product_id_supplier)
            // We model input uniqueness by (transaction_code + sku + supplier_email)
            if (tCode && sku && sEmail) {
                const quantity = parseInt(row.quantity, 10) || 0;
                const unitPrice = parseFloat(row.product_price) || 0;
                const totalLinePrice = parseFloat(row.total_line_price) || quantity * unitPrice;

                const tdKey = `${tCode}::${sku}::${sEmail}`;
                if (!transactionDetailsMap.has(tdKey)) {
                    transactionDetailsMap.set(tdKey, {
                        transaction_code: tCode,
                        product_sku: sku,
                        supplier_email: sEmail,
                        quantity,
                        total_line_price: totalLinePrice,
                    });
                } else {
                    // Si el CSV repite la misma línea, acumulamos cantidad y total (opcional, ajusta a tu regla).
                    const prev = transactionDetailsMap.get(tdKey);
                    prev.quantity += quantity;
                    prev.total_line_price += totalLinePrice;
                }
            }
        }

        // ── UPSERT customers ─────────────────────────────────────────────
        const customerIdMap = new Map(); // email -> id
        for (const c of customersMap.values()) {
            const res = await client.query(
                `INSERT INTO customers (name, last_name, email, phone, address)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE
           SET name = $1, last_name = $2, phone = $4, address = $5
         RETURNING id`,
                [c.name, c.last_name, c.email, c.phone, c.address]
            );
            customerIdMap.set(c.email, res.rows[0].id);
        }
        console.log(`👤 Customers upserted: ${customersMap.size}`);

        // ── UPSERT product_category ─────────────────────────────────────
        const categoryIdMap = new Map(); // category_name -> id
        for (const cat of categoriesMap.values()) {
            const res = await client.query(
                `INSERT INTO product_category (category_name)
         VALUES ($1)
         ON CONFLICT (category_name) DO UPDATE
           SET category_name = $1
         RETURNING id`,
                [cat.category_name]
            );
            categoryIdMap.set(cat.category_name, res.rows[0].id);
        }
        console.log(`🏷️  Categories upserted: ${categoriesMap.size}`);

        // ── UPSERT suppliers ────────────────────────────────────────────
        const supplierIdMap = new Map(); // email -> id
        for (const s of suppliersMap.values()) {
            const res = await client.query(
                `INSERT INTO suppliers (name, email)
         VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE
           SET name = $1
         RETURNING id`,
                [s.name, s.email]
            );
            supplierIdMap.set(s.email, res.rows[0].id);
        }
        console.log(`🏭 Suppliers upserted: ${suppliersMap.size}`);

        // ── UPSERT products ─────────────────────────────────────────────
        const productIdMap = new Map(); // sku -> id
        for (const p of productsMap.values()) {
            const categoryId = p.category_name ? categoryIdMap.get(p.category_name) : null;

            const res = await client.query(
                `INSERT INTO products (product_sku, product_name, product_price, product_category_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (product_sku) DO UPDATE
           SET product_name = $2, product_price = $3, product_category_id = $4
         RETURNING id`,
                [p.product_sku, p.product_name, p.product_price, categoryId]
            );
            productIdMap.set(p.product_sku, res.rows[0].id);
        }
        console.log(`📦 Products upserted: ${productsMap.size}`);

        // ── UPSERT product_suppliers ────────────────────────────────────
        const productSupplierIdMap = new Map(); // `${sku}::${supplierEmail}` -> id
        for (const pair of productSupplierPairs.values()) {
            const productId = productIdMap.get(pair.product_sku);
            const supplierId = supplierIdMap.get(pair.supplier_email);

            if (!productId || !supplierId) continue;

            const res = await client.query(
                `INSERT INTO product_suppliers (product_id, supplier_id)
         VALUES ($1, $2)
         ON CONFLICT (product_id, supplier_id) DO UPDATE
           SET product_id = EXCLUDED.product_id
         RETURNING id`,
                [productId, supplierId]
            );

            productSupplierIdMap.set(`${pair.product_sku}::${pair.supplier_email}`, res.rows[0].id);
        }
        console.log(`🔗 Product-Supplier pairs upserted: ${productSupplierPairs.size}`);

        // ── UPSERT transactions ─────────────────────────────────────────
        const transactionIdMap = new Map(); // transaction_code -> id
        for (const t of transactionsMap.values()) {
            const customerId = t.customer_email ? customerIdMap.get(t.customer_email) : null;

            if (!customerId) {
                console.warn(`⚠️  Skipping transaction ${t.transaction_code}: missing customer`);
                continue;
            }

            const res = await client.query(
                `INSERT INTO transactions (transaction_date, transaction_code, customer_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (transaction_code) DO UPDATE
           SET transaction_date = $1, customer_id = $3
         RETURNING id`,
                [t.transaction_date, t.transaction_code, customerId]
            );

            transactionIdMap.set(t.transaction_code, res.rows[0].id);
        }
        console.log(`🧾 Transactions upserted: ${transactionsMap.size}`);

        // ── UPSERT/INSERT transaction_details ───────────────────────────
        let transactionDetailsCount = 0;
        for (const td of transactionDetailsMap.values()) {
            const transactionId = transactionIdMap.get(td.transaction_code);
            const psId = productSupplierIdMap.get(`${td.product_sku}::${td.supplier_email}`);

            if (!transactionId || !psId) {
                console.warn(
                    `⚠️  Skipping detail tx=${td.transaction_code} sku=${td.product_sku} supplier=${td.supplier_email}: missing FK`
                );
                continue;
            }

            await client.query(
                `INSERT INTO transaction_details
           (transaction_id, product_id_supplier, quantity, total_line_price)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (transaction_id, product_id_supplier) DO UPDATE
           SET quantity = $3, total_line_price = $4`,
                [transactionId, psId, td.quantity, td.total_line_price]
            );

            transactionDetailsCount++;
        }
        console.log(`🧩 Transaction details upserted: ${transactionDetailsCount}`);

        await client.query('COMMIT');

        // ── MongoDB: construir historiales por cliente ───────────────────
        // Estructura según tu schema:
        // customerHistory: { customersEmail, customerid, transactions: [ { ... } ] }
        const historiesMap = new Map(); // customersEmail -> history

        for (const row of rows) {
            const cEmail = (row.customer_email || '').toLowerCase().trim();
            if (!cEmail) continue;

            if (!historiesMap.has(cEmail)) {
                const customerId = customerIdMap.get(cEmail);
                historiesMap.set(cEmail, {
                    customersEmail: cEmail,
                    customerid: customerId ? String(customerId) : null,
                    transactions: [],
                });
            }

            const txCode = row.transaction_code?.trim();
            if (!txCode) continue;

            // Ojo: tu transactionsSchema guarda "flat" por línea.
            // Aquí guardamos una entrada por cada línea del CSV (detalle).
            const transactionId = transactionIdMap.get(txCode);
            const customerId = customerIdMap.get(cEmail);

            const sku = row.product_sku?.trim();
            const sEmail = (row.supplier_email || '').toLowerCase().trim();
            const psId = sku && sEmail ? productSupplierIdMap.get(`${sku}::${sEmail}`) : null;

            historiesMap.get(cEmail).transactions.push({
                transaction_id: transactionId ? String(transactionId) : null,
                transaction_date: row.transaction_date,
                transaction_code: txCode,
                customer_id: customerId ? String(customerId) : null,
                transaction_detailsID: null, // no lo tenemos directo; si lo necesitas, hay que RETURNING id al insertar details.
                product_id_supplier: psId ? String(psId) : null,
                quantity: parseInt(row.quantity, 10) || 0,
                total_line_price:
                    parseFloat(row.total_line_price) ||
                    (parseInt(row.quantity, 10) || 0) * (parseFloat(row.product_price) || 0),
            });
        }

        for (const history of historiesMap.values()) {
            await customerHistory.findOneAndUpdate(
                { customersEmail: history.customersEmail },
                { $set: history },
                { upsert: true, new: true }
            );
        }
        console.log(`📋 Customer histories upserted: ${historiesMap.size}`);

        return {
            customers: customersMap.size,
            categories: categoriesMap.size,
            suppliers: suppliersMap.size,
            products: productsMap.size,
            productSuppliers: productSupplierPairs.size,
            transactions: transactionsMap.size,
            transactionDetails: transactionDetailsCount,
            histories: historiesMap.size,
            csvPath: CSV_PATH,
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = { migrate };