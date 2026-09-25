import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TokenService } from '../auth/token.service';

export type NotificacionPush = {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  enlace: string;
  leida: boolean;
  creadaEn: Date | string;
  usuarioId: string;
};

@WebSocketGateway({
  namespace: '/notificaciones',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificacionesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly log = new Logger(NotificacionesGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly tokens: TokenService) {}

  private room(userId: string) {
    return `user:${userId}`;
  }

  async handleConnection(client: Socket) {
    try {
      const raw =
        (client.handshake.auth?.token as string | undefined) ||
        (typeof client.handshake.headers.authorization === 'string'
          ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
          : undefined);
      if (!raw) {
        client.emit('error_auth', { codigo: 'TOKEN_NO' });
        client.disconnect(true);
        return;
      }
      if (await this.tokens.isRevoked(raw)) {
        client.emit('error_auth', { codigo: 'TOKEN_REVOCADO' });
        client.disconnect(true);
        return;
      }
      const payload = this.tokens.verify(raw);
      client.data.userId = payload.sub;
      await client.join(this.room(payload.sub));
      client.emit('conectado', { ok: true, usuarioId: payload.sub });
      this.log.debug(`WS notif conectado ${payload.sub.slice(0, 8)}`);
    } catch {
      client.emit('error_auth', { codigo: 'TOKEN_INVALIDO' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const uid = client.data?.userId as string | undefined;
    if (uid) this.log.debug(`WS notif desconectado ${uid.slice(0, 8)}`);
  }

  @SubscribeMessage('ping')
  ping(@ConnectedSocket() client: Socket, @MessageBody() _body?: unknown) {
    return { event: 'pong', data: { t: Date.now(), usuarioId: client.data?.userId } };
  }

  emitNueva(usuarioId: string, notificacion: NotificacionPush) {
    this.server.to(this.room(usuarioId)).emit('notificacion', notificacion);
  }

  emitConteo(usuarioId: string, count: number) {
    this.server.to(this.room(usuarioId)).emit('conteo', { count });
  }
}
