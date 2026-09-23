import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import {
  CAJA_FIJA,
  cajaDesdeHombros,
  cajaDesdeLandmarks,
  crearPose,
  type CajaOverlay,
} from '../pose'
import type { Producto } from '../types'

type Overlay = {
  varianteId: string
  talla: string
  color: string
  urlOverlay: string
  producto: string
}

export function Probador() {
  const { varianteId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [hermanas, setHermanas] = useState<Overlay[]>([])
  const [error, setError] = useState('')
  const [modo, setModo] = useState('Buscando pose…')
  const [caja, setCaja] = useState<CajaOverlay>(CAJA_FIJA)
  const [toques, setToques] = useState<{ x: number; y: number }[]>([])
  const [fotoCuerpo, setFotoCuerpo] = useState('')

  useEffect(() => {
    if (!varianteId) return
    api<Overlay>(`/catalogo/variantes/${varianteId}/overlay`)
      .then(setOverlay)
      .catch(() => setError('No hay overlay para esta variante.'))
  }, [varianteId])

  useEffect(() => {
    api<Producto[]>('/catalogo/productos').then((productos) => {
      const p = productos.find((x) => x.variantes.some((v) => v.id === varianteId))
      if (!p) return
      setHermanas(
        p.variantes.map((v) => ({
          varianteId: v.id,
          talla: v.talla,
          color: v.color,
          urlOverlay: v.urlOverlay || '/overlay-polera.png',
          producto: p.nombre,
        })),
      )
    })
  }, [varianteId])

  useEffect(() => {
    if (fotoCuerpo) return
    let stream: MediaStream | undefined
    let alive = true
    let raf = 0
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then(async (s) => {
        stream = s
        const video = videoRef.current
        if (!video) return
        video.srcObject = s
        await video.play()
        try {
          const pose = await crearPose()
          const tick = () => {
            if (!alive || !video.videoWidth) {
              raf = requestAnimationFrame(tick)
              return
            }
            const res = pose.detectForVideo(video, performance.now())
            const lm = res.landmarks[0]
            if (lm) {
              const next = cajaDesdeLandmarks(lm)
              if (next) {
                setCaja(next)
                setModo('Pose: hombros detectados')
              }
            }
            raf = requestAnimationFrame(tick)
          }
          raf = requestAnimationFrame(tick)
        } catch {
          setModo('Sin MediaPipe: tocá los dos hombros en el recuadro.')
        }
      })
      .catch(() =>
        setError('Sin cámara: cargá una foto de cuerpo o usá la demo.'),
      )
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [fotoCuerpo])

  function tocar(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const punto = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
    const next = [...toques, punto].slice(-2)
    setToques(next)
    if (next.length === 2) {
      setCaja(cajaDesdeHombros(next[0], next[1]))
      setModo('Anclado a los dos toques (hombros)')
    }
  }

  function cargarFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setFotoCuerpo(url)
    setModo('Foto de cuerpo: tocá los dos hombros.')
    setError('')
  }

  return (
    <section>
      <p className="eyebrow">Innovación 1 · Spike A</p>
      <h2>Probador virtual</h2>
      <p className="muted">
        Overlay 2D anclado a hombros. El video no se sube. No toca stock.
      </p>
      <p className="muted">{modo}</p>
      {error ? <p className="error">{error}</p> : null}
      <div className="tryon">
        <div className="stage" onClick={tocar}>
          {fotoCuerpo ? (
            <img className="cuerpo" src={fotoCuerpo} alt="Cuerpo" />
          ) : (
            <video ref={videoRef} autoPlay muted playsInline />
          )}
          {overlay ? (
            <img
              className="cloth"
              src={assetUrl(overlay.urlOverlay)}
              alt={overlay.producto}
              style={caja}
            />
          ) : null}
        </div>
        <aside className="card">
          <p>
            {overlay
              ? `${overlay.producto} · ${overlay.talla} / ${overlay.color}`
              : 'Cargando variante…'}
          </p>
          <div className="row-form">
            {hermanas.map((h) => (
              <button
                key={h.varianteId}
                type="button"
                className={h.varianteId === overlay?.varianteId ? '' : 'ghost'}
                onClick={() => navigate(`/probar/${h.varianteId}`)}
              >
                {h.color}
              </button>
            ))}
          </div>
          <label>
            Foto de cuerpo completo
            <input type="file" accept="image/*" onChange={cargarFoto} />
          </label>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setFotoCuerpo('/cuerpo-demo.svg')
              setModo('Foto demo: tocá los dos hombros.')
              setError('')
            }}
          >
            Usar foto demo
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setToques([])
              setCaja(CAJA_FIJA)
              setModo('Recuadro fijo (fallback)')
            }}
          >
            Resetear anclaje
          </button>
          <button type="button" className="ghost" onClick={() => navigate('/catalogo')}>
            Volver al catálogo
          </button>
        </aside>
      </div>
    </section>
  )
}
