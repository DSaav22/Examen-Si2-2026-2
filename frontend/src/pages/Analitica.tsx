import { useEffect, useState } from 'react'
import { api } from '../api'
import { OpsPage, OpsPanel, OpsTable } from '../shared/ops/OpsUi'

type Panel = {
  tienda: { nombre: string; moneda: string }
  datos: { periodoDias: number; ventasCobradas: number; clientesConCompras: number; variantesConVentas28Dias: number }
  demanda: { modelo: string; evaluacionSintetica: { entrenamiento: number; prueba: number; mae: number; maeBase: number }; predicciones: { varianteId: string; producto: string; sku: string; talla: string; color: string; ventas7: number; ventas28: number; disponible: number; estimacion7: number }[] }
  segmentos: { modelo: string; evaluacionSintetica: { entrenamiento: number; prueba: number; silueta: number }; grupos: { id: number; cantidad: number; centroSintetico: { recenciaDias: number; compras: number; monto: number } }[] }
  aviso: string
}

export function Analitica() {
  const [panel, setPanel] = useState<Panel | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { let activo = true; api<Panel>('/analitica/panel').then(r => { if (activo) setPanel(r) }).catch(e => { if (activo) setError((e as Error).message) }); return () => { activo = false } }, [])
  return <OpsPage eyebrow="Datos y aprendizaje automático" title="Analítica de la tienda" description="Demanda estimada y grupos de compra para explorar los datos de tu tienda.">
    {error ? <OpsPanel title="No se pudo cargar la analítica"><p role="alert">{error}</p></OpsPanel> : !panel ? <p role="status">Cargando analítica…</p> : <>
      <div className="analytics-notice" role="note"><strong>Modelo experimental.</strong> {panel.aviso}</div>
      <div className="analytics-kpis"><div><span>Ventas cobradas · {panel.datos.periodoDias} días</span><strong>{panel.datos.ventasCobradas}</strong></div><div><span>Clientas con compras</span><strong>{panel.datos.clientesConCompras}</strong></div><div><span>Variantes con ventas · 28 días</span><strong>{panel.datos.variantesConVentas28Dias}</strong></div></div>
      <div className="analytics-grid"><OpsPanel title="Demanda para los próximos 7 días" eyebrow="Modelo supervisado">
        <p className="muted">{panel.demanda.modelo} entrenada con {panel.demanda.evaluacionSintetica.entrenamiento} ejemplos sintéticos y evaluada con {panel.demanda.evaluacionSintetica.prueba} ejemplos sintéticos reservados.</p>
        <p className="analytics-metrics">Error medio absoluto: <strong>{panel.demanda.evaluacionSintetica.mae}</strong> unidades · Línea base: <strong>{panel.demanda.evaluacionSintetica.maeBase}</strong></p>
        {panel.demanda.predicciones.length ? <OpsTable minWidth={680}><thead><tr><th>Prenda</th><th>Variante</th><th>Ventas 7 / 28 días</th><th>Disponible</th><th>Estimación 7 días</th></tr></thead><tbody>{panel.demanda.predicciones.map(p => <tr key={p.varianteId}><td><strong>{p.producto}</strong><br /><small>{p.sku}</small></td><td>{p.talla} · {p.color}</td><td>{p.ventas7} / {p.ventas28}</td><td>{p.disponible}</td><td>{p.estimacion7}</td></tr>)}</tbody></OpsTable> : <p className="muted">No hay ventas cobradas en los últimos 28 días para estimar demanda.</p>}
      </OpsPanel><OpsPanel title="Grupos de compra" eyebrow="Modelo no supervisado">
        <p className="muted">{panel.segmentos.modelo} agrupa por recencia, frecuencia y monto en los últimos 90 días. Entrenamiento: {panel.segmentos.evaluacionSintetica.entrenamiento} ejemplos sintéticos; prueba: {panel.segmentos.evaluacionSintetica.prueba}.</p>
        <p className="analytics-metrics">Silueta en datos sintéticos: <strong>{panel.segmentos.evaluacionSintetica.silueta}</strong></p>
        {panel.datos.clientesConCompras ? <ul className="analytics-groups">{panel.segmentos.grupos.map(g => <li key={g.id}><div><strong>Grupo {g.id}</strong><span>{g.cantidad} clientas</span></div><div className="analytics-track"><span style={{ width: `${g.cantidad / panel.datos.clientesConCompras * 100}%` }} /></div><small>Centro sintético: {g.centroSintetico.recenciaDias} días · {g.centroSintetico.compras} compras · {g.centroSintetico.monto} unidades monetarias sintéticas</small></li>)}</ul> : <p className="muted">No hay ventas cobradas asociadas a clientas en los últimos 90 días.</p>}
      </OpsPanel></div>
      <p className="muted analytics-footnote">Los centros y las métricas provienen de datos sintéticos, no de clientes reales. El monto sintético no representa una moneda ni un valor esperado para tu tienda.</p>
    </>}
  </OpsPage>
}
