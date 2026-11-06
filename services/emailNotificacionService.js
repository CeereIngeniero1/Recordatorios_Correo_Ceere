const { actualizarEstadoEnviado, ESTADO_ENVIADO_MARCADO } = require('./citasService');
const { enviarEmailCita } = require('./emailService');

/**
 * Espera aleatoria entre min y max (ms).
 * @param {number} minMs
 * @param {number} maxMs
 */
function esperaAleatoria(minMs, maxMs) {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return { ms, promise: new Promise((resolve) => setTimeout(resolve, ms)) };
}

/**
 * Ritmo progresivo según tamaño del lote para no saturar el SMTP.
 * Se puede forzar con EMAIL_DELAY_MIN_MS / EMAIL_DELAY_MAX_MS en .env.
 * @param {number} total
 * @returns {{ minDelay: number, maxDelay: number, descansoCada: number|null }}
 */
function configurarRitmo(total) {
    const minEnv = parseInt(process.env.EMAIL_DELAY_MIN_MS || '', 10);
    const maxEnv = parseInt(process.env.EMAIL_DELAY_MAX_MS || '', 10);

    if (Number.isFinite(minEnv) && Number.isFinite(maxEnv) && minEnv > 0 && maxEnv >= minEnv) {
        console.log(
            `[Ritmo Email] Forzado por .env: ${Math.round(minEnv / 1000)}–${Math.round(maxEnv / 1000)} s entre correos.`
        );
        return { minDelay: minEnv, maxDelay: maxEnv, descansoCada: total > 20 ? 12 : null };
    }

    let minDelay;
    let maxDelay;
    let descansoCada = null;

    if (total <= 5) {
        minDelay = 20000;
        maxDelay = 40000;
    } else if (total <= 15) {
        minDelay = 40000;
        maxDelay = 70000;
    } else if (total <= 40) {
        minDelay = 60000;
        maxDelay = 120000;
        descansoCada = 12;
    } else {
        minDelay = 90000;
        maxDelay = 180000;
        descansoCada = 10;
    }

    console.log(
        `[Ritmo Email] Lote de ${total}. Espera entre correos: ${Math.round(minDelay / 1000)}–${Math.round(maxDelay / 1000)} s` +
            (descansoCada ? ` · descanso largo cada ~${descansoCada} envíos` : '') +
            '.'
    );

    return { minDelay, maxDelay, descansoCada };
}

/**
 * Procesa citas y envía correos de forma progresiva (uno a uno con pausas).
 * Tras envío exitoso: escribe EstadoEnviado = 2 (trigger suma 1 → queda 3).
 *
 * @param {Array} citas
 * @param {'programada'|'modificada'|'cancelada'} tipoEmail
 * @returns {Promise<{ enviados: number, fallidos: number, limiteSmtp: boolean }>}
 */
async function procesarYEnviarEmails(citas, tipoEmail) {
    const resultado = { enviados: 0, fallidos: 0, limiteSmtp: false };
    const total = citas.length;
    if (total === 0) return resultado;

    const { minDelay, maxDelay, descansoCada } = configurarRitmo(total);
    let enviadosSeguidos = 0;
    let proximoDescanso = descansoCada
        ? Math.floor(Math.random() * 3) + descansoCada
        : null;

    for (let i = 0; i < total; i++) {
        const cita = citas[i];
        const tieneCorreo = !!(cita.Correo && String(cita.Correo).trim() !== '');
        let intentoEnvio = false;

        if (!tieneCorreo) {
            console.log(
                `[Email] El paciente ${cita.Nom_Paciente} (ID: ${cita.Id_Compromiso}) no tiene correo. Se marca EstadoEnviado=${ESTADO_ENVIADO_MARCADO}.`
            );
            await actualizarEstadoEnviado(cita.Id_Compromiso, ESTADO_ENVIADO_MARCADO);
        } else {
            intentoEnvio = true;
            try {
                console.log(
                    `Enviando correo (${tipoEmail}) [${i + 1}/${total}] a ${cita.Correo} (${cita.Nom_Paciente})...`
                );
                const enviado = await enviarEmailCita(cita, tipoEmail);

                if (enviado) {
                    await actualizarEstadoEnviado(cita.Id_Compromiso, ESTADO_ENVIADO_MARCADO);
                    enviadosSeguidos++;
                    resultado.enviados++;
                } else {
                    resultado.fallidos++;
                    console.log(
                        `[Email] No se marcó la cita ${cita.Id_Compromiso}: el envío falló o fue omitido. Se reintentará.`
                    );
                }
            } catch (error) {
                resultado.fallidos++;
                if (error.code === 'SMTP_LIMITE_ENVIO') {
                    resultado.limiteSmtp = true;
                    console.error(
                        '[Email] El servidor SMTP bloqueó la cuenta por exceso de envíos. Se detiene el lote.'
                    );
                    break;
                }
                console.error(
                    `Error al procesar correo para ${cita.Nom_Paciente}:`,
                    error.message
                );
            }
        }

        if (i >= total - 1) continue;

        if (
            intentoEnvio &&
            proximoDescanso &&
            enviadosSeguidos >= proximoDescanso
        ) {
            const { ms, promise } = esperaAleatoria(180000, 300000);
            console.log(
                `\n[DESCANSO SMTP] ${enviadosSeguidos} correos seguidos. Pausando ${Math.round(ms / 60000)} min para no saturar el servidor...\n`
            );
            await promise;
            enviadosSeguidos = 0;
            proximoDescanso = descansoCada
                ? Math.floor(Math.random() * 3) + descansoCada
                : null;
            continue;
        }

        if (intentoEnvio) {
            const { ms, promise } = esperaAleatoria(minDelay, maxDelay);
            console.log(`Esperando ${Math.round(ms / 1000)} s antes del siguiente correo...`);
            await promise;
        }
    }

    return resultado;
}

module.exports = {
    procesarYEnviarEmails
};
