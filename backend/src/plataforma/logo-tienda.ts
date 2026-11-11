import { BadRequestException } from '@nestjs/common';

/** Raster pequeño y autocontenido; no se aceptan SVG, enlaces externos ni HTML. */
export function validarLogoTienda(logo?: string): string | undefined {
  if (!logo) return undefined;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(logo);
  if (!match || logo.length > 400_000) throw new BadRequestException({ codigo: 'LOGO_INVALIDO', message: 'El logo debe ser PNG, JPG o WebP y ocupar hasta 290 KB.' });
  const bytes = Buffer.from(match[2], 'base64');
  const valido = match[1] === 'png'
    ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
    : match[1] === 'jpeg'
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valido || bytes.length > 290 * 1024) throw new BadRequestException({ codigo: 'LOGO_INVALIDO', message: 'La imagen del logo no es válida.' });
  return logo;
}
