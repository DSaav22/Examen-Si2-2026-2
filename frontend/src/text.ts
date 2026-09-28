/** Formatea valores de catálogo almacenados como identificadores minúsculos, sin cambiar su valor real. */
export function catalogLabel(value: string | null | undefined) {
  const text = value?.trim().replace(/[-_]+/g, ' ') ?? ''
  if (!text) return ''
  const accents: Record<string, string> = {
    algodon: 'algodón',
    basicos: 'básicos',
    otono: 'otoño',
    poliester: 'poliéster',
    sastreria: 'sastrería',
    sueteres: 'suéteres',
  }
  const normalized = text
    .toLocaleLowerCase('es-BO')
    .split(/\s+/)
    .map(word => accents[word] ?? word)
    .join(' ')
  return normalized.charAt(0).toLocaleUpperCase('es-BO') + normalized.slice(1)
}
