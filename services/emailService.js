const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Obtiene o inicializa el transportador de correo SMTP.
 */
function obtenerTransporter() {
    if (!transporter) {
        const tls = {
            rejectUnauthorized: false
        };
        if (process.env.EMAIL_TLS_CIPHERS) {
            tls.ciphers = process.env.EMAIL_TLS_CIPHERS;
        }

        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT || '587', 10),
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls
        });
    }
    return transporter;
}

/**
 * Nombre de la clínica: primero Empresa (vista), luego .env como respaldo.
 * @param {object} [cita]
 */
function nombreClinica(cita) {
    const desdeBd = cita && (cita.Nom_Clinica || cita.Razon_Social);
    if (desdeBd && String(desdeBd).trim() !== '') {
        return String(desdeBd).trim();
    }
    return (process.env.CLINICA_NOMBRE || 'Clínica').trim();
}

function sloganClinica() {
    return (process.env.CLINICA_SLOGAN || '').trim();
}

/**
 * Teléfono de la clínica: primero EmpresaIII (vista), luego .env.
 * @param {object} [cita]
 */
function telefonoClinica(cita) {
    const desdeBd = cita && cita.Tel_Clinica;
    if (desdeBd && String(desdeBd).trim() !== '') {
        return String(desdeBd).trim();
    }
    return (process.env.CLINICA_TELEFONO || '').trim();
}

/**
 * Dirección de la clínica: primero EmpresaIII (vista), luego .env.
 * @param {object} [cita]
 */
function direccionClinica(cita) {
    const desdeBd = cita && cita.Direccion_Clinica;
    if (desdeBd && String(desdeBd).trim() !== '') {
        return String(desdeBd).trim();
    }
    return (process.env.CLINICA_DIRECCION || '').trim();
}

/**
 * Formatea una fecha y hora para presentación.
 */
function formatearFechaHora(fechaInicio, horaInicio) {
    const fecha = new Date(fechaInicio);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const anio = fecha.getFullYear();

    const hora = new Date(horaInicio);
    const horas24 = hora.getHours();
    const minStr = String(hora.getMinutes()).padStart(2, '0');
    const periodo = horas24 < 12 ? 'a.m.' : 'p.m.';
    let horas12 = horas24 % 12;
    if (horas12 === 0) horas12 = 12;
    const horaFormat = `${horas12}:${minStr} ${periodo}`;

    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const mesNombre = meses[fecha.getMonth()];

    return { dia, anio, mesNombre, horaFormat };
}

/**
 * Textos según tipo de notificación.
 * @param {'programada'|'modificada'|'cancelada'} tipo
 */
function textosPorTipo(tipo, clinica) {
    switch (tipo) {
        case 'modificada':
            return {
                titulo: 'Cita modificada',
                asunto: `Su cita ha sido modificada - ${clinica}`,
                intro: `Le informamos que su cita médica en <strong>${clinica}</strong> ha sido <strong>modificada</strong>. A continuación encontrará los datos actualizados.`
            };
        case 'cancelada':
            return {
                titulo: 'Cita cancelada',
                asunto: `Su cita ha sido cancelada - ${clinica}`,
                intro: `Le informamos que su cita médica en <strong>${clinica}</strong> ha sido <strong>cancelada</strong>.`
            };
        case 'programada':
        default:
            return {
                titulo: 'Confirmación de cita',
                asunto: `Confirmación de su cita médica - ${clinica}`,
                intro: `Le confirmamos que su cita médica en <strong>${clinica}</strong> ha sido <strong>programada</strong> con éxito.`
            };
    }
}

/**
 * Paleta según tipo de notificación.
 * @param {'programada'|'modificada'|'cancelada'} tipo
 */
function coloresPorTipo(tipo) {
    switch (tipo) {
        case 'modificada':
            return {
                colorPrimario: '#d97706',
                colorSecundario: '#f59e0b',
                colorDetalle: '#fff7ed',
                colorFondo: '#fffbf5',
                colorTexto: '#333333'
            };
        case 'cancelada':
            return {
                colorPrimario: '#b91c1c',
                colorSecundario: '#dc2626',
                colorDetalle: '#fef2f2',
                colorFondo: '#fff5f5',
                colorTexto: '#333333'
            };
        case 'programada':
        default:
            return {
                colorPrimario: '#2c5f7c',
                colorSecundario: '#3d8b6e',
                colorDetalle: '#eef3f6',
                colorFondo: '#f4f6f8',
                colorTexto: '#333333'
            };
    }
}

/**
 * Genera el cuerpo HTML y el texto plano para el correo electrónico.
 * @param {object} cita
 * @param {'programada'|'modificada'|'cancelada'} tipo
 */
function generarContenidoCorreo(cita, tipo) {
    const { dia, mesNombre, horaFormat } = formatearFechaHora(cita.Fecha_inicio, cita.Hora_inicio);
    const clinica = nombreClinica(cita);
    const slogan = sloganClinica();
    const telefono = telefonoClinica(cita);
    const direccion = direccionClinica(cita);
    const { titulo, intro } = textosPorTipo(tipo, clinica);
    const profesional = cita.Nom_profesional || 'Por asignar';
    const esCancelada = tipo === 'cancelada';

    const {
        colorPrimario,
        colorSecundario,
        colorDetalle,
        colorFondo,
        colorTexto
    } = coloresPorTipo(tipo);

    const filaDireccion = direccion
        ? `
                    <div class="detail-row">
                        <div class="detail-label">Dirección:</div>
                        <div class="detail-value">${direccion}</div>
                    </div>`
        : '';

    const cajaContacto = telefono
        ? `
                <div class="action-box">
                    Si requiere realizar alguna modificación, reprogramar o cancelar su cita, por favor comuníquese a:
                    <strong>${telefono}</strong>
                </div>`
        : `
                <div class="action-box">
                    Si requiere realizar alguna modificación, reprogramar o cancelar su cita, comuníquese con la clínica.
                </div>`;

    const mensajeCierre = esCancelada
        ? `Si desea agendar una nueva cita, comuníquese con ${clinica}.`
        : 'Por favor, llegue con anticipación a la hora programada y recuerde llevar su documento de identidad.';

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${titulo}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: ${colorFondo};
                color: ${colorTexto};
                margin: 0;
                padding: 0;
                -webkit-font-smoothing: antialiased;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.06);
                overflow: hidden;
                border-top: 6px solid ${colorPrimario};
            }
            .header {
                background: linear-gradient(135deg, ${colorPrimario} 0%, ${colorSecundario} 100%);
                color: #ffffff;
                text-align: center;
                padding: 30px 20px;
            }
            .header h1 {
                margin: 0;
                font-size: 22px;
                font-weight: 600;
                letter-spacing: 0.5px;
            }
            .header p {
                margin: 8px 0 0 0;
                font-size: 14px;
                opacity: 0.9;
            }
            .content {
                padding: 30px;
            }
            .saludo {
                font-size: 18px;
                margin-bottom: 15px;
                color: ${colorPrimario};
            }
            .intro {
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 25px;
            }
            .details-box {
                background-color: ${colorDetalle};
                border-left: 4px solid ${colorPrimario};
                border-radius: 6px;
                padding: 20px;
                margin-bottom: 25px;
            }
            .details-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 15px;
                color: ${colorPrimario};
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .detail-row {
                display: flex;
                margin-bottom: 10px;
                font-size: 15px;
            }
            .detail-label {
                width: 120px;
                font-weight: bold;
                color: #666;
            }
            .detail-value {
                flex: 1;
                color: #333;
            }
            .action-box {
                background-color: #fff9eb;
                border: 1px solid #ffeeba;
                border-radius: 6px;
                padding: 15px 20px;
                font-size: 14px;
                line-height: 1.5;
                color: #856404;
                margin-bottom: 25px;
                text-align: center;
            }
            .action-box strong {
                font-size: 16px;
                color: #533f03;
                display: block;
                margin-top: 8px;
            }
            .footer {
                background-color: #f1f1f1;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #777777;
                border-top: 1px solid #e5e5e5;
            }
            .footer p {
                margin: 5px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${clinica}</h1>
                ${slogan ? `<p>${slogan}</p>` : ''}
            </div>

            <div class="content">
                <div class="saludo">Estimada/o <strong>${cita.Nom_Paciente}</strong>,</div>
                <div class="intro">${intro}</div>

                <div class="details-box">
                    <div class="details-title">${esCancelada ? 'Datos de la cita cancelada' : 'Detalles de su cita'}</div>
                    <div class="detail-row">
                        <div class="detail-label">Profesional:</div>
                        <div class="detail-value">${profesional}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Fecha:</div>
                        <div class="detail-value">${dia} de ${mesNombre}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Hora:</div>
                        <div class="detail-value">${horaFormat}</div>
                    </div>
                    ${filaDireccion}
                </div>

                ${cajaContacto}

                <p style="font-size: 14px; line-height: 1.5; color: #555;">
                    ${mensajeCierre}
                </p>
            </div>

            <div class="footer">
                <p><strong>${clinica}</strong></p>
                ${direccion ? `<p>${direccion}</p>` : ''}
                <p>Este es un correo automático, por favor no responda directamente a este mensaje.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const textLineas = [
        `Hola ${cita.Nom_Paciente},`,
        '',
        intro.replace(/<[^>]+>/g, ''),
        '',
        esCancelada ? 'Datos de la cita cancelada:' : 'Detalles de la cita:',
        `- Profesional: ${profesional}`,
        `- Fecha: ${dia} de ${mesNombre}`,
        `- Hora: ${horaFormat}`
    ];
    if (direccion) {
        textLineas.push(`- Dirección: ${direccion}`);
    }
    textLineas.push('');
    if (telefono) {
        textLineas.push(`Para cambios o consultas: ${telefono}`);
    } else {
        textLineas.push('Para cambios o consultas, comuníquese con la clínica.');
    }
    textLineas.push('', `Atentamente,`, clinica);

    return { html, text: textLineas.join('\n').trim() };
}

/**
 * Envía un correo electrónico al paciente con los detalles de su cita.
 * @param {object} cita Datos de la cita médica
 * @param {'programada'|'modificada'|'cancelada'} tipo
 */
async function enviarEmailCita(cita, tipo) {
    if (!cita.Correo || String(cita.Correo).trim() === '') {
        console.log(`[Email Service] El paciente ${cita.Nom_Paciente} no tiene correo registrado.`);
        return false;
    }

    let correoDestinatario = String(cita.Correo).trim();
    const esPrueba = process.env.EMAIL_TEST_MODE === 'true';

    if (esPrueba) {
        const correoPrueba = process.env.EMAIL_TEST_ADDRESS;
        if (correoPrueba) {
            console.log(
                `[Email Service] [MODO PRUEBA] Redirigiendo correo de ${correoDestinatario} hacia ${correoPrueba}`
            );
            correoDestinatario = correoPrueba;
        } else {
            console.log(
                '[Email Service] [MODO PRUEBA] EMAIL_TEST_MODE es true pero EMAIL_TEST_ADDRESS no está definido. Omitiendo envío.'
            );
            return false;
        }
    }

    const clinica = nombreClinica(cita);
    const { html, text } = generarContenidoCorreo(cita, tipo);
    const { asunto } = textosPorTipo(tipo, clinica);

    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || `"${clinica}" <noreply@ejemplo.com>`,
            to: correoDestinatario,
            subject: asunto,
            text: text,
            html: html
        };

        const transport = obtenerTransporter();
        const info = await transport.sendMail(mailOptions);
        console.log(
            `[Email Service] Correo enviado con éxito a ${correoDestinatario} (ID Mensaje: ${info.messageId})`
        );
        return true;
    } catch (error) {
        console.error(`[Email Service] Error al enviar correo a ${correoDestinatario}:`, error.message);
        if (esLimiteDeEnvio(error)) {
            const errorLimite = new Error(error.message);
            errorLimite.code = 'SMTP_LIMITE_ENVIO';
            throw errorLimite;
        }
        return false;
    }
}

/**
 * Detecta cuando el servidor SMTP bloquea temporalmente la cuenta por exceso de envíos.
 */
function esLimiteDeEnvio(error) {
    const mensaje = String(error.message || '') + ' ' + String(error.response || '');
    return /too much mail|too many messages|rate limit|sending limit|exceeded/i.test(mensaje);
}

module.exports = {
    enviarEmailCita
};
