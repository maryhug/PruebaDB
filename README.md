```
GET http://localhost:3000/api/health
{
"ok": true,
"message": "MegaStore Global API is running"
}
```

```
POST http://localhost:3000/api/migration
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