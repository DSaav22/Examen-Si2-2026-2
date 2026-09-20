export type VentaCola = {
  uuid: string
  canal: 'pos'
  medioPago: 'efectivo' | 'qr'
  almacenId: string
  cajaTurnoId: string
  lineas: { varianteId: string; cantidad: number }[]
}

const CLAVE = 'ensayar_cola_pos'

export function leerCola(): VentaCola[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as VentaCola[]
  } catch {
    return []
  }
}

export function encolar(venta: VentaCola) {
  const cola = leerCola()
  cola.push(venta)
  localStorage.setItem(CLAVE, JSON.stringify(cola))
}

export function sacarDeCola(uuid: string) {
  localStorage.setItem(
    CLAVE,
    JSON.stringify(leerCola().filter((v) => v.uuid !== uuid)),
  )
}
