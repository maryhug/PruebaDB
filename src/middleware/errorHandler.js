// Controlador de errores para manejar errores no controlados en la aplicación Express.

function errorHandler(err, _req, res, _next) {
    console.error("(AHH!)Unhandled error:", err);
    const status = err.statusCode || 500;
    res.status(status).json({
        ok: false,
        error: err.message || "Internal Server Error",
    });
}

module.exports = errorHandler;
