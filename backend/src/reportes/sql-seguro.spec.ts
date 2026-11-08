import { compilarPregunta, validarSelect } from './sql-seguro';

describe('Spike C — SQL acotado', () => {
  it('acepta un SELECT sobre la vista', () => {
    const sql = validarSelect(
      'SELECT sucursal_nombre, subtotal FROM v_reporte_ventas',
    );
    expect(sql.toLowerCase()).toContain('limit 200');
  });

  it('rechaza DROP y otras tablas', () => {
    expect(() => validarSelect('DROP TABLE usuarios')).toThrow();
    expect(() =>
      validarSelect('SELECT * FROM usuarios'),
    ).toThrow('SQL_FUERA_DE_VISTA');
  });

  it('no deja salir de la tienda: ni tablas base junto a la vista ni cambiar la sesión', () => {
    expect(() =>
      validarSelect('SELECT p.nombre FROM v_reporte_ventas JOIN productos p ON true'),
    ).toThrow('SQL_FUERA_DE_VISTA');
    expect(() =>
      validarSelect('SELECT * FROM v_reporte_ventas, tiendas'),
    ).toThrow('SQL_FUERA_DE_VISTA');
    expect(() =>
      validarSelect("SELECT set_config('app.tienda_id', 'otra', true), * FROM v_reporte_ventas"),
    ).toThrow('SQL_PROHIBIDO');
    expect(() =>
      validarSelect("SELECT current_setting('app.tienda_id') FROM v_reporte_ventas"),
    ).toThrow('SQL_PROHIBIDO');
  });

  it('compila la pregunta del docente a la vista', () => {
    const { sql } = compilarPregunta(
      'ventas de la sucursal Santa Cruz, a quién y cuánto',
    );
    expect(sql).toMatch(/v_reporte_ventas/i);
    expect(sql).toMatch(/Santa Cruz/i);
  });
});
