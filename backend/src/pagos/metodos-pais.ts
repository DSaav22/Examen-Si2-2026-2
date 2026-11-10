/** Catálogo académico de métodos simulados. No indica una integración real. */
export type MetodoPais = { codigo: string; nombre: string; simulado: true };

const metodos: Record<string, string> = {
  tarjeta: 'Tarjeta de débito o crédito', qr_bolivia: 'QR interoperable', pix: 'Pix',
  mercado_pago: 'Mercado Pago', pse: 'PSE', nequi: 'Nequi', yape: 'Yape', plin: 'Plin',
  spei: 'SPEI', webpay: 'Webpay', khipu: 'Khipu', sinpe_movil: 'SINPE Móvil',
  deuna: 'Deuna', pago_efectivo: 'Pago Efectivo', tigo_money: 'Tigo Money',
  redpagos: 'Redpagos', abitab: 'Abitab', paycash: 'PayCash', soyfri: 'SoyFri',
  puntoxpress: 'PuntoXpress', akipago: 'Akipago', yappy: 'Yappy', punto_pago: 'Punto Pago',
  banco_popular: 'Transferencia Banco Popular', transfermovil: 'Transfermóvil', enzona: 'EnZona',
  moncash: 'MonCash', pago_movil: 'Pago Móvil', bizum: 'Bizum', paypal: 'PayPal',
  binance_pay: 'Binance Pay', transferencia: 'Transferencia bancaria',
};

// Los métodos locales se incorporan solo cuando existe evidencia; no implica popularidad ni soporte real.
const paises: Record<string, readonly string[]> = {
  BO: ['tarjeta', 'qr_bolivia', 'transferencia'],
  BR: ['tarjeta', 'pix', 'transferencia'],
  AR: ['tarjeta', 'mercado_pago', 'transferencia'],
  CL: ['tarjeta', 'webpay', 'mercado_pago', 'khipu', 'transferencia'],
  CO: ['tarjeta', 'pse', 'nequi', 'transferencia'],
  CR: ['tarjeta', 'sinpe_movil', 'transferencia'],
  EC: ['tarjeta', 'deuna', 'pago_efectivo', 'transferencia'],
  PY: ['tarjeta', 'tigo_money', 'transferencia'],
  UY: ['tarjeta', 'redpagos', 'abitab', 'transferencia'],
  GT: ['tarjeta', 'paycash', 'soyfri', 'transferencia'],
  HN: ['tarjeta', 'transferencia'],
  SV: ['tarjeta', 'puntoxpress', 'akipago', 'transferencia'],
  NI: ['tarjeta', 'puntoxpress', 'transferencia'],
  PA: ['tarjeta', 'yappy', 'punto_pago', 'paycash', 'transferencia'],
  DO: ['tarjeta', 'banco_popular', 'transferencia'],
  CU: ['transfermovil', 'enzona'],
  HT: ['moncash'],
  VE: ['tarjeta', 'pago_movil', 'transferencia'],
  PE: ['tarjeta', 'yape', 'plin', 'transferencia'],
  MX: ['tarjeta', 'spei', 'mercado_pago', 'transferencia'],
  ES: ['tarjeta', 'bizum', 'transferencia'],
  PR: ['tarjeta', 'transferencia'],
};

// La documentación consultada no es concluyente para Bolivia y Paraguay, Cuba y Haití.
const paypalPaises = new Set(['AR', 'BR', 'CL', 'CO', 'CR', 'EC', 'SV', 'ES', 'GT', 'HN', 'MX', 'NI', 'PA', 'PE', 'PR', 'DO', 'UY', 'VE']);

const monedas: Record<string, string> = {
  BO: 'BOB', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', CR: 'CRC', EC: 'USD',
  PY: 'PYG', UY: 'UYU', GT: 'GTQ', HN: 'HNL', SV: 'USD', NI: 'NIO', PA: 'USD',
  DO: 'DOP', CU: 'CUP', HT: 'HTG', VE: 'VES', PE: 'PEN', MX: 'MXN', ES: 'EUR', PR: 'USD',
};

export function monedaDePais(pais: string): string | undefined {
  return monedas[pais.trim().toUpperCase()];
}

export function metodosSimuladosPorPais(pais: string): MetodoPais[] {
  const codigo = pais.trim().toUpperCase();
  const base = paises[codigo];
  if (!base) return [];
  const ids = [...base, ...(paypalPaises.has(codigo) ? ['paypal'] : []), 'binance_pay'];
  return ids.map((id) => ({ codigo: id, nombre: metodos[id], simulado: true }));
}
