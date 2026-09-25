import type { ComponentProps, ReactNode } from 'react'
import { Button } from '../Button'

export function OpsPage({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="ops-page">
      <header className="ops-page-head">
        <div className="ops-page-copy">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        {actions ? <div className="ops-page-actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  )
}

export function OpsPanel({
  title,
  eyebrow,
  actions,
  children,
  className = '',
}: {
  title?: string
  eyebrow?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <article className={`ops-panel ${className}`.trim()}>
      {title || actions || eyebrow ? (
        <div className="ops-panel-head">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
          </div>
          {actions ? <div className="ops-panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="ops-panel-body">{children}</div>
    </article>
  )
}

export function OpsToolbar({ children }: { children: ReactNode }) {
  return <div className="ops-toolbar">{children}</div>
}

export function OpsField({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`ops-field ${className}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function OpsActions({ children }: { children: ReactNode }) {
  return <div className="ops-actions">{children}</div>
}

export function OpsTable({
  children,
  minWidth = 720,
  className = '',
}: {
  children: ReactNode
  minWidth?: number
  className?: string
}) {
  return (
    <div className={`ops-table-wrap ${className}`.trim()}>
      <table
        className="ops-data-table"
        style={minWidth > 0 ? { minWidth } : undefined}
      >
        {children}
      </table>
    </div>
  )
}

export function OpsEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="ops-empty" role="status">
      <strong>{title}</strong>
      {children ? <p className="muted">{children}</p> : null}
    </div>
  )
}

export function OpsStatus({ state, children }: { state?: 'ok' | 'warn' | 'muted'; children: ReactNode }) {
  return <span className={`ops-status-badge ops-status-badge--${state ?? 'muted'}`}>{children}</span>
}

export function OpsBtn(props: ComponentProps<typeof Button>) {
  return <Button {...props} className={`ops-btn ${props.className ?? ''}`.trim()} />
}
