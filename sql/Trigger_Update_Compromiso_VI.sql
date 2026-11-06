/*
================================================================================
Trigger: [dbo].[Update Compromiso VI]
Tabla:   [dbo].[CompromisoVI]
Proyecto: correo_recordatorios
================================================================================

DOCUMENTACIÓN (referencia del comportamiento en la BD del cliente)
-----------------------------------------------------------------
Este trigger ya existe en la base. No es necesario crearlo para el bot;
este archivo documenta por qué el programa escribe EstadoEnviado = 2
y no 3.

COMPORTAMIENTO
--------------
FOR UPDATE sobre CompromisoVI:
  1. Lee EstadoEnviado de la fila actualizada (inserted).
  2. Le suma 1.
  3. Vuelve a hacer UPDATE de EstadoEnviado con ese valor.

Efecto para el bot de correo:
  - App escribe 2  → trigger deja 3  → cita sale de las vistas (OK)
  - App escribe 3  → trigger deja 4  → entra como "modificada" (NO usar)

Script original (referencia, base de ejemplo CeereSio):
================================================================================
*/

/*
USE [CeereSio]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER TRIGGER [dbo].[Update Compromiso VI] ON [dbo].[CompromisoVI]
  FOR Update
AS
BEGIN

	Declare @IdCompromisoVI int;
	Declare @EstadoEnviado int;

	select @IdCompromisoVI = [Id CompromisoVI] ,
	@EstadoEnviado = EstadoEnviado
	From inserted


	Set @EstadoEnviado = @EstadoEnviado +  1 ;
	UPDATE CompromisoVI SET EstadoEnviado = @EstadoEnviado
	WHERE   [Id CompromisoVI] = @IdCompromisoVI

END
GO
*/
