import { entrenarDemanda, entrenarSegmentos } from './modelos';

describe('Modelos entrenados con datos sintéticos', () => {
  it('es reproducible y mejora la línea base en datos de prueba separados', () => {
    const a = entrenarDemanda(), b = entrenarDemanda();
    expect(a.evaluacion).toEqual(b.evaluacion);
    expect(a.evaluacion.prueba).toBe(120);
    expect(a.evaluacion.mae).toBeLessThan(a.evaluacion.maeBase);
    expect(a.predecir([5, 20])).toBeGreaterThanOrEqual(0);
  });
  it('entrena tres grupos reproducibles y los evalúa en datos reservados', () => {
    const a = entrenarSegmentos(), b = entrenarSegmentos();
    expect(a.centroides).toEqual(b.centroides);
    expect(a.evaluacion.prueba).toBe(45);
    expect(a.evaluacion.silueta).toBeGreaterThan(0);
    expect(new Set([[5, 12, 1300], [85, 1, 40], [35, 4, 350]].map(v => a.clasificar(v as [number, number, number]))).size).toBe(3);
  });
});
