export type TipoOp = 'venta' | 'cliente' | 'producto'
export type EstadoOp = 'pendiente' | 'conflicto' | 'rechazada' | 'vencida'

export type ErrorOp = { codigo?: string; mensaje?: string; detalle?: Record<string, unknown> }

/** Operación hecha en el dispositivo; `id` es el UUID con el que el servidor la reconoce. */
export type OperacionLocal = {
  id: string
  tienda: string
  cuentaId?: string
  tipo: TipoOp
  creadaEn: string
  datos: Record<string, unknown>
  resumen: string
  estado: EstadoOp
  error?: ErrorOp
}

export type ResultadoServidor = {
  id: string
  tipo: string
  estado: 'aplicada' | 'repetida' | 'fusionada' | 'conflicto' | 'rechazada' | 'vencida' | 'en_curso' | 'error'
  codigo?: string
  mensaje?: string
  recursoId?: string
  detalle?: Record<string, unknown>
}
