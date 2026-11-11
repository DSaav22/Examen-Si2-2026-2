import { validarLogoTienda } from './logo-tienda';

describe('Logo de tienda', () => {
  it('permite el alta solo con nombre', () => {
    expect(validarLogoTienda()).toBeUndefined();
  });
  it('acepta una imagen PNG autocontenida', () => {
    const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
    expect(validarLogoTienda(logo)).toBe(logo);
  });
  it.each(['https://externo.test/logo.png', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'data:image/png;base64,PGh0bWw+', 'data:image/webp;base64,YWJjZA==', 'data:image/png;base64,' + 'A'.repeat(400000)])('rechaza contenido o tamaño no permitido', logo => {
    expect(() => validarLogoTienda(logo)).toThrow();
  });
});
