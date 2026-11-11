import { useEffect, useState } from 'react'
import { api } from '../api'
import { tiendaActiva } from '../tienda'
import { conCache } from '../offline/cache'
import { esFalloRed } from '../offline/red'
import { LogoPago } from './LogosPagos'

export type MetodoSimulado = { codigo: string; nombre: string; simulado: boolean }
export function medioDeMetodo(codigo: string): 'tarjeta' | 'transferencia' | 'qr' {
  return codigo === 'tarjeta' ? 'tarjeta' : codigo === 'transferencia' ? 'transferencia' : 'qr'
}

/** Icono / Logo oficial del método de pago */
export function IconoPagoSimulado({ codigo }: { codigo: string }) {
  return <LogoPago codigo={codigo} size={22} className="pago-logo-badge" />
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
  return <fieldset style={{ border: '1px solid var(--line, #e0d7d3)', borderRadius: 8, padding: '0.8rem' }}><legend style={{ padding: '0 6px', fontWeight: 600 }}>Método de pago {pais ? `(${pais})` : ''}</legend>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10, marginTop: 4 }}>
      {metodos.map(m => {
        const seleccionado = valor === m.codigo
        return (
          <button
            type="button"
            disabled={disabled}
            className={`ui-button ${seleccionado ? 'ui-button--primary' : 'ui-button--secondary'}`}
            key={m.codigo}
            aria-pressed={seleccionado}
            onClick={() => onChange(m.codigo)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              minHeight: 46,
              textAlign: 'left',
              justifyContent: 'flex-start',
              border: seleccionado ? '2px solid var(--accent, #74253a)' : undefined,
              boxShadow: seleccionado ? '0 2px 8px rgba(116, 37, 58, 0.25)' : undefined,
              borderRadius: 8,
              transition: 'all 0.2s ease',
              width: '100%',
            }}
          >
            <LogoPago codigo={m.codigo} size={28} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: '0.88rem', fontWeight: seleccionado ? 700 : 500 }}>{m.nombre}</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>Simulado</span>
            </div>
          </button>
        )
      })}
    </div><small style={{ display: 'block', marginTop: 8, color: 'var(--muted, #666)' }}>Modo demostración: no se descuenta dinero real.</small>
  </fieldset>
}
