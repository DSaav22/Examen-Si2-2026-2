import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { OpsActions, OpsBtn, OpsEmpty, OpsPage, OpsPanel, OpsStatus } from '../shared/ops/OpsUi'

type LineaPedido = {
  cantidad: number
  variante: {
    talla: string
    color: string
    sku: string
    producto: { nombre: string }
  }
}

type PedidoDespacho = {
  id: string
  estado: string
  total: string | number
  direccion: string | null
  seguimiento: string | null
  creadoEn: string
  usuario: { nombre: string; email?: string }
  venta: {
    id: string
    canal: string
    estado?: string
    medioPago?: string
    lineas?: LineaPedido[]
  } | null
}

export function Despacho() {
  const [pedidos, setPedidos] = useState<PedidoDespacho[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [seguimiento, setSeguimiento] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function cargar() {
    setPedidos(await api<PedidoDespacho[]>('/pedidos/despacho'))
  }

  useEffect(() => {
    cargar().catch(() => setError('No se pudieron cargar los pedidos pendientes.'))
  }, [])

  const totalPendiente = useMemo(
    () => pedidos.reduce((acc, p) => acc + Number(p.total), 0),
    [pedidos],
  )

  async function despachar(id: string) {
    setError('')
    setOk('')
    setSeguimiento('')
    setBusyId(id)
    try {
      const r = await api<{ id: string; estado: string; seguimiento: string }>(
        `/pedidos/${id}/despachar`,
        { method: 'POST' },
      )
      setSeguimiento(r.seguimiento)
      setOk('Pedido marcado como enviado.')
      await cargar()
    } catch (err) {
      const codigo = err instanceof Error ? err.message : ''
      const textos: Record<string, string> = {
        NO_ES_ONLINE: 'Solo se pueden despachar pedidos en línea.',
        YA_ENVIADO: 'Este pedido ya fue enviado.',
        SIN_DIRECCION: 'El pedido no tiene dirección de envío.',
        PEDIDO_NO: 'No se encontró ese pedido.',
        VENTA_DEVUELTA: 'La venta asociada ya fue devuelta.',
      }
      setError(textos[codigo] ?? (codigo || 'No se pudo despachar el pedido.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <OpsPage
      eyebrow="Operaciones"
      title="Despacho"
      description="Pedidos en línea listos para preparar y enviar. Al despachar se genera un código de seguimiento."
      actions={
        <OpsActions>
          <Link className="ops-text-link" to="/encargado">
            Inventario
          </Link>
          <Link className="ops-text-link" to="/pos">
            Punto de venta
          </Link>
          <OpsBtn type="button" variant="secondary" onClick={() => void cargar()}>
            Actualizar
          </OpsBtn>
        </OpsActions>
      }
    >
      <div className="despacho-stats">
        <article className="despacho-stat">
          <p className="eyebrow">Cola</p>
          <strong>{pedidos.length}</strong>
          <span className="muted">pendientes</span>
        </article>
        <article className="despacho-stat">
          <p className="eyebrow">Importe</p>
          <strong>Bs {totalPendiente.toFixed(2)}</strong>
          <span className="muted">por despachar</span>
        </article>
        <article className="despacho-stat">
          <p className="eyebrow">Canal</p>
          <strong>Online</strong>
          <span className="muted">envío a domicilio</span>
        </article>
      </div>

      {ok ? <p className="ok">{ok}</p> : null}
      {seguimiento ? (
        <div className="despacho-track" role="status">
          <p className="eyebrow">Último seguimiento</p>
          <strong>{seguimiento}</strong>
          <span className="muted">Compartilo con la clienta o revisá en Avisos.</span>
        </div>
      ) : null}
      {error ? <p className="error">{error}</p> : null}

      <OpsPanel
        title="Pendientes de envío"
        eyebrow={pedidos.length ? `${pedidos.length} en cola` : 'Cola vacía'}
      >
        {!pedidos.length ? (
          <OpsEmpty title="Sin pedidos por despachar">
            Cuando cobren una compra online con dirección, aparece acá para generar el envío.
          </OpsEmpty>
        ) : (
          <ul className="despacho-list">
            {pedidos.map(p => {
              const lineas = p.venta?.lineas ?? []
              const sinDir = !p.direccion?.trim()
              return (
                <li key={p.id} className="despacho-card">
                  <header className="despacho-card-head">
                    <div>
                      <strong>{p.usuario.nombre}</strong>
                      {p.usuario.email ? <p className="muted">{p.usuario.email}</p> : null}
                    </div>
                    <div className="despacho-card-meta">
                      <OpsStatus state={sinDir ? 'warn' : 'muted'}>
                        {sinDir ? 'sin dirección' : p.estado}
                      </OpsStatus>
                      <span className="despacho-total">Bs {Number(p.total).toFixed(2)}</span>
                    </div>
                  </header>

                  <dl className="despacho-facts">
                    <div>
                      <dt>Pedido</dt>
                      <dd>{new Date(p.creadoEn).toLocaleString('es-BO')}</dd>
                    </div>
                    <div>
                      <dt>Canal</dt>
                      <dd>{(p.venta?.canal ?? 'online').toUpperCase()}</dd>
                    </div>
                    <div>
                      <dt>Pago</dt>
                      <dd>{p.venta?.medioPago ?? '—'}</dd>
                    </div>
                    <div className="despacho-facts-wide">
                      <dt>Dirección</dt>
                      <dd className={sinDir ? 'error' : undefined}>
                        {p.direccion?.trim() || 'Sin dirección — no se puede despachar'}
                      </dd>
                    </div>
                  </dl>

                  {lineas.length ? (
                    <ul className="despacho-lines">
                      {lineas.map((l, i) => (
                        <li key={`${p.id}-${i}`}>
                          <span>
                            {l.variante.producto.nombre} · {l.variante.talla}/{l.variante.color}
                          </span>
                          <span className="muted">{l.variante.sku}</span>
                          <strong>×{l.cantidad}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <OpsActions>
                    <OpsBtn
                      type="button"
                      disabled={sinDir || busyId === p.id}
                      onClick={() => void despachar(p.id)}
                    >
                      {busyId === p.id ? 'Despachando…' : 'Despachar y generar seguimiento'}
                    </OpsBtn>
                  </OpsActions>
                </li>
              )
            })}
          </ul>
        )}
      </OpsPanel>
    </OpsPage>
  )
}
