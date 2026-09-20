export type LineaTicket = {
  nombre: string
  detalle: string
  cantidad: number
  subtotal: number
}

export type TicketDatos = {
  id: string
  medio: string
  total: number
  lineas: LineaTicket[]
}

export function TicketPrint({ ticket }: { ticket: TicketDatos }) {
  return (
    <div className="ticket-print">
      <h3>EnsayAR</h3>
      <p>
        Comprobante {ticket.id.slice(0, 8)} · {ticket.medio}
      </p>
      <ul>
        {ticket.lineas.map((l, i) => (
          <li key={i}>
            {l.nombre} {l.detalle} × {l.cantidad} · Bs {l.subtotal.toFixed(2)}
          </li>
        ))}
      </ul>
      <p className="price">Total Bs {ticket.total.toFixed(2)}</p>
      <button type="button" className="ghost no-print" onClick={() => window.print()}>
        Imprimir / PDF
      </button>
    </div>
  )
}
