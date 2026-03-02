-- ============================================================
-- MegaStore Global — DDL Script (PostgreSQL)
-- Database: db_megastore_exam
-- Run: psql -U postgres -d db_megastore_exam -f ddl.sql
-- ============================================================

-- Drop tables if re-running (order matters due to FK constraints)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders     CASCADE;
DROP TABLE IF EXISTS products   CASCADE;
DROP TABLE IF EXISTS customers  CASCADE;
DROP TABLE IF EXISTS suppliers  CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Drop views
DROP VIEW IF EXISTS vw_product_revenue;
DROP VIEW IF EXISTS vw_supplier_inventory;
DROP VIEW IF EXISTS vw_customer_summary;

-- ============================================================
-- 1. Categories (extracted from product_category column)
-- ============================================================
CREATE TABLE categories (
    id_category   SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. Suppliers (extracted from supplier_name + supplier_email)
-- ============================================================
CREATE TABLE suppliers (
    id_supplier   SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 3. Products (extracted from product_sku, product_name, etc.)
--    unit_price belongs here (not in a separate table) since
--    it functionally depends on the product (SKU), satisfying 3NF.
-- ============================================================
CREATE TABLE products (
    id_product    SERIAL PRIMARY KEY,
    sku           VARCHAR(50)  NOT NULL UNIQUE,
    name          VARCHAR(255) NOT NULL,
    unit_price    NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    id_category   INT NOT NULL REFERENCES categories(id_category),
    id_supplier   INT NOT NULL REFERENCES suppliers(id_supplier),
    created_at    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 4. Customers (extracted from customer_name, email, address, phone)
-- ============================================================
CREATE TABLE customers (
    id_customer   SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    address       TEXT,
    phone         VARCHAR(20),
    created_at    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 5. Orders (one per transaction_id)
-- ============================================================
CREATE TABLE orders (
    id_order         SERIAL PRIMARY KEY,
    transaction_code VARCHAR(50) NOT NULL UNIQUE,
    order_date       DATE NOT NULL,
    id_customer      INT NOT NULL REFERENCES customers(id_customer),
    created_at       TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 6. Order Items (one per CSV row: a line item within an order)
-- ============================================================
CREATE TABLE order_items (
    id_order_item   SERIAL PRIMARY KEY,
    id_order        INT NOT NULL REFERENCES orders(id_order) ON DELETE CASCADE,
    id_product      INT NOT NULL REFERENCES products(id_product),
    quantity        INT NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    total_line      NUMERIC(14,2) NOT NULL CHECK (total_line >= 0),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Indexes for query performance
-- ============================================================
CREATE INDEX idx_products_category   ON products(id_category);
CREATE INDEX idx_products_supplier   ON products(id_supplier);
CREATE INDEX idx_orders_customer     ON orders(id_customer);
CREATE INDEX idx_order_items_order   ON order_items(id_order);
CREATE INDEX idx_order_items_product ON order_items(id_product);

-- ============================================================
-- Views
-- ============================================================

CREATE OR REPLACE VIEW vw_product_revenue AS
SELECT
p.id_product,
    p.sku,
    p.name AS product_name,
    c.name AS category_name,
    SUM(oi.quantity)   AS total_qty_sold,
    SUM(oi.total_line) AS total_revenue
FROM order_items oi
JOIN products   p ON p.id_product  = oi.id_product
JOIN categories c ON c.id_category = p.id_category
GROUP BY p.id_product, p.sku, p.name, c.name;

CREATE OR REPLACE VIEW vw_supplier_inventory AS
SELECT
s.id_supplier,
    s.name AS supplier_name,
    COUNT(DISTINCT p.id_product) AS product_count,
    SUM(oi.quantity)   AS total_items_sold,
    SUM(oi.total_line) AS total_inventory_value
FROM suppliers s
JOIN products    p  ON p.id_supplier = s.id_supplier
JOIN order_items oi ON oi.id_product = p.id_product
GROUP BY s.id_supplier, s.name;

CREATE OR REPLACE VIEW vw_customer_summary AS
SELECT
cu.id_customer,
    cu.name AS customer_name,
    cu.email,
    COUNT(DISTINCT o.id_order) AS total_orders,
    SUM(oi.total_line) AS total_spent
FROM customers cu
JOIN orders      o  ON o.id_customer  = cu.id_customer
JOIN order_items oi ON oi.id_order    = o.id_order
GROUP BY cu.id_customer, cu.name, cu.email;