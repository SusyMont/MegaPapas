(function (app) {
    function formatearPrecio(precio) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(precio);
    }

    function normalizarTexto(texto) {
        return texto.trim().toLocaleLowerCase('es');
    }

    function crearIndicador(idRegistro, clase, etiqueta, valor, maximo, texto) {
        const indicador = document.createElement('div');
        const label = document.createElement('label');
        const medida = document.createElement(clase);
        const detalle = document.createElement('small');
        const id = `medida-${idRegistro}-${clase}`;

        indicador.className = 'indicador-medicion';
        label.htmlFor = id;
        label.textContent = etiqueta;
        medida.id = id;
        medida.value = valor;
        medida.max = maximo;
        medida.setAttribute('aria-label', etiqueta);
        detalle.textContent = texto;
        indicador.append(label, medida, detalle);
        return indicador;
    }

    function crearTarjeta(registro, esAdmin) {
        const tarjeta = document.createElement('div');
        const imagen = document.createElement('img');
        const contenido = document.createElement('div');
        const nombre = document.createElement('h3');
        const descripcion = document.createElement('p');
        const precio = document.createElement('p');
        const cantidad = document.createElement('p');

        tarjeta.className = 'box';
        tarjeta.dataset.categoria = registro.categoria;
        tarjeta.dataset.precio = String(registro.precio);
        if (registro.cantidad <= 0) tarjeta.classList.add('agotado');

        imagen.src = registro.imagen;
        imagen.alt = registro.nombre;
        contenido.className = 'product-txt';
        nombre.textContent = registro.nombre;
        descripcion.textContent = registro.descripcion;
        precio.className = 'price';
        precio.textContent = formatearPrecio(registro.precio);
        cantidad.className = 'cantidad-producto';
        cantidad.textContent = registro.cantidad <= 0 ? 'Agotado' : `Cantidad disponible: ${registro.cantidad}`;
        contenido.append(nombre, descripcion, precio);

        if (registro.stock !== undefined) {
            contenido.append(
                crearIndicador(registro.id, 'progress', 'Stock disponible:', registro.stock, 100, `${registro.stock}% restante`),
                crearIndicador(registro.id, 'meter', 'Calificación de clientes:', registro.calificacion, 5, `${registro.calificacion} / 5.0`)
            );
        }

        contenido.appendChild(cantidad);
        if (esAdmin) {
            const botonEditar = document.createElement('button');
            const botonEliminar = document.createElement('button');
            botonEditar.type = 'button';
            botonEditar.className = 'editar-producto';
            botonEditar.dataset.id = String(registro.id);
            botonEditar.textContent = 'Editar';
            botonEliminar.type = 'button';
            botonEliminar.className = 'eliminar-producto';
            botonEliminar.dataset.id = String(registro.id);
            botonEliminar.textContent = 'Eliminar';
            contenido.append(botonEditar, botonEliminar);
        } else {
            const botonCarrito = document.createElement('a');
            botonCarrito.href = '#';
            botonCarrito.className = 'agregar-carrito btn-3';
            botonCarrito.dataset.id = String(registro.id);
            botonCarrito.textContent = 'Agregar al carrito';
            contenido.appendChild(botonCarrito);
        }

        tarjeta.append(imagen, contenido);
        return tarjeta;
    }

    function renderizarProductos(contenedor, productos, resaltar, esAdmin) {
        contenedor.replaceChildren();
        productos.forEach((producto) => {
            const tarjeta = crearTarjeta(producto, esAdmin);
            if (resaltar) tarjeta.classList.add('coincide-filtro');
            contenedor.appendChild(tarjeta);
        });
    }

    function crearBotonesFiltro(contenedor, productos, categoriaSeleccionada) {
        contenedor.replaceChildren();
        const categorias = [...new Set(productos.map((producto) => producto.categoria))];
        ['Todas', ...categorias].forEach((categoria) => {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'boton-filtro';
            boton.dataset.categoria = categoria;
            boton.textContent = categoria;
            boton.classList.toggle('filtro-seleccionado', categoria === categoriaSeleccionada);
            contenedor.appendChild(boton);
        });
    }

    function actualizarBotonesFiltro(contenedor, categoriaSeleccionada) {
        contenedor.querySelectorAll('button').forEach((boton) => {
            boton.classList.toggle('filtro-seleccionado', boton.dataset.categoria === categoriaSeleccionada);
        });
    }

    function dibujarTablaProductos(cuerpo, productos) {
        cuerpo.replaceChildren();
        productos.forEach((producto) => {
            const fila = document.createElement('tr');
            fila.dataset.categoria = producto.categoria;
            fila.dataset.estadoInventario = producto.cantidad <= 0 ? 'agotado' : 'disponible';
            const valores = [
                producto.nombre,
                producto.categoria,
                formatearPrecio(producto.precio),
                String(producto.cantidad),
                producto.cantidad <= 0 ? 'Agotado' : 'Disponible'
            ];
            valores.forEach((valor) => {
                const celda = document.createElement('td');
                celda.textContent = valor;
                fila.appendChild(celda);
            });
            if (producto.cantidad <= 0) fila.classList.add('fila-agotada');
            cuerpo.appendChild(fila);
        });
    }
    function dibujarTablaClientes(cuerpo, clientes) {
        cuerpo.replaceChildren();
        const crearCelda = (valor) => {
            const celda = document.createElement('td');
            celda.textContent = valor ?? '';
            return celda;
        };

        clientes.forEach((cliente) => {
            const pedidos = Array.isArray(cliente.pedidos)
                ? cliente.pedidos
                : (cliente.detallePedido ? [{
                    id: '',
                    estado: 'pendiente',
                    detallePedido: cliente.detallePedido,
                    total: cliente.total || 0,
                    fecha: cliente.fecha || ''
                }] : []);

            const pedidosParaMostrar = pedidos.length > 0 ? pedidos : [null];
            pedidosParaMostrar.forEach((pedido, indice) => {
                const fila = document.createElement('tr');
                fila.dataset.estadoPedido = !pedido
                    ? 'sin-pedido'
                    : (pedido.estado === 'entregado' ? 'entregado' : 'pendiente');
                const celdaProductos = document.createElement('td');
                if (!pedido || !pedido.detallePedido?.length) {
                    celdaProductos.textContent = pedido ? 'Sin detalle' : 'Sin pedidos';
                } else {
                    const lista = document.createElement('ul');
                    (pedido.detallePedido || []).forEach((item) => {
                        const li = document.createElement('li');
                        li.textContent = `${item.cantidad} × ${item.nombre}`;
                        lista.appendChild(li);
                    });
                    celdaProductos.appendChild(lista);
                }

                const celdaEstado = document.createElement('td');
                if (pedido) {
                    if (pedido.estado === 'entregado') {
                        celdaEstado.textContent = 'Entregado';
                        celdaEstado.dataset.csvValue = 'Entregado';
                    } else {
                        const botonEstado = document.createElement('button');
                        botonEstado.type = 'button';
                        botonEstado.className = 'btn-accion-pedido';
                        botonEstado.dataset.pedidoAccion = 'entregado';
                        botonEstado.dataset.email = cliente.email;
                        botonEstado.dataset.pedidoId = pedido.id;
                        botonEstado.textContent = 'Marcar como entregado';
                        celdaEstado.appendChild(botonEstado);
                        celdaEstado.dataset.csvValue = 'Pendiente';
                    }
                } else {
                    celdaEstado.textContent = '—';
                    celdaEstado.dataset.csvValue = 'Sin pedidos';
                }

                fila.append(
                    crearCelda(cliente.nombre),
                    crearCelda(cliente.email),
                    crearCelda(cliente.direccion),
                    crearCelda(cliente.telefono),
                    crearCelda(pedido ? `Pedido ${indice + 1}` : ''),
                    celdaProductos,
                    crearCelda(pedido ? formatearPrecio(Number(pedido.total) || 0) : ''),
                    crearCelda(cliente.medioPago),
                    crearCelda(cliente.instruccionesAdicionales),
                    crearCelda(pedido ? pedido.fecha : cliente.fecha),
                    celdaEstado
                );
                cuerpo.appendChild(fila);
            });
        });
    }

    function actualizarResumen(elementos, productos) {
        const categorias = [...new Set(productos.map((producto) => producto.categoria))];
        const sumaPrecios = productos.reduce((total, producto) => total + producto.precio, 0);
        const promedio = productos.length > 0 ? sumaPrecios / productos.length : 0;
        const agotados = productos.filter((producto) => producto.cantidad <= 0);
        const valorTotal = productos.reduce((total, producto) => total + producto.precio * producto.cantidad, 0);

        elementos.totalProductos.textContent = String(productos.length);
        elementos.totalCategorias.textContent = String(categorias.length);
        elementos.precioPromedio.textContent = formatearPrecio(promedio);
        elementos.totalAgotados.textContent = String(agotados.length);
        elementos.valorInventario.textContent = formatearPrecio(valorTotal);
    }

    function renderizarCarrito(cuerpo, totalElemento, productosCarrito) {
        cuerpo.replaceChildren();
        let total = 0;
        productosCarrito.forEach((producto) => {
            const fila = document.createElement('tr');
            const celdaImagen = document.createElement('td');
            const imagen = document.createElement('img');
            imagen.src = producto.imagen;
            imagen.width = 70;
            imagen.alt = producto.nombre;
            celdaImagen.appendChild(imagen);

            const celdaNombre = document.createElement('td');
            celdaNombre.textContent = producto.nombre;
            const celdaPrecio = document.createElement('td');
            celdaPrecio.textContent = formatearPrecio(producto.precio);

            const celdaCantidad = document.createElement('td');
            const controles = document.createElement('div');
            const botonRestar = document.createElement('button');
            const valorCantidad = document.createElement('span');
            const botonSumar = document.createElement('button');
            controles.className = 'controles-cantidad-carrito';
            botonRestar.type = 'button';
            botonRestar.className = 'cambiar-cantidad';
            botonRestar.dataset.id = String(producto.id);
            botonRestar.dataset.cambio = '-1';
            botonRestar.setAttribute('aria-label', `Restar una unidad de ${producto.nombre}`);
            botonRestar.textContent = '-';
            valorCantidad.textContent = String(producto.cantidadEnCarrito);
            botonSumar.type = 'button';
            botonSumar.className = 'cambiar-cantidad';
            botonSumar.dataset.id = String(producto.id);
            botonSumar.dataset.cambio = '1';
            botonSumar.setAttribute('aria-label', `Sumar una unidad de ${producto.nombre}`);
            botonSumar.textContent = '+';
            botonSumar.disabled = producto.cantidadEnCarrito >= producto.stock;
            controles.append(botonRestar, valorCantidad, botonSumar);
            celdaCantidad.appendChild(controles);

            const subtotal = producto.precio * producto.cantidadEnCarrito;
            total += subtotal;
            const celdaSubtotal = document.createElement('td');
            celdaSubtotal.textContent = formatearPrecio(subtotal);
            const celdaBorrar = document.createElement('td');
            const enlaceBorrar = document.createElement('a');
            enlaceBorrar.href = '#';
            enlaceBorrar.className = 'borrar';
            enlaceBorrar.dataset.id = String(producto.id);
            enlaceBorrar.setAttribute('aria-label', `Quitar ${producto.nombre} del carrito`);
            enlaceBorrar.textContent = 'X';
            celdaBorrar.appendChild(enlaceBorrar);
            fila.append(celdaImagen, celdaNombre, celdaPrecio, celdaCantidad, celdaSubtotal, celdaBorrar);
            cuerpo.appendChild(fila);
        });
        totalElemento.textContent = `Total: ${formatearPrecio(total)}`;
    }

    function renderizarResumenPedido(lista, totalElemento, productosCarrito) {
        lista.replaceChildren();
        let total = 0;

        if (productosCarrito.size === 0) {
            const vacio = document.createElement('li');
            vacio.textContent = 'Aún no has agregado productos al carrito.';
            lista.appendChild(vacio);
        }

        productosCarrito.forEach((producto) => {
            const subtotal = producto.precio * producto.cantidadEnCarrito;
            total += subtotal;
            const item = document.createElement('li');
            const nombre = document.createElement('span');
            const valor = document.createElement('span');
            nombre.textContent = `${producto.cantidadEnCarrito} × ${producto.nombre}`;
            valor.textContent = formatearPrecio(subtotal);
            item.append(nombre, valor);
            lista.appendChild(item);
        });

        totalElemento.textContent = `Total: ${formatearPrecio(total)}`;
    }

    function mostrarErrorProducto(mensaje, campo) {
        const error = document.getElementById('error-producto');
        error.textContent = mensaje;
        campo.classList.add('campo-error');
        campo.focus();
    }

    function limpiarErroresProducto(formulario) {
        document.getElementById('error-producto').textContent = '';
        formulario.querySelectorAll('.campo-error').forEach((campo) => campo.classList.remove('campo-error'));
    }
// Renderizado del mapa.

    function mostrarEstadoUbicacion(texto, cargando = false) {
        const estado = document.getElementById('estado-ubicacion');
        estado.textContent = texto;
        estado.classList.toggle('ubicacion__estado--cargando', cargando);
    }

    function habilitarBusquedaUbicacion(habilitada) {
        document.getElementById('boton-buscar-ubicacion').disabled = !habilitada;
    }

    function dibujarMapa(urlMapa, urlMapaGrande) {
        const enlace = document.getElementById('enlace-mapa');
        document.getElementById('mapa-ubicacion').src = urlMapa;
        enlace.href = urlMapaGrande;
        enlace.hidden = false;
    }

    function dibujarUbicaciones(lista) {
        const contenedor = document.getElementById('lista-ubicaciones');
        contenedor.replaceChildren();

        lista.forEach((lugar) => {
            const item = document.createElement('li');
            const boton = document.createElement('button');
            const nombre = document.createElement('span');

            item.className = 'ubicacion__item';
            boton.type = 'button';
            boton.className = 'ubicacion__opcion';
            boton.dataset.id = String(lugar.id);
            nombre.textContent = lugar.nombre;
            boton.appendChild(nombre);

            if (lugar.distanciaKm !== null) {
                const distancia = document.createElement('small');
                distancia.className = 'ubicacion__distancia';
                distancia.textContent = `A unos ${lugar.distanciaKm.toFixed(1)} km del local`;
                boton.appendChild(distancia);
            }

            item.appendChild(boton);
            contenedor.appendChild(item);
        });
    }

    app.Vista = {
        formatearPrecio,
        normalizarTexto,
        renderizarProductos,
        crearBotonesFiltro,
        actualizarBotonesFiltro,
        dibujarTablaProductos,
        dibujarTablaClientes,
        actualizarResumen,
        renderizarCarrito,
        renderizarResumenPedido,
        mostrarErrorProducto,
        limpiarErroresProducto,
        mostrarEstadoUbicacion,
        habilitarBusquedaUbicacion,
        dibujarMapa,
        dibujarUbicaciones
    };
})(window.MegaPapas = window.MegaPapas || {});
