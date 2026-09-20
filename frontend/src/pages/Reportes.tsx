import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

type Resultado = {
  titulo: string
  sql: string
  columnas: string[]
  filas: Record<string, string | number | null>[]
}

export function Reportes() {
  const { user } = useAuth()
  const [pregunta, setPregunta] = useState(
    'ventas de la sucursal Santa Cruz, a quién y cuánto',
  )
  const [data, setData] = useState<Resultado | null>(null)
  const [error, setError] = useState('')
  const [escuchando, setEscuchando] = useState(false)

  if (user?.rol !== 'ADMIN') return <Navigate to="/catalogo" replace />

  async function delDia() {
    setError('')
    try {
      setData(await api<Resultado>('/reportes/dia?sucursal=Santa Cruz'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No salió el reporte del día')
      setData(null)
    }
  }

  async function consultar(e?: FormEvent) {
    e?.preventDefault()
    setError('')
    try {
      const res = await api<Resultado>('/reportes/generativo', {
        method: 'POST',
        body: JSON.stringify({ pregunta }),
      })
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se armó el reporte')
      setData(null)
    }
  }

  function voz() {
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => {
        lang: string
        start: () => void
        onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
        onerror: (() => void) | null
      }
    }
    if (!w.webkitSpeechRecognition) {
      setError('Este navegador no tiene reconocimiento de voz.')
      return
    }
    const rec = new w.webkitSpeechRecognition()
    rec.lang = 'es-BO'
    rec.onresult = (ev) => {
      setPregunta(ev.results[0][0].transcript)
      setEscuchando(false)
    }
    rec.onerror = () => setEscuchando(false)
    setEscuchando(true)
    rec.start()
  }

  return (
    <section>
      <p className="eyebrow">Innovación 2</p>
      <h2>Reportes generativos</h2>
      <form className="card col-form wide" onSubmit={consultar}>
        <label>
          Pregunta en lenguaje natural
          <textarea
            rows={3}
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
          />
        </label>
        <div className="row-form">
          <button type="submit">Consultar</button>
          <button type="button" className="ghost" onClick={voz}>
            {escuchando ? 'Escuchando…' : 'Dictar'}
          </button>
          <button type="button" className="ghost" onClick={() => void delDia()}>
            Ventas del día
          </button>
          <button
            type="button"
            className="ghost"
            onClick={async () => {
              setError('')
              try {
                setData(await api<Resultado>('/reportes/inventario'))
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Sin inventario')
              }
            }}
          >
            Inventario
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </form>
      {data ? (
        <div className="card">
          <h3>{data.titulo}</h3>
          <pre className="sql">{data.sql}</pre>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {data.columnas.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.filas.map((fila, i) => (
                  <tr key={i}>
                    {data.columnas.map((c) => (
                      <td key={c}>{String(fila[c] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}
