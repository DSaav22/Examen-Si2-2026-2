import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { leerCarrito } from '../carrito'

type Turno = { rol: 'clienta' | 'asistente'; texto: string }

const SUGERENCIAS_FICHA = [
  '¿Qué tallas hay de esta prenda?',
  '¿Hay stock en Santa Cruz?',
  '¿Qué colores tienen disponibles?',
]

const SUGERENCIAS_CARRITO_CUENTA = [
  '¿Hay stock de las prendas de mi carrito?',
  '¿Qué tallas tienen estas prendas?',
  '¿Cómo van mis pedidos?',
]

const SUGERENCIAS_CARRITO_INVITADA = [
  '¿Hay stock de las prendas de mi carrito?',
  '¿Qué tallas tienen estas prendas?',
  '¿Qué colores tienen disponibles?',
]

const SUGERENCIAS_GENERAL_CUENTA = [
  '¿Qué prendas tienen disponibles?',
  '¿Hay stock en Santa Cruz?',
  '¿Cómo van mis pedidos?',
]

const SUGERENCIAS_GENERAL_INVITADA = [
  '¿Qué prendas tienen disponibles?',
  '¿Hay stock en Santa Cruz?',
  '¿Qué tallas y colores tienen?',
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

  const enCarritoConItems = useMemo(() => {
    return location.pathname.startsWith('/carrito') && leerCarrito().length > 0
  }, [location.pathname, abierto])

  const sugerencias = useMemo(() => {
    if (productoId) return SUGERENCIAS_FICHA
    if (enCarritoConItems) return guest ? SUGERENCIAS_CARRITO_INVITADA : SUGERENCIAS_CARRITO_CUENTA
    return guest ? SUGERENCIAS_GENERAL_INVITADA : SUGERENCIAS_GENERAL_CUENTA
  }, [productoId, enCarritoConItems, guest])

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
    const carrito = leerCarrito()
    const carritoIds = carrito.map(c => c.productoId).filter(Boolean)
    try {
      const res = await api<{ respuesta: string }>('/ia/bot', {
        method: 'POST',
        body: JSON.stringify({
          mensaje: limpio,
          productoId,
          carritoIds: carritoIds.length ? carritoIds : undefined,
          historial,
        }),
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
                    : productoId
                      ? 'Mirando esta prenda'
                      : enCarritoConItems
                        ? 'Revisando tu carrito'
                        : guest
                          ? 'Invitada · catálogo'
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
                  {productoId
                    ? 'Preguntame por tallas, colores o stock de esta prenda.'
                    : enCarritoConItems
                      ? 'Preguntame por stock, tallas de tus prendas en el carrito o tus pedidos.'
                      : guest
                        ? 'Preguntame por prendas, tallas y stock del catálogo.'
                        : 'Preguntame por prendas del catálogo, tallas, stock o tus pedidos.'}
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
