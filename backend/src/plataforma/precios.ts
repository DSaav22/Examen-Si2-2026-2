import type { PeriodoPlan } from '@prisma/client';

export const MESES: Record<PeriodoPlan, number> = { MENSUAL: 1, TRIMESTRAL: 3, ANUAL: 12 };
export const DESCUENTO: Record<PeriodoPlan, number> = { MENSUAL: 0, TRIMESTRAL: 0.1, ANUAL: 0.2 };

export function precioPeriodo(precioMensual: number, periodo: PeriodoPlan) {
  return Math.round(precioMensual * MESES[periodo] * (1 - DESCUENTO[periodo]) * 100) / 100;
}

export function sumarMeses(desde: Date, meses: number) {
  const d = new Date(desde);
  d.setMonth(d.getMonth() + meses);
  return d;
}
