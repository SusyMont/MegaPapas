// Servicio: consume la API de Nominatim (OpenStreetMap).
// Solo pide los datos y los devuelve tal como llegan: no toca el DOM ni decide qué mostrar.
(function (app) {
    const urlBaseNominatim = 'https://nominatim.openstreetmap.org/search';

    // Guarda las respuestas ya pedidas para no repetir peticiones (la API permite 1 por segundo).
    const cacheConsultas = new Map();

    // Busca lugares por texto. Devuelve el arreglo JSON de la API.
    async function consultarUbicaciones(consulta, limite = 5) {
        const clave = `${consulta}|${limite}`;
        if (cacheConsultas.has(clave)) {
            return cacheConsultas.get(clave);
        }

        // URLSearchParams codifica los caracteres especiales (por ejemplo el # de la dirección).
        const parametros = new URLSearchParams({
            q: consulta,
            format: 'jsonv2',
            limit: String(limite),
            countrycodes: 'co',
            'accept-language': 'es'
        });

        const respuesta = await fetch(`${urlBaseNominatim}?${parametros.toString()}`);

        // fetch solo falla si no hay red; un error 403 o 500 también "responde", por eso se revisa ok.
        if (!respuesta.ok) {
            throw new Error(`La API respondió con el estado ${respuesta.status}`);
        }

        const datos = await respuesta.json();
        cacheConsultas.set(clave, datos);
        return datos;
    }

    app.Servicios = { consultarUbicaciones };
})(window.MegaPapas = window.MegaPapas || {});