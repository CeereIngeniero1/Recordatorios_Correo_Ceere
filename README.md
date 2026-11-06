# Notificaciones de citas por correo

Bot Node.js que avisa por **correo electrónico** cuando una cita se **programa**, se **modifica** o se **cancela**.

Datos de la clínica: nombre desde `Empresa`, dirección y teléfono desde `EmpresaIII`. Paciente y profesional desde `Entidad` / `EntidadII`. En el `.env` solo configuras DB, SMTP y, si quieres, un slogan.

## Estados `CompromisoVI.EstadoEnviado`

| Valor | Significado |
|-------|-------------|
| `2` | Recién programada → correo de programación |
| `3` | Correo ya enviado (el programa escribe `2`; un trigger suma 1 → queda `3`) |
| `>= 4` | Modificada (el sistema suma 2) → correo de modificación |
| Cancelación | `Id Estado` 60 o 61 y `EstadoEnviado` = 2 o >= 4 → correo de cancelación |

Tras un envío exitoso el programa escribe `EstadoEnviado = 2` y el trigger lo deja en `3`. Si el sistema vuelve a modificar o cancelar, suma 2 y la cita vuelve a entrar en la vista correspondiente.

## Qué hace el ciclo

1. Conecta a SQL Server.
2. Consulta `[Cnsta Correo CitasProgramadas]` → email tipo `programada`.
3. Consulta `[Cnsta Correo CitasModificadas]` → email tipo `modificada`.
4. Consulta `[Cnsta Correo CitasCanceladas]` → email tipo `cancelada`.
5. Envía **uno a uno** con pausas (anti-spam SMTP).
6. Espera `POLLING_INTERVAL_MINUTES` (por defecto **10**) y repite.

Solo citas **futuras** (fecha posterior a hoy, o hoy con hora posterior a la actual).

Si el envío falla, no marca la fila y reintenta en el siguiente ciclo.

## Requisitos

- Node.js 18+
- SQL Server con las **tres** vistas creadas
- Cuenta SMTP

## Instalación

```bash
npm install
copy .env.example .env
```

Completa el `.env` (DB + SMTP + datos de la clínica).

### Vistas SQL (obligatorias)

Ejecuta en SSMS contra la base del cliente:

1. [`sql/Cnsta_Correo_CitasProgramadas.sql`](sql/Cnsta_Correo_CitasProgramadas.sql)
2. [`sql/Cnsta_Correo_CitasModificadas.sql`](sql/Cnsta_Correo_CitasModificadas.sql)
3. [`sql/Cnsta_Correo_CitasCanceladas.sql`](sql/Cnsta_Correo_CitasCanceladas.sql)

## Arranque

```bash
npm start
```

O `iniciar_bot.bat` en Windows.

## Estructura

```
index.js                              Ciclo: programadas + modificadas + canceladas
database.js                           Pool SQL
services/citasService.js              SELECT vistas + UPDATE EstadoEnviado = 2 (trigger → 3)
services/emailService.js              Plantillas HTML SMTP
services/emailNotificacionService.js  Envío uno a uno + ritmo anti-spam
sql/Cnsta_Correo_CitasProgramadas.sql
sql/Cnsta_Correo_CitasModificadas.sql
sql/Cnsta_Correo_CitasCanceladas.sql
```

## Flujo

```
ciclo
  → vista CitasProgramadas (EstadoEnviado=2) → email programada → escribe 2 (trigger → 3)
  → vista CitasModificadas (EstadoEnviado>=4) → email modificada → escribe 2 (trigger → 3)
  → vista CitasCanceladas (Id Estado 60/61) → email cancelada → escribe 2 (trigger → 3)
  → espera N minutos → repetir
```

## Dependencias

`dotenv`, `mssql`, `nodemailer`

## Notas

- Los correos se envían **uno a uno** con pausas aleatorias según el tamaño del lote.
- No se modifica `Id Estado` de la cita.
- No subas `.env` al repositorio.
- Para pruebas, usa `EMAIL_TEST_MODE=true` y `EMAIL_TEST_ADDRESS`.
