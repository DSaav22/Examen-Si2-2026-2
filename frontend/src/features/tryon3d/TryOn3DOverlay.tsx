import { useEffect, useRef, useState } from 'react'
import { assetUrl } from '../../asset'
import type { TryOnPose } from './domain'
import { ThreeGarmentRenderer } from './ThreeGarmentRenderer'

export function TryOn3DOverlay({
  modelUrl,
  pose,
  rotation,
}: {
  modelUrl: string
  pose: TryOnPose | null
  rotation: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<ThreeGarmentRenderer | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !modelUrl) return
    const renderer = new ThreeGarmentRenderer(canvas)
    rendererRef.current = renderer
    const observer = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect
      if (box) renderer.resize(box.width, box.height)
    })
    observer.observe(canvas.parentElement ?? canvas)
    renderer.resize(canvas.clientWidth || 1, canvas.clientHeight || 1)
    let active = true
    setState('loading')
    void renderer.load(assetUrl(modelUrl)).then(
      () => {
        if (active) setState('ready')
      },
      () => {
        if (active) setState('error')
      },
    )
    return () => {
      active = false
      observer.disconnect()
      renderer.dispose()
      rendererRef.current = null
    }
  }, [modelUrl])

  useEffect(() => {
    rendererRef.current?.render(pose, (rotation * Math.PI) / 180)
  }, [pose, rotation, state])

  return (
    <>
      <canvas ref={canvasRef} className="tryon-three-canvas" aria-label="Prenda 3D sobre la cámara" />
      {state === 'loading' ? <span className="tryon-three-status">Cargando prenda 3D…</span> : null}
      {state === 'error' ? <span className="tryon-three-status is-error">No se pudo cargar el modelo 3D.</span> : null}
    </>
  )
}
