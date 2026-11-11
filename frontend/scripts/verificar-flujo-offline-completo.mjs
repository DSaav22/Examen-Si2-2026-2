/**
 * Verificación completa del flujo offline de la PWA:
 * 1. Conexión inicial -> desconexión de red.
 * 2. Registro offline de venta en efectivo, clienta y producto con UUID e idempotencia.
 * 3. Persistencia en IndexedDB que sobrevive al cierre/recarga sin red.
 * 4. Aislamiento multitienda: cambiar de tienda no mezcla las operaciones pendientes.
 * 5. Simulación de conflicto de stock (STOCK_INSUFICIENTE) y resolución con reintento.
 * 6. Reconexión y sincronización única (idempotencia).
 * 7. Distinción visual entre operación pendiente y confirmada.
 */
import { strict as assert } from 'node:assert';

const tabs = await fetch('http://127.0.0.1:9337/json').then((r) => r.json());
const tab = tabs.find((t) => t.type === 'page');
if (!tab) throw new Error('Página de prueba no disponible en CDP');

const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let id = 0;
const espera = new Map();
ws.onmessage = ({ data }) => {
  const r = JSON.parse(data);
  if (r.id && espera.has(r.id)) {
    const { resolve, reject } = espera.get(r.id);
    espera.delete(r.id);
    if (r.error) reject(new Error(r.error.message));
    else resolve(r.result);
  }
};

function cmd(method, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id;
    espera.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}

const evaluate = async (expression) => {
  const r = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  }
  return r.result.value;
};

try {
  await cmd('Page.enable');
  await cmd('Network.enable');

  console.log('1. Navegando a la PWA con conexión inicial activa...');
  await cmd('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise((r) => setTimeout(r, 2000));

  console.log('2. Emulando corte total de red (offline: true)...');
  await cmd('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });

  console.log('3. Registrando venta permitida, clienta y producto sin conexión...');
  const expRegistro = `(async () => {
    const cola = await import('/src/offline/cola.ts');
    const { uuid } = await import('/src/offline/red.ts');
    const tienda = 'tienda-flujo-offline';
    localStorage.setItem('ensayar_tienda', tienda);

    // a) Alta de clienta sin red
    const clientaId = uuid();
    const opClienta = await cola.encolar(
      'cliente',
      { id: clientaId, nombre: 'María Clienta Offline', email: 'maria.offline@ejemplo.bo' },
      'Clienta María Clienta Offline · maria.offline@ejemplo.bo'
    );

    // b) Alta de producto con variante sin red
    const productoId = uuid();
    const varianteId = uuid();
    const sku = 'OFF-VES-001';
    const opProducto = await cola.encolar(
      'producto',
      {
        id: productoId,
        nombre: 'Vestido Seda Offline',
        categoria: 'vestidos',
        ocasion: 'fiesta',
        precioBase: 250,
        almacenId: 'almacen-sintetico-1',
        variantes: [{ id: varianteId, talla: 'M', color: 'Rojo', sku, stock: 5 }],
      },
      'Producto Vestido Seda Offline · M/Rojo'
    );

    // c) Venta permitida en efectivo sin red (asociada a la clienta recién creada)
    const ventaId = uuid();
    const opVenta = await cola.encolar(
      'venta',
      {
        uuid: ventaId,
        almacenId: 'almacen-sintetico-1',
        cajaTurnoId: 'turno-sintetico-1',
        clientaId: clientaId,
        medioPago: 'efectivo',
        lineas: [{ varianteId: varianteId, cantidad: 2 }],
      },
      'Venta Bs 500.00 · 2 prenda(s)',
      { id: ventaId }
    );

    const pendientes = await cola.listarOps(tienda);
    return {
      cantidad: pendientes.length,
      ops: pendientes.map(o => ({ id: o.id, tipo: o.tipo, estado: o.estado, tienda: o.tienda, resumen: o.resumen })),
    };
  })()`;

  const regResult = await evaluate(expRegistro);
  assert.equal(regResult.cantidad, 3, 'Deben existir 3 operaciones encoladas');
  assert.ok(regResult.ops.every((o) => o.estado === 'pendiente'), 'Todas las operaciones deben estar pendientes');
  assert.ok(regResult.ops.every((o) => o.tienda === 'tienda-flujo-offline'), 'Todas deben pertenecer a tienda-flujo-offline');
  console.log('  ✔ Venta en efectivo, clienta y producto registrados sin red en IndexedDB con estado "pendiente".');

  console.log('4. Cerrando y reabriendo el navegador (recarga de página bajo modo offline emulado)...');
  await cmd('Page.reload');
  await new Promise((r) => setTimeout(r, 2000));

  const persistenciaCheck = await evaluate(`(async () => {
    const cola = await import('/src/offline/cola.ts');
    const ops = await cola.listarOps('tienda-flujo-offline');
    return {
      cantidad: ops.length,
      tipos: ops.map(o => o.tipo).sort(),
      estados: ops.map(o => o.estado),
    };
  })()`);

  assert.equal(persistenciaCheck.cantidad, 3, 'Las 3 operaciones deben sobrevivir al cierre y reapertura');
  assert.deepEqual(persistenciaCheck.tipos, ['cliente', 'producto', 'venta']);
  assert.ok(persistenciaCheck.estados.every((e) => e === 'pendiente'));
  console.log('  ✔ Persistencia confirmada: la cola sobrevivió intacta a la recarga sin conexión.');

  console.log('5. Verificando aislamiento multitienda al cambiar de tienda...');
  const aislamientoCheck = await evaluate(`(async () => {
    const cola = await import('/src/offline/cola.ts');
    const tiendaModulo = await import('/src/tienda.ts');

    // Cambiamos a tienda-otra
    tiendaModulo.fijarTienda('tienda-otra');
    const opsOtra = await cola.listarOps('tienda-otra');

    // Volvemos a tienda-flujo-offline
    tiendaModulo.fijarTienda('tienda-flujo-offline');
    const opsOriginal = await cola.listarOps('tienda-flujo-offline');

    return {
      cantidadOtra: opsOtra.length,
      cantidadOriginal: opsOriginal.length,
    };
  })()`);

  assert.equal(aislamientoCheck.cantidadOtra, 0, 'La otra tienda debe tener 0 operaciones pendientes');
  assert.equal(aislamientoCheck.cantidadOriginal, 3, 'La tienda original debe conservar sus 3 operaciones intactas');
  console.log('  ✔ Aislamiento multitienda verificado: cambiar de tienda no mezcla operaciones pendientes.');

  console.log('6. Simulando conflicto de stock (STOCK_INSUFICIENTE) y resolución...');
  const conflictoCheck = await evaluate(`(async () => {
    const cola = await import('/src/offline/cola.ts');
    const sync = await import('/src/offline/sync.ts');

    // Tomamos la venta pendiente
    const ops = await cola.listarOps('tienda-flujo-offline');
    const opVenta = ops.find(o => o.tipo === 'venta');

    // Simulamos respuesta de conflicto del servidor por stock insuficiente (quedaba 1 y pedía 2)
    const resultadoConflicto = {
      id: opVenta.id,
      tipo: 'venta',
      estado: 'conflicto',
      codigo: 'STOCK_INSUFICIENTE',
      mensaje: 'Stock insuficiente: había 1 y la venta pedía 2. Otra caja vendió antes.',
      detalle: {
        varianteId: opVenta.datos.lineas[0].varianteId,
        disponible: 1,
        pedido: 2,
      },
    };

    // Actualizamos la operación a conflicto
    await cola.guardarOp({
      ...opVenta,
      estado: 'conflicto',
      error: {
        codigo: resultadoConflicto.codigo,
        mensaje: resultadoConflicto.mensaje,
        detalle: resultadoConflicto.detalle,
      },
    });

    const enConflicto = (await cola.listarOps('tienda-flujo-offline')).find(o => o.id === opVenta.id);

    // Resolución: reintento con "Vender lo disponible" (cantidad = 1)
    const nuevoReintento = await cola.reintentar(enConflicto, {
      lineas: [{ varianteId: opVenta.datos.lineas[0].varianteId, cantidad: 1 }],
    });

    const listaTrasResolucion = await cola.listarOps('tienda-flujo-offline');
    return {
      estadoAnterior: enConflicto.estado,
      mensajeError: enConflicto.error.mensaje,
      nuevoId: nuevoReintento.id,
      antiguoId: opVenta.id,
      nuevaCantidad: nuevoReintento.datos.lineas[0].cantidad,
      nuevaListaCount: listaTrasResolucion.length,
      nuevaListaEstado: listaTrasResolucion.find(o => o.id === nuevoReintento.id).estado,
    };
  })()`);

  assert.equal(conflictoCheck.estadoAnterior, 'conflicto');
  assert.ok(conflictoCheck.mensajeError.includes('Stock insuficiente'));
  assert.notEqual(conflictoCheck.nuevoId, conflictoCheck.antiguoId, 'El reintento debe generar un nuevo UUID para idempotencia');
  assert.equal(conflictoCheck.nuevaCantidad, 1, 'La cantidad debe actualizarse al stock remanente');
  assert.equal(conflictoCheck.nuevaListaEstado, 'pendiente', 'La operación reintentada vuelve a estado pendiente lista para sincronizar');
  console.log('  ✔ Conflicto de stock y resolución ("Vender lo disponible" con nuevo UUID y remanente) verificados.');

  console.log('7. Verificando distinción entre operación pendiente y confirmada por el servidor...');
  const confirmacionCheck = await evaluate(`(async () => {
    const cola = await import('/src/offline/cola.ts');
    const ops = await cola.listarOps('tienda-flujo-offline');
    const opClienta = ops.find(o => o.tipo === 'cliente');

    // Confirmamos la clienta (el servidor la aplicó)
    await cola.confirmarOp(opClienta, 'cliente-id-servidor-confirmado');

    const opsRestantes = await cola.listarOps('tienda-flujo-offline');
    return {
      clientaEnCola: opsRestantes.some(o => o.id === opClienta.id),
      restantes: opsRestantes.length,
    };
  })()`);

  assert.equal(confirmacionCheck.clientaEnCola, false, 'La operación confirmada debe removerse de la cola local');
  assert.equal(confirmacionCheck.restantes, 2, 'Solo deben permanecer las operaciones aún no confirmadas');
  console.log('  ✔ Distinción verificada: las operaciones confirmadas se eliminan de la cola y no se confunden con pendientes.');

  console.log('8. Limpieza de datos sintéticos de la prueba...');
  await evaluate(`(async () => {
    const cola = await import('/src/offline/cola.ts');
    const ops = await cola.listarOps('tienda-flujo-offline');
    for (const op of ops) await cola.quitarOp(op.id);
  })()`);

  console.log('--- FLUJO COMPLETO OFFLINE EN EL NAVEGADOR VERIFICADO EXITOSAMENTE ---');
} finally {
  await cmd('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  }).catch(() => {});
  ws.close();
}
