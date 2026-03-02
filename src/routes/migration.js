const { Router } = require("express");
const { runMigration } = require("../services/migrationService");

const router = Router();

router.post("/", runMigration);

module.exports = router;