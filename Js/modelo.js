(function (app) {
    const clave_productos = 'megapapas-productos';
    const clave_clientes = 'megapapas-clientes';

    const productos_iniciales = [
        { id: 1, nombre: 'Mega Hamburguesa', precio: 20000, categoria: 'Hamburguesas', cantidad: 30, imagen: 'img/pla1.png', descripcion: 'Pan artesanal, salsa de la casa, lechuga, tomate, carne artesanal 150g, queso, tocineta.', stock: 30, calificacion: 2.5 },
        { id: 2, nombre: 'Mega Mixtas', precio: 24900, categoria: 'Salchipapas', cantidad: 20, imagen: 'img/pla2.png', descripcion: 'Papas, pollo, carne molida, guacamole, paprika, salsas al gusto.', stock: 20, calificacion: 4.9 },
        { id: 3, nombre: 'Mega Tocineta', precio: 21900, categoria: 'Salchipapas', cantidad: 15, imagen: 'img/pla3.png', descripcion: 'Papas, tocineta, salsa de queso cheddar, cilantro picado, salsas al gusto.' },
        { id: 4, nombre: 'Mega Ranchera', precio: 24900, categoria: 'Salchipapas', cantidad: 18, imagen: 'img/pla4.png', descripcion: 'Papas, salchicha picada, maicitos, queso derretido, 2 huevitos de codorniz, salsas al gusto.' },
        { id: 5, nombre: 'Mega Antioqueñas', precio: 27900, categoria: 'Salchipapas', cantidad: 12, imagen: 'img/b5.png', descripcion: 'Papas, chicharrón, maduro, 2 butifarras, 4 chorizos cocteleros, queso derretido, salsas al gusto.' },
        { id: 6, nombre: 'Mega Porky', precio: 24900, categoria: 'Salchipapas', cantidad: 10, imagen: 'img/pla6.png', descripcion: 'Papas, queso derretido, pulled pork, guacamole, 2 huevitos de codorniz, salsas al gusto.' }
    ];

    function leerAlmacenamiento(clave, valorInicial) {
        try {
            const guardado = localStorage.getItem(clave);
            return guardado ? JSON.parse(guardado) : valorInicial;
        } catch {
            return valorInicial;
        }
    }

    function normalizarTexto(texto) {
        return texto.trim().toLocaleLowerCase('es');
    }

    function obtenerPedidos(cliente) {
        if (Array.isArray(cliente.pedidos)) return cliente.pedidos;
        if (Array.isArray(cliente.detallePedido) && cliente.detallePedido.length > 0) {
            return [{
                id: crearIdPedido(),
                estado: 'pendiente',
                detallePedido: cliente.detallePedido,
                total: cliente.total || 0,
                fecha: cliente.fecha || ''
            }];
        }
        return [];
    }

    function crearIdPedido() {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    function normalizarPedido(pedido) {
        let actualizado = false;
        const pedidoNormalizado = { ...pedido };
        if (!pedidoNormalizado.id) {
            pedidoNormalizado.id = crearIdPedido();
            actualizado = true;
        }
        if (pedidoNormalizado.estado !== 'entregado' && pedidoNormalizado.estado !== 'pendiente') {
            pedidoNormalizado.estado = 'pendiente';
            actualizado = true;
        }
        return { pedido: pedidoNormalizado, actualizado };
    }

    function validarProducto(datos, productos, idEdicion) {
        if (!datos.nombre || !datos.categoria || !datos.precioTexto || !datos.cantidadTexto || !datos.descripcion || (!datos.archivoImagen && !idEdicion)) {
            return { mensaje: 'Completa todos los campos y selecciona una imagen del producto.', campo: 'nombre-producto' };
        }
        if (datos.archivoImagen && !datos.archivoImagen.type.startsWith('image/')) {
            return { mensaje: 'El archivo seleccionado debe ser una imagen.', campo: 'imagen-producto' };
        }
        if (!Number.isFinite(datos.precio) || datos.precio <= 0 || !Number.isFinite(datos.cantidad) || datos.cantidad < 0) {
            return { mensaje: 'El precio debe ser positivo y la cantidad no puede ser negativa.', campo: 'precio-producto' };
        }
        if (productos.some((producto) => producto.id !== idEdicion && normalizarTexto(producto.nombre) === normalizarTexto(datos.nombre))) {
            return { mensaje: 'Ya existe un producto con ese nombre.', campo: 'nombre-producto' };
        }
        if (!Number.isInteger(datos.cantidad)) {
            return { mensaje: 'La cantidad debe ser un número entero.', campo: 'cantidad-producto' };
        }
        return null;
    }
const direccionNegocio = 'Carrera 69 #98-95, Medellín';

    // Consultas de la más exacta a la más general; se usa la primera que devuelva resultados.
    // Se incluye el barrio (Castilla) porque en Medellín hay varias "Carrera 69" y, sin ese dato,
    // la API devolvía una en San Antonio de Prado, muy lejos del local.
    const consultasNegocio = [
        'Carrera 69 #98-95, Castilla, Medellín, Colombia',
        'Carrera 69, Castilla, Medellín, Colombia',
        'Castilla, Medellín, Colombia'
    ];

    // Coordenadas verificadas del local (Carrera 69 entre calles 98 y 99, barrio Castilla).
    // La API no conoce el número exacto de la casa, así que el marcador siempre usa este punto.
    const coordenadasNegocio = { latitud: 6.2944, longitud: -75.5717 };

    // Si la API devuelve un lugar a más de esta distancia del local, se considera un resultado equivocado.
    const distanciaMaximaKm = 1.5;

    // La API pública permite máximo 1 petición por segundo.
    const pausaEntrePeticiones = 1100;

    // Guarda el local encontrado y los resultados de la última búsqueda.
    const estadoUbicacion = {
        negocio: {
            id: 0,
            nombre: direccionNegocio,
            latitud: coordenadasNegocio.latitud,
            longitud: coordenadasNegocio.longitud,
            importancia: 0,
            distanciaKm: null
        },
        resultados: []
    };

    // Espera un tiempo antes de continuar (se usa entre peticiones a la API).
    function pausar(milisegundos) {
        return new Promise((resolver) => setTimeout(resolver, milisegundos));
    }

    // Distancia en kilómetros entre dos puntos (fórmula de Haversine).
    function calcularDistanciaKm(origen, destino) {
        const radioTierraKm = 6371;
        const aRadianes = (grados) => (grados * Math.PI) / 180;
        const difLatitud = aRadianes(destino.latitud - origen.latitud);
        const difLongitud = aRadianes(destino.longitud - origen.longitud);
        const a = Math.sin(difLatitud / 2) ** 2
            + Math.cos(aRadianes(origen.latitud)) * Math.cos(aRadianes(destino.latitud)) * Math.sin(difLongitud / 2) ** 2;
        return radioTierraKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Convierte la respuesta de la API en objetos simples; con "origen" calcula la distancia al local.
    function transformarUbicaciones(datos, origen = null) {
        return datos
            .filter((lugar) => lugar.lat && lugar.lon)
            .map((lugar) => {
                const latitud = Number(lugar.lat);
                const longitud = Number(lugar.lon);
                return {
                    id: lugar.place_id,
                    nombre: lugar.display_name,
                    latitud,
                    longitud,
                    importancia: lugar.importance ?? 0,
                    distanciaKm: origen ? calcularDistanciaKm(origen, { latitud, longitud }) : null
                };
            })
            .sort((a, b) => (origen ? a.distanciaKm - b.distanciaKm : b.importancia - a.importancia));
    }

    // Arma el enlace del mapa incrustado de OpenStreetMap con un marcador en el punto.
    function crearUrlMapa(ubicacion) {
        const margen = 0.004;
        const caja = [
            ubicacion.longitud - margen,
            ubicacion.latitud - margen,
            ubicacion.longitud + margen,
            ubicacion.latitud + margen
        ].map((valor) => valor.toFixed(5)).join(',');
        return `https://www.openstreetmap.org/export/embed.html?bbox=${caja}&layer=mapnik&marker=${ubicacion.latitud},${ubicacion.longitud}`;
    }

    // Enlace para abrir el mismo punto en la página de OpenStreetMap.
    function crearUrlMapaGrande(ubicacion) {
        return `https://www.openstreetmap.org/?mlat=${ubicacion.latitud}&mlon=${ubicacion.longitud}#map=17/${ubicacion.latitud}/${ubicacion.longitud}`;
    }

    app.Modelo = {
        claveClientes: clave_clientes,
        obtenerProductos() {
            return leerAlmacenamiento(clave_productos, productos_iniciales);
        },
        guardarProductos(productos) {
            localStorage.setItem(clave_productos, JSON.stringify(productos));
        },
        obtenerClientes() {
            const clientes = leerAlmacenamiento(clave_clientes, []);
            let requiereGuardado = false;
            const clientesNormalizados = clientes.map((cliente) => {
                const pedidos = obtenerPedidos(cliente);
                const pedidosNormalizados = pedidos.map((pedido) => {
                    const resultado = normalizarPedido(pedido);
                    requiereGuardado = requiereGuardado || resultado.actualizado;
                    return resultado.pedido;
                });
                if (!Array.isArray(cliente.pedidos)) requiereGuardado = true;
                return { ...cliente, pedidos: pedidosNormalizados };
            });
            if (requiereGuardado) {
                localStorage.setItem(clave_clientes, JSON.stringify(clientesNormalizados));
            }
            return clientesNormalizados;
        },
        obtenerClientePorEmail(email) {
            const emailNormalizado = normalizarTexto(email);
            return this.obtenerClientes().find((cliente) =>
                normalizarTexto(cliente.email || '') === emailNormalizado
            ) || null;
        },
        guardarCliente(datos, emailAnterior = datos.email) {
            const clientes = this.obtenerClientes();
            const emailNormalizado = normalizarTexto(datos.email);
            const emailAnteriorNormalizado = normalizarTexto(emailAnterior);
            if (emailNormalizado !== emailAnteriorNormalizado && clientes.some((cliente) =>
                normalizarTexto(cliente.email || '') === emailNormalizado
            )) {
                throw new Error('Ya existe un registro con el nuevo correo electrónico.');
            }
            const coincidencias = clientes.filter((cliente) =>
                normalizarTexto(cliente.email || '') === emailAnteriorNormalizado
            );
            const existente = coincidencias[0];
            const pedidos = coincidencias.flatMap(obtenerPedidos);
            const fecha = new Date().toLocaleDateString();

            if (datos.detallePedido) {
                pedidos.push({
                    id: crearIdPedido(),
                    estado: 'pendiente',
                    detallePedido: datos.detallePedido,
                    total: datos.total,
                    fecha
                });
            }

            const cliente = {
                ...(existente || {}),
                nombre: datos.nombre,
                email: datos.email.trim(),
                direccion: datos.direccion,
                telefono: datos.telefono,
                medioPago: datos.medioPago,
                instruccionesAdicionales: datos.instruccionesAdicionales,
                pedidos,
                fecha: pedidos.length > 0 ? pedidos[pedidos.length - 1].fecha : (existente?.fecha || fecha)
            };
            const ultimoPedido = pedidos[pedidos.length - 1];
            if (ultimoPedido) {
                cliente.detallePedido = ultimoPedido.detallePedido;
                cliente.total = ultimoPedido.total;
            } else {
                delete cliente.detallePedido;
                delete cliente.total;
            }

            const clientesActualizados = clientes.filter((clienteGuardado) =>
                normalizarTexto(clienteGuardado.email || '') !== emailAnteriorNormalizado
            );
            clientesActualizados.push(cliente);
            localStorage.setItem(clave_clientes, JSON.stringify(clientesActualizados));
            return { actualizado: coincidencias.length > 0 };
        },
        actualizarEstadoPedido(email, idPedido) {
            const clientes = this.obtenerClientes();
            const cliente = clientes.find((registro) =>
                normalizarTexto(registro.email || '') === normalizarTexto(email)
            );
            const pedido = cliente?.pedidos.find((registro) => registro.id === idPedido);
            if (!pedido) throw new Error('No se encontró el pedido para actualizar.');
            pedido.estado = 'entregado';
            localStorage.setItem(clave_clientes, JSON.stringify(clientes));
        },
        validarProducto,
                ubicacion: {
            direccionNegocio,
            consultasNegocio,
            pausaEntrePeticiones,
            estado: estadoUbicacion,
            pausar,
            transformarUbicaciones,
            crearUrlMapa,
            crearUrlMapaGrande
        }
    };
}(window.MegaPapas = window.MegaPapas || {}) )

