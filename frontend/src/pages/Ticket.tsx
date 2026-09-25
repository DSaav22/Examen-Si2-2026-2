import { useEffect, useState } from 'react'

export type LineaTicket = {
  nombre: string
  detalle: string
  cantidad: number
  subtotal: number
  precioUnitario?: number
}

export const NIT_PRUEBA = '990000000'

export type TicketDatos = {
  id: string
  medio: string
  total: number
  lineas: LineaTicket[]
  nit?: string
  fecha?: string
  clientaNombre?: string
  clientaEmail?: string
  sucursalNombre?: string
  canal?: string
}

const FACTURA_PRINT_CSS = `
  @page { margin: 14mm; size: A4; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    color: #1a1512;
    background: #fff;
    font-size: 11pt;
    line-height: 1.4;
  }
  .factura {
    max-width: 190mm;
    margin: 0 auto;
  }
  .factura-top {
    display: flex;
    justify-content: space-between;
    gap: 1.5rem;
    align-items: flex-start;
    border-bottom: 2px solid #1a1512;
    padding-bottom: 0.85rem;
    margin-bottom: 1rem;
  }
  .factura-brand { font-size: 22pt; font-weight: 750; letter-spacing: -0.03em; margin: 0; }
  .factura-sub { margin: 0.2rem 0 0; font-size: 9pt; color: #5a524c; }
  .factura-meta { text-align: right; font-size: 9.5pt; }
  .factura-meta strong { display: block; font-size: 13pt; margin-bottom: 0.25rem; }
  .factura-badge {
    display: inline-block;
    border: 1px solid #1a1512;
    padding: 0.15rem 0.45rem;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 0.35rem;
  }
  .factura-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.1rem;
    font-size: 9.5pt;
  }
  .factura-box {
    border: 1px solid #d8d0c8;
    border-radius: 6px;
    padding: 0.65rem 0.75rem;
  }
  .factura-box h4 {
    margin: 0 0 0.35rem;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #7a716a;
    font-weight: 650;
  }
  .factura-box p { margin: 0.15rem 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.4rem 0 1rem;
    font-size: 9.5pt;
  }
  th {
    text-align: left;
    border-bottom: 1.5px solid #1a1512;
    padding: 0.45rem 0.35rem;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #5a524c;
  }
  td {
    padding: 0.5rem 0.35rem;
    border-bottom: 1px solid #e8e1da;
    vertical-align: top;
  }
  th.num, td.num { text-align: right; white-space: nowrap; }
  th.qty, td.qty { text-align: center; width: 3.2rem; }
  .factura-totales {
    margin-left: auto;
    width: min(100%, 240px);
    font-size: 10pt;
  }
  .factura-totales .row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.25rem 0;
  }
  .factura-totales .total {
    border-top: 2px solid #1a1512;
    margin-top: 0.35rem;
    padding-top: 0.45rem;
    font-size: 13pt;
    font-weight: 750;
  }
  .factura-foot {
    margin-top: 1.4rem;
    padding-top: 0.75rem;
    border-top: 1px dashed #cfc6bd;
    font-size: 8.5pt;
    color: #6a625c;
  }
  .no-print { display: none !important; }
`

function medioLabel(medio: string) {
  const map: Record<string, string> = {
    efectivo: 'Efectivo',
    qr: 'QR',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    mixto: 'Mixto',
    contra_entrega: 'Contra entrega',
  }
  return map[medio] ?? medio
}

function numeroFactura(id: string) {
  return `F-${id.replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

function imprimirFactura(root: HTMLElement) {
  const clone = root.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.no-print').forEach(el => el.remove())
  const titulo = clone.querySelector('[data-factura-n]')?.textContent ?? 'EnsayAR'
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Factura ${titulo}</title><style>${FACTURA_PRINT_CSS}</style></head><body>${clone.outerHTML}</body></html>`

  // iframe oculto: evita la pestaña about:blank y no imprime el POS
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.setAttribute('title', 'Impresión de factura')
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    window.print()
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => {
    iframe.remove()
  }

  const run = () => {
    win.addEventListener('afterprint', cleanup, { once: true })
    win.focus()
    win.print()
    // por si el navegador no dispara afterprint (p. ej. cancelar)
    window.setTimeout(cleanup, 1500)
  }

  if (doc.readyState === 'complete') window.setTimeout(run, 50)
  else iframe.addEventListener('load', () => window.setTimeout(run, 50), { once: true })
}

export function TicketPrint({
  ticket,
  onEnviarCorreo,
  enviandoCorreo,
  correoMsg,
}: {
  ticket: TicketDatos
  onEnviarCorreo?: (email: string) => void
  enviandoCorreo?: boolean
  correoMsg?: string
}) {
  const fecha = ticket.fecha ?? new Date().toLocaleString('es-BO')
  const nro = numeroFactura(ticket.id)
  const [emailDestino, setEmailDestino] = useState(ticket.clientaEmail ?? '')
  const lineas = ticket.lineas.map(l => ({
    ...l,
    precioUnitario: l.precioUnitario ?? (l.cantidad > 0 ? l.subtotal / l.cantidad : l.subtotal),
  }))
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDestino.trim())

  useEffect(() => {
    setEmailDestino(ticket.clientaEmail ?? '')
  }, [ticket.id, ticket.clientaEmail])

  return (
    <div className="ticket-print factura" data-print-root>
      <div className="factura-top">
        <div>
          <p className="factura-brand">EnsayAR</p>
          <p className="factura-sub">Tienda de moda · Bolivia</p>
          <p className="factura-sub">NIT {ticket.nit ?? NIT_PRUEBA}</p>
          <p className="factura-sub">{ticket.sucursalNombre ?? 'Sucursal de demostración'}</p>
        </div>
        <div className="factura-meta">
          <strong data-factura-n>{nro}</strong>
          <span>{fecha}</span>
          <div className="factura-badge">Factura simulada</div>
        </div>
      </div>

      <div className="factura-grid">
        <div className="factura-box">
          <h4>Cliente</h4>
          <p>
            <strong>{ticket.clientaNombre ?? 'Consumidor final'}</strong>
          </p>
          {ticket.clientaEmail ? <p>{ticket.clientaEmail}</p> : <p className="muted">Sin correo en la venta</p>}
        </div>
        <div className="factura-box">
          <h4>Detalle de cobro</h4>
          <p>Medio: {medioLabel(ticket.medio)}</p>
          <p>Canal: {(ticket.canal ?? 'pos').toUpperCase()}</p>
          <p>Ref. {ticket.id.slice(0, 8)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Descripción</th>
            <th className="qty">Cant.</th>
            <th className="num">P. unit.</th>
            <th className="num">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>
                <strong>{l.nombre}</strong>
                {l.detalle ? <span className="factura-detalle"> · {l.detalle}</span> : null}
              </td>
              <td className="qty">{l.cantidad}</td>
              <td className="num">Bs {l.precioUnitario.toFixed(2)}</td>
              <td className="num">Bs {l.subtotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="factura-totales">
        <div className="row">
          <span>Subtotal</span>
          <span>Bs {ticket.total.toFixed(2)}</span>
        </div>
        <div className="row">
          <span>IVA / fiscal</span>
          <span>No aplica (demo)</span>
        </div>
        <div className="row total">
          <span>Total</span>
          <span>Bs {ticket.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="factura-foot">
        <p>
          Documento de demostración académica. Sin validez tributaria ni envío a servicio fiscal.
          EnsayAR · comprobante interno {nro}.
        </p>
      </div>

      <div className="factura-actions no-print">
        <button
          type="button"
          className="ghost"
          onClick={e => {
            const root = (e.currentTarget.closest('[data-print-root]') as HTMLElement) ?? undefined
            if (root) imprimirFactura(root)
          }}
        >
          Imprimir / PDF
        </button>
        {onEnviarCorreo ? (
          <div className="factura-mail">
            <label className="factura-mail-field">
              <span>Correo destino</span>
              <input
                type="email"
                value={emailDestino}
                onChange={e => setEmailDestino(e.target.value)}
                placeholder="clienta@ensayar.bo"
                autoComplete="email"
              />
            </label>
            <button
              type="button"
              className="ghost"
              disabled={enviandoCorreo || !emailOk}
              onClick={() => onEnviarCorreo(emailDestino.trim())}
            >
              {enviandoCorreo ? 'Enviando…' : 'Enviar al correo'}
            </button>
          </div>
        ) : null}
      </div>
      {correoMsg ? <p className={`no-print ${correoMsg.startsWith('No') || correoMsg.startsWith('Elegí') || correoMsg.startsWith('Indicá') ? 'error' : 'ok'}`}>{correoMsg}</p> : null}
    </div>
  )
}
