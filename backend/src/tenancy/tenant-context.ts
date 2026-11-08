import { AsyncLocalStorage } from 'async_hooks';

/** Estado de tenancy de la petición en curso. */
export type TenantStore = {
  tiendaId?: string;
  /** Solo código de plataforma (alta de tiendas, métricas, login de cuenta). */
  sinFiltro?: boolean;
};

const als = new AsyncLocalStorage<TenantStore>();

export const TIENDA_VESTA_ID = '00000000-0000-4000-8000-000000000001';

export const TenantContext = {
  /** Abre un contexto nuevo; lo usa el middleware al inicio de cada petición. */
  run<T>(store: TenantStore, fn: () => T): T {
    return als.run(store, fn);
  },

  store(): TenantStore | undefined {
    return als.getStore();
  },

  tiendaId(): string | undefined {
    return als.getStore()?.tiendaId;
  },

  /** Tienda activa o error: para código que no debe correr sin inquilino. */
  tiendaIdOrThrow(): string {
    const id = als.getStore()?.tiendaId;
    if (!id) throw new Error('TENANT_REQUERIDO');
    return id;
  },

  /** Fija la tienda en el contexto actual (el guard JWT la toma del token). */
  fijar(tiendaId: string) {
    const store = als.getStore();
    if (!store) throw new Error('TENANT_SIN_CONTEXTO');
    store.tiendaId = tiendaId;
  },

  /**
   * Ejecuta `fn` dentro de una tienda concreta (seed, alta de tienda, jobs).
   * Las consultas Prisma son perezosas: se esperan aquí dentro para que corran con este contexto.
   */
  enTienda<T>(tiendaId: string, fn: () => T | PromiseLike<T>): Promise<T> {
    return als.run({ tiendaId }, async () => await fn());
  },

  /** Ejecuta `fn` sin filtro de tienda. Solo para operaciones de plataforma. */
  sinFiltro<T>(fn: () => T | PromiseLike<T>): Promise<T> {
    return als.run({ sinFiltro: true }, async () => await fn());
  },
};
