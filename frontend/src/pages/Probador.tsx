import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { TryOn3DOverlay } from '../features/tryon3d/TryOn3DOverlay'
import { poseFromMediaPipe } from '../features/tryon3d/mediapipePoseAdapter'
import type { TryOnPose } from '../features/tryon3d/domain'
import type { Producto } from '../types'
import { anchorFromShoulders, cutoutLightBackground, projectToPreview, smoothAnchor, type GarmentAnchor } from '../features/tryon3d/garment2d'

type Overlay = {
  varianteId: string
  talla: string
  color: string
  urlOverlay: string
  producto: string
  urlModelo: string
  urlFoto?: string
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
  const stageRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<GarmentAnchor | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [hermanas, setHermanas] = useState<Overlay[]>([])
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [modo, setModo] = useState('Preparando vista…')
  const [caja, setCaja] = useState<CajaOverlay>(CAJA_FIJA)
  const [toques, setToques] = useState<{ x: number; y: number }[]>([])
  const [fotoCuerpo, setFotoCuerpo] = useState('')
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null)
  const [vistaIa, setVistaIa] = useState('')
  const [generandoIa, setGenerandoIa] = useState(false)
  const [vista3d, setVista3d] = useState(false)
  const [rotacion, setRotacion] = useState(0)
  const [adminMsg, setAdminMsg] = useState('')
  const [sinCamara, setSinCamara] = useState(false)
  const [poseEnVivo, setPoseEnVivo] = useState<TryOnPose | null>(null)
  const [recorte, setRecorte] = useState('')
  const [estadoPrenda, setEstadoPrenda] = useState<'cargando' | 'lista' | 'error'>('cargando')
  const [anchor, setAnchor] = useState<GarmentAnchor | null>(null)
  const puede3d = useMemo(() => soportaTransform3d(), [])
  const esAdmin = user?.rol === 'ADMIN' || user?.rol === 'SUPERADMIN'
  const tieneModelo = Boolean(overlay?.urlModelo?.trim())
  const tieneFoto = Boolean(fotoCuerpo)
  const mostrando3d = vista3d && tieneModelo && puede3d
  /** Overlay genérico de polera: no sirve para gafas/accesorios; no lo dibujamos. */
  const overlayEsPlaceholder = !overlay?.urlOverlay
    || overlay.urlOverlay.includes('overlay-polera')
  const mostrarCloth =
    Boolean(overlay) &&
    Boolean(recorte || !overlayEsPlaceholder) &&
    (fotoCuerpo || !sinCamara) &&
    !vistaIa &&
    !mostrando3d

  useEffect(() => {
    if (!varianteId) return
    let active = true
    setOverlay(null)
    setRecorte('')
    setEstadoPrenda('cargando')
    setAviso('')
    setVista3d(false)
    setVistaIa('')
    api<Overlay>(`/catalogo/variantes/${varianteId}/overlay`)
      .then(async data => {
        // Versiones anteriores del backend no devuelven urlFoto en /overlay.
        // Recuperarla desde catálogo sin sustituirla por una prenda distinta.
        let urlFoto = data.urlFoto
        if (!urlFoto && (!data.urlOverlay || data.urlOverlay.includes('overlay-polera'))) {
          const productos = await api<Producto[] | { items: Producto[] }>('/catalogo/productos')
          const items = Array.isArray(productos) ? productos : productos.items
          urlFoto = items.flatMap(p => p.variantes).find(v => v.id === varianteId)?.urlFoto
        }
        if (!active) return
        const next = { ...data, urlFoto, urlModelo: data.urlModelo ?? '' }
        setOverlay(next)
      })
      .catch(() => {
        if (active) { setEstadoPrenda('error'); setError('No se pudo cargar la imagen de esta variante.') }
      })
    return () => { active = false }
  }, [varianteId])

  useEffect(() => {
    let active = true
    setRecorte('')
    anchorRef.current = null
    setAnchor(null)
    if (!overlay) return
    if (!overlayEsPlaceholder) {
      setEstadoPrenda('lista')
      return
    }
    if (!overlay.urlFoto) {
      setEstadoPrenda('error')
      return
    }
    setEstadoPrenda('cargando')
    void cutoutLightBackground(assetUrl(overlay.urlFoto)).then(url => {
      if (active) { setRecorte(url); setEstadoPrenda('lista') }
    }).catch(() => {
      if (active) setEstadoPrenda('error')
    })
    return () => { active = false }
  }, [overlay, overlayEsPlaceholder])

  useEffect(() => {
    api<Producto[]>('/catalogo/productos').then(productos => {
      const p = productos.find(x => x.variantes.some(v => v.id === varianteId))
      if (!p) return
      setHermanas(
        p.variantes.map(v => ({
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
    // La cámara sigue activa en modo 3D: MediaPipe alimenta el anclaje del GLB.
    // Una foto conserva el flujo 2D/IA; al abrir 3D volvemos a la cámara
    // porque el seguimiento de MediaPipe debe recibir video en vivo.
    if (vistaIa || (fotoCuerpo && !vista3d)) return
    let stream: MediaStream | undefined
    let alive = true
    let raf = 0
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then(async s => {
        stream = s
        setSinCamara(false)
        const video = videoRef.current
        if (!video || !alive) { s.getTracks().forEach(track => track.stop()); return }
        video.srcObject = s
        await video.play()
        try {
          const pose = await crearPose()
          const tick = () => {
            if (!alive) return
            if (!video.videoWidth) {
              raf = requestAnimationFrame(tick)
              return
            }
            const res = pose.detectForVideo(video, performance.now())
            const lm = res.landmarks[0]
            if (lm) {
              setPoseEnVivo(poseFromMediaPipe(lm))
              const stage = stageRef.current
              if (stage && lm[11] && lm[12]) {
                const rect = stage.getBoundingClientRect()
                const left = projectToPreview(lm[11], video.videoWidth, video.videoHeight, rect.width, rect.height)
                const right = projectToPreview(lm[12], video.videoWidth, video.videoHeight, rect.width, rect.height)
                const current = anchorFromShoulders(left, right)
                if (current) {
                  anchorRef.current = smoothAnchor(anchorRef.current, current)
                  setAnchor(anchorRef.current)
                } else { anchorRef.current = null; setAnchor(null) }
              }
              const next = cajaDesdeLandmarks(lm)
              if (next) {
                setCaja(next)
              }
            } else {
              setPoseEnVivo(null)
              anchorRef.current = null
              setAnchor(null)
            }
            raf = requestAnimationFrame(tick)
          }
          raf = requestAnimationFrame(tick)
        } catch {
          setModo('Tocá los dos hombros en la vista para anclar')
        }
      })
      .catch(() => {
        setSinCamara(true)
        setPoseEnVivo(null)
        setAviso('Sin cámara en este equipo. Subí una foto o usá la silueta demo.')
        setModo('Esperando tu foto')
      })
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [fotoCuerpo, vista3d, vistaIa])

  function tocar(e: MouseEvent<HTMLDivElement>) {
    if (vistaIa) return
    const rect = e.currentTarget.getBoundingClientRect()
    const punto = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
    const next = [...toques, punto].slice(-2)
    setToques(next)
    if (next.length === 2) {
      setCaja(cajaDesdeHombros(next[0], next[1]))
      setModo('Anclado a tus toques')
    }
  }

  function aplicarFoto(file: File, previewUrl: string) {
    setFotoArchivo(file)
    setFotoCuerpo(previewUrl)
    setVistaIa('')
    setError('')
    setAviso('')
    setModo(
      overlayEsPlaceholder
        ? 'Foto lista · usá «Ver vista realista» (este producto no tiene overlay 2D)'
        : 'Foto lista · tocá Vista realista o ajustá el overlay',
    )
  }

  function cargarFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    aplicarFoto(file, URL.createObjectURL(file))
  }

  async function capturarCamara() {
    const video = videoRef.current
    if (!video?.videoWidth) {
      setError('Esperá a que la cámara esté lista o subí una foto.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('No se pudo capturar el frame de la cámara.')
      return
    }
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const blob = await (await fetch(dataUrl)).blob()
    aplicarFoto(new File([blob], 'camara.jpg', { type: 'image/jpeg' }), dataUrl)
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('No se pudo leer la foto'))
      reader.readAsDataURL(file)
    })
  }

  async function generarVistaIa() {
    if (!varianteId) return
    setError('')
    setAviso('')
    setGenerandoIa(true)
    setModo('Generando vista realista…')
    try {
      let dataUrl = ''
      if (fotoArchivo) {
        dataUrl = await fileToDataUrl(fotoArchivo)
      } else if (fotoCuerpo && !fotoCuerpo.startsWith('blob:')) {
        const res = await fetch(fotoCuerpo)
        const blob = await res.blob()
        dataUrl = await fileToDataUrl(
          new File([blob], 'cuerpo.jpg', { type: blob.type || 'image/jpeg' }),
        )
      } else if (fotoCuerpo?.startsWith('blob:')) {
        const res = await fetch(fotoCuerpo)
        const blob = await res.blob()
        dataUrl = await fileToDataUrl(
          new File([blob], 'cuerpo.jpg', { type: blob.type || 'image/jpeg' }),
        )
      } else {
        setError('Primero subí una foto, capturá con la cámara o usá la silueta demo.')
        setModo('Falta foto')
        return
      }
      if (dataUrl.length > 4_500_000) {
        setError('La foto es muy pesada. Probá con una más liviana.')
        setModo('Foto demasiado grande')
        return
      }
      const out = await api<{ url: string; aviso?: string }>('/ia/probar', {
        method: 'POST',
        body: JSON.stringify({ varianteId, imagenBase64: dataUrl }),
        signal: AbortSignal.timeout(130_000),
      })
      setVistaIa(out.url.startsWith('http') ? out.url : assetUrl(out.url))
      setVista3d(false)
      setModo(out.aviso ?? 'Vista realista lista')
    } catch (err) {
      const abort =
        (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) ||
        (err instanceof Error && /aborted|timeout/i.test(err.message))
      const msg = abort
        ? 'La generación tardó demasiado. Probá otra foto o el overlay 2D.'
        : err instanceof Error
          ? err.message
          : 'No se generó la vista'
      setError(msg)
      setModo('No disponible · seguí con el overlay')
    } finally {
      setGenerandoIa(false)
    }
  }

  function toggleModelo3d() {
    if (!tieneModelo) {
      setAdminMsg('Esta variante todavía no tiene un archivo GLB asociado.')
      return
    }
    setVista3d(actual => !actual)
    setModo(mostrando3d ? 'Vista 2D' : 'Probador 3D activo')
  }

  function usarDemo() {
    setFotoArchivo(null)
    setFotoCuerpo('/cuerpo-demo.svg')
    setVistaIa('')
    setError('')
    setAviso('')
    setModo('Silueta demo · tocá Vista realista o los hombros')
  }

  const etapa = vistaIa ? 3 : tieneFoto || !sinCamara ? 2 : 1
  const estadoCamara = sinCamara ? modo : estadoPrenda === 'cargando'
    ? 'Preparando la imagen de la prenda…'
    : estadoPrenda === 'error'
      ? 'No hay una imagen compatible para esta prenda'
      : anchor
        ? 'Prenda superpuesta · seguimiento activo'
        : 'Buscando hombros · alejate para ver ambos'

  return (
    <section className="tryon-page">
      <header className="tryon-hero">
        <p className="tryon-kicker">Probador</p>
        <h1>¿Cómo te queda?</h1>
        <p className="tryon-lead">
          Subí tu foto y mirá una vista aproximada de la prenda. Podés usar el anclaje
          rápido o la vista realista con IA.
        </p>
      </header>

      <ol className="tryon-steps" aria-label="Pasos">
        <li className={etapa >= 1 ? 'is-on' : ''}>
          <span>1</span> Foto
        </li>
        <li className={etapa >= 2 ? 'is-on' : ''}>
          <span>2</span> Vista
        </li>
        <li className={etapa >= 3 ? 'is-on' : ''}>
          <span>3</span> Resultado
        </li>
      </ol>

      {aviso ? <p className="tryon-tip" role="status">{aviso}</p> : null}
      {error ? <p className="error tryon-error">{error}</p> : null}
      {adminMsg ? <p className="ok" role="status">{adminMsg}</p> : null}

      <div className="tryon">
        <div className="tryon-stage-wrap">
          {mostrando3d ? (
            <div className="uc28-scene" aria-label="Probador 3D">
              {sinCamara ? (
                <div className="tryon-three-empty">
                  Activá el permiso de cámara para probar la prenda en movimiento.
                </div>
              ) : (
                <video ref={videoRef} className="tryon-three-video" autoPlay muted playsInline />
              )}
              {overlay?.urlModelo ? (
                <TryOn3DOverlay modelUrl={overlay.urlModelo} pose={poseEnVivo} rotation={rotacion} />
              ) : null}
              <label className="uc28-giro">
                Girar
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={rotacion}
                  onChange={e => setRotacion(Number(e.target.value))}
                />
              </label>
            </div>
          ) : vistaIa ? (
            <div className="stage stage--ia" aria-label="Vista realista">
              {generandoIa ? <div className="tryon-loading">Generando…</div> : null}
              <img className="cuerpo" src={vistaIa} alt="Prueba virtual generada" />
              <span className="tryon-badge">Vista realista · aproximada</span>
            </div>
          ) : (
            <div
              ref={stageRef}
              className={`stage${sinCamara && !fotoCuerpo ? ' stage--empty' : ''}`}
              onClick={tocar}
            >
              {generandoIa ? <div className="tryon-loading">Generando…</div> : null}
              {fotoCuerpo ? (
                <img className="cuerpo" src={fotoCuerpo} alt="Tu foto" />
              ) : sinCamara ? (
                <div className="tryon-empty">
                  <strong>Tu foto, acá</strong>
                  <p>Subí una imagen de cuerpo o usá la silueta demo para empezar.</p>
                </div>
              ) : (
                <video ref={videoRef} autoPlay muted playsInline />
              )}
              {mostrarCloth && (fotoCuerpo || anchor) ? (
                <img
                  className="cloth"
                  src={recorte || assetUrl(overlay!.urlOverlay)}
                  alt={overlay!.producto}
                  onError={() => setEstadoPrenda('error')}
                  style={!fotoCuerpo && anchor ? {
                    left: `${anchor.x}px`, top: `${anchor.y}px`, width: `${anchor.width}px`, height: 'auto',
                    transformOrigin: '50% 15%', transform: `translate(-50%, -15%) rotate(${anchor.angle}rad)`,
                  } : caja}
                />
              ) : null}
              <span className="tryon-badge" role="status">{fotoCuerpo ? modo : estadoCamara}</span>
            </div>
          )}
        </div>

        <aside className="tryon-panel">
          <div className="tryon-panel__head">
            <p className="tryon-panel__eyebrow">Prenda</p>
            <h2>{overlay?.producto ?? 'Cargando…'}</h2>
            {overlay ? (
              <p className="muted">
                Talla {overlay.talla} · {overlay.color}
              </p>
            ) : null}
          </div>

          {hermanas.length > 1 ? (
            <div className="tryon-block">
              <p className="tryon-label">Color</p>
              <div className="tryon-swatches">
                {hermanas.map(h => (
                  <button
                    key={h.varianteId}
                    type="button"
                    className={`tryon-swatch${h.varianteId === overlay?.varianteId ? ' is-on' : ''}`}
                    onClick={() => navigate(`/probar/${h.varianteId}`)}
                  >
                    {h.color}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!mostrando3d ? (
            <div className="tryon-block">
              <p className="tryon-label">Tu foto</p>
              <input
                ref={fileRef}
                className="sr-only"
                type="file"
                accept="image/*"
                capture="user"
                onChange={cargarFoto}
              />
              <div className="tryon-photo-actions">
                <button
                  type="button"
                  className="ui-button ui-button--secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  {tieneFoto ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {!sinCamara ? (
                  <button
                    type="button"
                    className="ui-button ui-button--secondary"
                    onClick={() => void capturarCamara()}
                  >
                    {tieneFoto ? 'Recapturar' : 'Capturar cámara'}
                  </button>
                ) : null}
                <button type="button" className="ui-button ui-button--secondary" onClick={usarDemo}>
                  Silueta demo
                </button>
              </div>
              <p className="tryon-hint">De frente, buena luz. Ideal cuerpo completo.</p>
              {estadoPrenda === 'error' ? (
                <p className="tryon-hint">
                  No se pudo cargar o recortar la foto de esta variante. Probá otra prenda
                  o utilizá <strong>Ver vista realista</strong> con una foto.
                </p>
              ) : null}
            </div>
          ) : null}

          {!mostrando3d ? (
            <div className="tryon-block tryon-block--cta">
              <button
                type="button"
                className="ui-button ui-button--primary tryon-cta"
                disabled={generandoIa || !varianteId || (!tieneFoto && !fotoArchivo)}
                onClick={() => void generarVistaIa()}
              >
                {generandoIa ? 'Generando vista…' : 'Ver vista realista'}
              </button>
              {vistaIa ? (
                <button
                  type="button"
                  className="ui-button ui-button--secondary"
                  onClick={() => {
                    setVistaIa('')
                    setModo('Volviste al overlay')
                  }}
                >
                  Volver al overlay
                </button>
              ) : (
                <p className="tryon-hint">
                  La vista realista usa IA (Azure). Es aproximada y no modifica stock.
                </p>
              )}
            </div>
          ) : null}

          {tieneModelo && puede3d ? (
            <div className="tryon-block">
              <button
                type="button"
                className="ui-button ui-button--secondary"
                onClick={() => {
                  setVista3d(!mostrando3d)
                  setModo(mostrando3d ? 'Vista 2D' : 'Modelo 3D')
                }}
              >
                {mostrando3d ? 'Ir a vista 2D' : 'Probar volumen 3D'}
              </button>
            </div>
          ) : null}

          {esAdmin ? (
            <div className="tryon-block">
              <button
                type="button"
                className="ui-button ui-button--secondary"
                disabled={!overlay}
                onClick={toggleModelo3d}
              >
                {tieneModelo
                  ? mostrando3d
                    ? 'Ocultar visor 3D'
                    : 'Abrir visor 3D'
                  : 'Sin modelo GLB'}
              </button>
            </div>
          ) : null}

          {!mostrando3d && !vistaIa ? (
            <button
              type="button"
              className="tryon-linkish"
              onClick={() => {
                setToques([])
                setCaja(CAJA_FIJA)
                setModo('Anclaje restablecido')
              }}
            >
              Resetear anclaje del overlay
            </button>
          ) : null}

          <Link className="tryon-back" to="/catalogo">
            ← Volver al catálogo
          </Link>
        </aside>
      </div>
    </section>
  )
}
