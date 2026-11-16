(function (app) {
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
        formularioContacto.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            const nombre = document.getElementById('nombre-contacto').value.trim();
            if (!nombre) {
                mensajeContacto.textContent = 'Por favor escribe tu nombre.';
                return;
            }

            if (campoConsentimientoPromocionesContacto.checked) {
                try {
                    const respuesta = await fetch('/api/suscripciones', {
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
                }
            } else {
                mensajeContacto.textContent = `¡Gracias, ${nombre}! Hemos recibido tu mensaje y te responderemos pronto.`;
            }

            mensajeContacto.classList.remove('error');
            formularioContacto.reset();
        });
        configurarValidacionEnEspanol(formularioContacto);
    }

    // ---------- Ubicación del negocio (eventos y flujo) ----------
    // Pide los datos al servicio, los transforma con el modelo y le dice a la vista qué dibujar.
    function iniciarUbicacion() {
        const formulario = document.getElementById('form-ubicacion');
        if (!formulario) {
            return;
        }

        const modelo = app.Modelo.ubicacion;
        const campoConsulta = document.getElementById('consulta-ubicacion');
        const listaUbicaciones = document.getElementById('lista-ubicaciones');
        const botonVerNegocio = document.getElementById('boton-ver-negocio');

        // Muestra un lugar en el mapa.
        function mostrarLugar(lugar) {
            app.Vista.dibujarMapa(modelo.crearUrlMapa(lugar), modelo.crearUrlMapaGrande(lugar));
        }

        // Busca la dirección del negocio al abrir la página y muestra su mapa.
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
                        // Si no se halló el número exacto, se avisa que el mapa muestra solo la zona.
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

        // Busca un lugar escrito por la persona (solo al enviar el formulario, no mientras escribe).
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

        // Delegación de eventos: un solo listener en la lista atiende el clic de cada lugar.
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

        // Vuelve a mostrar el mapa del local.
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
            const actualizarTablaClientes = () => {
                app.Vista.dibujarTablaClientes(
                    document.getElementById('cuerpo-tabla'),
                    app.Modelo.obtenerClientes()
                );
            };
            const cuerpoTablaClientes = document.getElementById('cuerpo-tabla');
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
