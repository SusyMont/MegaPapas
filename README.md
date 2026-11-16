# MegaPapas

Proyecto académico de catálogo de comidas rápidas.

## Publicación

La interfaz estática se publica en GitHub Pages desde la rama `main` y la carpeta raíz. El backend de suscripciones debe desplegarse por separado como un servicio Node.js, por ejemplo en Render.

Para desplegar el backend en Render:

- Build command: `npm install`
- Start command: `node server.js`
- Variables de entorno:
  - `BREVO_API_KEY`: clave privada de Brevo.
  - `BREVO_LIST_ID`: ID numérico de la lista de contactos de Brevo.
  - `FRONTEND_ORIGIN`: origen del sitio publicado, por ejemplo `https://susymont.github.io` (sin ruta final).

No se debe subir el archivo `.env` ni escribir claves secretas en el código o en GitHub.

Cuando Render asigne la URL al backend, establece esa URL sin `/` al final en `apiBaseUrl` dentro de `Js/config.js` y publica el cambio en GitHub para que la página pueda enviar suscripciones al backend.

## API de mapas

La aplicación consulta Nominatim de OpenStreetMap desde `Js/api.js`.

- URL base y endpoint: `https://nominatim.openstreetmap.org/search`
- Método: `GET`
- Parámetros: `q` (búsqueda), `format=jsonv2`, `limit`, `countrycodes=co` y `accept-language=es`.
- Ejemplo de respuesta:

```json
[
  {
    "place_id": 123456,
    "lat": "6.2514071",
    "lon": "-75.5871704",
    "display_name": "Medellín, Antioquia, Colombia"
  }
]
```

Los resultados se transforman en `Js/modelo.js` y se muestran como ubicaciones seleccionables junto con el mapa de OpenStreetMap.

## API de suscripciones por correo

El navegador envía el correo al backend propio; el backend agrega el contacto a Brevo usando su API. La clave API nunca se envía al navegador.

- Endpoint del backend: `/api/suscripciones`
- Método: `POST`
- Encabezado: `Content-Type: application/json`
- Cuerpo de ejemplo:

```json
{
  "email": "persona@ejemplo.com",
  "consentimiento": true
}
```

- Respuesta exitosa de MegaPapas:

```json
{
  "mensaje": "Correo registrado para recibir promociones."
}
```
