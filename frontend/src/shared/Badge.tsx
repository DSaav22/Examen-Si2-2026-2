import type { ReactNode } from 'react'
export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'success' | 'warning' | 'error' }) { return <span className={`badge badge--${tone}`}>{children}</span> }
