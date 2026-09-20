import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class ImagenService {
  desdeDisco(archivo?: { filename: string; mimetype: string }) {
    if (!archivo?.filename) {
      throw new BadRequestException({ codigo: 'SIN_ARCHIVO' });
    }
    if (archivo.mimetype && !archivo.mimetype.startsWith('image/')) {
      throw new BadRequestException({ codigo: 'NO_ES_IMAGEN' });
    }
    return { url: `/uploads/${archivo.filename}` };
  }
}
