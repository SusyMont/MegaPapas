const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const publicDirectory = __dirname;
const port = Number(process.env.PORT) || 3000;
const maxBodyBytes = 8 * 1024;
const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
};

function responder(respuesta, estado, contenido) {
    respuesta.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' });
    respuesta.end(JSON.stringify(contenido));
}

async function leerJson(solicitud) {
    const partes = [];
    let bytesLeidos = 0;
    for await (const parte of solicitud) {
        bytesLeidos += parte.length;
        if (bytesLeidos > maxBodyBytes) {
            const error = new Error('El cuerpo de la solicitud es demasiado grande.');
            error.statusCode = 413;
            throw error;
        }
        partes.push(parte);
    }

    try {
        return JSON.parse(Buffer.concat(partes).toString('utf8'));
    } catch {
        const error = new Error('El cuerpo debe ser JSON válido.');
        error.statusCode = 400;
        throw error;
    }
}

async function registrarSuscripcion(solicitud, respuesta) {
    if (!solicitud.headers['content-type']?.includes('application/json')) {
        responder(respuesta, 415, { error: 'El contenido debe enviarse como JSON.' });
        return;
    }

    const datos = await leerJson(solicitud);
    const email = typeof datos.email === 'string' ? datos.email.trim() : '';
    if (datos.consentimiento !== true) {
        responder(respuesta, 400, { error: 'Se requiere aceptar recibir promociones.' });
        return;
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        responder(respuesta, 400, { error: 'Ingresa un correo electrónico válido.' });
        return;
    }

    const apiKey = process.env.BREVO_API_KEY;
    const listId = Number(process.env.BREVO_LIST_ID);
    if (!apiKey || !Number.isInteger(listId) || listId < 1) {
        responder(respuesta, 503, {
            error: 'El servidor no está configurado. Revisa BREVO_API_KEY y BREVO_LIST_ID en .env.'
        });
        return;
    }

    const resultado = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
            accept: 'application/json'
        },
        body: JSON.stringify({
            email,
            listIds: [listId],
            updateEnabled: true
        })
    });

    if (!resultado.ok) {
        const detalle = await resultado.text();
        console.error(`Brevo respondió ${resultado.status}: ${detalle}`);
        responder(respuesta, 502, {
            error: 'Brevo no pudo registrar el correo. Verifica la clave API y el ID de la lista.'
        });
        return;
    }

    responder(respuesta, 200, { mensaje: 'Correo registrado para recibir promociones.' });
}

async function servirArchivo(solicitud, respuesta, rutaUrl) {
    let rutaSolicitada;
    try {
        rutaSolicitada = decodeURIComponent(rutaUrl);
    } catch {
        respuesta.writeHead(400).end('Ruta no válida.');
        return;
    }

    const rutaRelativa = rutaSolicitada === '/' ? 'index.html' : rutaSolicitada.slice(1);
    const segmentos = rutaRelativa.split(/[\\/]/);
    const archivosPrivados = new Set([
        '.env',
        '.env.example',
        '.git',
        '.vscode',
        'node_modules',
        'package.json',
        'package-lock.json',
        'server.js'
    ]);
    if (segmentos.some((segmento) => segmento.startsWith('.') || archivosPrivados.has(segmento))) {
        respuesta.writeHead(404).end('No encontrado.');
        return;
    }

    const rutaArchivo = path.resolve(publicDirectory, rutaRelativa);
    if (!rutaArchivo.startsWith(`${publicDirectory}${path.sep}`)) {
        respuesta.writeHead(404).end('No encontrado.');
        return;
    }

    const tipo = contentTypes[path.extname(rutaArchivo).toLowerCase()];
    if (!tipo) {
        respuesta.writeHead(404).end('No encontrado.');
        return;
    }

    try {
        const archivo = await fs.promises.readFile(rutaArchivo);
        respuesta.writeHead(200, {
            'Content-Type': tipo,
            'X-Content-Type-Options': 'nosniff'
        });
        respuesta.end(solicitud.method === 'HEAD' ? undefined : archivo);
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'EISDIR') {
            respuesta.writeHead(404).end('No encontrado.');
            return;
        }
        throw error;
    }
}

const servidor = http.createServer(async (solicitud, respuesta) => {
    try {
        const rutaUrl = new URL(solicitud.url, 'http://localhost').pathname;
        if (rutaUrl === '/api/suscripciones' && solicitud.method === 'POST') {
            await registrarSuscripcion(solicitud, respuesta);
            return;
        }
        if (rutaUrl.startsWith('/api/')) {
            responder(respuesta, 404, { error: 'Ruta de API no encontrada.' });
            return;
        }
        if (solicitud.method !== 'GET' && solicitud.method !== 'HEAD') {
            respuesta.writeHead(405, { Allow: 'GET, HEAD' }).end('Método no permitido.');
            return;
        }
        await servirArchivo(solicitud, respuesta, rutaUrl);
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        if (!respuesta.headersSent) {
            responder(respuesta, error.statusCode || 500, {
                error: error.statusCode ? error.message : 'Error interno del servidor.'
            });
        }
    }
});

servidor.listen(port, () => {
    console.log(`MegaPapas disponible en http://localhost:${port}`);
});
