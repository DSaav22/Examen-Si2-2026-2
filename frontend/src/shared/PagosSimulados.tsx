import { useEffect, useState } from 'react'
import { api } from '../api'
import { tiendaActiva } from '../tienda'
import { conCache } from '../offline/cache'
import { esFalloRed } from '../offline/red'

export type MetodoSimulado = { codigo: string; nombre: string; simulado: boolean }
export function medioDeMetodo(codigo: string): 'tarjeta' | 'transferencia' | 'qr' {
  return codigo === 'tarjeta' ? 'tarjeta' : codigo === 'transferencia' ? 'transferencia' : 'qr'
}

/** Icono geométrico y genérico para métodos simulados, sin marcas comerciales. */
export function IconoPagoSimulado({ codigo }: { codigo: string }) {
  const tarjeta = codigo === 'tarjeta'
  const qr = codigo === 'qr_bolivia' || codigo === 'pix' || codigo.startsWith('qr')
  const banco = codigo === 'transferencia' || codigo === 'pse' || codigo === 'spei' || codigo === 'banco_popular'
  return (
    <svg
      style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 6, flexShrink: 0 }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {tarjeta ? (
        <>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 9h20M5 15h4" />
        </>
      ) : qr ? (
        <>
          <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM20 15v3M15 21h3M21 21h.01" />
        </>
      ) : banco ? (
        <>
          <path d="M3 9l9-6 9 6M4 10h16M4 19h16M7 10v9M12 10v9M17 10v9" />
        </>
      ) : (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 9h18M15 14h3" />
        </>
      )}
    </svg>
  )
}

export function useMetodosPago() {
  const [datos, setDatos] = useState<{ pais: string; metodos: MetodoSimulado[] }>({ pais: '', metodos: [] })
  const [error, setError] = useState('')
  const tienda = tiendaActiva()
  useEffect(() => {
    let vigente = true
    setDatos({ pais: '', metodos: [] }); setError('')
    conCache('pagos-metodos', () => api<{ pais: string; metodos: MetodoSimulado[] }>('/pagos/metodos'))
      .then(r => { if (vigente) setDatos(r.datos) })
      .catch((err) => {
        if (vigente && !esFalloRed(err)) setError('No se pudieron cargar los métodos de pago. Reintentá recargando la página.')
      })
    return () => { vigente = false }
  }, [tienda])
  return { ...datos, error }
}
export function BotonesPago({ metodos, pais, valor, onChange, disabled = false }: { metodos: MetodoSimulado[]; pais: string; valor: string; onChange: (codigo: string) => void; disabled?: boolean }) {
  return <fieldset><legend>Pago simulado {pais ? `- ${pais}` : ''}</legend>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {metodos.map(m => (
        <button
          type="button"
          disabled={disabled}
          className="ui-button ui-button--secondary"
          key={m.codigo}
          aria-pressed={valor === m.codigo}
          onClick={() => onChange(m.codigo)}
          style={{ display: 'inline-flex', alignItems: 'center' }}
        >
          <IconoPagoSimulado codigo={m.codigo} />
          {valor === m.codigo ? 'Seleccionado: ' : ''}{m.nombre}
        </button>
      ))}
    </div><small>Demostración: no se cobra dinero real.</small>
  </fieldset>
}
