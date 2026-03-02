-- 1. Categories
CREATE TABLE IF NOT EXISTS categories (
    id_category   SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    created_at    TIMESTAMP DEFAULT NOW()
    );

-- 2. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id_supplier   SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    created_at    TIMESTAMP DEFAULT NOW()
    );

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
    id_product    SERIAL PRIMARY KEY,
    sku           VARCHAR(50)  NOT NULL UNIQUE,
    name          VARCHAR(255) NOT NULL,
    unit_price    NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    id_category   INT NOT NULL,
    id_supplier   INT NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_product_category FOREIGN KEY (id_category) REFERENCES categories(id_category),
    CONSTRAINT fk_product_supplier FOREIGN KEY (id_supplier) REFERENCES suppliers(id_supplier)
    );

-- 4. Customers
CREATE TABLE IF NOT EXISTS customers (
    id_customer   SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    address       TEXT,
    phone         VARCHAR(20),
    created_at    TIMESTAMP DEFAULT NOW()
    );

-- 5. Orders (transaction header)
CREATE TABLE IF NOT EXISTS orders (
    id_order         SERIAL PRIMARY KEY,
    transaction_code VARCHAR(50) NOT NULL UNIQUE,
    order_date       DATE NOT NULL,
    id_customer      INT NOT NULL,
    created_at       TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_order_customer FOREIGN KEY (id_customer) REFERENCES customers(id_customer)
    );

-- 6. Order Items (transaction line items)
CREATE TABLE IF NOT EXISTS order_items (
    id_order_item   SERIAL PRIMARY KEY,
    id_order        INT NOT NULL,
    id_product      INT NOT NULL,
    quantity        INT NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    total_line      NUMERIC(14,2) NOT NULL CHECK (total_line >= 0),
    created_at      TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_item_order   FOREIGN KEY (id_order)   REFERENCES orders(id_order) ON DELETE CASCADE,
    CONSTRAINT fk_item_product FOREIGN KEY (id_product) REFERENCES products(id_product)
    );

-- ============================================================
-- Useful indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category  ON products(id_category);
CREATE INDEX IF NOT EXISTS idx_products_supplier  ON products(id_supplier);
CREATE INDEX IF NOT EXISTS idx_orders_customer    ON orders(id_customer);
CREATE INDEX IF NOT EXISTS idx_order_items_order  ON order_items(id_order);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(id_product);

-- ============================================================
-- Views (Business Intelligence helpers)
-- ============================================================

-- Revenue per product
CREATE OR REPLACE VIEW vw_product_revenue AS
SELECT
    p.id_product,
    p.sku,
    p.name AS product_name,
    c.name AS category_name,
    SUM(oi.quantity) AS total_qty_sold,
    SUM(oi.total_line) AS total_revenue
FROM order_items oi
         JOIN products   p ON p.id_product  = oi.id_product
         JOIN categories c ON c.id_category = p.id_category
GROUP BY p.id_product, p.sku, p.name, c.name;

-- Supplier inventory value
CREATE OR REPLACE VIEW vw_supplier_inventory AS
SELECT
    s.id_supplier,
    s.name AS supplier_name,
    COUNT(DISTINCT p.id_product) AS product_count,
    SUM(oi.quantity) AS total_items_sold,
    SUM(oi.total_line) AS total_inventory_value
FROM suppliers s
         JOIN products   p  ON p.id_supplier = s.id_supplier
         JOIN order_items oi ON oi.id_product = p.id_product
GROUP BY s.id_supplier, s.name;

-- Customer purchase summary
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