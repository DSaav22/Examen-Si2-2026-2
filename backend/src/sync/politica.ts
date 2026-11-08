export type AccionOffline = { accion: string; titulo: string; motivo: string };

export const VENTANA_MIN_DIAS = 1;
export const VENTANA_MAX_DIAS = 30;

/** Qué se puede hacer sin red y qué no, con la razón de cada decisión. */
export const POLITICA_OFFLINE: { disponibles: AccionOffline[]; soloEnLinea: AccionOffline[] } = {
  disponibles: [
    {
      accion: 'venta_efectivo',
      titulo: 'Venta en efectivo en caja',
      motivo:
        'El dinero se recibe en mano, así que la venta ya ocurrió. Al sincronizar, la base descuenta el stock con un UPDATE condicional; si otra caja vendió la última unidad, la venta queda en conflicto visible en lugar de dejar stock negativo.',
    },
    {
      accion: 'registro_cliente',
      titulo: 'Registro de clientes',
      motivo:
        'El dispositivo genera el UUID del cliente, así que la venta puede referirlo antes de sincronizar. Si el correo ya existía en la tienda, se fusiona con el cliente existente.',
    },
    {
      accion: 'registro_producto',
      titulo: 'Registro de productos',
      motivo:
        'Producto y variantes llevan UUID del dispositivo. Un SKU repetido se informa como conflicto para que el administrador lo corrija.',
    },
    {
      accion: 'consulta_catalogo',
      titulo: 'Consulta de catálogo, precios y stock local',
      motivo: 'Se lee la última copia guardada en el dispositivo; el stock mostrado es orientativo hasta sincronizar.',
    },
  ],
  soloEnLinea: [
    {
      accion: 'pago_qr_tarjeta',
      titulo: 'Pagos con QR o tarjeta',
      motivo:
        'El banco o la pasarela tiene que confirmar el cobro en el momento. Sin red no se sabe si el cobro se hizo, y reintentarlo después arriesga cobrar dos veces.',
    },
    {
      accion: 'venta_credito',
      titulo: 'Ventas al crédito y abonos',
      motivo:
        'Fiar exige ver la deuda real de la clienta en ese momento. Con datos viejos del dispositivo se podría fiar a quien ya debe o cobrar dos veces el mismo abono desde dos cajas.',
    },
    {
      accion: 'compra_online',
      titulo: 'Compras de la tienda online',
      motivo: 'La clienta paga por pasarela y necesita stock confirmado al instante para reservarlo.',
    },
    {
      accion: 'devoluciones',
      titulo: 'Devoluciones',
      motivo: 'Mueven dinero y stock sobre una venta que puede no estar sincronizada todavía.',
    },
    {
      accion: 'cierre_caja',
      titulo: 'Cierre de caja',
      motivo: 'El arqueo debe incluir todas las ventas; se bloquea mientras haya operaciones pendientes de sincronizar.',
    },
    {
      accion: 'inventario',
      titulo: 'Ajustes, ingresos y transferencias de inventario',
      motivo: 'Corrigen el stock real; aplicarlos sobre una copia vieja produce correcciones equivocadas.',
    },
    {
      accion: 'usuarios_suscripcion',
      titulo: 'Usuarios, roles y suscripción',
      motivo: 'Afectan permisos y facturación de la tienda; requieren validación central inmediata.',
    },
    {
      accion: 'reportes',
      titulo: 'Reportes y analítica',
      motivo: 'Se calculan sobre los datos consolidados del servidor.',
    },
  ],
};
