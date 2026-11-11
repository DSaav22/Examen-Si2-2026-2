jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import { IaService } from './ia.service';
import { TenantContext } from '../tenancy/tenant-context';

describe('Chatbot conectado al esquema de la tienda', () => {
  const tiendaId = '00000000-0000-4000-8000-000000000001';
  let local: any, plataforma: any, esquemas: any, modelo: any, servicio: IaService;
  beforeEach(() => {
    local = {
      producto: { findMany: jest.fn().mockResolvedValue([{ nombre: 'Pulsera exclusiva', categoria: 'accesorios', ocasion: 'casual', precioBase: 50, descuentoPct: 10, descripcion: 'Pulsera azul', variantes: [{ talla: 'U', color: 'Azul', stocks: [{ cantidad: 7, reservado: 2, almacen: { sucursal: { nombre: 'Centro' } } }] }] }]), findFirst: jest.fn().mockResolvedValue(null) },
      usuario: { findFirst: jest.fn().mockResolvedValue({ id: 'clienta-local' }) },
      venta: { findMany: jest.fn().mockResolvedValue([]) }, reserva: { findMany: jest.fn().mockResolvedValue([]) },
    };
    plataforma = { tienda: { findUniqueOrThrow: jest.fn().mockResolvedValue({ nombre: 'Trendify', moneda: 'EUR', pais: 'ES' }) } };
    esquemas = { clienteTienda: jest.fn().mockReturnValue(local), clientePlataforma: jest.fn().mockReturnValue(plataforma) };
    modelo = { completar: jest.fn().mockResolvedValue('Respuesta de prueba') };
    servicio = new IaService(esquemas, modelo, {} as any);
  });
  it('envía nombre, moneda, precio descontado y stock del esquema autorizado', async () => {
    await TenantContext.enTienda(tiendaId, () => servicio.bot(null, 'Hola, qué productos tienen?'));
    expect(esquemas.clienteTienda).toHaveBeenCalledWith(tiendaId);
    const consulta = local.producto.findMany.mock.calls[0][0];
    expect(consulta.where).toEqual({ tiendaId });
    expect(consulta.include.variantes.where).toEqual({ tiendaId });
    expect(consulta.include.variantes.include.stocks.where.tiendaId).toBe(tiendaId);
    const mensajes = modelo.completar.mock.calls[0][0];
    const contexto = JSON.parse(mensajes.at(-1).content.split('Contexto:\n')[1]);
    expect(contexto.tienda).toEqual({ nombre: 'Trendify', moneda: 'EUR', pais: 'ES' });
    expect(contexto.prendas[0].precio).toBe(45);
    expect(contexto.prendas[0].variantes[0].disponible).toBe(5);
    expect(local.venta.findMany).not.toHaveBeenCalled();
    expect(local.reserva.findMany).not.toHaveBeenCalled();
    expect(mensajes[0].content).not.toContain('tienda Vesta');
  });
  it('consulta solo pedidos y reservas de la clienta de esa tienda', async () => {
    await TenantContext.enTienda(tiendaId, () => servicio.bot('clienta-local', 'Mis pedidos'));
    expect(local.usuario.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'clienta-local', tiendaId, activo: true, rol: 'CLIENTA' } }));
    expect(local.venta.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { clientaId: 'clienta-local', tiendaId } }));
    expect(local.reserva.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { clientaId: 'clienta-local', tiendaId } }));
  });
  it('rechaza una clienta inexistente en el esquema antes de consultar pedidos', async () => {
    local.usuario.findFirst.mockResolvedValue(null);
    await expect(TenantContext.enTienda(tiendaId, () => servicio.bot('clienta-ajena', 'Mis pedidos'))).rejects.toThrow();
    expect(local.venta.findMany).not.toHaveBeenCalled();
    expect(modelo.completar).not.toHaveBeenCalled();
  });
  it('no busca una prenda ajena en tablas compartidas ni la envía al modelo', async () => {
    local.producto.findMany.mockResolvedValue([]);
    await expect(TenantContext.enTienda(tiendaId, () => servicio.bot(null, 'Tallas', 'producto-ajeno'))).rejects.toThrow();
    expect(local.producto.findMany.mock.calls[0][0].where).toEqual({ tiendaId, id: 'producto-ajeno' });
    expect(modelo.completar).not.toHaveBeenCalled();
  });
  it('busca por SKU y conserva la moneda cuando usa reglas', async () => {
    modelo.completar.mockResolvedValue(null);
    const r = await TenantContext.enTienda(tiendaId, () => servicio.bot(null, 'SKU-UNIC0'));
    expect(local.producto.findMany.mock.calls[0][0].where.OR).toEqual(expect.arrayContaining([expect.objectContaining({ variantes: expect.anything() })]));
    expect(r.fuente).toBe('reglas');
    expect(r.respuesta).toContain('EUR 45.00');
    expect(r.respuesta).not.toContain('Bs ');
  });
  it('sin tienda autorizada falla antes de acceder a datos', async () => {
    await expect(servicio.bot(null, 'Pulsera')).rejects.toThrow('TENANT_REQUERIDO');
    expect(esquemas.clienteTienda).not.toHaveBeenCalled();
    expect(modelo.completar).not.toHaveBeenCalled();
  });
});
