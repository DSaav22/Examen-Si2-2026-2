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

  it('compila la pregunta del docente a la vista', () => {
    const { sql } = compilarPregunta(
      'ventas de la sucursal Santa Cruz, a quién y cuánto',
    );
    expect(sql).toMatch(/v_reporte_ventas/i);
    expect(sql).toMatch(/Santa Cruz/i);
  });
});
