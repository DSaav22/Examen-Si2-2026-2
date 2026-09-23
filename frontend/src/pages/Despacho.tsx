import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

type PedidoDespacho = {
  id: string
  estado: string
  total: string | number
  direccion: string | null
  seguimiento: string | null
  creadoEn: string
  usuario: { nombre: string }
  venta: { id: string; canal: string }
}

export function Despacho() {
  const [pedidos, setPedidos] = useState<PedidoDespacho[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [seguimiento, setSeguimiento] = useState('')

  async function cargar() {
    setPedidos(await api<PedidoDespacho[]>('/pedidos/despacho'))
  }

  useEffect(() => {
    cargar().catch(() => setError('No se pudieron cargar los pedidos pendientes.'))
  }, [])

  async function despachar(id: string) {
    setError('')
    setOk('')
    setSeguimiento('')
    try {
      const r = await api<{ id: string; estado: string; seguimiento: string }>(
        `/pedidos/${id}/despachar`,
        { method: 'POST' },
      )
      setSeguimiento(r.seguimiento)
      setOk('Pedido despachado.')
      await cargar()
    } catch (err) {
      const codigo = err instanceof Error ? err.message : ''
      const textos: Record<string, string> = {
        NO_ES_ONLINE: 'Solo se pueden despachar pedidos en línea.',
        YA_ENVIADO: 'Este pedido ya fue enviado.',
        SIN_DIRECCION: 'El pedido no tiene dirección de envío.',
      }
      setError(textos[codigo] ?? (codigo || 'No se pudo despachar el pedido.'))
    }
  }

  return (
    <section>
      <p className="eyebrow">Operaciones</p>
      <h1>Despacho de pedidos</h1>
      <p>Pedidos en línea pendientes de envío.</p>
      <p>
        <Link to="/encargado">← Volver a encargado</Link>
      </p>
      {ok ? <p className="ok">{ok}</p> : null}
      {seguimiento ? (
        <p className="ok">
          Seguimiento: <strong>{seguimiento}</strong>
        </p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}

      {pedidos.length === 0 ? (
        <article className="ui-card">
          <p className="muted">No hay pedidos pendientes de despacho.</p>
        </article>
      ) : (
        <div className="grid">
          {pedidos.map((p) => (
            <article key={p.id} className="ui-card">
              <strong>{p.usuario.nombre}</strong>
              <p className="muted">
                {new Date(p.creadoEn).toLocaleString()} · {p.venta.canal} · Bs{' '}
                {Number(p.total).toFixed(2)}
              </p>
              <p>
                <strong>Dirección:</strong> {p.direccion ?? 'Sin dirección'}
              </p>
              <button
                type="button"
                className="ui-button ui-button--primary"
                onClick={() => void despachar(p.id)}
              >
                Despachar
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
