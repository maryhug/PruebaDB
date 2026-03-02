function errorHandler(err, _req, res, _next) {
    console.error("Unhandled error:", err);
    const status = err.statusCode || 500;
    res.status(status).json({
        ok: false,
        error: err.message || "Internal Server Error",
    });
}

module.exports = errorHandler;