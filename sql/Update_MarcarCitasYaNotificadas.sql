/*
================================================================================
Script: Marcar citas pendientes como YA notificadas (EstadoEnviado = 3)
Proyecto: correo_recordatorios
================================================================================

PROPÓSITO
---------
Pone EstadoEnviado = 3 en todas las citas que hoy entrarían a las vistas
de correo (programadas, modificadas o canceladas pendientes).

Así, al arrancar el bot, NO reenvía el histórico: solo notificará citas
que el sistema vuelva a marcar con EstadoEnviado = 2 o >= 4 DESPUÉS de
ejecutar este script.

EJECUCIÓN
---------
1. Abrir en SSMS contra la base del cliente (ej. Laureles).
2. Revisar el SELECT de vista previa.
3. Si está bien, descomentar el UPDATE y ejecutarlo.
4. Opcional: confirmar con el SELECT final.

IMPORTANTE
----------
No modifica Id Estado ni fechas. Solo EstadoEnviado.
================================================================================
*/

-- Vista previa: cuántas y cuáles se marcarían
SELECT
    C.[Id CompromisoVI],
    C.EstadoEnviado,
    C.[Id Estado],
    C.[Fecha Inicio CompromisoVI],
    C.[Hora Inicio CompromisoVI],
    C.[Entidad Atendida],
    CASE
        WHEN C.[Id Estado] IN (60, 61) THEN N'Cancelada pendiente'
        WHEN C.EstadoEnviado = 2 THEN N'Programada pendiente'
        WHEN C.EstadoEnviado >= 4 THEN N'Modificada pendiente'
        ELSE N'Otro'
    END AS Motivo
FROM dbo.CompromisoVI AS C
WHERE
    (
        C.EstadoEnviado = 2
        OR C.EstadoEnviado >= 4
    )
ORDER BY
    C.[Fecha Inicio CompromisoVI],
    C.[Hora Inicio CompromisoVI];

/*
-- ============================================================
-- EJECUTAR SOLO CUANDO HAYAS REVISADO LA VISTA PREVIA
-- ============================================================
BEGIN TRANSACTION;

UPDATE dbo.CompromisoVI
SET EstadoEnviado = 3
WHERE
    EstadoEnviado = 2
    OR EstadoEnviado >= 4;

-- Debe coincidir con el conteo de la vista previa
SELECT @@ROWCOUNT AS FilasActualizadas;

-- Verificación: no deben quedar pendientes de correo
SELECT COUNT(*) AS PendientesRestantes
FROM dbo.CompromisoVI
WHERE EstadoEnviado = 2 OR EstadoEnviado >= 4;

-- Si todo está bien:
COMMIT TRANSACTION;
-- Si algo salió mal:
-- ROLLBACK TRANSACTION;
*/
GO
