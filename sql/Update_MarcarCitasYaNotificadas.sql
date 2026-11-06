/*
================================================================================
Script: Marcar citas pendientes como YA notificadas
Proyecto: correo_recordatorios
================================================================================

PROPÓSITO
---------
Escribe EstadoEnviado = 2 en las citas pendientes de correo.
Hay un TRIGGER que suma 1 → el valor final queda en 3.
Así salen de las vistas y el bot no reenvía el histórico.

EJECUCIÓN
---------
1. Abrir en SSMS contra la base del cliente (ej. Laureles).
2. Revisar el SELECT de vista previa.
3. Si está bien, descomentar el UPDATE y ejecutarlo.
4. Confirmar PendientesRestantes = 0 (tras el trigger deben quedar en 3).

IMPORTANTE
----------
No pongas SET EstadoEnviado = 3: el trigger sumaría 1 y quedarían en 4
(volverían a entrar como "modificadas").
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

-- Escribe 2; el trigger suma 1 → queda 3
UPDATE dbo.CompromisoVI
SET EstadoEnviado = 2
WHERE
    EstadoEnviado = 2
    OR EstadoEnviado >= 4;

SELECT @@ROWCOUNT AS FilasActualizadas;

-- Tras el trigger no deben quedar pendientes (2 o >= 4)
SELECT COUNT(*) AS PendientesRestantes
FROM dbo.CompromisoVI
WHERE EstadoEnviado = 2 OR EstadoEnviado >= 4;

-- Si todo está bien:
COMMIT TRANSACTION;
-- Si algo salió mal:
-- ROLLBACK TRANSACTION;
*/
GO
