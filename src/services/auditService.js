const AuditLog = require("../models/auditLog");

const VALID_ACTIONS = new Set(["CREATE", "UPDATE", "DELETE"]);

async function logAction({ action, entity, entityId, snapshot, performedBy = "system", metadata = {} }) {
    try {
        const act = action ? String(action).toUpperCase() : "";
        if (!VALID_ACTIONS.has(act)) {
            throw new Error(`Invalid audit action: ${action}`);
        }
        // crear el log; no lanzar si falla (evitar romper flujo de negocio)
        const doc = new AuditLog({
            entity,
            action: act,
            entity_id: entityId,
            snapshot,
            performed_by: performedBy,
            metadata,
        });
        await doc.save();
        return doc;
    } catch (err) {
        // registrar pero no interrumpir la aplicación
        console.error("AuditLog error:", err && err.message ? err.message : err);
        return null;
    }
}

const logCreate = (args) => logAction({ ...args, action: "CREATE" });
const logUpdate = (args) => logAction({ ...args, action: "UPDATE" });
const logDelete = (args) => logAction({ ...args, action: "DELETE" });

module.exports = { logAction, logCreate, logUpdate, logDelete };
