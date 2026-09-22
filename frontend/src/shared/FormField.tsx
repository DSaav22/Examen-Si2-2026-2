import type { InputHTMLAttributes } from 'react'
type Props = InputHTMLAttributes<HTMLInputElement> & { label: string }
export function FormField({ label, id, ...props }: Props) { const inputId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`; return <label className="form-field" htmlFor={inputId}><span>{label}</span><input id={inputId} {...props} /></label> }
