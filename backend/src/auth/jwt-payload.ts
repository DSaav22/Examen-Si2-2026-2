import { Rol } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  email: string;
  rol: Rol;
};
