import { useId, useRef, useState } from 'react'
import { useInstalar } from '../offline/pwa'
import './instalar-app.css'

/** Siempre visible: usa el instalador nativo o explica las opciones del navegador. */
export function InstalarApp() {
  const { puede, instalar, estaInstalada } = useInstalar()
  const dialogo = useRef<HTMLDialogElement>(null)
  const titulo = useId()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  async function abrir() {
    if (ocupado || estaInstalada) return
    setError('')
    if (!puede) { dialogo.current?.showModal(); return }
    setOcupado(true)
    try { await instalar() }
    catch { setError('No se pudo abrir el instalador. Podés intentarlo desde el menú del navegador.'); dialogo.current?.showModal() }
    finally { setOcupado(false) }
  }

  return <>
    <button className="pwa-install-button" type="button" onClick={() => void abrir()} disabled={ocupado || estaInstalada} aria-label={estaInstalada ? 'Aplicación instalada' : 'Instalar aplicación'} title={estaInstalada ? 'Aplicación instalada' : 'Instalar aplicación'}>
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3v11m-4-4 4 4 4-4M5 15v5h14v-5" /></svg>
      <span className="pwa-install-label">{estaInstalada ? 'Aplicación instalada' : ocupado ? 'Abriendo…' : 'Instalar aplicación'}</span>
      <span className="pwa-install-short" aria-hidden="true">{estaInstalada ? 'Instalada' : 'Instalar'}</span>
    </button>
    <dialog className="pwa-install-dialog" ref={dialogo} aria-labelledby={titulo} onClick={e => { if (e.target === dialogo.current) dialogo.current.close() }}>
      <div className="pwa-install-dialog-head"><h2 id={titulo}>Instalar la aplicación</h2><button type="button" aria-label="Cerrar instrucciones" onClick={() => dialogo.current?.close()}>×</button></div>
      <p>Podés añadir EnsayAR a tu dispositivo para abrirla desde su propio icono.</p>
      {error ? <p role="alert">{error}</p> : null}
      <ol>
        <li><strong>En computadora:</strong> buscá el icono de instalación en la barra de direcciones o la opción «Instalar aplicación» en el menú del navegador.</li>
        <li><strong>En Android:</strong> abrí el menú del navegador y buscá «Instalar aplicación» o «Añadir a pantalla de inicio».</li>
        <li><strong>En iPhone o iPad:</strong> desde Safari, tocá Compartir y después «Añadir a pantalla de inicio».</li>
      </ol>
      <p className="pwa-install-help">La opción depende del navegador. Si no aparece, la instalación puede no estar disponible o la aplicación ya puede estar instalada. Podés seguir usando la página normalmente.</p>
      <button className="pwa-install-done" type="button" onClick={() => dialogo.current?.close()}>Entendido</button>
    </dialog>
  </>
}
