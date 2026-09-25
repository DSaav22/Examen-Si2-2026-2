import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { esSuperadmin, homePorRol } from '../roles'
import { OpsActions, OpsBtn, OpsEmpty, OpsField, OpsPage, OpsPanel, OpsStatus } from '../shared/ops/OpsUi'

type Table = {
  nombre: string
  dominio: string
  estado: 'existente' | 'parcial' | 'conceptual' | 'propuesta' | 'descartada'
  campos: string[]
  relaciones: string[]
}

const estadoTone: Record<Table['estado'], 'ok' | 'warn' | 'muted'> = {
  existente: 'ok',
  parcial: 'warn',
  conceptual: 'muted',
  propuesta: 'muted',
  descartada: 'muted',
}

const estadoLabel: Record<Table['estado'], string> = {
  existente: 'En producción',
  parcial: 'Parcial',
  conceptual: 'Conceptual',
  propuesta: 'Propuesta',
  descartada: 'Descartada',
}

/** Atajos útiles según la tabla seleccionada */
const flujosPorTabla: Record<string, { to: string; label: string }[]> = {
  usuarios: [
    { to: '/admin/configuracion', label: 'Usuarios' },
    { to: '/cuenta', label: 'Cuenta' },
  ],
  productos: [
    { to: '/catalogo', label: 'Catálogo' },
    { to: '/encargado', label: 'Inventario' },
  ],
  variantes: [
    { to: '/catalogo', label: 'Catálogo' },
    { to: '/pos', label: 'POS' },
  ],
  stock_almacen: [
    { to: '/encargado', label: 'Inventario' },
    { to: '/pos', label: 'POS' },
  ],
  movimientos_inventario: [{ to: '/encargado', label: 'Inventario' }],
  ventas: [
    { to: '/pos', label: 'POS' },
    { to: '/reportes', label: 'Reportes' },
  ],
  lineas_venta: [{ to: '/pos', label: 'POS' }],
  reservas: [{ to: '/encargado', label: 'Inventario' }],
  pedidos: [{ to: '/despacho', label: 'Despacho' }],
  caja_turnos: [{ to: '/pos', label: 'POS' }],
  reportes_ejecuciones: [{ to: '/reportes', label: 'Reportes' }],
  audit_logs: [{ to: '/admin/bitacora', label: 'Bitácora' }],
  reviews: [{ to: '/admin/moderacion', label: 'Moderación' }],
  sucursales: [{ to: '/admin/configuracion', label: 'Configuración' }],
  almacenes: [{ to: '/encargado', label: 'Inventario' }],
  proveedores: [{ to: '/proveedor', label: 'Portal proveedor' }],
}

function parseCampo(raw: string) {
  const flags: string[] = []
  let name = raw
  for (const flag of ['PK/FK', 'UNIQUE/FK', 'PK', 'FK', 'UNIQUE'] as const) {
    if (name.includes(flag)) {
      flags.push(flag)
      name = name.replace(flag, '').trim()
    }
  }
  return { name: name.replace(/\s+/g, ' ').trim() || raw, flags, raw }
}

function tableFromFk(fk: string, tables: Table[]) {
  // e.g. "sucursal_id FK" → try "sucursales"
  const base = fk.replace(/\s*(PK\/FK|UNIQUE\/FK|PK|FK|UNIQUE)\s*/gi, '').replace(/_id$/i, '').trim()
  if (!base) return null
  const plural = `${base}s`
  const candidates = [plural, base, `${base}es`, base.replace(/y$/, 'ies')]
  return tables.find(t => candidates.includes(t.nombre)) ?? null
}

export function DatabaseExplorer() {
  const { user } = useAuth()
  const [tables, setTables] = useState<Table[]>([])
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [domain, setDomain] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<Table['estado'] | ''>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  function cargar() {
    setLoading(true)
    setError('')
    return api<Table[]>('/admin/esquema')
      .then(data => {
        setTables(data)
        setSelectedName(current => {
          if (current && data.some(t => t.nombre === current)) return current
          return data[0]?.nombre ?? null
        })
      })
      .catch(() => setError('No se pudo cargar el modelo.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    void cargar()
  }, [])

  const domains = useMemo(() => Array.from(new Set(tables.map(t => t.dominio))), [tables])

  const stats = useMemo(() => {
    const byEstado = {
      existente: 0,
      parcial: 0,
      conceptual: 0,
      propuesta: 0,
      descartada: 0,
    }
    for (const t of tables) byEstado[t.estado] += 1
    return { total: tables.length, ...byEstado, dominios: domains.length }
  }, [tables, domains])

  const filtered = useMemo(
    () =>
      tables.filter(
        table =>
          (!domain || table.dominio === domain) &&
          (!estadoFilter || table.estado === estadoFilter) &&
          (!query || table.nombre.toLowerCase().includes(query.toLowerCase())),
      ),
    [tables, domain, estadoFilter, query],
  )

  const selected = useMemo(
    () => tables.find(t => t.nombre === selectedName) ?? filtered[0] ?? null,
    [tables, selectedName, filtered],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, Table[]>()
    for (const t of filtered) {
      const list = map.get(t.dominio) ?? []
      list.push(t)
      map.set(t.dominio, list)
    }
    return Array.from(map.entries())
  }, [filtered])

  const flujos = selected ? flujosPorTabla[selected.nombre] ?? [] : []

  if (!user || !['ADMIN', 'SUPERADMIN'].includes(user.rol)) {
    return <Navigate to={user ? homePorRol(user.rol) : '/login'} replace />
  }

  return (
    <OpsPage
      eyebrow="Sistema · solo lectura"
      title="Base de datos"
      description="Mapa del esquema: tablas, campos y FKs. No expone filas ni credenciales."
      actions={
        <OpsActions>
          <Link className="ops-text-link" to="/admin">
            Resumen
          </Link>
          {esSuperadmin(user.rol) ? (
            <Link className="ops-text-link" to="/admin/bitacora">
              Bitácora
            </Link>
          ) : null}
          <Link className="ops-text-link" to="/reportes">
            Reportes
          </Link>
          <OpsBtn type="button" variant="secondary" onClick={() => void cargar()}>
            Actualizar
          </OpsBtn>
        </OpsActions>
      }
    >
      {error ? <p className="error">{error}</p> : null}

      <div className="despacho-stats db-stats">
        <article className="despacho-stat">
          <p className="eyebrow">Tablas</p>
          <strong>{loading ? '…' : stats.total}</strong>
          <span className="muted">{stats.dominios} dominios</span>
        </article>
        <article className="despacho-stat">
          <p className="eyebrow">Existentes</p>
          <strong>{stats.existente}</strong>
          <span className="muted">en producción</span>
        </article>
        <article className="despacho-stat">
          <p className="eyebrow">En diseño</p>
          <strong>{stats.conceptual + stats.propuesta}</strong>
          <span className="muted">
            {stats.conceptual} conceptual · {stats.propuesta} propuesta
          </span>
        </article>
      </div>

      <OpsPanel title="Explorar esquema" eyebrow={`${filtered.length} / ${tables.length} tablas`}>
        <div className="db-toolbar">
          <OpsField label="Buscar" className="db-search">
            <input
              aria-label="Buscar tablas"
              placeholder="usuarios, ventas, stock…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </OpsField>
          <OpsField label="Dominio">
            <select value={domain} onChange={e => setDomain(e.target.value)}>
              <option value="">Todos</option>
              {domains.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </OpsField>
          <OpsField label="Estado">
            <select
              value={estadoFilter}
              onChange={e => setEstadoFilter(e.target.value as Table['estado'] | '')}
            >
              <option value="">Todos</option>
              <option value="existente">Existente</option>
              <option value="parcial">Parcial</option>
              <option value="conceptual">Conceptual</option>
              <option value="propuesta">Propuesta</option>
            </select>
          </OpsField>
          {(query || domain || estadoFilter) && (
            <OpsBtn
              type="button"
              variant="secondary"
              onClick={() => {
                setQuery('')
                setDomain('')
                setEstadoFilter('')
              }}
            >
              Limpiar
            </OpsBtn>
          )}
        </div>

        <div className="db-domain-chips" role="list" aria-label="Dominios">
          <button
            type="button"
            className={!domain ? 'is-active' : ''}
            onClick={() => setDomain('')}
          >
            Todos
          </button>
          {domains.map(d => (
            <button
              key={d}
              type="button"
              className={domain === d ? 'is-active' : ''}
              onClick={() => setDomain(domain === d ? '' : d)}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="database-layout db-layout">
          <nav className="database-tables db-tables" aria-label="Tablas del modelo">
            {loading ? (
              <p className="muted db-loading">Cargando esquema…</p>
            ) : !filtered.length ? (
              <OpsEmpty title="Sin tablas">Probá otro filtro o dominio.</OpsEmpty>
            ) : (
              grouped.map(([dom, items]) => (
                <div key={dom} className="db-group">
                  <p className="db-group-title">{dom}</p>
                  {items.map(table => (
                    <button
                      type="button"
                      className={`ops-list-item${selected?.nombre === table.nombre ? ' is-active' : ''}`}
                      key={table.nombre}
                      onClick={() => setSelectedName(table.nombre)}
                    >
                      <span>{table.nombre}</span>
                      <OpsStatus state={estadoTone[table.estado]}>{table.estado}</OpsStatus>
                    </button>
                  ))}
                </div>
              ))
            )}
          </nav>

          <article className="database-detail db-detail">
            {selected ? (
              <>
                <header className="db-detail-head">
                  <div>
                    <p className="eyebrow">{selected.dominio}</p>
                    <h2>{selected.nombre}</h2>
                  </div>
                  <OpsStatus state={estadoTone[selected.estado]}>
                    {estadoLabel[selected.estado]}
                  </OpsStatus>
                </header>

                {flujos.length ? (
                  <div className="db-flows">
                    <p className="eyebrow">Flujos en la app</p>
                    <div className="db-flow-links">
                      {flujos.map(f => (
                        <Link key={f.to} className="ops-text-link" to={f.to}>
                          {f.label} →
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                <section className="db-section">
                  <h3>Campos · {selected.campos.length}</h3>
                  <ul className="db-fields">
                    {selected.campos.map(field => {
                      const parsed = parseCampo(field)
                      return (
                        <li key={field}>
                          <code>{parsed.name}</code>
                          <span className="db-flags">
                            {parsed.flags.map(f => (
                              <span
                                key={f}
                                className={`db-flag db-flag--${f.toLowerCase().replace('/', '-')}`}
                              >
                                {f}
                              </span>
                            ))}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </section>

                <section className="db-section">
                  <h3>Relaciones · {selected.relaciones.length}</h3>
                  {selected.relaciones.length ? (
                    <ul className="db-relations">
                      {selected.relaciones.map(relation => {
                        const target = tableFromFk(relation, tables)
                        return (
                          <li key={relation}>
                            <code>{relation}</code>
                            {target ? (
                              <button
                                type="button"
                                className="ops-text-link"
                                onClick={() => setSelectedName(target.nombre)}
                              >
                                Ver {target.nombre}
                              </button>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="muted">Sin FKs registradas en este mapa.</p>
                  )}
                </section>

                <p className="db-note muted">
                  Vista de documentación del modelo. Para filas reales usá Reportes o los módulos
                  operativos.
                </p>
              </>
            ) : (
              <OpsEmpty title="Selecciona una tabla">El detalle aparece aquí a la derecha.</OpsEmpty>
            )}
          </article>
        </div>
      </OpsPanel>
    </OpsPage>
  )
}
