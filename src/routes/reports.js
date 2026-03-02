const { Router } = require("express");
const ctrl = require("../services/reportService");

const router = Router();

router.get("/suppliers",              ctrl.supplierAnalysis);
router.get("/customers/:id/history",  ctrl.customerHistory);
router.get("/top-products",           ctrl.topProductsByCategory);
router.get("/audit-logs",             ctrl.getAuditLogs);

module.exports = router;