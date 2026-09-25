import { useEffect, useRef, useState, type ReactNode } from 'react'

export function SearchField({
  value,
  onChange,
  placeholder = 'Buscar',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="search-field">
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  )
}

export function FilterChip({
  children,
  active = false,
  onClick,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className={`filter-chip${active ? ' is-active' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function DiscountBadge({ value }: { value: number }) {
  return <span className="discount-badge">-{value}%</span>
}

export function StockIndicator({ count }: { count: number }) {
  return (
    <span className={`stock-indicator ${count <= 2 ? 'is-low' : ''}`}>
      {count <= 2 ? 'Últimas unidades' : 'Disponible'} · {count}
    </span>
  )
}

/** Estado de red del navegador (online/offline). Se actualiza en vivo. */
export function ConnectionIndicator({ compact = false }: { compact?: boolean }) {
  const [online, setOnline] = useState(
    () => (typeof navigator !== 'undefined' ? navigator.onLine : true),
  )

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    setOnline(navigator.onLine)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const label = online ? 'Conectado' : 'Sin conexión'
  return (
    <span
      className={`connection-indicator ${online ? 'is-online' : 'is-offline'}${compact ? ' is-compact' : ''}`}
      role="status"
      title={
        online
          ? 'Tu navegador tiene conexión a internet'
          : 'Sin red: algunas acciones pueden fallar'
      }
    >
      {compact ? null : label}
      {compact ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {children ? <p className="muted">{children}</p> : null}
    </div>
  )
}

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (open) ref.current?.showModal()
    else ref.current?.close()
  }, [open])
  return (
    <dialog ref={ref} className="modal" onCancel={onClose}>
      <div className="modal-header">
        <h2>{title}</h2>
        <button type="button" className="theme-toggle" onClick={onClose} aria-label="Cerrar diálogo">
          Cerrar
        </button>
      </div>
      {children}
    </dialog>
  )
}

export function SidePanel({
  title,
  open,
  onClose,
  children,
  className = '',
}: {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <>
      <div
        className={`panel-backdrop${open ? ' is-open' : ''}`}
        onClick={onClose}
        hidden={!open}
      />
      <aside
        className={`side-panel${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
        hidden={!open}
        aria-hidden={!open}
      >
        <div className="modal-header">
          <h2 id={`panel-${title.replace(/\s+/g, '-').toLowerCase()}`}>{title}</h2>
          <button
            type="button"
            className="side-panel-close"
            onClick={onClose}
            aria-label={`Cerrar ${title}`}
          >
            ×
          </button>
        </div>
        {children}
      </aside>
    </>
  )
}

export function Confirmation({ children }: { children: ReactNode }) {
  return (
    <div className="confirmation" role="status">
      {children}
    </div>
  )
}
