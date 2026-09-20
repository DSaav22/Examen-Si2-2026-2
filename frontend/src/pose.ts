export type CajaOverlay = {
  left: string
  top: string
  width: string
  height: string
  transform: string
}

export const CAJA_FIJA: CajaOverlay = {
  left: '18%',
  top: '16%',
  width: '64%',
  height: '68%',
  transform: 'none',
}

const WASM =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
const MODELO =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

type Landmark = { x: number; y: number; visibility?: number }

export function cajaDesdeHombros(
  izq: { x: number; y: number },
  der: { x: number; y: number },
): CajaOverlay {
  const anchoHombros = Math.hypot(der.x - izq.x, der.y - izq.y)
  const ancho = Math.max(0.28, Math.min(0.85, anchoHombros * 1.85))
  const midX = (izq.x + der.x) / 2
  const midY = (izq.y + der.y) / 2
  const angulo = (Math.atan2(der.y - izq.y, der.x - izq.x) * 180) / Math.PI
  return {
    left: `${(midX - ancho / 2) * 100}%`,
    top: `${(midY - ancho * 0.12) * 100}%`,
    width: `${ancho * 100}%`,
    height: `${ancho * 1.55 * 100}%`,
    transform: `rotate(${angulo}deg)`,
  }
}

export function cajaDesdeLandmarks(puntos: Landmark[]): CajaOverlay | null {
  const hombroI = puntos[11]
  const hombroD = puntos[12]
  if (!hombroI || !hombroD) return null
  if ((hombroI.visibility ?? 1) < 0.4 || (hombroD.visibility ?? 1) < 0.4) {
    return null
  }
  return cajaDesdeHombros(
    { x: 1 - hombroI.x, y: hombroI.y },
    { x: 1 - hombroD.x, y: hombroD.y },
  )
}

type Vision = {
  FilesetResolver: {
    forVisionTasks: (wasm: string) => Promise<unknown>
  }
  PoseLandmarker: {
    createFromOptions: (
      files: unknown,
      opts: Record<string, unknown>,
    ) => Promise<{
      detectForVideo: (
        video: HTMLVideoElement,
        t: number,
      ) => { landmarks: { x: number; y: number; visibility?: number }[][] }
    }>
  }
}

export async function crearPose() {
  const vision = (await import(
    /* @vite-ignore */
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
  )) as Vision
  const files = await vision.FilesetResolver.forVisionTasks(WASM)
  return vision.PoseLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: MODELO },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.4,
    minPosePresenceConfidence: 0.4,
    minTrackingConfidence: 0.4,
  })
}
