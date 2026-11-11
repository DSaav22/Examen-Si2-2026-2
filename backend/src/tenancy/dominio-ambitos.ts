/**
 * Propiedad lógica de los modelos: las cuentas y la facturación SaaS son
 * globales; el resto de modelos de negocio pertenece a una tienda concreta.
 * Es un contrato de dominio, no crea ni cambia esquemas PostgreSQL.
 */
export const MODELOS_PLATAFORMA = [
  'Cuenta', 'Tienda', 'Plan', 'Suscripcion', 'PagoSuscripcion', 'TokenRevocado',
] as const;

export const MODELOS_TIENDA = [
  'Usuario', 'Sucursal', 'Almacen', 'Proveedor', 'Temporada', 'Coleccion',
  'Producto', 'Variante', 'StockAlmacen', 'MovimientoInventario', 'Reserva',
  'LineaReserva', 'CajaTurno', 'Venta', 'LineaVenta', 'PagoSimulado',
  'ReporteEjecucion', 'CuentaCobrar', 'AbonoCredito', 'Categoria',
  'ProductoCategoria', 'DireccionCliente', 'Favorito', 'CuentaLealtad', 'Cupon',
  'Pedido', 'Devolucion', 'DevolucionLinea', 'Promocion', 'Empleado',
  'TurnoEmpleado', 'EventoAnalitica', 'Dispositivo', 'OperacionSync',
  'PushSuscripcion', 'Auditoria', 'Notificacion', 'Opinion', 'AlertaProducto',
] as const;

export const RELACIONES_TIENDA_PLATAFORMA = [
  { modelo: 'Usuario', campo: 'cuenta', destino: 'Cuenta', clave: 'cuentaId' },
] as const;

export type AmbitoDominio = 'plataforma' | 'tienda';
const plataforma = new Set<string>(MODELOS_PLATAFORMA);
const tienda = new Set<string>(MODELOS_TIENDA);

/** Un modelo desconocido no debe asignarse a una tienda por suposición. */
export function ambitoModelo(modelo: string): AmbitoDominio {
  if (plataforma.has(modelo)) return 'plataforma';
  if (tienda.has(modelo)) return 'tienda';
  throw new Error(`MODELO_SIN_AMBITO: ${modelo}`);
}
