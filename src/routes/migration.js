const { Router } = require("express");
const { runMigration } = require("../controllers/migrationController");

const router = Router();

router.post("/", runMigration);

module.exports = router;