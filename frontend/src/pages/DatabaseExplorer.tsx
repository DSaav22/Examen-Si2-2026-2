import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

type Table = { nombre: string; dominio: string; estado: 'existente' | 'parcial' | 'conceptual' | 'propuesta' | 'descartada'; campos: string[]; relaciones: string[] }
export function DatabaseExplorer() {
  const { user } = useAuth(); const [tables, setTables] = useState<Table[]>([]); const [selected, setSelected] = useState<Table | null>(null); const [query, setQuery] = useState(''); const [domain, setDomain] = useState(''); const [error, setError] = useState('')
  useEffect(() => { api<Table[]>('/admin/esquema').then(setTables).catch(() => setError('No se pudo cargar el modelo.')) }, [])
  const domains = useMemo(() => Array.from(new Set(tables.map(table => table.dominio))), [tables])
  const filtered = tables.filter(table => (!domain || table.dominio === domain) && (!query || table.nombre.toLowerCase().includes(query.toLowerCase())))
  if (user?.rol !== 'ADMIN') return <Navigate to="/catalogo" replace />
  return <section className="database-explorer"><div className="page-head"><div><p className="eyebrow">Solo lectura</p><h1>Explorador de datos</h1><p>Modelo físico actual y extensiones conceptuales de Vesta.</p></div></div>{error ? <p className="error">{error}</p> : null}<div className="database-toolbar"><input aria-label="Buscar tablas" placeholder="Buscar tablas" value={query} onChange={event => setQuery(event.target.value)} /><select value={domain} onChange={event => setDomain(event.target.value)}><option value="">Todos los dominios</option>{domains.map(item => <option key={item}>{item}</option>)}</select></div><div className="database-layout"><nav className="database-tables" aria-label="Tablas del modelo">{filtered.map(table => <button type="button" className={selected?.nombre === table.nombre ? 'is-active' : ''} key={table.nombre} onClick={() => setSelected(table)}><span>{table.nombre}</span><small className={`schema-state schema-${table.estado}`}>{table.estado}</small></button>)}{!filtered.length ? <p className="muted">Sin tablas para estos filtros.</p> : null}</nav><article className="database-detail">{selected ? <><p className="eyebrow">{selected.dominio} · {selected.estado}</p><h2>{selected.nombre}</h2><h3>Campos y restricciones</h3><ul>{selected.campos.map(field => <li key={field}><code>{field}</code></li>)}</ul><h3>Relaciones</h3>{selected.relaciones.length ? <ul>{selected.relaciones.map(relation => <li key={relation}>{relation}</li>)}</ul> : <p className="muted">No se registraron relaciones en esta ficha.</p>}</> : <div className="catalog-state"><strong>Selecciona una tabla</strong><p>El explorador no muestra filas ni credenciales.</p></div>}</article></div></section>
}
