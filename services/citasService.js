const { getPool, sql } = require('../database');

/** Tras envío exitoso: marca la cita para que salga de las vistas */
const ESTADO_ENVIADO_MARCADO = 3;

/**
 * Obtiene citas pendientes de notificación por correo desde la vista SQL.
 *
 * @param {string} vista Nombre de la vista (ej. [Cnsta Correo CitasProgramadas])
 * @returns {Promise<Array>} Lista de citas
 */
async function obtenerCitas(vista) {
    try {
        const pool = await getPool();
        const request = pool.request();

        const result = await request.query(`
            SELECT
                Estado_Correo,
                Id_Compromiso,
                Hora_inicio,
                Hora_Fin,
                Fecha_inicio,
                Documento_Paciente,
                Nom_Paciente,
                Correo,
                Tel,
                Documento_Profecional,
                Nom_profesional,
                Documento_Empresa,
                Nom_Clinica,
                Razon_Social,
                Direccion_Clinica,
                Tel_Clinica,
                Id_Estado
            FROM ${vista}
        `);

        return result.recordset;
    } catch (error) {
        const esTimeout = error.code === 'ETIMEOUT' || (error.message || '').includes('Timeout');
        if (esTimeout) {
            console.error(
                `Timeout al consultar ${vista} (la vista tarda demasiado). Se reintentará en el próximo ciclo.`
            );
        } else {
            console.error(`Error al consultar citas de la vista ${vista}:`, error);
        }
        return [];
    }
}

/**
 * Marca la cita como notificada (CompromisoVI.EstadoEnviado = 3).
 * Así sale de las vistas hasta que el sistema de citas sume 2 de nuevo.
 *
 * @param {number} idCompromiso Id CompromisoVI
 * @param {number} [estado=3] Valor a guardar en EstadoEnviado
 */
async function actualizarEstadoEnviado(idCompromiso, estado = ESTADO_ENVIADO_MARCADO) {
    try {
        const pool = await getPool();
        const request = pool.request();

        request.input('Estado', sql.Int, estado);
        request.input('id', sql.Int, idCompromiso);

        await request.query(`
            UPDATE CompromisoVI
            SET EstadoEnviado = @Estado
            WHERE [Id CompromisoVI] = @id
        `);
        console.log(`Cita ${idCompromiso}: CompromisoVI.EstadoEnviado = ${estado}`);
    } catch (error) {
        console.error(`Error al actualizar EstadoEnviado de cita ${idCompromiso}:`, error);
    }
}

module.exports = {
    obtenerCitas,
    actualizarEstadoEnviado,
    ESTADO_ENVIADO_MARCADO
};
