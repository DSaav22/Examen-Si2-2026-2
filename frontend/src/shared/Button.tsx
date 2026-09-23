import type { ButtonHTMLAttributes, ReactNode } from 'react'
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: 'primary' | 'secondary' | 'text' }
export function Button({ children, variant = 'primary', className = '', ...props }: Props) { return <button className={`ui-button ui-button--${variant} ${className}`} {...props}>{children}</button> }
