require('dotenv').config();

const { connectDB } = require('./database');
const { obtenerCitas } = require('./services/citasService');
const { procesarYEnviarEmails } = require('./services/emailNotificacionService');

/**
 * Vista: citas pendientes de correo de programación (EstadoEnviado = 2).
 * Script: sql/Cnsta_Correo_CitasProgramadas.sql
 */
const VISTA_CITAS_PROGRAMADAS = '[Cnsta Correo CitasProgramadas]';

/**
 * Vista: citas pendientes de correo de modificación (EstadoEnviado >= 4).
 * Script: sql/Cnsta_Correo_CitasModificadas.sql
 */
const VISTA_CITAS_MODIFICADAS = '[Cnsta Correo CitasModificadas]';

/**
 * Vista: citas canceladas pendientes de correo (Id Estado 60/61).
 * Script: sql/Cnsta_Correo_CitasCanceladas.sql
 */
const VISTA_CITAS_CANCELADAS = '[Cnsta Correo CitasCanceladas]';

let procesando = false;

/**
 * Si HORARIO_INICIO / HORARIO_FIN están definidos, solo envía en ese rango (hora local).
 * Si no están definidos, revisa todo el día.
 */
function dentroDeHorario() {
    const inicio = process.env.HORARIO_INICIO;
    const fin = process.env.HORARIO_FIN;
    if (inicio === undefined || inicio === '' || fin === undefined || fin === '') {
        return true;
    }
    const horaActual = new Date().getHours();
    const hInicio = parseInt(inicio, 10);
    const hFin = parseInt(fin, 10);
    if (!Number.isFinite(hInicio) || !Number.isFinite(hFin)) {
        return true;
    }
    return horaActual >= hInicio && horaActual < hFin;
}

/**
 * Ciclo: 1) programadas  2) modificadas  3) canceladas.
 */
async function iniciarCicloDinamico() {
    if (!dentroDeHorario()) {
        const minutosVacio = parseInt(process.env.POLLING_INTERVAL_MINUTES || '10', 10);
        console.log(
            `Fuera del horario de envío (${process.env.HORARIO_INICIO}:00 – ${process.env.HORARIO_FIN}:00). Esperando ${minutosVacio} minutos.`
        );
        setTimeout(iniciarCicloDinamico, minutosVacio * 60 * 1000);
        return;
    }

    if (procesando) return;

    procesando = true;
    let enviados = 0;
    let fallidos = 0;
    let limiteSmtp = false;

    const acumular = (resultado) => {
        enviados += resultado.enviados;
        fallidos += resultado.fallidos;
        limiteSmtp = limiteSmtp || resultado.limiteSmtp;
    };

    console.log('\n--- Iniciando ciclo de revisión de citas (email) ---');
    try {
        console.log('1) Buscando citas programadas pendientes...');
        const citasProgramadas = await obtenerCitas(VISTA_CITAS_PROGRAMADAS);
        if (citasProgramadas.length > 0) {
            console.log(`Encontradas ${citasProgramadas.length} citas programadas.`);
            acumular(await procesarYEnviarEmails(citasProgramadas, 'programada'));
        } else {
            console.log('No hay citas programadas pendientes.');
        }

        if (!limiteSmtp) {
            console.log('2) Buscando citas modificadas pendientes...');
            const citasModificadas = await obtenerCitas(VISTA_CITAS_MODIFICADAS);
            if (citasModificadas.length > 0) {
                console.log(`Encontradas ${citasModificadas.length} citas modificadas.`);
                acumular(await procesarYEnviarEmails(citasModificadas, 'modificada'));
            } else {
                console.log('No hay citas modificadas pendientes.');
            }
        }

        if (!limiteSmtp) {
            console.log('3) Buscando citas canceladas pendientes...');
            const citasCanceladas = await obtenerCitas(VISTA_CITAS_CANCELADAS);
            if (citasCanceladas.length > 0) {
                console.log(`Encontradas ${citasCanceladas.length} citas canceladas.`);
                acumular(await procesarYEnviarEmails(citasCanceladas, 'cancelada'));
            } else {
                console.log('No hay citas canceladas pendientes.');
            }
        }
    } catch (error) {
        console.error('Error durante el ciclo de notificaciones:', error);
    } finally {
        procesando = false;
        console.log('--- Ciclo de revisión finalizado ---');
    }

    const minutosPolling = parseInt(process.env.POLLING_INTERVAL_MINUTES || '10', 10);
    const minutosBloqueo = parseInt(process.env.SMTP_LIMIT_WAIT_MINUTES || '60', 10);
    let proximaEspera;

    if (limiteSmtp) {
        proximaEspera = minutosBloqueo * 60 * 1000;
        console.log(
            `Cuenta SMTP bloqueada por exceso de envíos. Esperando ${minutosBloqueo} minutos antes de reintentar...\n`
        );
    } else if (enviados > 0) {
        proximaEspera = minutosPolling * 60 * 1000;
        console.log(
            `Se enviaron ${enviados} correos. Próxima revisión en ${minutosPolling} minutos...\n`
        );
    } else if (fallidos > 0) {
        proximaEspera = minutosPolling * 60 * 1000;
        console.log(
            `Hubo ${fallidos} envíos fallidos. Esperando ${minutosPolling} minutos antes de reintentar...\n`
        );
    } else {
        proximaEspera = minutosPolling * 60 * 1000;
        console.log(
            `No se encontraron citas. Esperando ${minutosPolling} minutos antes del siguiente ciclo...\n`
        );
    }

    setTimeout(iniciarCicloDinamico, proximaEspera);
}

async function main() {
    console.log('Iniciando bot de notificaciones por correo electrónico...');
    try {
        await connectDB();
        console.log('Conexión a Base de Datos iniciada correctamente.');
        await iniciarCicloDinamico();
    } catch (err) {
        console.error('Error al iniciar la aplicación:', err);
        process.exit(1);
    }
}

main();
