const mongoose = require("mongoose");

// Este esquema de auditoría registra cada acción realizada sobre las entidades principales del sistema (productos, clientes, proveedores, órdenes, etc.).
// Cada registro incluye el tipo de entidad afectada, la acción realizada (crear, actualizar o eliminar), el ID de la entidad,
// una instantánea del estado de la entidad antes o después de la acción (según corresponda), quién realizó la acción y cualquier metadato adicional relevante.
// Esto permitirá un seguimiento detallado de los cambios en el sistema para fines de seguridad, cumplimiento y análisis histórico.
const auditLogSchema = new mongoose.Schema(
    {
        entity: {
            type: String,
            required: true,
            enum: ["product", "customer", "supplier", "order", "order_item", "category"],
        },
        action: {
            type: String,
            required: true,
            enum: ["DELETE", "UPDATE", "CREATE"],
            set: (v) => (v ? String(v).toUpperCase() : v),
        },
        entity_id: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        snapshot: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        performed_by: {
            type: String,
            default: "system",
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true
    }
);

auditLogSchema.index({ entity: 1, action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
