import { useEffect, useState } from 'react'
import { api } from '../api'

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let aviso: EventoInstalar | null = null
const oyentes = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    aviso = e as EventoInstalar
    oyentes.forEach(fn => fn())
  })
  window.addEventListener('appinstalled', () => {
    aviso = null
    oyentes.forEach(fn => fn())
  })
}

export function instalada() {
  return window.matchMedia('(display-mode: standalone)').matches
}

/** El navegador ofrece instalar la PWA: devuelve la acción para mostrar el diálogo. */
export function useInstalar() {
  const [puede, setPuede] = useState(() => Boolean(aviso))
  useEffect(() => {
    const fn = () => setPuede(Boolean(aviso))
    oyentes.add(fn)
    return () => {
      oyentes.delete(fn)
    }
  }, [])
  async function instalar() {
    if (!aviso) return false
    await aviso.prompt()
    const { outcome } = await aviso.userChoice
    aviso = null
    setPuede(false)
    return outcome === 'accepted'
  }
  return { puede, instalar }
}

export type EstadoPush = 'no-soportado' | 'denegado' | 'activo' | 'inactivo'

function soportaPush() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!soportaPush()) return 'no-soportado'
  if (Notification.permission === 'denied') return 'denegado'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'activo' : 'inactivo'
}

function claveABytes(base64: string) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4)
  const bin = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

export async function activarPush() {
  if (!soportaPush()) throw new Error('Este navegador no admite notificaciones push.')
  const { activo, clavePublica } = await api<{ activo: boolean; clavePublica: string }>('/push/clave')
  if (!activo) throw new Error('El servidor no tiene configuradas las notificaciones push.')
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') throw new Error('No se dio permiso para mostrar notificaciones.')
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(clavePublica) }))
  const { endpoint, keys } = sub.toJSON()
  await api('/push/suscribir', { method: 'POST', body: JSON.stringify({ endpoint, keys }) })
  await api('/push/probar', { method: 'POST' })
}

export async function desactivarPush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await api('/push/desuscribir', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined)
  await sub.unsubscribe()
}
