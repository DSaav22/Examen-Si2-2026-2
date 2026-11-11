import type { TryOnPose } from './domain'
import type { GarmentProfile } from './garmentProfile'
import { anchorFromLandmarks, projectToPreview, type Point } from './garment2d'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/** Proyecta los puntos con el mismo object-fit y reflejo que el video. */
export function poseFromMediaPipe(landmarks: Point[], profile: GarmentProfile, frameWidth: number, frameHeight: number, width: number, height: number): TryOnPose | null {
  if (!frameWidth || !frameHeight || !width || !height) return null
  const projected = landmarks.map(point => projectToPreview(point, frameWidth, frameHeight, width, height))
  const anchor = anchorFromLandmarks(projected, profile)
  if (!anchor) return null
  const indices = profile.reference === 'caderas' ? [23, 24] : [11, 12]
  const depthDelta = (landmarks[indices[1]]?.z ?? 0) - (landmarks[indices[0]]?.z ?? 0)
  let centerY = anchor.y + anchor.width * profile.centerFactor3d
  if (profile.reference === 'caderas') {
    const knees = [projected[25], projected[26]].filter(point => point && (point.visibility ?? 1) >= 0.35)
    if (knees.length) {
      const kneeY = knees.reduce((sum, point) => sum + point.y, 0) / knees.length
      if (kneeY > anchor.y) centerY = anchor.y + (kneeY - anchor.y) * (profile.kind === 'falda' ? 0.55 : 1)
    }
  }
  return {
    visible: true,
    torsoX: clamp(anchor.x / width, 0, 1),
    torsoY: clamp(centerY / height, 0, 1),
    shoulderWidth: clamp(anchor.width / width, 0.02, 1.5),
    turnRadians: clamp(-depthDelta * 1.4, -0.35, 0.35),
  }
}
