import { PrismaClient } from '@prisma/client';

/**
 * Token de inyección y tipo del cliente Prisma.
 * La instancia real es un PrismaClient con la extensión de tenancy (ver PrismaModule).
 */
export class PrismaService extends PrismaClient {}
