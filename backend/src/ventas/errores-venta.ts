export class StockInsuficienteError extends Error {
  constructor(
    public readonly varianteId: string,
    public readonly disponible?: number,
    public readonly pedido?: number,
  ) {
    super(`Stock insuficiente para la variante ${varianteId}`);
    this.name = 'StockInsuficienteError';
  }
}

export class TurnoRequeridoError extends Error {
  constructor() {
    super('UC07 exige un turno de caja abierto');
    this.name = 'TurnoRequeridoError';
  }
}

export class TurnoInvalidoError extends Error {
  constructor(public readonly codigo = 'TURNO_INVALIDO') {
    super('El turno de caja no es válido para esta venta');
    this.name = 'TurnoInvalidoError';
  }
}

export class UuidConflictError extends Error {
  constructor() {
    super('El uuid ya existe con otro payload');
    this.name = 'UuidConflictError';
  }
}
