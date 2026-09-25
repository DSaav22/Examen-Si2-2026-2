import { Rol } from '@prisma/client';

/** Administrador operativo o superusuario (misma capacidad de gestión, distinta bitácora). */
export function esAdminNivel(rol: Rol | string | undefined): boolean {
  return rol === Rol.ADMIN || rol === Rol.SUPERADMIN;
}

export function esSuperadmin(rol: Rol | string | undefined): boolean {
  return rol === Rol.SUPERADMIN;
}
