(function (app) {
    const urlBaseNominatim = 'https://nominatim.openstreetmap.org/search';

    const cacheConsultas = new Map();

    async function consultarUbicaciones(consulta, limite = 5) {
        const clave = `${consulta}|${limite}`;
        if (cacheConsultas.has(clave)) {
            return cacheConsultas.get(clave);
        }

        const parametros = new URLSearchParams({
            q: consulta,
            format: 'jsonv2',
            limit: String(limite),
            countrycodes: 'co',
            'accept-language': 'es'
        });

        const respuesta = await fetch(`${urlBaseNominatim}?${parametros.toString()}`);

        if (!respuesta.ok) {
            throw new Error(`La API respondió con el estado ${respuesta.status}`);
        }

        const datos = await respuesta.json();
        cacheConsultas.set(clave, datos);
        return datos;
    }

    app.Servicios = { consultarUbicaciones };
})(window.MegaPapas = window.MegaPapas || {});
