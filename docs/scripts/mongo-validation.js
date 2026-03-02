
use("db_megastore_exam");

// ============================================================
// 1. audit_logs collection — stores DELETE audit trail
// ============================================================
db.createCollection("audit_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["entity", "action", "entity_id", "snapshot"],
      properties: {
        entity: {
          bsonType: "string",
          enum: [
            "product",
            "customer",
            "supplier",
            "order",
            "order_item",
            "category",
          ],
          description: "The entity type that was affected",
        },
        action: {
          bsonType: "string",
          enum: ["DELETE", "UPDATE", "CREATE"],
          description: "The action performed",
        },
        entity_id: {
          description: "The ID of the affected entity (SQL PK)",
        },
        snapshot: {
          bsonType: "object",
          description:
            "Full snapshot of the entity at the time of deletion (embedded for fast reads without JOINs)",
        },
        performed_by: {
          bsonType: "string",
          description: "User or system that performed the action",
        },
        metadata: {
          bsonType: "object",
          description: "Extra context like IP address, user agent, etc.",
        },
      },
    },
  },
});

db.audit_logs.createIndex({ entity: 1, action: 1 });
db.audit_logs.createIndex({ createdAt: -1 });

print("✔ audit_logs collection created with schema validation and indexes");

// ============================================================
// 2. migration_logs collection — stores migration run history
// ============================================================
db.createCollection("migration_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["filename", "total_rows", "status"],
      properties: {
        filename: {
          bsonType: "string",
          description: "Name of the CSV file processed",
        },
        total_rows: {
          bsonType: "int",
          minimum: 0,
          description: "Total rows in the CSV",
        },
        inserted: {
          bsonType: "object",
          description: "Counts of newly created entities per table",
        },
        skipped_duplicates: {
          bsonType: "object",
          description: "Counts of skipped duplicates per table",
        },
        errors: {
          bsonType: "array",
          description: "Row-level errors encountered during migration",
        },
        duration_ms: {
          bsonType: "int",
          description: "Total migration time in milliseconds",
        },
        status: {
          bsonType: "string",
          enum: ["success", "partial", "failed"],
        },
      },
    },
  },
});

db.migration_logs.createIndex({ createdAt: -1 });

print("✔ migration_logs collection created with schema validation and indexes");

print("\n=== MongoDB setup complete ===");