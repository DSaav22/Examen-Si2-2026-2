import { io, type Socket } from 'socket.io-client'

type NotifPush = {
  id: string
  tipo: string
  titulo: string
  cuerpo: string
  enlace: string
  leida: boolean
  creadaEn: string
  usuarioId?: string
}

type Handlers = {
  onNotificacion?: (n: NotifPush) => void
  onConteo?: (count: number) => void
  onEstado?: (conectado: boolean) => void
}

let socket: Socket | null = null

function wsBase(): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined
  if (explicit) return explicit
  // En dev el proxy de Vite reenvía /socket.io → backend
  return window.location.origin
}

export function conectarNotificaciones(token: string, handlers: Handlers): () => void {
  desconectarNotificaciones()

  socket = io(`${wsBase()}/notificaciones`, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1200,
  })

  socket.on('connect', () => handlers.onEstado?.(true))
  socket.on('disconnect', () => handlers.onEstado?.(false))
  socket.on('conectado', () => handlers.onEstado?.(true))
  socket.on('notificacion', (n: NotifPush) => handlers.onNotificacion?.(n))
  socket.on('conteo', (p: { count: number }) => handlers.onConteo?.(p.count))
  socket.on('error_auth', () => {
    handlers.onEstado?.(false)
    desconectarNotificaciones()
  })

  return () => desconectarNotificaciones()
}

export function desconectarNotificaciones() {
  if (!socket) return
  socket.removeAllListeners()
  socket.disconnect()
  socket = null
}
