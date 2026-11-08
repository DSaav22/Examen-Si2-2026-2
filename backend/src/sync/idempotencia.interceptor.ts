import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
  SetMetadata,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import { from, mergeMap, Observable, of, throwError, catchError } from 'rxjs';
import type { JwtPayload } from '../auth/jwt-payload';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';

const IDEMPOTENTE = 'idempotente';

/**
 * Marca un endpoint que acepta la cabecera `Idempotency-Key`: si el cliente repite la
 * petición (doble clic, reintento tras corte de red) recibe la misma respuesta y la
 * operación se ejecuta una sola vez.
 */
export const Idempotente = () => SetMetadata(IDEMPOTENTE, true);

const ESPERA_MS = 200;
const INTENTOS_ESPERA = 25;
/** Una reserva `en_curso` más vieja que esto quedó huérfana (proceso caído). */
const HUERFANA_MS = 60_000;

type Guardada = { status: number; body: unknown };

export function huella(valor: unknown) {
  return createHash('sha256').update(JSON.stringify(valor ?? null)).digest('hex');
}

function aJson(valor: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(valor ?? null)) as Prisma.InputJsonValue;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class IdempotenciaInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (!this.reflector.get<boolean>(IDEMPOTENTE, ctx.getHandler())) return next.handle();
    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const clave = req.header('idempotency-key')?.trim();
    const tiendaId = TenantContext.tiendaId();
    if (!clave || !tiendaId) return next.handle();
    if (clave.length > 200) throw new BadRequestException({ codigo: 'IDEMPOTENCY_KEY_INVALIDA' });

    const usuarioId = req.user?.sub ?? null;
    const operationId = `http:${usuarioId ?? 'anon'}:${clave}`;
    const hash = huella({
      metodo: req.method,
      ruta: (req.route as { path?: string } | undefined)?.path ?? req.path,
      params: req.params,
      body: req.body as unknown,
    });

    const previa = await this.reservar(operationId, hash, usuarioId, req);
    if (previa) {
      res.setHeader('Idempotent-Replayed', 'true');
      if (previa.status >= 400) throw new HttpException(previa.body as object, previa.status);
      res.status(previa.status);
      return of(previa.body);
    }

    const status =
      this.reflector.get<number>(HTTP_CODE_METADATA, ctx.getHandler()) ?? (req.method === 'POST' ? 201 : 200);
    const enTienda = <T>(fn: () => Promise<T>) => TenantContext.enTienda(tiendaId, fn);

    return next.handle().pipe(
      mergeMap((body) =>
        from(
          enTienda(() =>
            this.prisma.operacionSync.update({
              where: { tiendaId_operationId: { tiendaId, operationId } },
              data: { estado: 'aplicada', resultado: aJson({ status, body }) },
            }),
          ).then(() => body),
        ),
      ),
      catchError((err: unknown) => {
        const http = err instanceof HttpException ? err : null;
        const cliente = http && http.getStatus() >= 400 && http.getStatus() < 500;
        // Un 4xx es una respuesta definitiva (se repite igual); un 5xx o fallo se puede reintentar.
        const registro = cliente
          ? enTienda(() =>
              this.prisma.operacionSync.update({
                where: { tiendaId_operationId: { tiendaId, operationId } },
                data: {
                  estado: 'rechazada',
                  resultado: aJson({ status: http.getStatus(), body: http.getResponse() }),
                },
              }),
            )
          : enTienda(() => this.prisma.operacionSync.deleteMany({ where: { operationId } }));
        return from(registro.catch(() => null)).pipe(mergeMap(() => throwError(() => err)));
      }),
    );
  }

  /** Reserva la clave. Si ya existía, espera a que termine y devuelve la respuesta guardada. */
  private async reservar(
    operationId: string,
    hash: string,
    usuarioId: string | null,
    req: Request,
  ): Promise<Guardada | null> {
    for (let intento = 0; intento <= INTENTOS_ESPERA; intento++) {
      try {
        await this.prisma.operacionSync.create({
          data: {
            operationId,
            dispositivoId: req.header('x-dispositivo')?.slice(0, 100) || 'http',
            usuarioId,
            tipo: 'http',
            hash,
            payload: aJson({ metodo: req.method, ruta: req.originalUrl }),
          },
        });
        return null;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      }
      const fila = await this.prisma.operacionSync.findFirst({ where: { operationId } });
      if (!fila) continue;
      if (fila.hash !== hash) {
        throw new UnprocessableEntityException({
          codigo: 'IDEMPOTENCIA_CONFLICTO',
          message: 'Esa clave de idempotencia ya se usó con otro contenido.',
        });
      }
      if (fila.estado !== 'en_curso') return fila.resultado as Guardada;
      if (Date.now() - fila.actualizadoEn.getTime() > HUERFANA_MS) {
        await this.prisma.operacionSync.deleteMany({ where: { id: fila.id, estado: 'en_curso' } });
        continue;
      }
      await dormir(ESPERA_MS);
    }
    throw new ConflictException({
      codigo: 'OPERACION_EN_CURSO',
      message: 'La misma operación todavía se está procesando. Reintentá en unos segundos.',
    });
  }
}
