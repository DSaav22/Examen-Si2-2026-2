import { useEffect, useState } from 'react'
import { api, tiendaActiva } from './api'
export type MetodoPago = { codigo: string; nombre: string }
export function medioDeMetodo(codigo: string): 'qr' | 'tarjeta' | 'transferencia' {
  return codigo === 'tarjeta' ? 'tarjeta' : codigo === 'transferencia' ? 'transferencia' : 'qr'
}
export function useMetodosPago(token: string | null) {
  const [metodos, setMetodos] = useState<MetodoPago[]>([])
  const [error, setError] = useState('')
  const tienda = tiendaActiva()
  useEffect(() => {
    let vigente = true
    setMetodos([]); setError('')
    if (token) api<{ metodos: MetodoPago[] }>('/pagos/metodos', token)
      .then(r => { if (vigente) setMetodos(r.metodos) })
      .catch(() => { if (vigente) setError('No se pudieron cargar los métodos de pago.') })
    return () => { vigente = false }
  }, [token, tienda])
  return { metodos, error }
}
