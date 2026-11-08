import * as SQLite from 'expo-sqlite'
import type { OperacionLocal } from './tipos'

type FilaOp = {
  id: string
  tienda: string
  tipo: OperacionLocal['tipo']
  creada_en: string
  datos: string
  resumen: string
  estado: OperacionLocal['estado']
  error: string | null
}

let db: Promise<SQLite.SQLiteDatabase> | null = null

function abrir() {
  db ??= (async () => {
    const d = await SQLite.openDatabaseAsync('ensayar-offline.db')
    await d.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS operaciones (
        id TEXT PRIMARY KEY NOT NULL,
        tienda TEXT NOT NULL,
        tipo TEXT NOT NULL,
        creada_en TEXT NOT NULL,
        datos TEXT NOT NULL,
        resumen TEXT NOT NULL,
        estado TEXT NOT NULL,
        error TEXT
      );
      CREATE INDEX IF NOT EXISTS operaciones_tienda ON operaciones (tienda, creada_en);
      CREATE TABLE IF NOT EXISTS cache (
        clave TEXT PRIMARY KEY NOT NULL,
        valor TEXT NOT NULL,
        guardado_en TEXT NOT NULL
      );
    `)
    return d
  })()
  return db
}

export const motor = 'SQLite'

export async function listarOps(tienda: string): Promise<OperacionLocal[]> {
  const d = await abrir()
  const filas = await d.getAllAsync<FilaOp>(
    'SELECT * FROM operaciones WHERE tienda = ? ORDER BY creada_en',
    tienda,
  )
  return filas.map(f => ({
    id: f.id,
    tienda: f.tienda,
    tipo: f.tipo,
    creadaEn: f.creada_en,
    datos: JSON.parse(f.datos) as Record<string, unknown>,
    resumen: f.resumen,
    estado: f.estado,
    error: f.error ? (JSON.parse(f.error) as OperacionLocal['error']) : undefined,
  }))
}

export async function guardarOp(op: OperacionLocal) {
  const d = await abrir()
  await d.runAsync(
    `INSERT OR REPLACE INTO operaciones (id, tienda, tipo, creada_en, datos, resumen, estado, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    op.id,
    op.tienda,
    op.tipo,
    op.creadaEn,
    JSON.stringify(op.datos),
    op.resumen,
    op.estado,
    op.error ? JSON.stringify(op.error) : null,
  )
}

export async function quitarOp(id: string) {
  const d = await abrir()
  await d.runAsync('DELETE FROM operaciones WHERE id = ?', id)
}

export async function leerCache<T>(clave: string): Promise<T | null> {
  const d = await abrir()
  const fila = await d.getFirstAsync<{ valor: string }>('SELECT valor FROM cache WHERE clave = ?', clave)
  return fila ? (JSON.parse(fila.valor) as T) : null
}

export async function guardarCache(clave: string, valor: unknown) {
  const d = await abrir()
  await d.runAsync(
    'INSERT OR REPLACE INTO cache (clave, valor, guardado_en) VALUES (?, ?, ?)',
    clave,
    JSON.stringify(valor),
    new Date().toISOString(),
  )
}

export async function borrarCache(clave: string) {
  const d = await abrir()
  await d.runAsync('DELETE FROM cache WHERE clave = ?', clave)
}
