import { Prisma } from '@prisma/client';
import { ambitoModelo, MODELOS_PLATAFORMA, MODELOS_TIENDA, RELACIONES_TIENDA_PLATAFORMA } from './dominio-ambitos';

describe('Separación lógica de plataforma y tiendas', () => {
  const modelos = Prisma.dmmf.datamodel.models;

  it('clasifica cada modelo exactamente una vez, incluso al agregar modelos futuros', () => {
    const nombres = [...MODELOS_PLATAFORMA, ...MODELOS_TIENDA];
    expect(new Set(nombres).size).toBe(nombres.length);
    expect([...nombres].sort()).toEqual(modelos.map((m) => m.name).sort());
    expect(() => ambitoModelo('ModeloDesconocido')).toThrow('MODELO_SIN_AMBITO');
  });

  it('exige identificador de tienda en cada modelo operativo', () => {
    for (const nombre of MODELOS_TIENDA) {
      const modelo = modelos.find((m) => m.name === nombre);
      expect(modelo?.fields.some((f) => f.name === 'tiendaId' && f.isRequired)).toBe(true);
    }
  });

  it('registra explícitamente todas las relaciones con clave desde tienda hacia plataforma', () => {
    const relaciones = modelos.flatMap((modelo) => modelo.fields
      .filter((f) => f.kind === 'object' && f.relationFromFields?.length && ambitoModelo(modelo.name) === 'tienda' && ambitoModelo(f.type) === 'plataforma')
      .map((f) => ({ modelo: modelo.name, campo: f.name, destino: f.type, clave: f.relationFromFields![0] })));
    expect(relaciones).toEqual([...RELACIONES_TIENDA_PLATAFORMA]);
  });

  it('mantiene global el pago de suscripción aunque incluya relaciones con tiendas', () => {
    expect(ambitoModelo('Suscripcion')).toBe('plataforma');
    expect(ambitoModelo('PagoSuscripcion')).toBe('plataforma');
    expect(ambitoModelo('PagoSimulado')).toBe('tienda');
  });
});
