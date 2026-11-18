# MegaPapas

Proyecto académico: catálogo web de comidas rápidas con carrito, pedidos, panel de administración y un mapa para ubicar el local.

## La API que usa la aplicación

Para el mapa y la búsqueda de direcciones, la página usa **Nominatim**, el servicio de búsqueda de lugares de OpenStreetMap. Es gratuito y no necesita clave. La aplicación lo consulta desde `Js/api.js`.

En palabras simples: le mandamos un texto (por ejemplo "Laureles, Medellín") y nos devuelve una lista de lugares con sus coordenadas, para poder mostrarlos en el mapa.

### Datos de la API

- **URL base:** `https://nominatim.openstreetmap.org`
- **Endpoint:** `/search`
- **Dirección completa:** `https://nominatim.openstreetmap.org/search`
- **Método HTTP:** `GET`

### Parámetros que se envían

| Parámetro | Para qué sirve | Ejemplo |
|---|---|---|
| `q` | El texto que se quiere buscar (dirección o barrio). | `Carrera 69, Castilla, Medellín` |
| `format` | En qué formato queremos la respuesta. | `jsonv2` |
| `limit` | Cuántos resultados devolver como máximo. | `5` |
| `countrycodes` | Limita la búsqueda a un país. | `co` (Colombia) |
| `accept-language` | Idioma en que llegan los nombres. | `es` (español) |

Un ejemplo de consulta completa sería:

```
https://nominatim.openstreetmap.org/search?q=Carrera+69,+Castilla,+Medellín&format=jsonv2&limit=5&countrycodes=co&accept-language=es
```

### Ejemplo de respuesta (JSON)

La API responde con una **lista** de lugares. Cada lugar trae, entre otros datos, su identificador, sus coordenadas (`lat` y `lon`) y su nombre completo:

```json
[
  {
    "place_id": 309883514,
    "lat": "6.2569310",
    "lon": "-75.5857997",
    "display_name": "Carrera 69, Suramericana, Comuna 11 - Laureles-Estadio, Medellín, Antioquia, Colombia",
    "type": "residential",
    "importance": 0.053
  }
]
```

De esa respuesta, la aplicación solo toma lo que necesita: el nombre (`display_name`) y las coordenadas (`lat`, `lon`) para ubicar el punto en el mapa. Esa transformación se hace en `Js/modelo.js`.

> Nota: Nominatim permite **una consulta por segundo** como máximo, por eso la aplicación espera un momento entre búsquedas y guarda en memoria las que ya hizo.

## La API de correo (suscripción a promociones)

El formulario de novedades registra el correo de quien quiere recibir promociones. Por seguridad, el navegador **no** habla directo con el proveedor de correo (Brevo): le envía el dato a un servidor propio de MegaPapas (`server.js`), y ese servidor es el que lo registra usando su clave privada. Así la clave nunca queda expuesta en la página.

En palabras simples: la página manda el correo a su propio servidor, y el servidor responde si quedó registrado o no.

### Datos de la API

- **URL base:** la del servidor propio, configurada en `Js/config.js` siendo esta url: `https://megapapas.onrender.com`.
- **Endpoint:** `/api/suscripciones`
- **Método HTTP:** `POST`
- **Encabezado:** `Content-Type: application/json`

### Datos que se envían (cuerpo de la petición)

| Campo | Para qué sirve | Ejemplo |
|---|---|---|
| `email` | El correo que se quiere registrar. | `persona@ejemplo.com` |
| `consentimiento` | Confirma que la persona aceptó recibir promociones. | `true` |

```json
{
  "email": "persona@ejemplo.com",
  "consentimiento": true
}
```

### Ejemplo de respuesta (JSON)

Si todo sale bien, el servidor responde con un mensaje de confirmación:

```json
{
  "mensaje": "Correo registrado para recibir promociones."
}
```

Si algo falla (por ejemplo, un correo mal escrito), responde con una explicación del error:

```json
{
  "error": "Ingresa un correo electrónico válido."
}
```

## Dónde se guarda la información

El catálogo de productos y los datos de los clientes se guardan en el **navegador** (localStorage), no en una base de datos. Por eso cada computador tiene su propia copia.

## Publicación

La página se publica en GitHub Pages desde la rama `main`. El registro de correos para promociones funciona con un servidor aparte, llamado Render (que activa el 'server.js'), el cual se despliega por separado; su dirección se configura en 'Js/config.js'.

**URL base:** https://render.com/

Por seguridad, el archivo `.env` con las claves privadas nunca se sube al repositorio.
