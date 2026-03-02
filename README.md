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
