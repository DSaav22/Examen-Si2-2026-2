import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { responderFicha } from './ficha';

@Injectable()
export class IaService {
  constructor(private readonly prisma: PrismaService) {}

  async ficha(productoId: string, pregunta: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
      include: { variantes: true },
    });
    if (!producto) {
      throw new NotFoundException({ codigo: 'PRODUCTO_NO_EXISTE' });
    }
    return responderFicha(producto, pregunta);
  }
}
