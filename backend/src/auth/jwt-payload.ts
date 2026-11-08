import { Rol } from '@prisma/client';

/** Sesión dentro de una tienda: `sub` es el Usuario (perfil) de esa tienda. */
export type JwtPayload = {
  tipo: 'tienda';
  sub: string;
  email: string;
  rol: Rol;
  tiendaId: string;
  cuentaId: string;
};

/** Sesión de plataforma: `sub` es la Cuenta global (alta de tiendas, métricas). */
export type CuentaPayload = {
  tipo: 'cuenta';
  sub: string;
  email: string;
  plataforma: boolean;
};
