const pool = require("../config/postgres");
const AuditLog = require("../models/auditLog");

const SQL_BASE = `
  SELECT p.id_product, p.sku, p.name, p.unit_price,
         c.id_category, c.name AS category,
         s.id_supplier, s.name AS supplier
  FROM products p
  JOIN categories c ON c.id_category = p.id_category
  JOIN suppliers  s ON s.id_supplier = p.id_supplier
`;

async function getAll(req, res, next) {
    try {
        const { category, supplier, sort } = req.query;
        let where = [];
        let params = [];
        let idx = 1;

        if (category) {
            where.push(`LOWER(c.name) = LOWER($${idx++})`);
            params.push(category);
        }
        if (supplier) {
            where.push(`LOWER(s.name) = LOWER($${idx++})`);
            params.push(supplier);
        }

        let sql = SQL_BASE;
        if (where.length) sql += ` WHERE ${where.join(" AND ")}`;

        if (sort === "price_asc") sql += " ORDER BY p.unit_price ASC";
        else if (sort === "price_desc") sql += " ORDER BY p.unit_price DESC";
        else sql += " ORDER BY p.id_product ASC";

        const { rows } = await pool.query(sql, params);
        res.json({ ok: true, count: rows.length, data: rows });
    } catch (err) {
        next(err);
    }
}

async function getById(req, res, next) {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(`${SQL_BASE} WHERE p.id_product = $1`, [id]);
        if (!rows.length) return res.status(404).json({ ok: false, error: "Product not found" });
        res.json({ ok: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
}

async function create(req, res, next) {
    try {
        const { sku, name, unit_price, id_category, id_supplier } = req.body;
        if (!sku || !name || unit_price == null || !id_category || !id_supplier) {
            return res.status(400).json({ ok: false, error: "Missing required fields: sku, name, unit_price, id_category, id_supplier" });
        }

        const { rows } = await pool.query(
            `INSERT INTO products (sku, name, unit_price, id_category, id_supplier)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [sku, name, unit_price, id_category, id_supplier]
        );
        res.status(201).json({ ok: true, data: rows[0] });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({ ok: false, error: "Product with this SKU already exists" });
        }
        next(err);
    }
}

async function update(req, res, next) {
    try {
        const { id } = req.params;
        const { sku, name, unit_price, id_category, id_supplier } = req.body;

        const existing = await pool.query("SELECT * FROM products WHERE id_product = $1", [id]);
        if (!existing.rows.length) return res.status(404).json({ ok: false, error: "Product not found" });

        const { rows } = await pool.query(
            `UPDATE products SET
         sku = COALESCE($1, sku),
         name = COALESCE($2, name),
         unit_price = COALESCE($3, unit_price),
         id_category = COALESCE($4, id_category),
         id_supplier = COALESCE($5, id_supplier)
       WHERE id_product = $6 RETURNING *`,
            [sku, name, unit_price, id_category, id_supplier, id]
        );
        res.json({ ok: true, data: rows[0] });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({ ok: false, error: "SKU already in use" });
        }
        next(err);
    }
}

async function remove(req, res, next) {
    try {
        const { id } = req.params;

        const existing = await pool.query(
            `${SQL_BASE} WHERE p.id_product = $1`, [id]
        );
        if (!existing.rows.length) return res.status(404).json({ ok: false, error: "Product not found" });

        const snapshot = existing.rows[0];

        await pool.query("DELETE FROM order_items WHERE id_product = $1", [id]);
        await pool.query("DELETE FROM products WHERE id_product = $1", [id]);

        await AuditLog.create({
            entity: "product",
            action: "DELETE",
            entity_id: id,
            snapshot,
            performed_by: req.headers["x-user"] || "anonymous",
            metadata: { ip: req.ip },
        });

        res.json({ ok: true, message: "Product deleted and audit log recorded", deleted: snapshot });
    } catch (err) {
        next(err);
    }
}

module.exports = { getAll, getById, create, update, remove };