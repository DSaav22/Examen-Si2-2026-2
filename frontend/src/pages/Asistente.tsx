import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

type Turno = { rol: 'clienta' | 'asistente'; texto: string }

const SUGERENCIAS_CUENTA = [
  '¿Qué tallas hay de esta prenda?',
  '¿Hay stock en Santa Cruz?',
  '¿Cómo van mis pedidos?',
]
const SUGERENCIAS_INVITADA = [
  '¿Qué tallas hay de esta prenda?',
  '¿Hay stock en Santa Cruz?',
  '¿Qué colores tienen disponibles?',
]

export function Asistente() {
  const { user } = useAuth()
  const location = useLocation()
  const productoId = location.pathname.match(/^\/ficha\/([^/]+)/)?.[1]
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [turno, setTurno] = useState<Turno[]>([])
  const [enviando, setEnviando] = useState(false)
  const lista = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const guest = !user
  const sugerencias = guest ? SUGERENCIAS_INVITADA : SUGERENCIAS_CUENTA

  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' })
  }, [turno, abierto, enviando])

  useEffect(() => {
    if (abierto) inputRef.current?.focus()
  }, [abierto])

  async function enviar(mensaje: string) {
    const limpio = mensaje.trim()
    if (!limpio || enviando) return
    const historial = turno
    setTurno(actual => [...actual, { rol: 'clienta', texto: limpio }])
    setTexto('')
    setEnviando(true)
    try {
      const res = await api<{ respuesta: string }>('/ia/bot', {
        method: 'POST',
        body: JSON.stringify({ mensaje: limpio, productoId, historial }),
      })
      setTurno(actual => [...actual, { rol: 'asistente', texto: res.respuesta }])
    } catch {
      setTurno(actual => [
        ...actual,
        { rol: 'asistente', texto: 'No pude consultar la tienda. Inténtalo de nuevo.' },
      ])
    } finally {
      setEnviando(false)
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void enviar(texto)
  }

  return (
    <div className={`assistant${abierto ? ' is-open' : ''}`}>
      {abierto ? (
        <section className="assistant-panel" aria-label="Asistente de la tienda">
          <header className="assistant-panel-head">
            <div className="assistant-brand">
              <span className="assistant-avatar" aria-hidden="true">
                V
              </span>
              <div>
                <p className="assistant-kicker">VESTA</p>
                <h2>Asistente</h2>
                <p className="assistant-status">
                  {enviando
                    ? 'Escribiendo…'
                    : guest
                      ? 'Invitada · catálogo'
                      : productoId
                        ? 'Mirando esta ficha'
                        : 'En línea'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="assistant-close"
              aria-label="Cerrar asistente"
              onClick={() => setAbierto(false)}
            >
              ×
            </button>
          </header>

          <div className="assistant-log" ref={lista}>
            {turno.length === 0 ? (
              <div className="assistant-welcome">
                <p>
                  {guest
                    ? 'Preguntame por tallas y stock. Para pedidos, creá una cuenta al pagar.'
                    : `Preguntame por tallas, stock o tus pedidos.${productoId ? ' Estoy viendo la prenda abierta.' : ''}`}
                </p>
                <div className="assistant-suggestions">
                  {sugerencias.map(idea => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => void enviar(idea)}
                      disabled={enviando}
                    >
                      {idea}
                    </button>
                  ))}
                </div>
                {guest ? (
                  <p className="assistant-guest-hint">
                    <Link to={`/registro?next=${encodeURIComponent(location.pathname)}`}>
                      Crear cuenta
                    </Link>
                    {' · '}
                    <Link to={`/login?next=${encodeURIComponent(location.pathname)}`}>Entrar</Link>
                  </p>
                ) : null}
              </div>
            ) : null}
            {turno.map((item, index) => (
              <p
                key={`${item.rol}-${index}`}
                className={item.rol === 'clienta' ? 'assistant-mine' : 'assistant-theirs'}
              >
                {item.texto}
              </p>
            ))}
            {enviando ? (
              <p className="assistant-theirs assistant-typing" aria-live="polite">
                <span />
                <span />
                <span />
              </p>
            ) : null}
          </div>

          <form className="assistant-compose" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              value={texto}
              onChange={event => setTexto(event.target.value)}
              placeholder="Escribe tu pregunta"
              aria-label="Pregunta para el asistente"
              disabled={enviando}
            />
            <button
              className="assistant-send"
              type="submit"
              disabled={enviando || texto.trim().length < 2}
              aria-label="Enviar"
            >
              {enviando ? '…' : '↑'}
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="assistant-launcher"
        aria-expanded={abierto}
        aria-label={abierto ? 'Cerrar asistente' : 'Abrir asistente'}
        onClick={() => setAbierto(value => !value)}
      >
        {abierto ? (
          <span aria-hidden="true">×</span>
        ) : (
          <>
            <span className="assistant-launcher-dot" aria-hidden="true" />
            Asistente
          </>
        )}
      </button>
    </div>
  )
}
