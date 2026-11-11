jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import { JwtAuthGuard } from './jwt-auth.guard';
import { TenantContext } from '../tenancy/tenant-context';

describe('Membresía de tienda en esquema', () => {
  const idA = '00000000-0000-4000-8000-000000000001';
  const idB = '33333333-3333-4333-8333-333333333333';
  const payload = { tipo: 'tienda', tiendaId: idA, sub: 'perfil-a', cuentaId: 'cuenta-a', rol: 'ADMIN' };

  function preparar(cambio: Partial<typeof payload> = {}, perfil: object | null = { id: 'perfil-a', tiendaId: idA, cuentaId: 'cuenta-a', rol: 'ADMIN', activo: true }) {
    const tokens = { isRevoked: jest.fn().mockResolvedValue(false), verify: jest.fn().mockReturnValue({ ...payload, ...cambio }) };
    const legacy = { usuario: { findUnique: jest.fn() } };
    const local = { usuario: { findUnique: jest.fn().mockResolvedValue(perfil) } };
    const esquemas = { clienteTienda: jest.fn().mockReturnValue(local) };
    const tiendas = { porId: jest.fn().mockResolvedValue({ vigente: true }) };
    const guard = new JwtAuthGuard(tokens as never, legacy as never, tiendas as never, esquemas as never, { get: () => 'true' } as never);
    const request = { headers: { authorization: 'Bearer prueba' }, user: undefined };
    const context = { switchToHttp: () => ({ getRequest: () => request }) };
    return { guard, context, tokens, local, esquemas, legacy, request };
  }

  it('autoriza un perfil activo coincidente en el esquema de su JWT', async () => {
    const p = preparar();
    await expect(TenantContext.enTienda(idA, () => p.guard.canActivate(p.context as never))).resolves.toBe(true);
    expect(p.esquemas.clienteTienda).toHaveBeenCalledWith(idA);
    expect(p.legacy.usuario.findUnique).not.toHaveBeenCalled();
    expect(p.request.user).toBeDefined();
  });

  it.each([
    ['otra tienda', { tiendaId: idB }, undefined],
    ['otra cuenta', { cuentaId: 'otra' }, undefined],
    ['otro rol', { rol: 'CAJERO' }, undefined],
    ['perfil inactivo', {}, { id: 'perfil-a', tiendaId: idA, cuentaId: 'cuenta-a', rol: 'ADMIN', activo: false }],
    ['perfil inexistente', {}, null],
  ])('rechaza %s', async (_nombre, cambio, perfil) => {
    const p = perfil === undefined ? preparar(cambio) : preparar(cambio, perfil);
    await expect(TenantContext.enTienda(idA, () => p.guard.canActivate(p.context as never))).rejects.toThrow();
    expect(p.request.user).toBeUndefined();
  });

  it('rechaza un token revocado antes de obtener un cliente de tienda', async () => {
    const p = preparar();
    p.tokens.isRevoked.mockResolvedValue(true);
    await expect(TenantContext.enTienda(idA, () => p.guard.canActivate(p.context as never))).rejects.toThrow();
    expect(p.esquemas.clienteTienda).not.toHaveBeenCalled();
  });
});
