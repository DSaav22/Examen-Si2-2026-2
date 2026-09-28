import type { TryOnPose } from './domain'

type MediaPipeLandmark = { x: number; y: number; z?: number; visibility?: number }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/**
 * Convierte landmarks de MediaPipe a coordenadas independientes del motor 3D.
 * Índices BlazePose: hombros 11/12 y caderas 23/24.
 */
export function poseFromMediaPipe(landmarks: MediaPipeLandmark[]): TryOnPose | null {
  const leftShoulder = landmarks[11]
  const rightShoulder = landmarks[12]
  const leftHip = landmarks[23]
  const rightHip = landmarks[24]
  // Para el AR de una prenda basta con los hombros. Exigir las caderas hacía
  // fallar el reconocimiento cuando la cámara mostraba sólo el torso.
  if (!leftShoulder || !rightShoulder) return null
  if ([leftShoulder, rightShoulder].some(point => (point.visibility ?? 1) < 0.35)) return null

  const shoulderWidth = Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y)
  if (shoulderWidth < 0.04) return null
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
  const hipsVisible = leftHip && rightHip
    && (leftHip.visibility ?? 1) >= 0.35
    && (rightHip.visibility ?? 1) >= 0.35
  const hipMidY = hipsVisible ? (leftHip.y + rightHip.y) / 2 : shoulderMidY + shoulderWidth * 1.35
  const depthDelta = (rightShoulder.z ?? 0) - (leftShoulder.z ?? 0)

  return {
    visible: true,
    // El video se refleja para que actúe como espejo; la pose debe reflejarse
    // igual para que la prenda no se desplace al lado contrario.
    torsoX: clamp(1 - shoulderMidX, 0, 1),
    torsoY: clamp(shoulderMidY + (hipMidY - shoulderMidY) * 0.35, 0, 1),
    shoulderWidth: clamp(shoulderWidth, 0.08, 0.65),
    // La profundidad monocular de BlazePose es ruidosa. Un rango corto evita
    // que una diferencia mínima entre hombros gire violentamente la prenda.
    turnRadians: clamp(-depthDelta * 1.4, -0.35, 0.35),
  }
}
