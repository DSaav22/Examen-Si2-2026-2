import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { conectarNotificaciones } from '../notificaciones-ws'

type Notif = {
  id: string
  tipo: string
  titulo: string
  cuerpo: string
  enlace: string
  leida: boolean
  creadaEn: string
}

function formatoRelativo(iso: string) {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Hace ${days} d`
  return date.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })
}

/** Textos amables para la vitrina: sin jerga técnica ni SMTP. */
function cuerpoVitrina(cuerpo: string, tipo: string) {
  const monto = cuerpo.match(/Bs\s*([\d.,]+)/i)?.[1]
  const esFactura =
    /factura/i.test(tipo) || /factura/i.test(cuerpo) || /compra/i.test(cuerpo)

  if (esFactura) {
    return monto
      ? `Compra por Bs ${monto}. Tu factura está lista en tu cuenta.`
      : 'Tu factura está lista para revisar en tu cuenta.'
  }

  return cuerpo
    .replace(/\s*Correo simulado[\s\S]*$/i, '')
    .replace(/\s*\(?\s*configurá\s+SMTP[\s\S]*$/i, '')
    .replace(/\s*SMTP[_A-Z]*[\s\S]*$/i, '')
    .replace(/\s*[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}[\s\S]*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function etiquetaTipo(tipo: string) {
  const key = tipo.toLowerCase()
  if (key.includes('factura') || key.includes('pago') || key.includes('venta')) return 'Compra'
  if (key.includes('pedido') || key.includes('despacho') || key.includes('envio')) return 'Pedido'
  if (key.includes('stock') || key.includes('inventario')) return 'Stock'
  if (key.includes('promo') || key.includes('oferta')) return 'Oferta'
  return 'Aviso'
}

function tituloVitrina(titulo: string, tipo: string) {
  if (/^factura\s+/i.test(titulo)) return 'Tu factura está lista'
  if (tipo.toLowerCase().includes('factura')) return 'Factura de tu compra'
  return titulo
}

/** Avisos viejos apuntaban a /cuenta; la factura vive en Mis compras. */
function enlaceCliente(enlace: string, tipo: string) {
  if (!enlace || enlace === '/cuenta') {
    return /factura|venta|compra|pedido|pago/i.test(tipo) ? '/historial' : '/cuenta'
  }
  return enlace
}

export function NotificacionesBell({ variant = 'ops' }: { variant?: 'ops' | 'client' }) {
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [count, setCount] = useState(0)
  const [live, setLive] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const esCliente = variant === 'client'

  const cargar = useCallback(() => {
    void Promise.all([
      api<Notif[]>('/notificaciones?limit=20').catch(() => [] as Notif[]),
      api<{ count: number }>('/notificaciones/no-leidas').catch(() => ({ count: 0 })),
    ]).then(([list, c]) => {
      setItems(list)
      setCount(c.count)
    })
  }, [])

  useEffect(() => {
    cargar()
    const token = localStorage.getItem('ensayar_token')
    if (!token) return

    const stop = conectarNotificaciones(token, {
      onEstado: setLive,
      onNotificacion: n => {
        setItems(prev => {
          if (prev.some(x => x.id === n.id)) return prev
          return [
            {
              id: n.id,
              tipo: n.tipo,
              titulo: n.titulo,
              cuerpo: n.cuerpo,
              enlace: n.enlace,
              leida: n.leida,
              creadaEn: typeof n.creadaEn === 'string' ? n.creadaEn : new Date(n.creadaEn).toISOString(),
            },
            ...prev,
          ].slice(0, 20)
        })
        setToast(esCliente ? tituloVitrina(n.titulo, n.tipo) : n.titulo)
        window.setTimeout(() => setToast(null), 4500)
      },
      onConteo: setCount,
    })

    const t = window.setInterval(cargar, 120_000)
    return () => {
      stop()
      window.clearInterval(t)
    }
  }, [cargar, esCliente])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  async function marcar(id: string) {
    try {
      await api(`/notificaciones/${id}/leer`, { method: 'PATCH' })
      setItems(prev => prev.map(n => (n.id === id ? { ...n, leida: true } : n)))
      setCount(c => Math.max(0, c - 1))
    } catch {
      /* ignore */
    }
  }

  async function marcarTodas() {
    try {
      await api('/notificaciones/leer-todas', { method: 'POST' })
      setItems(prev => prev.map(n => ({ ...n, leida: true })))
      setCount(0)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={`notif-bell notif-bell--${variant}`} ref={rootRef}>
      {toast ? (
        <div className="notif-toast" role="status">
          <strong>{toast}</strong>
          <span>{esCliente ? 'Tenés un nuevo aviso' : 'Nueva notificación'}</span>
        </div>
      ) : null}
      <button
        type="button"
        className={esCliente ? 'shell-icon-button notif-bell-btn' : 'ops-notif-btn notif-bell-btn'}
        aria-label={count ? `${count} notificaciones sin leer` : 'Notificaciones'}
        aria-expanded={open}
        aria-controls={panelId}
        title="Notificaciones"
        onClick={() => {
          setOpen(v => !v)
          if (!open) cargar()
        }}
      >
        {esCliente ? (
          <span className="notif-bell-glyph" aria-hidden="true">
            ✉
          </span>
        ) : (
          <>
            <span className="notif-bell-label" aria-hidden="true">
              Avisos
            </span>
            <span className={`notif-live${live ? ' is-on' : ''}`} aria-hidden="true" />
          </>
        )}
        {count > 0 ? <span className="notif-bell-count">{count > 9 ? '9+' : count}</span> : null}
      </button>
      {open ? (
        <div className="notif-panel" id={panelId} role="dialog" aria-label="Notificaciones">
          <header className="notif-panel-head">
            <div className="notif-panel-title">
              <strong>{esCliente ? 'Tus avisos' : 'Notificaciones'}</strong>
              <p>
                {esCliente
                  ? count
                    ? `${count} sin leer`
                    : 'Pedidos, facturas y novedades'
                  : live
                    ? 'En vivo'
                    : 'Actualización periódica'}
              </p>
            </div>
            {count > 0 ? (
              <button type="button" className="notif-mark-all" onClick={() => void marcarTodas()}>
                Marcar leídas
              </button>
            ) : null}
          </header>

          {!items.length ? (
            <div className="notif-empty">
              <span aria-hidden="true">✦</span>
              <p>{esCliente ? 'Todavía no hay avisos. Cuando compres, aparecerán aquí.' : 'Sin avisos por ahora.'}</p>
            </div>
          ) : (
            <ul className="notif-list">
              {items.map(n => {
                const titulo = esCliente ? tituloVitrina(n.titulo, n.tipo) : n.titulo
                const cuerpo = esCliente ? cuerpoVitrina(n.cuerpo, n.tipo) : n.cuerpo
                const tipo = etiquetaTipo(n.tipo)
                const destino = esCliente ? enlaceCliente(n.enlace, n.tipo) : n.enlace
                return (
                  <li key={n.id} className={n.leida ? '' : 'is-unread'}>
                    <button
                      type="button"
                      className="notif-item"
                      onClick={() => {
                        if (!n.leida) void marcar(n.id)
                      }}
                    >
                      <div className="notif-item-meta">
                        <span className="notif-type">{tipo}</span>
                        <time dateTime={n.creadaEn}>{formatoRelativo(n.creadaEn)}</time>
                      </div>
                      <strong>{titulo}</strong>
                      {cuerpo ? <span>{cuerpo}</span> : null}
                    </button>
                    {destino ? (
                      <Link to={destino} className="notif-link" onClick={() => setOpen(false)}>
                        {esCliente && /historial/.test(destino) ? 'Ver compra →' : 'Ver detalle →'}
                      </Link>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
