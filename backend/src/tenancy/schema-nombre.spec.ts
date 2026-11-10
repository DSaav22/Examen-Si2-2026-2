import { nombreSchemaTienda } from './schema-nombre';

describe('Identificador de esquema por tienda', () => {
  it('produce un nombre determinista válido a partir del identificador de tienda', () => {
    expect(nombreSchemaTienda('00000000-0000-4000-8000-000000000001')).toBe('tienda_00000000000040008000000000000001');
    expect(nombreSchemaTienda('ABCDEFAB-CDEF-ABCD-EFAB-CDEFABCDEFAB')).toBe('tienda_abcdefabcdefabcdefabcdefabcdefab');
  });

  it('genera nombres distintos para tiendas distintas', () => {
    expect(nombreSchemaTienda('00000000-0000-4000-8000-000000000001')).not.toBe(
      nombreSchemaTienda('00000000-0000-4000-8000-000000000002'),
    );
  });

  it.each(['', 'public', '../tienda', '00000000-0000-4000-8000-000000000001;DROP SCHEMA public', '00000000-0000-4000-8000-00000000000'])('rechaza identificadores no válidos: %s', (id) => {
    expect(() => nombreSchemaTienda(id)).toThrow('TIENDA_ID_INVALIDO');
  });
});
