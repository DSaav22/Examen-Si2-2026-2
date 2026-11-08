import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, descargarArchivo } from '../../api'
import { OpsBtn, OpsEmpty, OpsPanel, OpsTable } from '../../shared/ops/OpsUi'

type Tipo = 'texto' | 'entero' | 'numero' | 'dinero' | 'fecha' | 'fechahora' | 'logico'
type Columna = { clave: string; campo: string; etiqueta: string; tipo: Tipo; agregacion?: string; totalizable: boolean }
type Fila = Record<string, string | number | null>
type Especificacion = {
  titulo: string
  fuente: string
  columnas: { campo: string; agregacion?: string }[]
  filtros: Record<string, unknown>[]
  agrupar: string[]
  orden: Record<string, unknown>[]
  limite: number
  formato: 'pantalla' | 'pdf' | 'excel'
}
type Motor = 'modelo' | 'reglas' | 'manual'
type Resultado = {
  titulo: string
  pregunta: string | null
  motor: Motor
  especificacion: Especificacion
  interpretacion: { fuente: string; columnas: string[]; filtros: string[]; agrupar: string[]; orden: string[]; limite: number; formato: string }
  columnas: Columna[]
  filas: Fila[]
  totales: Record<string, number> | null
  narracion: string
  avisos: string[]
  sql: string
  parametros: unknown[]
  ms: number
}
type Catalogo = { ejemplos: string[]; modelo: { configurado: boolean; disponible: boolean } }

type Reconocimiento = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

function crearReconocimiento(): Reconocimiento | null {
  const w = window as unknown as { SpeechRecognition?: new () => Reconocimiento; webkitSpeechRecognition?: new () => Reconocimiento }
  const Clase = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return Clase ? new Clase() : null
}

const MOTOR: Record<Motor, string> = { modelo: 'Interpretado con IA', reglas: 'Interpretado con reglas locales', manual: 'Criterios editados' }

function celda(c: Columna, v: string | number | null | undefined) {
  if (v == null || v === '') return '—'
  if (c.tipo === 'dinero') return `Bs ${Number(v).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (c.tipo === 'numero') return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 2 })
  if (c.tipo === 'entero') return Number(v).toLocaleString('es-BO')
  if (c.tipo === 'fecha' || c.tipo === 'fechahora') {
    const s = String(v)
    const [y, m, d] = s.slice(0, 10).split('-')
    return `${d}/${m}/${y}${c.tipo === 'fechahora' ? ` ${s.slice(11, 16)}` : ''}`
  }
  return String(v)
}

const numerica = (c: Columna) => c.tipo === 'dinero' || c.tipo === 'numero' || c.tipo === 'entero'

export function ReporteInteligente() {
  const [pregunta, setPregunta] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [cargando, setCargando] = useState(false)
  const [descargando, setDescargando] = useState<'' | 'pdf' | 'excel'>('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [verSql, setVerSql] = useState(false)
  const [escuchando, setEscuchando] = useState(false)
  const reconocimiento = useRef<Reconocimiento | null>(null)
  const hayVoz = typeof window !== 'undefined' && crearReconocimiento() !== null

  const [iaActiva, setIaActiva] = useState(false)

  useEffect(() => {
    api<Catalogo>('/reportes/inteligente/catalogo')
      .then(c => {
        setCatalogo(c)
        setIaActiva(c.modelo.disponible)
      })
      .catch(() => setCatalogo(null))
    return () => reconocimiento.current?.stop()
  }, [])

  async function exportar(formato: 'pdf' | 'excel', r: Resultado) {
    setDescargando(formato)
    setError('')
    try {
      const nombre = await descargarArchivo('/reportes/inteligente/exportar', {
        formato,
        especificacion: r.especificacion,
        motor: r.motor,
        ...(r.pregunta ? { pregunta: r.pregunta } : {}),
      })
      setAviso(`Descargado: ${nombre}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el archivo')
    } finally {
      setDescargando('')
    }
  }

  async function generar(texto: string) {
    if (texto.trim().length < 3) return
    setCargando(true)
    setError('')
    setAviso('')
    try {
      const r = await api<Resultado>('/reportes/inteligente', { method: 'POST', body: JSON.stringify({ pregunta: texto.trim() }) })
      setResultado(r)
      setIaActiva(r.motor === 'modelo')
      if (r.especificacion.formato !== 'pantalla') void exportar(r.especificacion.formato, r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo armar el reporte')
    } finally {
      setCargando(false)
    }
  }

  async function reejecutar(especificacion: Especificacion) {
    setCargando(true)
    setError('')
    try {
      const r = await api<Resultado>('/reportes/inteligente/ejecutar', {
        method: 'POST',
        body: JSON.stringify({ especificacion: { ...especificacion, titulo: '', formato: 'pantalla' }, motor: 'manual', pregunta: resultado?.pregunta ?? undefined }),
      })
      setResultado(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el reporte')
    } finally {
      setCargando(false)
    }
  }

  function quitarFiltro(i: number) {
    if (!resultado) return
    const e = resultado.especificacion
    void reejecutar({ ...e, filtros: e.filtros.filter((_, j) => j !== i) })
  }

  function quitarGrupo(i: number) {
    if (!resultado) return
    const e = resultado.especificacion
    const grupo = e.agrupar[i]
    void reejecutar({ ...e, agrupar: e.agrupar.filter((_, j) => j !== i), columnas: e.columnas.filter(c => c.campo !== grupo || c.agregacion) })
  }

  function invertirOrden() {
    if (!resultado?.especificacion.orden.length) return
    const e = resultado.especificacion
    void reejecutar({ ...e, orden: e.orden.map((o, i) => (i === 0 ? { ...o, dir: o.dir === 'asc' ? 'desc' : 'asc' } : o)) })
  }

  function dictar() {
    if (escuchando) {
      reconocimiento.current?.stop()
      return
    }
    const rec = crearReconocimiento()
    if (!rec) return
    rec.lang = 'es-BO'
    rec.interimResults = true
    rec.continuous = false
    let final = ''
    rec.onresult = e => {
      let parcial = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) final += r[0].transcript
        else parcial += r[0].transcript
      }
      setPregunta((final + parcial).trim())
    }
    rec.onerror = e => {
      setError(e.error === 'not-allowed' ? 'El navegador no tiene permiso para usar el micrófono.' : `No se pudo escuchar (${e.error}).`)
    }
    rec.onend = () => {
      setEscuchando(false)
      if (final.trim().length >= 3) void generar(final)
    }
    reconocimiento.current = rec
    setError('')
    setEscuchando(true)
    rec.start()
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    void generar(pregunta)
  }

  const r = resultado
  const grupos = r?.columnas.filter(c => !c.agregacion && r.especificacion.agrupar.includes(c.campo)) ?? []
  const medidaBarras = r?.columnas.find(c => c.totalizable && c.tipo === 'dinero') ?? r?.columnas.find(c => c.totalizable)
  const barras =
    r && grupos.length && medidaBarras && r.filas.length > 1 && r.filas.length <= 15
      ? r.filas.map(f => ({
          label: grupos.map(g => celda(g, f[g.clave])).join(' · '),
          valor: Number(f[medidaBarras.clave] ?? 0),
        }))
      : []
  const maxBarra = Math.max(...barras.map(b => b.valor), 1)

  return (
    <OpsPanel
      className="ri-panel"
      eyebrow={iaActiva ? 'IA generativa · texto o voz' : 'Intérprete local · texto o voz'}
      title="Reporte inteligente"
    >
      <form className="ri-form" onSubmit={enviar}>
        <textarea
          rows={3}
          value={pregunta}
          onChange={e => setPregunta(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void generar(pregunta)
          }}
          placeholder="Ej. sácame una lista de los clientes con su nombre, dirección y email de los que me deben de 500 a 3000 Bs por ventas al crédito, en Excel"
          aria-label="Qué reporte necesitás"
        />
        <div className="ri-form-acciones">
          {hayVoz ? (
            <button type="button" className={`ri-mic${escuchando ? ' is-on' : ''}`} onClick={dictar} aria-pressed={escuchando} title="Dictar por voz">
              <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
              {escuchando ? 'Escuchando… (tocá para terminar)' : 'Dictar'}
            </button>
          ) : (
            <span className="muted ri-sin-voz">Para dictar usá Chrome o Edge (o el dictado del teclado del celular).</span>
          )}
          <OpsBtn type="submit" disabled={cargando || pregunta.trim().length < 3}>
            {cargando ? 'Generando…' : 'Generar reporte'}
          </OpsBtn>
        </div>
      </form>

      {catalogo?.ejemplos.length ? (
        <div className="ri-ejemplos" aria-label="Ejemplos">
          {catalogo.ejemplos.map(ej => (
            <button key={ej} type="button" onClick={() => { setPregunta(ej); void generar(ej) }} disabled={cargando}>
              {ej}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="error" role="alert">{error}</p> : null}

      {r ? (
        <div className="ri-resultado">
          <div className="ri-cabecera">
            <div>
              <h3>{r.titulo}</h3>
              <p className="muted">
                {MOTOR[r.motor]} · {r.filas.length} {r.filas.length === 1 ? 'fila' : 'filas'} · {r.ms} ms
              </p>
            </div>
            <div className="ri-descargas">
              <OpsBtn type="button" variant="secondary" disabled={!!descargando || !r.filas.length} onClick={() => void exportar('excel', r)}>
                {descargando === 'excel' ? 'Generando…' : 'Excel'}
              </OpsBtn>
              <OpsBtn type="button" variant="secondary" disabled={!!descargando} onClick={() => void exportar('pdf', r)}>
                {descargando === 'pdf' ? 'Generando…' : 'PDF'}
              </OpsBtn>
            </div>
          </div>

          <div className="ri-chips" aria-label="Lo que entendió el sistema">
            <span className="ri-chip ri-chip--fuente">{r.interpretacion.fuente}</span>
            {r.interpretacion.filtros.map((f, i) => (
              <span key={f} className="ri-chip">
                {f}
                <button type="button" onClick={() => quitarFiltro(i)} aria-label={`Quitar criterio ${f}`} disabled={cargando}>×</button>
              </span>
            ))}
            {r.interpretacion.agrupar.map((g, i) => (
              <span key={g} className="ri-chip ri-chip--grupo">
                por {g}
                <button type="button" onClick={() => quitarGrupo(i)} aria-label={`Quitar agrupación ${g}`} disabled={cargando}>×</button>
              </span>
            ))}
            {r.interpretacion.orden.map(o => (
              <button key={o} type="button" className="ri-chip ri-chip--orden" onClick={invertirOrden} title="Invertir el orden" disabled={cargando}>
                ↕ {o}
              </button>
            ))}
            {r.especificacion.limite < 200 ? <span className="ri-chip">primeras {r.especificacion.limite}</span> : null}
          </div>

          <p className="ops-report-narracion">{r.narracion}</p>
          {r.avisos.map(a => <p key={a} className="ops-report-aviso">{a}</p>)}
          {aviso ? <p className="muted ri-descargado">{aviso}</p> : null}

          {barras.length ? (
            <ul className="ops-report-bars" aria-label="Comparativa">
              {barras.map((b, i) => (
                <li key={`${i}-${b.label}`}>
                  <div className="ops-report-bars-label">
                    <strong>{b.label}</strong>
                    <span>{medidaBarras ? celda(medidaBarras, b.valor) : b.valor}</span>
                  </div>
                  <div className="ops-report-bars-track">
                    <span style={{ width: `${Math.max(3, Math.round((b.valor / maxBarra) * 100))}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {r.filas.length ? (
            <OpsTable minWidth={Math.min(1100, 140 * r.columnas.length)} className="ops-report-table">
              <thead>
                <tr>{r.columnas.map(c => <th key={c.clave} className={numerica(c) ? 'ri-num' : ''}>{c.etiqueta}</th>)}</tr>
              </thead>
              <tbody>
                {r.filas.map((f, i) => (
                  <tr key={i}>
                    {r.columnas.map(c => <td key={c.clave} className={numerica(c) ? 'ri-num' : ''}>{celda(c, f[c.clave])}</td>)}
                  </tr>
                ))}
              </tbody>
              {r.totales ? (
                <tfoot>
                  <tr>
                    {r.columnas.map((c, i) => (
                      <td key={c.clave} className={numerica(c) ? 'ri-num' : ''}>
                        {i === 0 ? 'Total' : c.clave in r.totales! ? celda(c, r.totales![c.clave]) : ''}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              ) : null}
            </OpsTable>
          ) : (
            <OpsEmpty title="Ningún registro cumple estos criterios">Quitá un criterio tocando la × o reformulá el pedido.</OpsEmpty>
          )}

          <button type="button" className="ri-ver-sql" onClick={() => setVerSql(v => !v)}>
            {verSql ? 'Ocultar consulta' : 'Ver cómo se generó (SQL)'}
          </button>
          {verSql ? (
            <div className="ri-sql">
              <pre>{r.sql}</pre>
              <p className="muted">Parámetros: {JSON.stringify(r.parametros)}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </OpsPanel>
  )
}
