import type { HTMLAttributes, ReactNode } from 'react'
export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) { return <div className={`ui-card ${className}`} {...props}>{children}</div> }
