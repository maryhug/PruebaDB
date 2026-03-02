const pool = require("../config/postgres");
const AuditLog = require("../models/auditLog");

// Reportes y análisis avanzados para insights de negocio
async function supplierAnalysis(_req, res, next) {
    try {
        const { rows } = await pool.query(`
      SELECT
        s.id_supplier,
        s.name   AS supplier_name,
        s.email  AS supplier_email,
        COUNT(DISTINCT p.id_product) AS distinct_products,
        SUM(oi.quantity)             AS total_items_sold,
        SUM(oi.total_line)           AS total_inventory_value
      FROM suppliers s
      JOIN products    p  ON p.id_supplier = s.id_supplier
      JOIN order_items oi ON oi.id_product = p.id_product
      GROUP BY s.id_supplier, s.name, s.email
      ORDER BY total_items_sold DESC
    `);
        res.json({ ok: true, count: rows.length, data: rows });
    } catch (err) {
        next(err);
    }
}

// Para el historial de un cliente, obtenemos primero la información del cliente y luego sus órdenes con los detalles de cada producto comprado.
async function customerHistory(req, res, next) {
    try {
        const { id } = req.params;

        const custResult = await pool.query(
            "SELECT * FROM customers WHERE id_customer = $1", [id]
        );
        if (!custResult.rows.length) {
            return res.status(404).json({ ok: false, error: "Customer not found" });
        }
        const customer = custResult.rows[0];

        const { rows: orders } = await pool.query(`
      SELECT
        o.id_order,
        o.transaction_code,
        o.order_date,
        p.sku,
        p.name   AS product_name,
        c.name   AS category,
        oi.quantity,
        oi.unit_price,
        oi.total_line
      FROM orders o
      JOIN order_items oi ON oi.id_order  = o.id_order
      JOIN products    p  ON p.id_product = oi.id_product
      JOIN categories  c  ON c.id_category = p.id_category
      WHERE o.id_customer = $1
      ORDER BY o.order_date DESC, o.id_order, oi.id_order_item
    `, [id]);

        const orderMap = {};
        for (const row of orders) {
            if (!orderMap[row.id_order]) {
                orderMap[row.id_order] = {
                    id_order: row.id_order,
                    transaction_code: row.transaction_code,
                    order_date: row.order_date,
                    items: [],
                    order_total: 0,
                };
            }
            const lineTotal = parseFloat(row.total_line);
            orderMap[row.id_order].items.push({
                sku: row.sku,
                product_name: row.product_name,
                category: row.category,
                quantity: row.quantity,
                unit_price: parseFloat(row.unit_price),
                total_line: lineTotal,
            });
            orderMap[row.id_order].order_total += lineTotal;
        }

        const totalSpent = Object.values(orderMap).reduce((s, o) => s + o.order_total, 0);

        res.json({
            ok: true,
            customer: { id: customer.id_customer, name: customer.name, email: customer.email },
            total_orders: Object.keys(orderMap).length,
            total_spent: totalSpent,
            orders: Object.values(orderMap),
        });
    } catch (err) {
        next(err);
    }
}

// Para obtener los productos más vendidos por categoría,
// hacemos una consulta que agrupa por producto dentro de la categoría y ordena por el total de ingresos generados.
async function topProductsByCategory(req, res, next) {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ ok: false, error: "Query param 'category' is required" });
        }

        const { rows } = await pool.query(`
      SELECT
        p.id_product,
        p.sku,
        p.name        AS product_name,
        c.name        AS category,
        SUM(oi.quantity)   AS total_qty_sold,
        SUM(oi.total_line) AS total_revenue
      FROM order_items oi
      JOIN products   p ON p.id_product  = oi.id_product
      JOIN categories c ON c.id_category = p.id_category
      WHERE LOWER(c.name) = LOWER($1)
      GROUP BY p.id_product, p.sku, p.name, c.name
      ORDER BY total_revenue DESC
    `, [category]);

        res.json({ ok: true, category, count: rows.length, data: rows });
    } catch (err) {
        next(err);
    }
}

// Para los logs de auditoría, permitimos filtrar por entidad y acción, y limitamos la cantidad de resultados para evitar sobrecargar la respuesta.
async function getAuditLogs(req, res, next) {
    try {
        const { entity, action, limit = 50 } = req.query;
        const filter = {};
        if (entity) filter.entity = entity;
        if (action) filter.action = action;

        const logs = await AuditLog.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit, 10));

        res.json({ ok: true, count: logs.length, data: logs });
    } catch (err) {
        next(err);
    }
}

module.exports = { supplierAnalysis, customerHistory, topProductsByCategory, getAuditLogs };