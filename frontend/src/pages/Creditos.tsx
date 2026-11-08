import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import { OpsBtn, OpsEmpty, OpsField, OpsPage, OpsPanel, OpsStatus, OpsTable } from '../shared/ops/OpsUi'

type Credito = {
  id: string
  clienta: { id: string; nombre: string; email: string }
  sucursal: string
  venta: string
  monto: number
  saldo: number
  pagado: number
  creadaEn: string
  venceEn: string
  diasMora: number
  abonos: { id: string; monto: number; medioPago: string; creadoEn: string }[]
}

const bs = (n: number) => `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fecha = (s: string) => new Date(s).toLocaleDateString('es-BO', { timeZone: 'America/La_Paz' })

export function Creditos() {
  const [estado, setEstado] = useState<'pendientes' | 'pagados' | 'todos'>('pendientes')
  const [creditos, setCreditos] = useState<Credito[] | null>(null)
  const [turnoId, setTurnoId] = useState<string | null>(null)
  const [abriendo, setAbriendo] = useState<string | null>(null)
  const [monto, setMonto] = useState('')
  const [medio, setMedio] = useState('efectivo')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function cargar() {
    try {
      setCreditos(await api<Credito[]>(`/creditos?estado=${estado}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la cartera')
    }
  }

  useEffect(() => {
    void cargar()
  }, [estado])

  useEffect(() => {
    api<{ id?: string } | null>('/caja/turno-abierto')
      .then(t => setTurnoId(t?.id ?? null))
      .catch(() => setTurnoId(null))
  }, [])

  async function abonar(e: FormEvent, c: Credito) {
    e.preventDefault()
    const n = Number(monto.replace(',', '.'))
    if (!(n > 0)) return
    setGuardando(true)
    setError('')
    try {
      const r = await api<{ saldo: number }>(`/creditos/${c.id}/abonos`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ monto: n, medioPago: medio, ...(turnoId ? { cajaTurnoId: turnoId } : {}) }),
      })
      setMsg(`Abono de ${bs(n)} a ${c.clienta.nombre || c.clienta.email}. Saldo: ${bs(r.saldo)}.`)
      setAbriendo(null)
      setMonto('')
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se registró el abono')
    } finally {
      setGuardando(false)
    }
  }

  const total = (creditos ?? []).reduce((a, c) => a + c.saldo, 0)
  const vencido = (creditos ?? []).filter(c => c.diasMora > 0).reduce((a, c) => a + c.saldo, 0)

  return (
    <OpsPage eyebrow="Caja" title="Cuentas por cobrar" description="Ventas al crédito a 30 días, lo que ya abonaron y lo que falta cobrar.">
      <div className="admin-kpis admin-kpis--dense">
        <article className="admin-kpi"><span>Créditos listados</span><strong>{creditos?.length ?? '…'}</strong></article>
        <article className="admin-kpi"><span>Saldo por cobrar</span><strong>{bs(total)}</strong></article>
        <article className="admin-kpi"><span>Saldo vencido</span><strong>{bs(vencido)}</strong></article>
      </div>
      {msg ? <p className="ops-report-insight">{msg}</p> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}
      {!turnoId ? <p className="muted">Sin turno de caja abierto: los abonos se registran pero no suman al arqueo.</p> : null}

      <OpsPanel
        title="Cartera"
        actions={
          <select value={estado} onChange={e => setEstado(e.target.value as typeof estado)} aria-label="Estado">
            <option value="pendientes">Con saldo</option>
            <option value="pagados">Pagados</option>
            <option value="todos">Todos</option>
          </select>
        }
      >
        {!creditos ? (
          <OpsEmpty title="Cargando…" />
        ) : !creditos.length ? (
          <OpsEmpty title="No hay créditos en este filtro">Las ventas al crédito se hacen en el POS eligiendo la clienta y el medio “Crédito”.</OpsEmpty>
        ) : (
          <OpsTable minWidth={860}>
            <thead>
              <tr>
                <th>Clienta</th><th>Sucursal</th><th>Fecha</th><th>Vence</th>
                <th className="ri-num">Monto</th><th className="ri-num">Abonado</th><th className="ri-num">Saldo</th><th>Estado</th><th />
              </tr>
            </thead>
            <tbody>
              {creditos.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.clienta.nombre || c.clienta.email}</strong><br /><span className="muted">{c.clienta.email}</span></td>
                  <td>{c.sucursal}</td>
                  <td>{fecha(c.creadaEn)}</td>
                  <td>{fecha(c.venceEn)}</td>
                  <td className="ri-num">{bs(c.monto)}</td>
                  <td className="ri-num">{bs(c.pagado)}</td>
                  <td className="ri-num"><strong>{bs(c.saldo)}</strong></td>
                  <td>
                    {c.saldo === 0 ? <OpsStatus state="ok">Pagado</OpsStatus> : c.diasMora > 0 ? <OpsStatus state="warn">{c.diasMora} días de mora</OpsStatus> : <OpsStatus>Al día</OpsStatus>}
                  </td>
                  <td>
                    {c.saldo > 0 ? (
                      abriendo === c.id ? (
                        <form className="ri-form-acciones" onSubmit={e => void abonar(e, c)}>
                          <OpsField label="Monto">
                            <input value={monto} onChange={e => setMonto(e.target.value)} inputMode="decimal" autoFocus size={7} placeholder={c.saldo.toFixed(2)} />
                          </OpsField>
                          <OpsField label="Medio">
                            <select value={medio} onChange={e => setMedio(e.target.value)}>
                              <option value="efectivo">Efectivo</option>
                              <option value="qr">QR</option>
                              <option value="transferencia">Transferencia</option>
                              <option value="tarjeta">Tarjeta</option>
                            </select>
                          </OpsField>
                          <OpsBtn type="submit" disabled={guardando}>{guardando ? '…' : 'Registrar'}</OpsBtn>
                          <OpsBtn type="button" variant="text" onClick={() => setAbriendo(null)}>Cancelar</OpsBtn>
                        </form>
                      ) : (
                        <OpsBtn type="button" variant="secondary" onClick={() => { setAbriendo(c.id); setMonto('') }}>Abonar</OpsBtn>
                      )
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </OpsTable>
        )}
      </OpsPanel>
    </OpsPage>
  )
}
