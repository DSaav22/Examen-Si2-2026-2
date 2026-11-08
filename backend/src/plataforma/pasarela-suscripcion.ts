import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

export type TarjetaPrueba = { titular: string; numero: string; vence: string; cvc: string };

export type ResultadoCobro =
  | { aprobado: true; referencia: string; ultimos4: string; pasarela: string }
  | { aprobado: false; motivo: string; ultimos4: string; pasarela: string };

/**
 * Puerto de cobro de suscripciones. Hoy lo implementa una pasarela simulada con las
 * tarjetas de prueba estándar; el punto de pagos la reemplaza por un sandbox real.
 */
export abstract class PasarelaSuscripcion {
  abstract cobrar(monto: number, moneda: string, tarjeta: TarjetaPrueba, idempotencyKey: string): Promise<ResultadoCobro>;
  abstract reembolsar(referencia: string): Promise<void>;
}

const RECHAZADAS: Record<string, string> = {
  '4000000000000002': 'TARJETA_RECHAZADA',
  '4000000000009995': 'FONDOS_INSUFICIENTES',
  '4000000000000069': 'TARJETA_VENCIDA',
};

function luhn(numero: string) {
  let suma = 0;
  let doble = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let d = Number(numero[i]);
    if (doble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
    doble = !doble;
  }
  return suma % 10 === 0;
}

@Injectable()
export class PasarelaSimulada extends PasarelaSuscripcion {
  private readonly cobros = new Map<string, ResultadoCobro>();

  async cobrar(_monto: number, _moneda: string, tarjeta: TarjetaPrueba, idempotencyKey: string): Promise<ResultadoCobro> {
    const previo = this.cobros.get(idempotencyKey);
    if (previo) return previo;
    const numero = tarjeta.numero.replace(/\D/g, '');
    const ultimos4 = numero.slice(-4);
    const base = { ultimos4, pasarela: 'simulada' };
    let r: ResultadoCobro;
    if (numero.length < 13 || !luhn(numero)) r = { aprobado: false, motivo: 'TARJETA_INVALIDA', ...base };
    else if (RECHAZADAS[numero]) r = { aprobado: false, motivo: RECHAZADAS[numero], ...base };
    else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(tarjeta.vence.trim())) r = { aprobado: false, motivo: 'VENCIMIENTO_INVALIDO', ...base };
    else r = { aprobado: true, referencia: `SIM-${randomBytes(6).toString('hex').toUpperCase()}`, ...base };
    this.cobros.set(idempotencyKey, r);
    return r;
  }

  async reembolsar(_referencia: string) {
    return;
  }
}
