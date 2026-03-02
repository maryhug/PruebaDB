const mongoose = require("mongoose");

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
    { timestamps: true }
);

auditLogSchema.index({ entity: 1, action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);