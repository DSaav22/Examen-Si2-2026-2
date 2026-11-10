/**
 * Nombre interno y estable para el esquema PostgreSQL de una tienda.
 * No depende del nombre comercial ni de datos enviados como identificadores SQL.
 * Esta función es preparación para la migración; no cambia el aislamiento actual.
 */
export function nombreSchemaTienda(tiendaId: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tiendaId)) {
    throw new Error('TIENDA_ID_INVALIDO');
  }
  return `tienda_${tiendaId.replace(/-/g, '').toLowerCase()}`;
}
