import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { nombreSchemaTienda } from '../tenancy/schema-nombre';
import { MODELOS_PLATAFORMA, MODELOS_TIENDA, type AmbitoDominio } from '../tenancy/dominio-ambitos';

const MAX_CLIENTES_TIENDA = 20;
const CONEXIONES_POR_CLIENTE = 2;

const delegado = (modelo: string) => modelo.charAt(0).toLowerCase() + modelo.slice(1);
const modelosPorAmbito = {
  plataforma: new Set<string>(MODELOS_PLATAFORMA.map(delegado)),
  tienda: new Set<string>(MODELOS_TIENDA.map(delegado)),
};

/** Evita usar modelos Prisma con enums del ámbito equivocado y rastrea transacciones activas. */
function limitarModelos<T extends object>(
  cliente: T,
  ambito: AmbitoDominio,
  onTxStart?: () => void,
  onTxEnd?: () => void,
): T {
  const opuesto: AmbitoDominio = ambito === 'tienda' ? 'plataforma' : 'tienda';
  return new Proxy(cliente, {
    get(objetivo, propiedad) {
      if (typeof propiedad === 'string' && modelosPorAmbito[opuesto].has(propiedad)) {
        throw new Error(`MODELO_FUERA_DE_AMBITO: ${propiedad}`);
      }
      const valor: unknown = Reflect.get(objetivo, propiedad, objetivo);
      if (propiedad === '$transaction' && typeof valor === 'function') {
        return (primero: unknown, ...opciones: unknown[]) => {
          onTxStart?.();
          const terminar = () => { onTxEnd?.(); };
          if (typeof primero === 'function') {
            const operacion = async (tx: object) => {
              try {
                return await (primero as (tx: object) => Promise<unknown>)(limitarModelos(tx, ambito));
              } finally {
                terminar();
              }
            };
            return Reflect.apply(valor, objetivo, [operacion, ...opciones]).catch((err: unknown) => {
              terminar();
              throw err;
            });
          }
          const prom = Reflect.apply(valor, objetivo, [primero, ...opciones]);
          if (prom && typeof (prom as Promise<unknown>).finally === 'function') {
            return (prom as Promise<unknown>).finally(terminar);
          }
          terminar();
          return prom;
        };
      }
      return typeof valor === 'function' ? valor.bind(objetivo) : valor;
    },
  });
}

/** Construye una URL interna sin aceptar nombres de esquema del cliente HTTP. */
export function urlParaEsquema(databaseUrl: string, esquema: string): string {
  if (esquema !== 'public' && !/^tienda_[0-9a-f]{32}$/.test(esquema)) {
    throw new Error('ESQUEMA_INVALIDO');
  }
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL_INVALIDA');
  }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') throw new Error('DATABASE_URL_INVALIDA');
  url.searchParams.set('schema', esquema);
  url.searchParams.set('connection_limit', String(CONEXIONES_POR_CLIENTE));
  return url.toString();
}

/**
 * Clientes explícitos para la futura arquitectura por esquemas.
 * El llamador debe comprobar previamente la pertenencia del usuario a la tienda.
 * No se conecta al flujo de negocio actual hasta completar transacciones y alta.
 */
@Injectable()
export class PrismaEsquemasService implements OnModuleDestroy {
  private readonly baseUrl: string;
  private readonly plataforma: PrismaClient;
  private readonly tiendas = new Map<string, PrismaClient>();
  private readonly ultimoUso = new Map<string, number>();
  private readonly operacionesActivas = new Map<string, number>();
  private readonly maxClientes: number;
  private cerrando = false;

  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL');
    if (!url) throw new Error('DATABASE_URL_NO_CONFIGURADA');
    this.baseUrl = url;
    const maxConfig = config.get<string>('MAX_CLIENTES_TIENDA');
    this.maxClientes = maxConfig && !isNaN(Number(maxConfig)) ? Number(maxConfig) : MAX_CLIENTES_TIENDA;
    this.plataforma = limitarModelos(new PrismaClient({ datasources: { db: { url: urlParaEsquema(url, 'public') } } }), 'plataforma');
  }

  clientePlataforma(): PrismaClient {
    if (this.cerrando) throw new Error('CLIENTES_EN_CIERRE');
    return this.plataforma;
  }

  clienteTienda(tiendaId: string): PrismaClient {
    if (this.cerrando) throw new Error('CLIENTES_EN_CIERRE');
    const esquema = nombreSchemaTienda(tiendaId);
    const existente = this.tiendas.get(esquema);
    if (existente) {
      this.ultimoUso.set(esquema, Date.now());
      return existente;
    }
    // Si se alcanza la capacidad, desalojamos el cliente inactivo menos recientemente usado (LRU).
    if (this.tiendas.size >= this.maxClientes) {
      let candidato: string | null = null;
      let minUso = Infinity;
      for (const [esq, uso] of this.ultimoUso.entries()) {
        const activas = this.operacionesActivas.get(esq) ?? 0;
        if (activas === 0 && uso < minUso) {
          minUso = uso;
          candidato = esq;
        }
      }
      if (candidato) {
        const clienteDesalojado = this.tiendas.get(candidato);
        this.tiendas.delete(candidato);
        this.ultimoUso.delete(candidato);
        this.operacionesActivas.delete(candidato);
        if (clienteDesalojado) {
          void clienteDesalojado.$disconnect().catch(() => undefined);
        }
      } else {
        // Todas las conexiones en caché tienen operaciones activas concurrentes: falla cerrado.
        throw new Error('LIMITE_CLIENTES_TIENDA');
      }
    }
    const cliente = limitarModelos(
      new PrismaClient({ datasources: { db: { url: urlParaEsquema(this.baseUrl, esquema) } } }),
      'tienda',
      () => {
        const actual = this.operacionesActivas.get(esquema) ?? 0;
        this.operacionesActivas.set(esquema, actual + 1);
        this.ultimoUso.set(esquema, Date.now());
      },
      () => {
        const actual = this.operacionesActivas.get(esquema) ?? 1;
        this.operacionesActivas.set(esquema, Math.max(0, actual - 1));
        this.ultimoUso.set(esquema, Date.now());
      },
    );
    this.tiendas.set(esquema, cliente);
    this.ultimoUso.set(esquema, Date.now());
    return cliente;
  }

  /** Marca el inicio explícito de una operación en tienda para evitar desalojo. */
  iniciarOperacion(tiendaId: string): () => void {
    const esquema = nombreSchemaTienda(tiendaId);
    const actual = this.operacionesActivas.get(esquema) ?? 0;
    this.operacionesActivas.set(esquema, actual + 1);
    this.ultimoUso.set(esquema, Date.now());
    let terminado = false;
    return () => {
      if (terminado) return;
      terminado = true;
      const act = this.operacionesActivas.get(esquema) ?? 1;
      this.operacionesActivas.set(esquema, Math.max(0, act - 1));
      this.ultimoUso.set(esquema, Date.now());
    };
  }

  totalClientesEnCache(): number {
    return this.tiendas.size;
  }

  async onModuleDestroy(): Promise<void> {
    this.cerrando = true;
    await Promise.all([this.plataforma, ...this.tiendas.values()].map((cliente) => cliente.$disconnect()));
    this.tiendas.clear();
    this.ultimoUso.clear();
    this.operacionesActivas.clear();
  }
}
