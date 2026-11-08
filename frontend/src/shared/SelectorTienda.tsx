import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { homePorRol } from '../roles'
import { fijarTienda, tiendaActiva } from '../tienda'

export type TiendaPublica = {
  id: string
  slug: string
  nombre: string
  pais: string
  moneda: string
  plan: { codigo: string; nombre: string; modulos: string[] } | null
}

let cache: Promise<TiendaPublica | null> | null = null

/** Nombre y datos de la tienda cuya vitrina se está mostrando. */
export function useTiendaPublica() {
  const [tienda, setTienda] = useState<TiendaPublica | null>(null)
  useEffect(() => {
    cache ??= api<TiendaPublica>('/tienda').catch(() => null)
    void cache.then(setTienda)
  }, [])
  return tienda
}

/** Selector de tienda del panel: misma cuenta, cambia de tienda sin volver a iniciar sesión. */
export function SelectorTienda() {
  const { tienda, tiendas, cambiarTienda } = useAuth()
  const [error, setError] = useState('')
  if (!tienda) return null

  async function cambiar(tiendaId: string) {
    setError('')
    try {
      const s = await cambiarTienda(tiendaId)
      window.location.assign(homePorRol(s.user.rol))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="tienda-switch">
      <p className="tienda-switch-label">Tienda</p>
      {tiendas.length > 1 ? (
        <select
          className="tienda-switch-select"
          value={tienda.id}
          aria-label="Cambiar de tienda"
          onChange={e => void cambiar(e.target.value)}
        >
          {tiendas.map(t => (
            <option key={t.tiendaId} value={t.tiendaId} disabled={!t.vigente}>
              {t.nombre} · {t.rol.toLowerCase()}{t.vigente ? '' : ' (vencida)'}
            </option>
          ))}
        </select>
      ) : (
        <p className="tienda-switch-name">{tienda.nombre}</p>
      )}
      <p className="tienda-switch-meta">
        {tienda.plan ? `Plan ${tienda.plan}` : 'Sin plan'} · <a href="/plataforma">Mis tiendas</a>
      </p>
      {error ? <p className="tienda-switch-error">{error}</p> : null}
    </div>
  )
}

/** /t/:slug abre la vitrina de esa tienda (y cambia la sesión si la cuenta también trabaja allí). */
export function TiendaPorSlug() {
  const { slug = '' } = useParams()
  const { user, tienda, tiendas, cambiarTienda, logout } = useAuth()

  useEffect(() => {
    let vivo = true
    void (async () => {
      if (user && tienda?.slug !== slug) {
        const destino = tiendas.find(t => t.slug === slug)
        if (destino) await cambiarTienda(destino.tiendaId).catch(() => logout())
        else logout()
      }
      if (!vivo) return
      if (tiendaActiva() !== slug) fijarTienda(slug)
      window.location.replace('/inicio')
    })()
    return () => {
      vivo = false
    }
    // Solo al entrar a la ruta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  return <p style={{ padding: '3rem', textAlign: 'center' }}>Abriendo tienda…</p>
}
