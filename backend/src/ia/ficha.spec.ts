import { responderFicha } from './ficha';

const polera = {
  nombre: 'Polera básica',
  descripcion: 'Algodón, lavar en frío.',
  categoria: 'tops',
  ocasion: 'casual',
  precioBase: 89.9,
  variantes: [{ talla: 'M', color: 'negro' }],
};

describe('UC04 — asistente de ficha', () => {
  it('responde precio', () => {
    expect(responderFicha(polera, 'cuánto cuesta').respuesta).toMatch(/89.90/);
  });

  it('responde talla', () => {
    expect(responderFicha(polera, 'qué talla hay').respuesta).toMatch(/M/);
  });
});
