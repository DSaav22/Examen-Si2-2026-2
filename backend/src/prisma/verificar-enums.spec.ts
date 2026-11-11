import { contratoEnums, verificarEnumsEsquema } from './verificar-enums';

describe('Contrato de enums multitenant', () => {
  it('distingue el estado de pago global del estado de pago de la tienda', () => {
    expect(contratoEnums('plataforma')).toEqual(expect.arrayContaining([
      expect.objectContaining({ tabla: 'pagos_suscripcion', columna: 'estado', tipo: 'EstadoPago' }),
    ]));
    expect(contratoEnums('tienda')).toEqual(expect.arrayContaining([
      expect.objectContaining({ tabla: 'pagos_simulados', columna: 'estado', tipo: 'EstadoPago' }),
    ]));
  });

  it('rechaza un esquema arbitrario antes de consultar la base', async () => {
    const cliente = { $queryRaw: jest.fn() } as any;
    await expect(verificarEnumsEsquema(cliente, 'public', 'tienda')).rejects.toThrow('AMBITO_ESQUEMA_INVALIDO');
    await expect(verificarEnumsEsquema(cliente, 'tienda_00000000000040008000000000000001', 'plataforma')).rejects.toThrow('AMBITO_ESQUEMA_INVALIDO');
    expect(cliente.$queryRaw).not.toHaveBeenCalled();
  });

  it('detecta columnas faltantes en vez de asumir compatibilidad', async () => {
    const cliente = { $queryRaw: jest.fn().mockResolvedValue([]) } as any;
    const informe = await verificarEnumsEsquema(cliente, 'public', 'plataforma');
    expect(informe.errores).toContain('COLUMNA_ENUM_INCORRECTA: tiendas.estado');
  });

  it('detecta valores y valores por defecto que no coinciden con Prisma', async () => {
    const contrato = contratoEnums('plataforma');
    const columnas = contrato.map((c) => ({
      ...c, esquemaTipo: 'public', valorPorDefecto: c.valorPorDefecto ? `'${c.valorPorDefecto}'::"${c.tipo}"` : null,
    }));
    columnas.find((c) => c.tabla === 'tiendas' && c.columna === 'estado')!.valorPorDefecto = `'suspendida'::"EstadoTienda"`;
    const tipos = new Map(contrato.map((c) => [c.tipo, c.valores]));
    const valores = [...tipos].flatMap(([tipo, etiquetas]) => etiquetas.map((valor) => ({ tipo, valor })));
    valores.find((v) => v.tipo === 'EstadoPago')!.valor = 'etiqueta_incorrecta';
    const cliente = { $queryRaw: jest.fn().mockResolvedValueOnce(columnas).mockResolvedValueOnce(valores) } as any;
    const informe = await verificarEnumsEsquema(cliente, 'public', 'plataforma');
    expect(informe.errores).toContain('DEFAULT_ENUM_INCORRECTO: tiendas.estado');
    expect(informe.errores).toContain('VALORES_ENUM_DISTINTOS: EstadoPago');
  });
});
