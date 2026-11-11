/** Parámetros aproximados de anclaje; no representan tallaje ni simulación de tela. */
export type GarmentKind = 'superior' | 'vestido' | 'falda' | 'pantalon' | 'no-compatible'
export type GarmentProfile = { kind: GarmentKind; reference: 'hombros' | 'caderas'; widthFactor: number; imageOrigin: number; centerFactor3d: number }

export const GARMENT_PROFILES: Record<GarmentKind, GarmentProfile> = {
  superior: { kind: 'superior', reference: 'hombros', widthFactor: 1.85, imageOrigin: 0.15, centerFactor3d: 0.35 },
  vestido: { kind: 'vestido', reference: 'hombros', widthFactor: 1.55, imageOrigin: 0.08, centerFactor3d: 0.65 },
  falda: { kind: 'falda', reference: 'caderas', widthFactor: 1.5, imageOrigin: 0.04, centerFactor3d: 0.45 },
  pantalon: { kind: 'pantalon', reference: 'caderas', widthFactor: 1.4, imageOrigin: 0.04, centerFactor3d: 0.65 },
  'no-compatible': { kind: 'no-compatible', reference: 'hombros', widthFactor: 1, imageOrigin: 0, centerFactor3d: 0 },
}

export function garmentProfile(category = '', name = ''): GarmentProfile {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const classify = (text: string): GarmentProfile | null => {
    if (/\b(calzado|zapato|zapatos|bota|botas|accesorio|accesorios)\b/.test(text)) return GARMENT_PROFILES['no-compatible']
    if (/\b(falda|faldas|pollera|polleras)\b/.test(text)) return GARMENT_PROFILES.falda
    if (/\b(pantalon|pantalones|jean|jeans|short|shorts|bermuda|bermudas)\b/.test(text)) return GARMENT_PROFILES.pantalon
    if (/\b(vestido|vestidos|enterizo|enterizos)\b/.test(text)) return GARMENT_PROFILES.vestido
    if (/\b(blusa|blusas|polera|poleras|camiseta|camisetas|top|tops|sueter|sueteres|cardigan|sudadera|sudaderas|camisa|camisas|abrigo|abrigos|chaqueta|chaquetas|blazer|sastreria)\b/.test(text)) return GARMENT_PROFILES.superior
    return null
  }
  return classify(normalize(category)) ?? classify(normalize(name)) ?? GARMENT_PROFILES['no-compatible']
}
