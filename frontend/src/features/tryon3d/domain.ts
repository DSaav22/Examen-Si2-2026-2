/** Datos normalizados que el tracker entrega al renderizador, sin acoplarlo a MediaPipe. */
export type TryOnPose = {
  visible: boolean
  torsoX: number
  torsoY: number
  shoulderWidth: number
  turnRadians: number
}

/** Contrato que permite reemplazar Three.js por otro motor sin modificar el tracker. */
export interface GarmentRenderer {
  load(modelUrl: string): Promise<void>
  resize(width: number, height: number): void
  render(pose: TryOnPose | null, extraRotation?: number): void
  dispose(): void
}
