import { useEffect, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { api, apiArchivo } from './api'
import { useSession } from './session'
import { colors } from './theme'

type Tipo = 'texto' | 'entero' | 'numero' | 'dinero' | 'fecha' | 'fechahora' | 'logico'
type Columna = { clave: string; etiqueta: string; tipo: Tipo; totalizable: boolean }
type Fila = Record<string, string | number | null>
type Formato = 'pantalla' | 'pdf' | 'excel'
type Resultado = {
  titulo: string
  motor: 'modelo' | 'reglas' | 'manual'
  especificacion: Record<string, unknown> & { formato: Formato }
  interpretacion: { fuente: string; filtros: string[]; agrupar: string[]; orden: string[] }
  columnas: Columna[]
  filas: Fila[]
  totales: Record<string, number> | null
  narracion: string
  avisos: string[]
  ms: number
}

const FILAS_VISIBLES = 40

function celda(c: Columna, v: string | number | null | undefined) {
  if (v == null || v === '') return '—'
  if (c.tipo === 'dinero') return `Bs ${Number(v).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (c.tipo === 'numero' || c.tipo === 'entero') return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 2 })
  if (c.tipo === 'fecha' || c.tipo === 'fechahora') {
    const s = String(v)
    const [y, m, d] = s.slice(0, 10).split('-')
    return `${d}/${m}/${y}${c.tipo === 'fechahora' ? ` ${s.slice(11, 16)}` : ''}`
  }
  return String(v)
}

function aBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result).split(',')[1] ?? '')
    lector.onerror = () => reject(new Error('No se pudo leer el archivo'))
    lector.readAsDataURL(blob)
  })
}

/** Reporte en lenguaje natural para administración: se escribe o se dicta con el micrófono del teclado del teléfono. */
export function ReporteInteligenteMovil() {
  const s = useSession()
  const [pregunta, setPregunta] = useState('')
  const [ejemplos, setEjemplos] = useState<string[]>([])
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [cargando, setCargando] = useState(false)
  const [exportando, setExportando] = useState<Formato | null>(null)

  useEffect(() => {
    api<{ ejemplos: string[] }>('/reportes/inteligente/catalogo', s.token)
      .then(c => setEjemplos(c.ejemplos.slice(0, 4)))
      .catch(() => setEjemplos([]))
  }, [s.token])

  async function exportar(formato: 'pdf' | 'excel', r: Resultado) {
    setExportando(formato)
    try {
      const archivo = await apiArchivo('/reportes/inteligente/exportar', s.token, { formato, especificacion: r.especificacion, motor: r.motor })
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(archivo.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = archivo.nombre
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
      } else {
        const uri = `${FileSystem.cacheDirectory}${archivo.nombre}`
        await FileSystem.writeAsStringAsync(uri, await aBase64(archivo.blob), { encoding: FileSystem.EncodingType.Base64 })
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: archivo.tipo, dialogTitle: r.titulo })
        else s.setAviso(`Archivo guardado en ${uri}`)
      }
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'No se pudo exportar el reporte')
    } finally {
      setExportando(null)
    }
  }

  async function generar(texto = pregunta) {
    const limpio = texto.trim()
    if (limpio.length < 3) return
    setCargando(true)
    try {
      const r = await api<Resultado>('/reportes/inteligente', s.token, { method: 'POST', body: JSON.stringify({ pregunta: limpio }) })
      setResultado(r)
      if (r.especificacion.formato === 'pdf' || r.especificacion.formato === 'excel') void exportar(r.especificacion.formato, r)
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'No se pudo generar el reporte')
    } finally {
      setCargando(false)
    }
  }

  const r = resultado
  const principal = r?.columnas[0]
  const resto = r?.columnas.slice(1) ?? []

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>REPORTE INTELIGENTE · TEXTO O VOZ</Text>
      <Text style={styles.cardTitle}>¿Qué reporte necesitás?</Text>
      <Text style={styles.muted}>Escribilo o tocá el micrófono del teclado para dictarlo. Agregá “en PDF” o “en Excel” para descargarlo.</Text>
      <TextInput
        value={pregunta}
        onChangeText={setPregunta}
        multiline
        style={styles.input}
        placeholder="Ej. clientes con su dirección y email que me deben de 500 a 3000 Bs por ventas al crédito"
        placeholderTextColor={colors.taupe}
      />
      <Pressable disabled={cargando || pregunta.trim().length < 3} onPress={() => void generar()} style={[styles.action, (cargando || pregunta.trim().length < 3) && styles.disabled]}>
        <Text style={styles.actionText}>{cargando ? 'GENERANDO…' : 'GENERAR REPORTE'}</Text>
      </Pressable>
      {ejemplos.length ? (
        <View style={styles.chips}>
          {ejemplos.map(ej => (
            <Pressable key={ej} disabled={cargando} onPress={() => { setPregunta(ej); void generar(ej) }} style={styles.chip}>
              <Text style={styles.chipText}>{ej}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {r ? (
        <View style={styles.resultado}>
          <Text style={styles.rowTitle}>{r.titulo}</Text>
          <Text style={styles.muted}>
            {r.motor === 'modelo' ? 'Interpretado por IA' : r.motor === 'reglas' ? 'Interpretado con reglas locales' : 'Criterios editados'} · {r.filas.length} filas · {r.ms} ms
          </Text>
          <View style={styles.chips}>
            {[r.interpretacion.fuente, ...r.interpretacion.filtros, ...r.interpretacion.agrupar.map(g => `por ${g}`), ...r.interpretacion.orden].map(t => (
              <View key={t} style={styles.criterio}><Text style={styles.criterioText}>{t}</Text></View>
            ))}
          </View>
          <Text style={styles.narracion}>{r.narracion}</Text>
          {r.avisos.map(a => <Text key={a} style={styles.aviso}>{a}</Text>)}
          <View style={styles.botones}>
            <Pressable disabled={!!exportando} onPress={() => void exportar('excel', r)} style={[styles.action, styles.secondary, styles.flex]}>
              <Text style={[styles.actionText, styles.secondaryText]}>{exportando === 'excel' ? 'PREPARANDO…' : 'EXCEL'}</Text>
            </Pressable>
            <Pressable disabled={!!exportando} onPress={() => void exportar('pdf', r)} style={[styles.action, styles.secondary, styles.flex]}>
              <Text style={[styles.actionText, styles.secondaryText]}>{exportando === 'pdf' ? 'PREPARANDO…' : 'PDF'}</Text>
            </Pressable>
          </View>
          {principal && r.filas.length ? (
            r.filas.slice(0, FILAS_VISIBLES).map((f, i) => (
              <View key={i} style={styles.fila}>
                <Text style={styles.rowTitle}>{celda(principal, f[principal.clave])}</Text>
                {resto.map(c => (
                  <Text key={c.clave} style={styles.muted}>
                    {c.etiqueta}: <Text style={styles.valor}>{celda(c, f[c.clave])}</Text>
                  </Text>
                ))}
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No hay datos que cumplan esos criterios.</Text>
          )}
          {r.filas.length > FILAS_VISIBLES ? <Text style={styles.muted}>Se muestran {FILAS_VISIBLES} de {r.filas.length} filas; el PDF y el Excel las incluyen todas.</Text> : null}
          {r.totales ? (
            <View style={[styles.fila, styles.total]}>
              <Text style={styles.rowTitle}>Total</Text>
              {r.columnas.filter(c => c.clave in r.totales!).map(c => (
                <Text key={c.clave} style={styles.muted}>
                  {c.etiqueta}: <Text style={styles.valor}>{celda(c, r.totales![c.clave])}</Text>
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 13, gap: 8, marginTop: 4 },
  eyebrow: { color: colors.taupe, fontSize: 10, letterSpacing: 1.6 },
  cardTitle: { color: colors.ink, fontWeight: '700', fontSize: 18 },
  muted: { color: colors.taupe, fontSize: 12, lineHeight: 17 },
  input: { borderWidth: 1, borderColor: colors.line, color: colors.ink, padding: 11, backgroundColor: colors.paper, minHeight: 72, textAlignVertical: 'top' },
  action: { backgroundColor: colors.wine, padding: 11, alignItems: 'center' },
  actionText: { color: colors.white, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.wine },
  secondaryText: { color: colors.wine },
  disabled: { opacity: 0.45 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: colors.paper },
  chipText: { color: colors.ink, fontSize: 11 },
  resultado: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, gap: 8 },
  criterio: { backgroundColor: '#f1e4e7', paddingVertical: 4, paddingHorizontal: 8 },
  criterioText: { color: colors.wine, fontSize: 11 },
  narracion: { color: colors.ink, fontSize: 13, lineHeight: 19 },
  aviso: { color: '#8a5a12', backgroundColor: '#f7ecd6', padding: 8, fontSize: 12 },
  botones: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  fila: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, gap: 2 },
  total: { borderTopWidth: 2, borderTopColor: colors.ink },
  rowTitle: { color: colors.ink, fontWeight: '600' },
  valor: { color: colors.ink, fontWeight: '600' },
})
