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



Causas más probables (breve):
Todas las filas fallaron: errors_count: 78 y inserted.* = 0 sugiere errores por fila (validación, tipos, nulls, campos requeridos).
Constraint/clave foránea o índice único que impide inserts.
Mapeo incorrecto entre origen y modelo (nombres/formatos de campos).
Timeouts o problemas de conexión/permiso a la BD durante cada insert.
El script de migración captura errores y marca la migración como fallida (pero sigue contando filas).
Pasos concretos para depurar (rápido):
Buscar dónde se genera el mensaje "Migration failed: ..." en el código:
Linux: grep -R "Migration failed" -n .
Revisar el migration_log guardado usando migration_log_id:
MongoDB (mongosh):
db.migration_logs.findOne({_id: ObjectId("69a5a6ab3d439861c97b8545")})
o si se guarda como campo:
db.migration_logs.findOne({migration_log_id: "69a5a6ab3d439861c97b8545"})
SQL:
SELECT * FROM migration_logs WHERE migration_log_id = '69a5a6ab3d439861c97b8545';
Habilitar logs detallados en el proceso de migración (o imprimir errores por fila). Añade logs en el bucle de procesamiento para ver la primera causa real.
Snippet para agregar logging por fila (explicación: captura y muestra el error de cada fila para identificar la causa):
// javascript
// Añadir dentro del bucle que procesa cada fila en tu migración
try {
await insertRow(mappedRow); // tu función de insert
} catch (err) {
console.error('Error processing row', { rowIndex, mappedRow, message: err.message, stack: err.stack });
errors_count++;
// opcional: almacenar el error en un array para guardarlo en migration_log
errors.push({ rowIndex, error: err.message });
}
Ejecuta la migración sobre un subconjunto (por ejemplo 1-5 filas) para reproducir y aislar el error.
Revisa modelos/esquemas: campos required, tipos, validadores personalizados y relaciones FK.
Verifica permisos de DB y que la conexión no se cierre durante la importación.
Aplicando lo anterior usualmente se identifica el primer error real (p. ej. campo nulo que es requerido, valor tipo string en campo numérico, duplicado en índice único). Corrige el mapeo/validación o ajusta la inserción según sea necesario.