export class StockInsuficienteError extends Error {
  constructor(public readonly varianteId: string) {
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

export class UuidConflictError extends Error {
  constructor() {
    super('El uuid ya existe con otro payload');
    this.name = 'UuidConflictError';
  }
}
