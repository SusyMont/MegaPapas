(function (app) {
    function configurarTablaPaginada(opciones) {
        const filasPorPagina = 5;
        const botonAnterior = opciones.paginacion.querySelector('[data-page-prev]');
        const botonSiguiente = opciones.paginacion.querySelector('[data-page-next]');
        const textoPagina = opciones.paginacion.querySelector('[data-page-info]');
        let paginaActual = 1;

        function obtenerFilasFiltradas() {
            const busqueda = app.Vista.normalizarTexto(opciones.busqueda.value);
            return [...opciones.cuerpo.querySelectorAll('tr')].filter((fila) => {
                const textoFila = [...fila.cells]
                    .map((celda) => celda.dataset.csvValue || celda.textContent)
                    .join(' ');
                if (busqueda && !app.Vista.normalizarTexto(textoFila).includes(busqueda)) {
                    return false;
                }
                return opciones.filtros.every((filtro) => {
                    const valor = filtro.control.value;
                    return !valor || fila.dataset[filtro.atributo] === valor;
                });
            });
        }

        function actualizar(reiniciarPagina = false) {
            const todasLasFilas = [...opciones.cuerpo.querySelectorAll('tr')];
            const filasFiltradas = obtenerFilasFiltradas();
            const paginasTotales = Math.max(1, Math.ceil(filasFiltradas.length / filasPorPagina));
            if (reiniciarPagina) paginaActual = 1;
            paginaActual = Math.min(paginaActual, paginasTotales);

            const inicio = (paginaActual - 1) * filasPorPagina;
            const filasPagina = new Set(filasFiltradas.slice(inicio, inicio + filasPorPagina));
            todasLasFilas.forEach((fila) => {
                fila.hidden = !filasPagina.has(fila);
            });

            textoPagina.textContent = filasFiltradas.length === 0
                ? 'Sin registros para mostrar'
                : `Mostrando ${inicio + 1}–${Math.min(inicio + filasPorPagina, filasFiltradas.length)} de ${filasFiltradas.length}`;
            botonAnterior.disabled = paginaActual === 1;
            botonSiguiente.disabled = paginaActual === paginasTotales;
        }

        function exportarCsv() {
            const encabezados = [...opciones.tabla.querySelectorAll('thead th')]
                .map((celda) => celda.textContent.trim());
            const filas = obtenerFilasFiltradas().map((fila) => [...fila.cells].map((celda) => {
                if (celda.dataset.csvValue) return celda.dataset.csvValue;
                const elementosLista = [...celda.querySelectorAll('li')];
                return elementosLista.length > 0
                    ? elementosLista.map((elemento) => elemento.textContent.trim()).join('; ')
                    : celda.textContent.trim().replace(/\s+/g, ' ');
            }));
            const escapar = (valor) => {
                const texto = String(valor);
                const seguro = /^\s*[=+\-@]/.test(texto) ? `'${texto}` : texto;
                return `"${seguro.replace(/"/g, '""')}"`;
            };
            const contenido = [encabezados, ...filas]
                .map((fila) => fila.map(escapar).join(','))
                .join('\r\n');
            const archivo = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(archivo);
            const enlace = document.createElement('a');
            enlace.href = url;
            enlace.download = opciones.nombreArchivo;
            document.body.appendChild(enlace);
            enlace.click();
            enlace.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 0);
        }

        opciones.busqueda.addEventListener('input', () => actualizar(true));
        opciones.filtros.forEach((filtro) => {
            filtro.control.addEventListener('change', () => actualizar(true));
        });
        botonAnterior.addEventListener('click', () => {
            paginaActual -= 1;
            actualizar();
        });
        botonSiguiente.addEventListener('click', () => {
            paginaActual += 1;
            actualizar();
        });
        opciones.botonExportar.addEventListener('click', exportarCsv);

        return { actualizar };
    }

    function configurarValidacionEnEspanol(formulario) {
        formulario.querySelectorAll('input, select, textarea').forEach((campo) => {
            campo.addEventListener('invalid', () => {
                const reglas = campo.validity;
                let mensaje = 'Revisa la información ingresada.';
                if (reglas.valueMissing) {
                    mensaje = 'Completa este campo antes de continuar.';
                } else if (campo.id === 'telefono' && (reglas.patternMismatch || reglas.tooShort || reglas.tooLong)) {
                    mensaje = 'Ingresa un número de teléfono de exactamente 10 dígitos.';
                } else if (reglas.typeMismatch && campo.type === 'email') {
                    mensaje = 'Ingresa un correo electrónico válido. Ejemplo: nombre@correo.com.';
                } else if (reglas.patternMismatch) {
                    mensaje = campo.title || 'El formato ingresado no es válido.';
                } else if (reglas.tooShort) {
                    mensaje = `Ingresa al menos ${campo.minLength} caracteres.`;
                } else if (reglas.tooLong) {
                    mensaje = `Ingresa como máximo ${campo.maxLength} caracteres.`;
                } else if (reglas.rangeUnderflow) {
                    mensaje = `El valor debe ser igual o mayor que ${campo.min}.`;
                } else if (reglas.rangeOverflow) {
                    mensaje = `El valor debe ser igual o menor que ${campo.max}.`;
                } else if (reglas.stepMismatch || reglas.badInput) {
                    mensaje = 'Ingresa un número válido.';
                }
                campo.setCustomValidity(mensaje);
            });
            campo.addEventListener('input', () => campo.setCustomValidity(''));
            campo.addEventListener('change', () => campo.setCustomValidity(''));
        });
    }

    function iniciarCatalogo(esAdmin) {
        let productos = app.Modelo.obtenerProductos();
        let categoriaSeleccionada = 'Todas';
        const contenedorFiltros = document.getElementById('filtros-categoria');
        const contenedorTarjetas = document.getElementById('lista-1');
        const campoBusqueda = document.getElementById('buscador-productos');
        const mensajeBusqueda = document.getElementById('mensaje-busqueda');
        const cantidadResultados = document.getElementById('cantidad-resultados');
        const listaResumen = document.getElementById('resumen-pedido');
        const totalResumen = document.getElementById('total-pedido');
        const mensajePedido = document.getElementById('mensaje-pedido');
        const botonPedido = document.getElementById('realizar-pedido');
        const tablaProductos = esAdmin ? configurarTablaPaginada({
            tabla: document.getElementById('tabla-productos'),
            cuerpo: document.getElementById('cuerpo-tabla-productos'),
            busqueda: document.getElementById('filtro-tabla-productos'),
            filtros: [
                { control: document.getElementById('categoria-tabla-productos'), atributo: 'categoria' },
                { control: document.getElementById('estado-tabla-productos'), atributo: 'estadoInventario' }
            ],
            paginacion: document.getElementById('paginacion-productos'),
            botonExportar: document.getElementById('exportar-productos'),
            nombreArchivo: 'megapapas-productos.csv'
        }) : null;

        const actualizarCatalogo = () => {
            const busqueda = app.Vista.normalizarTexto(campoBusqueda.value);
            const visibles = productos.filter((producto) => {
                const coincideCategoria = categoriaSeleccionada === 'Todas' || producto.categoria === categoriaSeleccionada;
                return coincideCategoria && app.Vista.normalizarTexto(producto.nombre).includes(busqueda);
            });
            const hayFiltro = busqueda !== '' || categoriaSeleccionada !== 'Todas';
            app.Vista.renderizarProductos(contenedorTarjetas, visibles, hayFiltro, esAdmin);
            cantidadResultados.textContent = `${visibles.length} productos en esta selección`;
            mensajeBusqueda.textContent = visibles.length === 0 ? 'No se encontraron productos.' : '';

            if (esAdmin) {
                app.Vista.dibujarTablaProductos(document.getElementById('cuerpo-tabla-productos'), productos);
                tablaProductos.actualizar();
                app.Vista.actualizarResumen({
                    totalProductos: document.getElementById('total-productos'),
                    totalCategorias: document.getElementById('total-categorias'),
                    precioPromedio: document.getElementById('precio-promedio'),
                    totalAgotados: document.getElementById('total-agotados'),
                    valorInventario: document.getElementById('valor-inventario')
                }, productos);
            }
        };

        const seleccionarCategoria = (evento) => {
            const boton = evento.target.closest('button[data-categoria]');
            if (!boton || !contenedorFiltros.contains(boton)) return;
            categoriaSeleccionada = boton.dataset.categoria;
            app.Vista.actualizarBotonesFiltro(contenedorFiltros, categoriaSeleccionada);
            actualizarCatalogo();
        };

        app.Vista.crearBotonesFiltro(contenedorFiltros, productos, categoriaSeleccionada);
        campoBusqueda.addEventListener('input', actualizarCatalogo);
        contenedorFiltros.addEventListener('click', seleccionarCategoria);

        if (esAdmin) {
            const catalogo = {
                productos,
                actualizarProductos(nuevos) {
                    productos = nuevos;
                    catalogo.productos = nuevos;
                },
                actualizarCatalogo,
                restablecerCategoria: () => {
                    categoriaSeleccionada = 'Todas';
                    app.Vista.actualizarBotonesFiltro(contenedorFiltros, categoriaSeleccionada);
                }
            };
            iniciarAdministracion(catalogo);
        } else {
            iniciarTienda(productos, contenedorTarjetas);
        }
        actualizarCatalogo();
    }

    function iniciarAdministracion(catalogo) {
        const formulario = document.getElementById('form-producto');
        const campoNombre = document.getElementById('nombre-producto');
        const campoCategoria = document.getElementById('categoria-producto');
        const campoPrecio = document.getElementById('precio-producto');
        const campoCantidad = document.getElementById('cantidad-producto');
        const campoDescripcion = document.getElementById('descripcion-producto');
        const campoImagen = document.getElementById('imagen-producto');
        const campoIdEdicion = document.getElementById('producto-id-edicion');
        const botonCancelarEdicion = document.getElementById('cancelar-edicion');
        const botonGuardarProducto = formulario.querySelector('button[type="submit"]');
        const contenedorTarjetas = document.getElementById('lista-1');

        function cancelarEdicion() {
            formulario.reset();
            campoIdEdicion.value = '';
            campoImagen.required = true;
            botonGuardarProducto.textContent = 'Agregar producto';
            botonCancelarEdicion.hidden = true;
            app.Vista.limpiarErroresProducto(formulario);
        }

        async function agregarProducto(evento) {
            evento.preventDefault();
            app.Vista.limpiarErroresProducto(formulario);
            const datos = {
                nombre: campoNombre.value.trim(),
                categoria: campoCategoria.value,
                precioTexto: campoPrecio.value.trim(),
                cantidadTexto: campoCantidad.value.trim(),
                descripcion: campoDescripcion.value.trim(),
                archivoImagen: campoImagen.files[0]
            };
            datos.precio = Number(datos.precioTexto);
            datos.cantidad = Number(datos.cantidadTexto);
            const idEdicion = campoIdEdicion.value ? Number(campoIdEdicion.value) : null;
            const error = app.Modelo.validarProducto(datos, catalogo.productos, idEdicion);
            if (error) {
                app.Vista.mostrarErrorProducto(error.mensaje, document.getElementById(error.campo));
                return;
            }

            const registroExistente = catalogo.productos.find((producto) => producto.id === idEdicion);
            let imagen;
            try {
                imagen = datos.archivoImagen ? await leerImagen(datos.archivoImagen) : registroExistente.imagen;
            } catch (errorLectura) {
                app.Vista.mostrarErrorProducto('No se pudo leer la imagen seleccionada. Intenta cargarla de nuevo.', campoImagen);
                return;
            }

            const producto = {
                ...registroExistente,
                id: idEdicion || Date.now(),
                nombre: datos.nombre,
                precio: datos.precio,
                categoria: datos.categoria,
                cantidad: datos.cantidad,
                imagen,
                descripcion: datos.descripcion
            };
            const nuevosProductos = idEdicion
                ? catalogo.productos.map((registro) => registro.id === idEdicion ? producto : registro)
                : [...catalogo.productos, producto];
            app.Modelo.guardarProductos(nuevosProductos);
            catalogo.actualizarProductos(nuevosProductos);

            formulario.reset();
            campoIdEdicion.value = '';
            campoImagen.required = true;
            botonGuardarProducto.textContent = 'Agregar producto';
            botonCancelarEdicion.hidden = true;
            catalogo.restablecerCategoria();
            catalogo.actualizarCatalogo();
        }

        function leerImagen(archivo) {
            return new Promise((resolver, rechazar) => {
                const lector = new FileReader();
                lector.onload = () => resolver(lector.result);
                lector.onerror = () => rechazar(lector.error);
                lector.readAsDataURL(archivo);
            });
        }

        function editarProducto(evento) {
            const boton = evento.target.closest('button.editar-producto');
            if (!boton) return;
            const registro = catalogo.productos.find((producto) => producto.id === Number(boton.dataset.id));
            if (!registro) return;
            campoIdEdicion.value = String(registro.id);
            campoNombre.value = registro.nombre;
            campoCategoria.value = registro.categoria;
            campoPrecio.value = String(registro.precio);
            campoCantidad.value = String(registro.cantidad);
            campoDescripcion.value = registro.descripcion;
            campoImagen.required = false;
            botonGuardarProducto.textContent = 'Guardar cambios';
            botonCancelarEdicion.hidden = false;
            formulario.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function eliminarProducto(evento) {
            const boton = evento.target.closest('button.eliminar-producto');
            if (!boton) return;
            const id = Number(boton.dataset.id);
            const registro = catalogo.productos.find((producto) => producto.id === id);
            if (!registro || !confirm(`¿Seguro que quieres eliminar "${registro.nombre}"?`)) return;
            const nuevosProductos = catalogo.productos.filter((producto) => producto.id !== id);
            app.Modelo.guardarProductos(nuevosProductos);
            catalogo.actualizarProductos(nuevosProductos);
            catalogo.actualizarCatalogo();
        }

        formulario.addEventListener('submit', agregarProducto);
        botonCancelarEdicion.addEventListener('click', cancelarEdicion);
        contenedorTarjetas.addEventListener('click', editarProducto);
        contenedorTarjetas.addEventListener('click', eliminarProducto);
        configurarValidacionEnEspanol(formulario);
    }

    function iniciarTienda(productos, contenedorTarjetas) {
        const cuerpoCarrito = document.querySelector('#lista-carrito tbody');
        const totalCarrito = document.getElementById('total-carrito');
        const mensajeCarrito = document.getElementById('mensaje-carrito');
        const carrito = document.getElementById('carrito');
        const vaciarCarritoBtn = document.getElementById('vaciar-carrito');
        const listaResumen = document.getElementById('resumen-pedido');
        const totalResumen = document.getElementById('total-pedido');
        const mensajePedido = document.getElementById('mensaje-pedido');
        const botonPedido = document.getElementById('realizar-pedido');
        const productosCarrito = new Map();

        function actualizarCarrito() {
            app.Vista.renderizarCarrito(cuerpoCarrito, totalCarrito, productosCarrito);
            app.Vista.renderizarResumenPedido(listaResumen, totalResumen, productosCarrito);
        }

        function comprarElemento(evento) {
            evento.preventDefault();
            const boton = evento.target.closest('.agregar-carrito');
            if (!boton) return;
            const registro = productos.find((producto) => producto.id === Number(boton.dataset.id));
            if (!registro || registro.cantidad <= 0) return;
            const productoEnCarrito = productosCarrito.get(registro.id);
            if (productoEnCarrito) {
                if (productoEnCarrito.cantidadEnCarrito >= registro.cantidad) {
                    mensajeCarrito.textContent = `Solo hay ${registro.cantidad} unidades disponibles de ${registro.nombre}.`;
                    return;
                }
                productoEnCarrito.cantidadEnCarrito += 1;
            } else {
                productosCarrito.set(registro.id, {
                    id: registro.id,
                    nombre: registro.nombre,
                    imagen: registro.imagen,
                    precio: registro.precio,
                    stock: registro.cantidad,
                    cantidadEnCarrito: 1
                });
            }
            mensajeCarrito.textContent = '';
            actualizarCarrito();
        }

        function cambiarCantidadCarrito(evento) {
            const boton = evento.target.closest('button.cambiar-cantidad');
            if (!boton) return;
            const producto = productosCarrito.get(Number(boton.dataset.id));
            if (!producto) return;
            const cantidadNueva = producto.cantidadEnCarrito + Number(boton.dataset.cambio);
            if (cantidadNueva <= 0) {
                productosCarrito.delete(producto.id);
            } else if (cantidadNueva <= producto.stock) {
                producto.cantidadEnCarrito = cantidadNueva;
            }
            mensajeCarrito.textContent = '';
            actualizarCarrito();
        }

        function eliminarDelCarrito(evento) {
            evento.preventDefault();
            const enlace = evento.target.closest('.borrar');
            if (!enlace) return;
            productosCarrito.delete(Number(enlace.dataset.id));
            mensajeCarrito.textContent = '';
            actualizarCarrito();
        }

        function vaciarCarrito(evento) {
            if (evento) evento.preventDefault();
            productosCarrito.clear();
            mensajeCarrito.textContent = '';
            actualizarCarrito();
        }

        contenedorTarjetas.addEventListener('click', comprarElemento);
        carrito.addEventListener('click', eliminarDelCarrito);
        carrito.addEventListener('click', cambiarCantidadCarrito);
        vaciarCarritoBtn.addEventListener('click', vaciarCarrito);
        botonPedido.addEventListener('click', (evento) => {
            evento.preventDefault();
            if (productosCarrito.size === 0) {
                mensajeCarrito.textContent = 'Agrega al menos un producto antes de realizar el pedido.';
                return;
            }
            mensajeCarrito.textContent = '';
            document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
            document.getElementById('nombre').focus({ preventScroll: true });
        });
        actualizarCarrito();

        const formularioCliente = document.getElementById('form-cliente');
        const campoEmailCliente = document.getElementById('email');
        const botonBuscarCliente = document.getElementById('buscar-cliente');
        const estadoCliente = document.getElementById('estado-cliente');
        const botonEnviarPedido = formularioCliente.querySelector('button[type="submit"]');
        let emailOriginalCliente = '';

        function buscarCliente() {
            const email = campoEmailCliente.value.trim();
            if (!email) {
                emailOriginalCliente = '';
                estadoCliente.textContent = 'Escribe tu correo para buscar un registro existente.';
                return;
            }

            const cliente = app.Modelo.obtenerClientePorEmail(email);
            if (!cliente) {
                emailOriginalCliente = '';
                estadoCliente.textContent = 'No encontramos un registro con ese correo. Puedes continuar como cliente nuevo.';
                botonEnviarPedido.textContent = 'Enviar Pedido';
                return;
            }

            emailOriginalCliente = cliente.email;
            document.getElementById('nombre').value = cliente.nombre || '';
            document.getElementById('direccion').value = cliente.direccion || '';
            document.getElementById('telefono').value = cliente.telefono || '';
            document.getElementById('pago').value = cliente.medioPago || '';
            document.getElementById('instrucciones').value = cliente.instruccionesAdicionales || '';
            estadoCliente.textContent = 'Encontramos tu registro. Puedes editar tus datos y guardarlos; si agregas productos, también se creará un nuevo pedido.';
            botonEnviarPedido.textContent = 'Guardar datos y pedido';
        }
        botonBuscarCliente.addEventListener('click', buscarCliente);
        campoEmailCliente.addEventListener('input', () => {
            estadoCliente.textContent = '';
            botonEnviarPedido.textContent = 'Enviar Pedido';
        });

        formularioCliente.addEventListener('submit', (evento) => {
            evento.preventDefault();

            const email = campoEmailCliente.value.trim();
            const clienteExistente = app.Modelo.obtenerClientePorEmail(emailOriginalCliente || email);
            if (productosCarrito.size === 0 && !clienteExistente) {
                mensajePedido.classList.add('error');
                mensajePedido.textContent = 'Agrega productos al carrito antes de enviar un pedido. Si solo quieres actualizar tus datos, busca primero tu correo registrado.';
                return;
            }

            const detallePedido = [...productosCarrito.values()].map((producto) => ({
                id: producto.id,
                nombre: producto.nombre,
                cantidad: producto.cantidadEnCarrito,
                precio: producto.precio,
                subtotal: producto.precio * producto.cantidadEnCarrito
            }));
            const total = detallePedido.reduce((suma, item) => suma + item.subtotal, 0);

            try {
                const resultado = app.Modelo.guardarCliente({
                    nombre: document.getElementById('nombre').value.trim(),
                    email,
                    direccion: document.getElementById('direccion').value.trim(),
                    telefono: document.getElementById('telefono').value.trim(),
                    medioPago: document.getElementById('pago').value,
                    instruccionesAdicionales: document.getElementById('instrucciones').value.trim(),
                    ...(detallePedido.length > 0 ? { detallePedido, total } : {})
                }, emailOriginalCliente || email);
                formularioCliente.reset();
                vaciarCarrito();
                emailOriginalCliente = '';
                botonEnviarPedido.textContent = 'Enviar Pedido';
                estadoCliente.textContent = '';
                mensajePedido.classList.remove('error');
                mensajePedido.textContent = resultado.actualizado
                    ? (detallePedido.length > 0 ? 'Tus datos se actualizaron y el nuevo pedido quedó guardado.' : 'Tus datos se actualizaron correctamente.')
                    : '¡Pedido enviado! Pronto nos pondremos en contacto contigo.';
            } catch (error) {
                mensajePedido.classList.add('error');
                mensajePedido.textContent = error instanceof Error && error.message.includes('nuevo correo')
                    ? error.message
                    : 'No pudimos guardar la información. Revisa el almacenamiento del navegador e inténtalo de nuevo.';
                console.error('Error al guardar el registro del cliente:', error);
            }
        });
        configurarValidacionEnEspanol(formularioCliente);

        const formularioContacto = document.getElementById('form-contacto');
        const mensajeContacto = document.getElementById('mensaje-contacto');
        const campoEmailContacto = document.getElementById('correo-contacto');
        const campoConsentimientoPromocionesContacto = document.getElementById('consentimiento-promociones-contacto');
        const botonContacto = formularioContacto.querySelector('button[type="submit"]');
        formularioContacto.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            const nombre = document.getElementById('nombre-contacto').value.trim();
            if (!nombre) {
                mensajeContacto.textContent = 'Por favor escribe tu nombre.';
                return;
            }

            if (campoConsentimientoPromocionesContacto.checked) {
                botonContacto.disabled = true;
                mensajeContacto.classList.remove('error');
                mensajeContacto.textContent = 'Registrando tu correo...';
                try {
                    const baseApi = window.MegaPapasConfig.apiBaseUrl.replace(/\/$/, '');
                    if (!baseApi && window.location.hostname.endsWith('github.io')) {
                        throw new Error('El servicio de correos todavía no está conectado.');
                    }
                    const respuesta = await fetch(`${baseApi}/api/suscripciones`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: campoEmailContacto.value.trim(),
                            consentimiento: true
                        })
                    });
                    const resultadoSuscripcion = await respuesta.json();
                    if (!respuesta.ok) {
                        throw new Error(resultadoSuscripcion.error || 'No se pudo completar la suscripción.');
                    }
                    mensajeContacto.textContent = `¡Gracias, ${nombre}! Hemos recibido tu mensaje y registramos tu correo para promociones.`;
                } catch (error) {
                    const detalle = error instanceof Error
                        ? error.message
                        : 'No se pudo conectar con el servicio de correo.';
                    mensajeContacto.textContent = `No pudimos registrar tu correo para promociones: ${detalle}`;
                    mensajeContacto.classList.add('error');
                    console.error('Error al registrar el correo para promociones:', error);
                    return;
                } finally {
                    botonContacto.disabled = false;
                }
            } else {
                mensajeContacto.textContent = `¡Gracias, ${nombre}! Hemos recibido tu mensaje y te responderemos pronto.`;
            }

            mensajeContacto.classList.remove('error');
            formularioContacto.reset();
        });
        configurarValidacionEnEspanol(formularioContacto);
    }

    // Eventos del mapa.
    function iniciarUbicacion() {
        const formulario = document.getElementById('form-ubicacion');
        if (!formulario) {
            return;
        }

        const modelo = app.Modelo.ubicacion;
        const campoConsulta = document.getElementById('consulta-ubicacion');
        const listaUbicaciones = document.getElementById('lista-ubicaciones');
        const botonVerNegocio = document.getElementById('boton-ver-negocio');

        function mostrarLugar(lugar) {
            app.Vista.dibujarMapa(modelo.crearUrlMapa(lugar), modelo.crearUrlMapaGrande(lugar));
        }

        async function cargarUbicacionNegocio() {
            mostrarLugar(modelo.estado.negocio);
            app.Vista.mostrarEstadoUbicacion('Cargando la ubicación del negocio...', true);

            try {
                for (let indice = 0; indice < modelo.consultasNegocio.length; indice += 1) {
                    const datos = await app.Servicios.consultarUbicaciones(modelo.consultasNegocio[indice], 1);
                    const lugares = modelo.transformarUbicaciones(datos);

                    if (lugares.length > 0) {
                        modelo.estado.negocio = lugares[0];
                        mostrarLugar(lugares[0]);
                        app.Vista.mostrarEstadoUbicacion(indice === 0
                            ? 'Así llegas a nuestro local.'
                            : 'No encontramos el número exacto; el mapa muestra la zona del local.');
                        return;
                    }

                    await modelo.pausar(modelo.pausaEntrePeticiones);
                }

                app.Vista.mostrarEstadoUbicacion(`No pudimos ubicar la dirección en el mapa. Nos encuentras en ${modelo.direccionNegocio}.`);
            } catch (error) {
                app.Vista.mostrarEstadoUbicacion(`No pudimos cargar el mapa en este momento. Revisa tu conexión e inténtalo de nuevo. Nos encuentras en ${modelo.direccionNegocio}.`);
            }
        }

        async function buscarDireccion(evento) {
            evento.preventDefault();

            const consulta = campoConsulta.value.trim();
            if (consulta.length < 3) {
                app.Vista.mostrarEstadoUbicacion('Escribe al menos 3 caracteres para buscar.');
                return;
            }

            app.Vista.habilitarBusquedaUbicacion(false);
            app.Vista.mostrarEstadoUbicacion('Buscando lugares...', true);

            try {
                const datos = await app.Servicios.consultarUbicaciones(consulta, 5);
                const lugares = modelo.transformarUbicaciones(datos, modelo.estado.negocio);
                modelo.estado.resultados = lugares;
                app.Vista.dibujarUbicaciones(lugares);
                app.Vista.mostrarEstadoUbicacion(lugares.length === 0
                    ? 'No se encontraron lugares con esa búsqueda.'
                    : `Encontramos ${lugares.length} lugares. Elige uno para verlo en el mapa.`);
            } catch (error) {
                modelo.estado.resultados = [];
                app.Vista.dibujarUbicaciones([]);
                app.Vista.mostrarEstadoUbicacion('No pudimos consultar el servicio de mapas. Revisa tu conexión e inténtalo de nuevo.');
            } finally {
                await modelo.pausar(modelo.pausaEntrePeticiones);
                app.Vista.habilitarBusquedaUbicacion(true);
            }
        }

        function seleccionarUbicacion(evento) {
            const boton = evento.target.closest('button.ubicacion__opcion');
            if (!boton) {
                return;
            }

            const lugar = modelo.estado.resultados.find((resultado) => resultado.id === Number(boton.dataset.id));
            if (!lugar) {
                return;
            }

            mostrarLugar(lugar);
            app.Vista.mostrarEstadoUbicacion(`Mostrando: ${lugar.nombre}`);
        }

        function verUbicacionNegocio() {
            if (!modelo.estado.negocio) {
                app.Vista.mostrarEstadoUbicacion('Todavía no tenemos la ubicación del local en el mapa.');
                return;
            }

            mostrarLugar(modelo.estado.negocio);
            app.Vista.mostrarEstadoUbicacion('Así llegas a nuestro local.');
        }

        formulario.addEventListener('submit', buscarDireccion);
        listaUbicaciones.addEventListener('click', seleccionarUbicacion);
        botonVerNegocio.addEventListener('click', verUbicacionNegocio);
        cargarUbicacionNegocio();
    }

    function iniciar() {
        const esAdmin = document.body.dataset.vista === 'administrador';
        iniciarCatalogo(esAdmin);
                if (!esAdmin) {
            iniciarUbicacion();
        }
        if (esAdmin) {
            const cuerpoTablaClientes = document.getElementById('cuerpo-tabla');
            const tablaClientes = configurarTablaPaginada({
                tabla: document.getElementById('tabla-clientes'),
                cuerpo: cuerpoTablaClientes,
                busqueda: document.getElementById('filtro-tabla-clientes'),
                filtros: [
                    { control: document.getElementById('estado-tabla-clientes'), atributo: 'estadoPedido' }
                ],
                paginacion: document.getElementById('paginacion-clientes'),
                botonExportar: document.getElementById('exportar-clientes'),
                nombreArchivo: 'megapapas-clientes-pedidos.csv'
            });
            const actualizarTablaClientes = () => {
                app.Vista.dibujarTablaClientes(
                    cuerpoTablaClientes,
                    app.Modelo.obtenerClientes()
                );
                tablaClientes.actualizar();
            };
            cuerpoTablaClientes.addEventListener('click', (evento) => {
                const boton = evento.target.closest('button[data-pedido-accion]');
                if (!boton) return;

                try {
                    app.Modelo.actualizarEstadoPedido(
                        boton.dataset.email,
                        boton.dataset.pedidoId,
                        'entregado'
                    );
                    actualizarTablaClientes();
                } catch (error) {
                    console.error('Error al actualizar los pedidos del administrador:', error);
                    window.alert('No se pudo actualizar el pedido. Recarga la página e inténtalo de nuevo.');
                }
            });
            actualizarTablaClientes();
            window.addEventListener('storage', (evento) => {
                if (evento.key === app.Modelo.claveClientes) actualizarTablaClientes();
            });
            window.addEventListener('focus', actualizarTablaClientes);
            window.addEventListener('pageshow', actualizarTablaClientes);
        }
    }

    app.Controlador = { iniciar };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})(window.MegaPapas = window.MegaPapas || {});
