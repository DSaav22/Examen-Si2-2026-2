import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import { useAuth } from '../auth'
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
  urlModelo: string
}

const COLORES_TELA: { nombre: string; hex: string }[] = [
  { nombre: 'Vino', hex: '#6b2b3a' },
  { nombre: 'Negro', hex: '#1a1a1a' },
  { nombre: 'Arena', hex: '#c4b5a0' },
  { nombre: 'Marfil', hex: '#ebe4d8' },
  { nombre: 'Azul', hex: '#2c3e5a' },
]

function colorHex(nombre: string): string {
  const n = nombre.trim().toLocaleLowerCase()
  const known = COLORES_TELA.find((c) => c.nombre.toLocaleLowerCase() === n)
  if (known) return known.hex
  if (n.includes('vino') || n.includes('bordeaux') || n.includes('rojo')) return '#6b2b3a'
  if (n.includes('negro') || n.includes('black')) return '#1a1a1a'
  if (n.includes('blanco') || n.includes('marfil') || n.includes('ivory')) return '#ebe4d8'
  if (n.includes('beige') || n.includes('arena') || n.includes('camel')) return '#c4b5a0'
  if (n.includes('azul') || n.includes('navy')) return '#2c3e5a'
  if (n.includes('verde')) return '#3d5a45'
  return '#6b2b3a'
}

function soportaTransform3d(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
  return (
    CSS.supports('transform-style', 'preserve-3d') &&
    CSS.supports('perspective', '800px')
  )
}

export function Probador() {
  const { varianteId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [hermanas, setHermanas] = useState<Overlay[]>([])
  const [error, setError] = useState('')
  const [modo, setModo] = useState('Buscando pose…')
  const [caja, setCaja] = useState<CajaOverlay>(CAJA_FIJA)
  const [toques, setToques] = useState<{ x: number; y: number }[]>([])
  const [fotoCuerpo, setFotoCuerpo] = useState('')
  const [vista3d, setVista3d] = useState(false)
  const [rotacion, setRotacion] = useState(0)
  const [colorTela, setColorTela] = useState('#6b2b3a')
  const [adminMsg, setAdminMsg] = useState('')
  const [guardandoModelo, setGuardandoModelo] = useState(false)
  const puede3d = useMemo(() => soportaTransform3d(), [])
  const esAdmin = user?.rol === 'ADMIN' || user?.rol === 'SUPERADMIN'
  const tieneModelo = Boolean(overlay?.urlModelo?.trim())

  useEffect(() => {
    if (!varianteId) return
    setVista3d(false)
    api<Overlay>(`/catalogo/variantes/${varianteId}/overlay`)
      .then((data) => {
        const next = { ...data, urlModelo: data.urlModelo ?? '' }
        setOverlay(next)
        setColorTela(colorHex(next.color))
        if (next.urlModelo?.trim() && soportaTransform3d()) setVista3d(true)
      })
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
          urlModelo: '',
        })),
      )
    })
  }, [varianteId])

  useEffect(() => {
    if (fotoCuerpo || vista3d) return
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
  }, [fotoCuerpo, vista3d])

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

  async function toggleModelo3d() {
    if (!overlay || !varianteId) return
    const siguiente = tieneModelo ? '' : 'vesta-volumen'
    setGuardandoModelo(true)
    setAdminMsg('')
    try {
      await api(`/catalogo/variantes/${varianteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ urlModelo: siguiente }),
      })
      setOverlay({ ...overlay, urlModelo: siguiente })
      if (siguiente && puede3d) {
        setVista3d(true)
        setModo('Modelo 3D activo')
      } else {
        setVista3d(false)
        setModo(siguiente && !puede3d ? 'Sin soporte 3D: vista 2D' : 'Overlay 2D')
      }
      setAdminMsg(siguiente ? 'Modelo 3D activado.' : 'Modelo 3D quitado.')
    } catch {
      setAdminMsg('No se pudo actualizar el modelo.')
    } finally {
      setGuardandoModelo(false)
    }
  }

  const mostrando3d = vista3d && tieneModelo && puede3d

  return (
    <section>
      <p className="eyebrow">Innovación 1 · Spike A · UC28</p>
      <h2>Probador virtual</h2>
      <p className="muted">
        Overlay 2D anclado a hombros
        {tieneModelo ? ' · volumen de tela cuando hay modelo 3D' : ''}. El video no se
        sube. No toca stock.
      </p>
      <p className="muted">{modo}</p>
      {error ? <p className="error">{error}</p> : null}
      {tieneModelo && !puede3d ? (
        <p className="muted">Tu navegador no soporta vista 3D; se muestra el overlay 2D.</p>
      ) : null}
      {adminMsg ? <p className="ok" role="status">{adminMsg}</p> : null}

      <div className="tryon">
        {mostrando3d ? (
          <div className="uc28-scene" aria-label="Probador 3D">
            <div
              className="uc28-stage3d"
              style={{ transform: `rotateY(${rotacion}deg)` }}
            >
              <div className="uc28-torso">
                <div className="uc28-cuello" />
                <div className="uc28-pecho" />
                <div className="uc28-brazo uc28-brazo--izq" />
                <div className="uc28-brazo uc28-brazo--der" />
              </div>
              <div
                className="uc28-prenda uc28-prenda--caida"
                style={{ ['--tela' as string]: colorTela }}
              >
                <div className="uc28-prenda-cara uc28-prenda-frente" />
                <div className="uc28-prenda-cara uc28-prenda-atras" />
                <div className="uc28-prenda-cara uc28-prenda-izq" />
                <div className="uc28-prenda-cara uc28-prenda-der" />
                <div className="uc28-manga uc28-manga--izq" />
                <div className="uc28-manga uc28-manga--der" />
              </div>
            </div>
            <label className="uc28-giro">
              Girar
              <input
                type="range"
                min={-180}
                max={180}
                value={rotacion}
                onChange={(e) => setRotacion(Number(e.target.value))}
              />
            </label>
            <div className="uc28-colores row-form">
              {COLORES_TELA.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  className={`ui-button ui-button--secondary${colorTela === c.hex ? ' is-active' : ''}`}
                  style={{ borderColor: c.hex }}
                  onClick={() => setColorTela(c.hex)}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>
        ) : (
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
        )}

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

          {tieneModelo && puede3d ? (
            mostrando3d ? (
              <button
                type="button"
                className="ui-button ui-button--primary"
                onClick={() => {
                  setVista3d(false)
                  setModo('Vista 2D (overlay)')
                }}
              >
                Vista 2D
              </button>
            ) : (
              <button
                type="button"
                className="ui-button ui-button--primary"
                onClick={() => {
                  setVista3d(true)
                  setModo('Modelo 3D · volumen de tela')
                }}
              >
                Vista 3D
              </button>
            )
          ) : null}

          {esAdmin ? (
            <button
              type="button"
              className="ui-button ui-button--secondary"
              disabled={guardandoModelo || !overlay}
              onClick={() => void toggleModelo3d()}
            >
              {guardandoModelo
                ? 'Guardando…'
                : tieneModelo
                  ? 'Quitar modelo'
                  : 'Activar modelo 3D'}
            </button>
          ) : null}

          {!mostrando3d ? (
            <>
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
            </>
          ) : null}

          <button type="button" className="ghost" onClick={() => navigate('/catalogo')}>
            Volver al catálogo
          </button>
        </aside>
      </div>
    </section>
  )
}
