import { precioPeriodo, sumarMeses } from './precios';

describe('Períodos de suscripción', () => {
  it('aplica los descuentos trimestral y anual', () => {
    expect(precioPeriodo(19, 'MENSUAL')).toBe(19);
    expect(precioPeriodo(19, 'TRIMESTRAL')).toBe(51.3);
    expect(precioPeriodo(19, 'ANUAL')).toBe(182.4);
  });

  it('ajusta el último día del mes sin saltar al mes siguiente', () => {
    const original = new Date('2027-01-31T15:30:00.000Z');
    expect(sumarMeses(original, 1).toISOString()).toBe('2027-02-28T15:30:00.000Z');
    expect(original.toISOString()).toBe('2027-01-31T15:30:00.000Z');
    expect(sumarMeses(new Date('2028-01-31T15:30:00.000Z'), 1).toISOString()).toBe('2028-02-29T15:30:00.000Z');
  });
});
