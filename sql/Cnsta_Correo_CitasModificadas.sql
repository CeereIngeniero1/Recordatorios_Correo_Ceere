/*
================================================================================
Vista: [dbo].[Cnsta Correo CitasModificadas]
Proyecto: correo_recordatorios (notificaciones por correo al modificar cita)
================================================================================

PROPÓSITO
---------
Citas pendientes del correo de MODIFICACIÓN (CompromisoVI.EstadoEnviado >= 4),
no canceladas y con fecha/hora futura.

FUENTES DE DATOS
----------------
  Empresa     → Nom_Clinica vía Documento Empresa
  EmpresaIII  → dirección y teléfonos de la clínica
  Entidad     → paciente (Entidad Atendida) y profesional (Entidad Responsable)
  EntidadII   → correo y celular del paciente

FILTROS
-------
  - EstadoEnviado >= 4
  - Id Estado NO es 60 ni 61
  - E-mail válido
  - Fecha+hora de la cita > GETDATE()
  TOP (50)

ACTUALIZACIÓN DESDE LA APP
--------------------------
Tras envío exitoso (el trigger suma 1 → queda 3):
  UPDATE CompromisoVI SET EstadoEnviado = 2 WHERE [Id CompromisoVI] = @id

INSTALACIÓN
-----------
Ejecutar en SSMS contra la BD del cliente (DB_NAME del .env).
================================================================================
*/

IF OBJECT_ID(N'[dbo].[Cnsta Correo CitasModificadas]', N'V') IS NOT NULL
    DROP VIEW [dbo].[Cnsta Correo CitasModificadas];
GO

CREATE VIEW [dbo].[Cnsta Correo CitasModificadas]
AS
SELECT TOP (50)
    C.EstadoEnviado AS Estado_Correo,
    C.[Id CompromisoVI] AS Id_Compromiso,
    CONVERT(NVARCHAR(30), C.[Hora Inicio CompromisoVI], 121) AS Hora_inicio,
    CONVERT(NVARCHAR(30), C.[Hora Fin CompromisoVI], 121) AS Hora_Fin,
    CONVERT(NVARCHAR(30), C.[Fecha Inicio CompromisoVI], 121) AS Fecha_inicio,
    C.[Entidad Atendida] AS Documento_Paciente,
    E.[Nombre Completo Entidad] AS Nom_Paciente,
    E2.[E-mail Nro 1 EntidadII] AS Correo,
    E2.[Teléfono Celular EntidadII] AS Tel,
    C.[Entidad Responsable] AS Documento_Profecional,
    EP.[Nombre Completo Entidad] AS Nom_profesional,
    C.[Documento Empresa] AS Documento_Empresa,
    COALESCE(
        NULLIF(LTRIM(RTRIM(EM.[Nombre Comercial Empresa])), ''),
        NULLIF(LTRIM(RTRIM(EM.[Razon Social Empresa])), ''),
        N'Clínica'
    ) AS Nom_Clinica,
    EM.[Razon Social Empresa] AS Razon_Social,
    EM3.[Dirección EmpresaIII] AS Direccion_Clinica,
    COALESCE(
        NULLIF(LTRIM(RTRIM(EM3.[Teléfono No 1 EmpresaIII])), ''),
        NULLIF(LTRIM(RTRIM(EM3.[Teléfono No 2 EmpresaIII])), ''),
        NULLIF(LTRIM(RTRIM(EM3.[Teléfono No 3 EmpresaIII])), '')
    ) AS Tel_Clinica,
    C.[Id Estado] AS Id_Estado,
    C.[Fecha Inicio CompromisoVI]
FROM dbo.CompromisoVI AS C
INNER JOIN dbo.Entidad AS E
    ON C.[Entidad Atendida] = E.[Documento Entidad]
INNER JOIN dbo.EntidadII AS E2
    ON E.[Documento Entidad] = E2.[Documento Entidad]
LEFT JOIN dbo.Entidad AS EP
    ON C.[Entidad Responsable] = EP.[Documento Entidad]
LEFT JOIN dbo.Empresa AS EM
    ON C.[Documento Empresa] = EM.[Documento Empresa]
LEFT JOIN dbo.EmpresaIII AS EM3
    ON C.[Documento Empresa] = EM3.[Documento Empresa]
WHERE
    (C.EstadoEnviado >= 4)
    AND (C.[Id Estado] IS NULL OR C.[Id Estado] NOT IN (60, 61))
    AND (E2.[E-mail Nro 1 EntidadII] IS NOT NULL)
    AND (LTRIM(RTRIM(E2.[E-mail Nro 1 EntidadII])) <> '')
    AND (E2.[E-mail Nro 1 EntidadII] LIKE '%@%.%')
    AND (
        CAST(C.[Fecha Inicio CompromisoVI] AS DATE) > CAST(GETDATE() AS DATE)
        OR (
            CAST(C.[Fecha Inicio CompromisoVI] AS DATE) = CAST(GETDATE() AS DATE)
            AND CAST(C.[Hora Inicio CompromisoVI] AS TIME) > CAST(GETDATE() AS TIME)
        )
    )
ORDER BY
    C.[Fecha Inicio CompromisoVI],
    CAST(C.[Hora Inicio CompromisoVI] AS TIME);
GO
