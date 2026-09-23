import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api'

type Turno = { rol: 'clienta' | 'asistente'; texto: string }

const SUGERENCIAS = ['¿Qué tallas hay de esta prenda?', '¿Hay stock en Santa Cruz?', '¿Cómo van mis pedidos?']

export function Asistente() {
  const location = useLocation()
  const productoId = location.pathname.match(/^\/ficha\/([^/]+)/)?.[1]
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [turno, setTurno] = useState<Turno[]>([])
  const [enviando, setEnviando] = useState(false)
  const lista = useRef<HTMLDivElement>(null)

  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight })
  }, [turno, abierto])

  async function enviar(mensaje: string) {
    const limpio = mensaje.trim()
    if (!limpio || enviando) return
    const historial = turno
    setTurno((actual) => [...actual, { rol: 'clienta', texto: limpio }])
    setTexto('')
    setEnviando(true)
    try {
      const res = await api<{ respuesta: string }>('/ia/bot', {
        method: 'POST',
        body: JSON.stringify({ mensaje: limpio, productoId, historial }),
      })
      setTurno((actual) => [...actual, { rol: 'asistente', texto: res.respuesta }])
    } catch {
      setTurno((actual) => [...actual, { rol: 'asistente', texto: 'No pude consultar la tienda. Inténtalo de nuevo.' }])
    } finally {
      setEnviando(false)
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void enviar(texto)
  }

  return (
    <div className="assistant">
      {abierto ? (
        <section className="assistant-panel" aria-label="Asistente de la tienda">
          <header>
            <div>
              <p className="eyebrow">Vesta</p>
              <h2>Asistente</h2>
            </div>
            <button type="button" className="shell-icon-button" aria-label="Cerrar asistente" onClick={() => setAbierto(false)}>×</button>
          </header>
          <p className="muted">Pregunta por talla, stock o tus pedidos. No cambia precios ni inventario.</p>
          <div className="assistant-log" ref={lista}>
            {turno.length === 0 ? <p className="assistant-empty">Estoy mirando el catálogo{productoId ? ' de esta ficha' : ''} y tus compras.</p> : null}
            {turno.map((item, index) => (
              <p key={index} className={item.rol === 'clienta' ? 'assistant-mine' : 'assistant-theirs'}>{item.texto}</p>
            ))}
          </div>
          {turno.length === 0 ? (
            <div className="assistant-suggestions">
              {SUGERENCIAS.map((idea) => (
                <button key={idea} type="button" onClick={() => void enviar(idea)}>{idea}</button>
              ))}
            </div>
          ) : null}
          <form onSubmit={onSubmit}>
            <input value={texto} onChange={(event) => setTexto(event.target.value)} placeholder="Escribe tu pregunta" aria-label="Pregunta para el asistente" />
            <button className="ui-button ui-button--primary" type="submit" disabled={enviando || texto.trim().length < 2}>{enviando ? '…' : 'Enviar'}</button>
          </form>
        </section>
      ) : null}
      <button type="button" className="assistant-launcher" aria-expanded={abierto} onClick={() => setAbierto((value) => !value)}>
        {abierto ? 'Cerrar' : 'Asistente'}
      </button>
    </div>
  )
}
