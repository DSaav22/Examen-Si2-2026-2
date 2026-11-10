import { metodosSimuladosPorPais, monedaDePais } from './metodos-pais';

describe('Catálogo de pagos simulados por país', () => {
  const codigos = (pais: string) => metodosSimuladosPorPais(pais).map((m) => m.codigo);

  it('ofrece Pix en Brasil y no en Bolivia', () => {
    expect(codigos('BR')).toContain('pix');
    expect(codigos('BO')).not.toContain('pix');
    expect(codigos('BO')).toContain('qr_bolivia');
  });

  it('no presupone PayPal para países con cobertura no confirmada', () => {
    for (const pais of ['BO', 'PY', 'CU', 'HT']) expect(codigos(pais)).not.toContain('paypal');
  });

  it('ofrece Binance como simulación, sin afirmar disponibilidad comercial', () => {
    expect(metodosSimuladosPorPais('CU')).toContainEqual({ codigo: 'binance_pay', nombre: 'Binance Pay', simulado: true });
  });

  it('rechaza países desconocidos y normaliza códigos', () => {
    expect(metodosSimuladosPorPais('XX')).toEqual([]);
    expect(codigos(' br ')).toContain('pix');
  });

  it('resuelve la moneda nacional sin suponer bolivianos para otros países', () => {
    expect(monedaDePais('BR')).toBe('BRL');
    expect(monedaDePais('BO')).toBe('BOB');
    expect(monedaDePais('XX')).toBeUndefined();
  });
});
