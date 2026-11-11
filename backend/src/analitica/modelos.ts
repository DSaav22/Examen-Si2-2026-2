/** Modelos académicos reproducibles. Los datos sintéticos nunca se insertan en ventas reales. */
type Par = { x: number[]; y: number };
type Vector = [number, number, number];
const redondear = (n: number) => Math.round(n * 100) / 100;
function generador(semilla: number) { let s = semilla >>> 0; return () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296); }
function media(xs: number[]) { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function escala(v: number[][]) {
  const mu = v[0].map((_, i) => media(v.map(x => x[i])));
  const sd = mu.map((m, i) => Math.sqrt(media(v.map(x => (x[i] - m) ** 2))) || 1);
  return { mu, sd, transformar: (x: number[]) => x.map((n, i) => (n - mu[i]) / sd[i]) };
}

export function entrenarDemanda() {
  const rnd = generador(20261111);
  const muestras: Par[] = Array.from({ length: 600 }, () => {
    const semana = Math.floor(rnd() * 36), mes = semana + Math.floor(rnd() * 75);
    return { x: [semana, mes], y: Math.max(0, .55 * semana + .13 * mes + (rnd() - .5) * 5) };
  });
  // Generación independiente y partición fija antes de estimar cualquier parámetro.
  const train = muestras.slice(0, 480), test = muestras.slice(480);
  const e = escala(train.map(m => m.x));
  const yMedia = media(train.map(m => m.y));
  const pesos = [yMedia, 0, 0];
  for (let epoca = 0; epoca < 600; epoca++) {
    const grad = [0, 0, 0];
    for (const m of train) {
      const [a, b] = e.transformar(m.x), error = pesos[0] + pesos[1] * a + pesos[2] * b - m.y;
      grad[0] += error; grad[1] += error * a; grad[2] += error * b;
    }
    for (let i = 0; i < pesos.length; i++) pesos[i] -= .05 * grad[i] / train.length;
  }
  const predecir = (x: number[]) => { const [a, b] = e.transformar(x); return Math.max(0, pesos[0] + pesos[1] * a + pesos[2] * b); };
  return {
    predecir,
    evaluacion: { entrenamiento: train.length, prueba: test.length,
      mae: redondear(media(test.map(m => Math.abs(predecir(m.x) - m.y)))),
      maeBase: redondear(media(test.map(m => Math.abs(yMedia - m.y)))) },
  };
}

function distancia(a: number[], b: number[]) { return Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0)); }
export function entrenarSegmentos() {
  const rnd = generador(17381);
  const datos: Vector[] = [];
  for (let i = 0; i < 180; i++) {
    const grupo = i % 3;
    datos.push(grupo === 0 ? [3 + rnd() * 17, 6 + rnd() * 7, 700 + rnd() * 1000]
      : grupo === 1 ? [20 + rnd() * 30, 2 + rnd() * 4, 150 + rnd() * 500]
        : [50 + rnd() * 40, 1 + rnd() * 2, 20 + rnd() * 160]);
  }
  const train = datos.slice(0, 135), test = datos.slice(135);
  const e = escala(train);
  const normalizados = train.map(x => e.transformar(x));
  let centroides = [normalizados[0], normalizados[1], normalizados[2]].map(x => [...x]);
  const asignarNormal = (x: number[]) => centroides.reduce((mejor, c, i) => distancia(x, c) < distancia(x, centroides[mejor]) ? i : mejor, 0);
  for (let iter = 0; iter < 100; iter++) {
    const grupos = centroides.map(() => [] as number[][]);
    normalizados.forEach(x => grupos[asignarNormal(x)].push(x));
    const nuevos = grupos.map((g, i) => g.length ? centroides[i].map((_, j) => media(g.map(x => x[j]))) : centroides[i]);
    const cambio = Math.max(...nuevos.map((c, i) => distancia(c, centroides[i])));
    centroides = nuevos;
    if (cambio < 1e-8) break;
  }
  const prueba = test.map(x => e.transformar(x));
  const etiquetas = prueba.map(asignarNormal);
  const siluetas = prueba.map((x, i) => {
    const mismo = prueba.filter((_, j) => j !== i && etiquetas[j] === etiquetas[i]);
    if (!mismo.length) return 0;
    const a = media(mismo.map(y => distancia(x, y)));
    const otros = centroides.map((_, k) => prueba.filter((__, j) => etiquetas[j] === k)).filter((g, k) => k !== etiquetas[i] && g.length);
    if (!otros.length) return 0;
    const b = Math.min(...otros.map(g => media(g.map(y => distancia(x, y)))));
    return Math.max(a, b) === 0 ? 0 : (b - a) / Math.max(a, b);
  });
  return {
    clasificar: (x: Vector) => asignarNormal(e.transformar(x)),
    centroides: centroides.map(c => c.map((n, i) => redondear(n * e.sd[i] + e.mu[i])) as Vector),
    evaluacion: { entrenamiento: train.length, prueba: test.length, silueta: redondear(media(siluetas)) },
  };
}
