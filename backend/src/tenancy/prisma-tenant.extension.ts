/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Prisma, PrismaClient } from '@prisma/client';
import { TenantContext } from './tenant-context';
import { MODELOS_PLATAFORMA } from './dominio-ambitos';

/** Tablas de la plataforma: nunca se filtran por tienda. */
const PLATAFORMA = new Set<string>(MODELOS_PLATAFORMA);

const modelos = Prisma.dmmf.datamodel.models;

export const MODELOS_CON_TIENDA = new Set(
  modelos
    .filter((m) => !PLATAFORMA.has(m.name) && m.fields.some((f) => f.name === 'tiendaId'))
    .map((m) => m.name),
);

/** modelo → (campo de relación → modelo destino) */
const relaciones = new Map<string, Record<string, string>>(
  modelos.map((m) => [
    m.name,
    Object.fromEntries(m.fields.filter((f) => f.kind === 'object').map((f) => [f.name, f.type])),
  ]),
);

const LECTURAS_Y_BORRADOS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'delete',
  'deleteMany',
]);

function mapear(valor: any, fn: (v: any) => any) {
  return Array.isArray(valor) ? valor.map(fn) : fn(valor);
}

function conCreate(modelo: string, data: any, tiendaId: string): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map((d) => conCreate(modelo, d, tiendaId));
  const out = { ...data };
  if (MODELOS_CON_TIENDA.has(modelo)) out.tiendaId = tiendaId;
  anidados(modelo, out, tiendaId);
  return out;
}

function conUpdate(modelo: string, data: any, tiendaId: string): any {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const out = { ...data };
  delete out.tiendaId;
  anidados(modelo, out, tiendaId);
  return out;
}

/** Propaga la tienda a los create/upsert anidados (p. ej. venta → lineas). */
function anidados(modelo: string, data: any, tiendaId: string) {
  const rels = relaciones.get(modelo) ?? {};
  for (const [campo, destino] of Object.entries(rels)) {
    const op = data[campo];
    if (!op || typeof op !== 'object') continue;
    const n = { ...op };
    if (n.create) n.create = conCreate(destino, n.create, tiendaId);
    if (n.createMany?.data) n.createMany = { ...n.createMany, data: conCreate(destino, n.createMany.data, tiendaId) };
    if (n.connectOrCreate) {
      n.connectOrCreate = mapear(n.connectOrCreate, (c) => ({ ...c, create: conCreate(destino, c.create, tiendaId) }));
    }
    if (n.upsert) {
      n.upsert = mapear(n.upsert, (u) => ({
        ...u,
        create: conCreate(destino, u.create, tiendaId),
        update: conUpdate(destino, u.update, tiendaId),
      }));
    }
    if (n.update) {
      n.update = mapear(n.update, (u) =>
        u && typeof u === 'object' && 'where' in u && 'data' in u
          ? { ...u, data: conUpdate(destino, u.data, tiendaId) }
          : conUpdate(destino, u, tiendaId),
      );
    }
    data[campo] = n;
  }
}

/**
 * Aislamiento multi-tenant a nivel de aplicación.
 * Toda consulta sobre una tabla de negocio se restringe a la tienda del contexto
 * y toda alta recibe su `tiendaId`. Sin tienda en el contexto, la consulta falla.
 */
export function extensionTenancy() {
  return Prisma.defineExtension({
    name: 'tenancy',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          const store = TenantContext.store();
          if (store?.sinFiltro) return query(args);

          const filtra = MODELOS_CON_TIENDA.has(model);
          const tiendaId = store?.tiendaId;
          if (!tiendaId) {
            if (filtra) throw new Error(`TENANT_REQUERIDO: ${model}.${operation}`);
            return query(args);
          }

          const a: any = { ...(args ?? {}) };
          const conTienda = () => {
            if (filtra) a.where = { ...(a.where ?? {}), tiendaId };
          };

          if (LECTURAS_Y_BORRADOS.has(operation)) {
            conTienda();
          } else if (operation === 'create' || operation === 'createMany' || operation === 'createManyAndReturn') {
            a.data = conCreate(model, a.data, tiendaId);
          } else if (operation === 'update' || operation === 'updateMany' || operation === 'updateManyAndReturn') {
            conTienda();
            a.data = conUpdate(model, a.data, tiendaId);
          } else if (operation === 'upsert') {
            conTienda();
            a.create = conCreate(model, a.create, tiendaId);
            a.update = conUpdate(model, a.update, tiendaId);
          }
          return query(a);
        },
      },
    },
  });
}

export function crearPrismaTenant(client = new PrismaClient()) {
  return client.$extends(extensionTenancy());
}
