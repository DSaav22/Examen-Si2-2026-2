import { useState } from 'react'
import { useTiendaPublica } from './SelectorTienda'

/** Identidad de la tienda tanto en la vitrina como en el panel de operaciones. */
export function MarcaTienda() {
  const tienda = useTiendaPublica()
  const [fallido, setFallido] = useState<string | null>(null)
  const nombre = tienda?.nombre ?? 'EnsayAR'
  return tienda?.logo && fallido !== tienda.logo
    ? <img src={tienda.logo} alt={nombre} onError={() => setFallido(tienda.logo ?? null)} style={{ display: 'block', objectFit: 'contain', maxWidth: 'min(190px, 38vw)', height: 48 }} />
    : <span style={{ overflowWrap: 'anywhere' }}>{nombre}</span>
}
