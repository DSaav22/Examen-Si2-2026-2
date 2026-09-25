import type { Rol } from './types'



export type NavItem = { to: string; label: string; end?: boolean }

export type NavGrupo = { id: string; titulo: string; items: NavItem[] }



export function esClienta(rol: Rol | string | undefined) {

  return rol === 'CLIENTA'

}



export function esAdminNivel(rol: Rol | string | undefined) {

  return rol === 'ADMIN' || rol === 'SUPERADMIN'

}



export function esSuperadmin(rol: Rol | string | undefined) {

  return rol === 'SUPERADMIN'

}



export function esStaff(rol: Rol | string | undefined) {

  return (

    esAdminNivel(rol) ||

    rol === 'CAJERO' ||

    rol === 'ENCARGADO' ||

    rol === 'PROVEEDOR'

  )

}



export function puedeOperar(rol: Rol | string | undefined) {

  return esStaff(rol)

}



export function homePorRol(rol: Rol | string) {

  if (rol === 'CAJERO') return '/pos'

  if (rol === 'ENCARGADO') return '/encargado'

  if (rol === 'PROVEEDOR') return '/proveedor'

  if (esAdminNivel(rol)) return '/admin'

  return '/inicio'

}



function navGestionAdmin(incluirBitacora: boolean): NavGrupo {

  const items: NavItem[] = [

    { to: '/admin', label: 'Resumen', end: true },

    { to: '/admin/configuracion', label: 'Usuarios' },

    { to: '/admin/moderacion', label: 'Moderación' },

  ]

  if (incluirBitacora) {

    items.push({ to: '/admin/bitacora', label: 'Bitácora' })

  }

  items.push({ to: '/reportes', label: 'Reportes' })

  return { id: 'gestion', titulo: 'Gestión', items }

}



export function navGruposPorRol(rol: Rol | string): NavGrupo[] {

  if (rol === 'CAJERO') {

    return [

      {

        id: 'caja',

        titulo: 'Caja',

        items: [

          { to: '/pos', label: 'Punto de venta', end: true },

          { to: '/catalogo', label: 'Consultar catálogo' },

        ],

      },

      {

        id: 'cuenta',

        titulo: 'Sesión',

        items: [{ to: '/cuenta', label: 'Cuenta y clave' }],

      },

    ]

  }

  if (rol === 'ENCARGADO') {

    return [

      {

        id: 'sucursal',

        titulo: 'Sucursal',

        items: [

          { to: '/encargado', label: 'Inventario y reservas', end: true },

          { to: '/despacho', label: 'Despacho de pedidos' },

          { to: '/catalogo', label: 'Consultar catálogo' },

        ],

      },

      {

        id: 'cuenta',

        titulo: 'Sesión',

        items: [{ to: '/cuenta', label: 'Cuenta y clave' }],

      },

    ]

  }

  if (esAdminNivel(rol)) {

    return [

      navGestionAdmin(esSuperadmin(rol)),

      {

        id: 'ops',

        titulo: 'Operaciones',

        items: [

          { to: '/pos', label: 'Punto de venta' },

          { to: '/encargado', label: 'Inventario' },

          { to: '/despacho', label: 'Despacho' },

          { to: '/catalogo', label: 'Catálogo' },

        ],

      },

      {

        id: 'sistema',

        titulo: 'Sistema',

        items: [

          { to: '/base-datos', label: 'Base de datos' },

          { to: '/cuenta', label: 'Cuenta y clave' },

        ],

      },

    ]

  }

  if (rol === 'PROVEEDOR') {

    return [

      {

        id: 'portal',

        titulo: 'Proveedor',

        items: [

          { to: '/proveedor', label: 'Mis productos', end: true },

          { to: '/cuenta', label: 'Cuenta y clave' },

        ],

      },

    ]

  }

  return [

    {

      id: 'tienda',

      titulo: 'Tienda',

      items: [

        { to: '/inicio', label: 'Inicio', end: true },

        { to: '/catalogo', label: 'Catálogo' },

        { to: '/catalogo?coleccion=novedades', label: 'Novedades' },

        { to: '/catalogo?coleccion=ofertas', label: 'Ofertas' },

      ],

    },

  ]

}



export function navPorRol(rol: Rol | string): NavItem[] {

  return navGruposPorRol(rol).flatMap(grupo => grupo.items)

}



export function enlacesCuentaPorRol(rol: Rol | string): NavItem[] {

  if (esClienta(rol)) {

    return [

      { to: '/cuenta', label: 'Mi cuenta' },

      { to: '/favoritos', label: 'Mis favoritos' },

      { to: '/historial', label: 'Mis compras' },

      { to: '/reservas', label: 'Mis reservas' },

    ]

  }

  const hub = homePorRol(rol)

  const items: NavItem[] = [{ to: hub, label: 'Volver al centro' }, { to: '/cuenta', label: 'Cuenta y clave' }]

  if (esAdminNivel(rol)) {

    items.splice(1, 0, { to: '/admin/configuracion', label: 'Usuarios y catálogos' })

  }

  return items

}



export function etiquetaRol(rol: Rol | string) {

  const map: Record<string, string> = {

    CLIENTA: 'Clienta',

    CAJERO: 'Cajero',

    ENCARGADO: 'Encargado',

    ADMIN: 'Administrador',

    SUPERADMIN: 'Superusuario',

    PROVEEDOR: 'Proveedor',

  }

  return map[rol] ?? rol

}


