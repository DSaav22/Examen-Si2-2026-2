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
  const known = COLORES_TELA.find(c => c.nombre.toLocaleLowerCase() === n)
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
  const [colorTela, setColorTela] = useState('#6b2b3a')
  const [adminMsg, setAdminMsg] = useState('')
  const [guardandoModelo, setGuardandoModelo] = useState(false)
  const [sinCamara, setSinCamara] = useState(false)
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
    !overlayEsPlaceholder &&
    (fotoCuerpo || !sinCamara) &&
    !vistaIa &&
    !mostrando3d

  useEffect(() => {
    if (!varianteId) return
    setVista3d(false)
    setVistaIa('')
    api<Overlay>(`/catalogo/variantes/${varianteId}/overlay`)
      .then(data => {
        const next = { ...data, urlModelo: data.urlModelo ?? '' }
        setOverlay(next)
        setColorTela(colorHex(next.color))
        if (next.urlModelo?.trim() && soportaTransform3d()) setVista3d(true)
        setModo('Elegí una foto o usá la cámara')
      })
      .catch(() => setError('No hay overlay para esta variante.'))
  }, [varianteId])

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
    if (fotoCuerpo || vista3d || vistaIa) return
    let stream: MediaStream | undefined
    let alive = true
    let raf = 0
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then(async s => {
        stream = s
        setSinCamara(false)
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
                setModo('Hombros detectados · overlay activo')
              }
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
        setModo(siguiente && !puede3d ? 'Sin soporte 3D' : 'Overlay 2D')
      }
      setAdminMsg(siguiente ? 'Modelo 3D activado.' : 'Modelo 3D quitado.')
    } catch {
      setAdminMsg('No se pudo actualizar el modelo.')
    } finally {
      setGuardandoModelo(false)
    }
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
              <div className="uc28-stage3d" style={{ transform: `rotateY(${rotacion}deg)` }}>
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
                  onChange={e => setRotacion(Number(e.target.value))}
                />
              </label>
              <div className="uc28-colores row-form">
                {COLORES_TELA.map(c => (
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
          ) : vistaIa ? (
            <div className="stage stage--ia" aria-label="Vista realista">
              {generandoIa ? <div className="tryon-loading">Generando…</div> : null}
              <img className="cuerpo" src={vistaIa} alt="Prueba virtual generada" />
              <span className="tryon-badge">Vista realista · aproximada</span>
            </div>
          ) : (
            <div
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
              {mostrarCloth ? (
                <img
                  className="cloth"
                  src={assetUrl(overlay!.urlOverlay)}
                  alt={overlay!.producto}
                  style={caja}
                />
              ) : null}
              <span className="tryon-badge">{modo}</span>
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
              {overlayEsPlaceholder && tieneFoto ? (
                <p className="tryon-hint">
                  Esta prenda no tiene recorte 2D propio (el placeholder de polera se
                  oculta). Usá <strong>Ver vista realista</strong> para verla sobre tu
                  foto.
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
                disabled={guardandoModelo || !overlay}
                onClick={() => void toggleModelo3d()}
              >
                {guardandoModelo
                  ? 'Guardando…'
                  : tieneModelo
                    ? 'Quitar modelo 3D'
                    : 'Activar modelo 3D'}
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
