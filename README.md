## MegaStore Global API

### Project structure

```
PruebaDB/
├── src/
│   ├── config/
│   │   ├── env.js
│   │   ├── postgres.js                  
│   │   └── mongodb.js               
│   ├── models/
│   │   ├── auditLog.js            
│   │   └── migrationLog.js        
│   ├── services/
│   │   ├── migrationService.js 
│   │   ├── productService.js   
│   │   └── reportService.js   
│   ├── routes/
│   │   ├── customer.js
│   │   ├── migration.js
│   │   ├── products.js
│   │   └── reports.js
│   ├── middleware/
│   │   └── errorHandler.js
│   └── app.js                    
├── sql/
│   └── schema.sql                
├── docs/
│   ├── AM-prueba-desempeno-data_m4.csv 
│   ├── DER.svg
│   └── Prueba de desempeño M4.pdf
├── postman/
│   └── MegaStore_Global.postman_collection.json
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```


## Clone & Install
```
git clone https://github.com/maryhug/PruebaDB.git
cd PruebaDB
npm install
```

## Environment Variables
```
cp .env.example .env
```

## NPM Scripts & Workflow
### Start the Server (auto-creates schema)

```
npm run dev
```   
This will:

- Connect to PostgreSQL (Supabase) and MongoDB.
- Run initSchema() to create tables and indexes if they don't exist.
- Start Express at http://localhost:3000.

### Check Schema & Data Status
#### GET http://localhost:3000/api/health
```
{
"ok": true,
"message": "MegaStore Global API is running"
}
```

### Run Migration via API
#### POST http://localhost:3000/api/migration

Possible responses:
```
{
    "ok": true,
    "message": "Migration success: 78 rows processed in 65740ms",
    "summary": {
        "inserted": {
            "categories": 3,
            "suppliers": 5,
            "products": 15,
            "customers": 9,
            "orders": 30,
            "order_items": 78
        },
        "skipped_duplicates": {
            "categories": 75,
            "suppliers": 73,
            "products": 63,
            "customers": 69,
            "orders": 48
        }
    },
    "errors_count": 0,
    "errors_sample": [],
    "migration_log_id": "69a5d3bcd0d11090b47c1e6a"
}
```

```
{
    "ok": true,
    "message": "Migration failed: 78 rows processed in 86932ms",
    "summary": {
        "inserted": {
            "categories": 0,
            "suppliers": 0,
            "products": 0,
            "customers": 0,
            "orders": 0,
            "order_items": 0
        },
        "skipped_duplicates": {
            "categories": 0,
            "suppliers": 0,
            "products": 0,
            "customers": 0,
            "orders": 0
        }
    },
    "errors_count": 78,
    "migration_log_id": "69a5a6ab3d439861c97b8545"
}
```
```
{
"ok": true,
"message": "Migration success: 78 rows processed in 64826ms",
"summary": {
"inserted": {
"categories": 0,
"suppliers": 0,
"products": 0,
"customers": 0,
"orders": 0,
"order_items": 78
},
"skipped_duplicates": {
"categories": 78,
"suppliers": 78,
"products": 78,
"customers": 78,
"orders": 78
}
},
"errors_count": 0,
"errors_sample": [],
"migration_log_id": "69a5b7413627d546df2ba6c1"
}
```

## Endpoints API

### Health Check

| Method | Route         | Description                   |
|--------|---------------|-------------------------------|
| GET    | `/api/health` | Check server status |

### Migration

| Method | Route         | Description                  |
|--------|------|------------- |
| POST | `/api/migration` | Run CSV migration (idempotent) |

### Products (CRUD)

| Method | Route         | Description                   |
|--------|------|-------------|
| GET | `/api/products` | List all products. Filters: `?category=`, `?supplier=`, `?sort=price_asc\|price_desc` |
| GET | `/api/products/:id` | Get a product by ID |
| POST | `/api/products` | Create a new product |
| PUT | `/api/products/:id` | Update an existing product |
| DELETE | `/api/products/:id` | Delete a product (saves an audit log in MongoDB) |

**Example of a body for creating/updating a product:**

```json
{
  "sku": "NEW-SKU-001",
  "name": "Producto Nuevo",
  "unit_price": 99000,
  "id_category": 1,
  "id_supplier": 1
}
```

**Example for deletion with auditing (header optional):**

```
DELETE /api/products/1
Header: x-user: admin@megastore.com
```

### Reports (Business Intelligence)

| Method | Route         | Description                   |
|--------|------|---------------------------------------------------------------------------|
| GET | `/api/reports/suppliers` | Supplier analysis: items sold and inventory value   |
| GET | `/api/reports/customers/:id/history` | Complete purchase history of a customer |
| GET | `/api/reports/top-products?category=X` | Top-selling products by category, sorted by revenue             |
| GET | `/api/reports/audit-logs` | Consult audit logs. Filters: `?entity=product`, `?action=DELETE` |

---








## Data Model Justification

### PostgreSQL — Why Relational?

Business data (customers, products, suppliers, orders) has **well-defined relationships** and requires **ACID transactions**, **referential integrity**, and **complex JOINs** for reporting. A relational engine is the natural choice.

#### Normalization Process (1NF → 3NF)

**Starting Point (0NF):** The original CSV file has one flat row per order line, mixing customer, product, supplier, and transaction data — full of redundancy.

**1NF — Eliminate Repeating Groups:**
- Each cell has an atomic value (already fulfilled in the CSV structure).

- Each row is uniquely identified by `(transaction_id, product_sku)`.

**2NF — Eliminate Partial Dependencies:**
- `customer_name`, `customer_email`, `customer_address`, `customer_phone` depend only on the customer, not the full composite key → extracted to the **`customers`** table.

- `supplier_name`, `supplier_email` depend only on the supplier → extracted to **`suppliers`**.

- `product_name`, `unit_price`, `product_category` depend only on the `product_sku` → extracted to **`products`**.

**3NF — Eliminate Transitive Dependencies:**
- `product_category` is a property of the product, but describes a *category entity* → extracted to **`categories`** with its own primary key.

`3NF` - The `date` and `customer` fields depend on the `transaction_id` (order header), not on the individual lines → extracted to **`orders`**.

- The individual lines (quantity, unit price, total) form the **`order_items`** table.
#### Esquema SQL Final (6 tablas, 3FN):

| Tabla | Proposito | Restriccion Clave |
|-------|-----------|-------------------|
| `categories` | Clasificacion de productos | `name UNIQUE` |
| `suppliers` | Datos maestros de proveedores | `email UNIQUE` |
| `products` | Catalogo de productos | `sku UNIQUE`, FK → categories, suppliers |
| `customers` | Datos maestros de clientes | `email UNIQUE` |
| `orders` | Cabeceras de transaccion | `transaction_code UNIQUE`, FK → customers |
| `order_items` | Lineas de detalle por orden | FK → orders, products |

### MongoDB — Why NoSQL?

Two collections are stored in MongoDB, each for a clear architectural reason:

#### `audit_logs` — Why Embedded Snapshots?

- **Frequent Writes, Infrequent Reads**: Audit logs are appended to each DELETE but are rarely queried in bulk.

- **Schema Flexibility**: The `snapshot` field stores the complete state of the entity at the time of its deletion. Since different entities (products, customers) have different structures, embedding the snapshot avoids a rigid schema.

- **No Need for JOINs**: When auditing, you need the complete picture in a single document — who, what, when, and the complete deleted record. Embedding achieves this with a single read.

- **Referencing Would Be Useless**: The original SQL record is deleted, so a reference (foreign key) would point to nothing.

#### `migration_logs` — Why embedded counters?

- **Self-contained report**: Each migration run is a single document with counters for inserted/skipped data per table, error array, and time.

- **Flexible error array**: Each migration can produce a variable number of errors with different structures — ideal for MongoDB's flexible arrays.

- **No relation to other entities**: Migration logs are operational metadata, not business data.
