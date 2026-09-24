import { CameraView, useCameraPermissions } from 'expo-camera'
import { useEffect, useMemo, useState } from 'react'
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { api, apiBase, assetUrl, guardarApiBase } from './api'
import { useSession } from './session'
import { colors } from './theme'
import {
  precioEfectivo,
  type CatalogPage,
  type Producto,
  type Reserva,
  type Sucursal,
  type Variante,
  type Venta,
} from './types'
import { Btn, ProductCard, ProductImage } from './ui'

const input = {
  borderWidth: 1,
  borderColor: colors.line,
  backgroundColor: colors.surface,
  padding: 12,
  color: colors.ink,
} as const

function fotoDe(p: Producto) {
  return p.variantes[0]?.urlFoto
}

export function LoginScreen() {
  const s = useSession()
  const [email, setEmail] = useState('clienta@ensayar.bo')
  const [password, setPassword] = useState('diego')
  const [servidor, setServidor] = useState(apiBase())
  const [cargando, setCargando] = useState(false)

  async function submit() {
    setCargando(true)
    s.setError('')
    try {
      await guardarApiBase(servidor)
      await s.entrar(email.trim(), password)
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'No se pudo entrar')
    } finally {
      setCargando(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>ENSAYAR</Text>
      <Text style={styles.h1}>La nueva{'\n'}sofisticación</Text>
      <Text style={styles.lead}>Entra con tu cuenta de clienta para ver la colección, probar prendas y comprar.</Text>
      <Text style={styles.label}>Correo</Text>
      <TextInput style={input} autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Text style={styles.label}>Clave</Text>
      <TextInput style={input} secureTextEntry value={password} onChangeText={setPassword} />
      <Text style={styles.label}>Servidor de la API</Text>
      <TextInput style={input} autoCapitalize="none" value={servidor} onChangeText={setServidor} />
      <Text style={styles.hint}>En el teléfono usa la IP de tu PC, por ejemplo http://10.253.6.26:3000</Text>
      <Btn label="ENTRAR" onPress={() => void submit()} loading={cargando} />
      <Btn label="CREAR CUENTA" ghost onPress={() => s.push({ name: 'registro' })} />
    </ScrollView>
  )
}

export function RegistroScreen() {
  const s = useSession()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)

  async function submit() {
    setCargando(true)
    try {
      await s.registrar(nombre.trim(), email.trim(), password)
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'No se pudo registrar')
    } finally {
      setCargando(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>CUENTA NUEVA</Text>
      <Text style={styles.h1}>Registro</Text>
      <Text style={styles.label}>Nombre</Text>
      <TextInput style={input} value={nombre} onChangeText={setNombre} />
      <Text style={styles.label}>Correo</Text>
      <TextInput style={input} autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Text style={styles.label}>Clave</Text>
      <TextInput style={input} secureTextEntry value={password} onChangeText={setPassword} />
      <Btn label="CREAR CUENTA" onPress={() => void submit()} loading={cargando} disabled={nombre.length < 2 || password.length < 4} />
      <Btn label="YA TENGO CUENTA" ghost onPress={s.back} />
    </ScrollView>
  )
}

export function HomeScreen() {
  const s = useSession()
  const [products, setProducts] = useState<Producto[]>([])
  const [popular, setPopular] = useState<Producto[]>([])
  const [novedades, setNovedades] = useState<Producto[]>([])
  const [refreshing, setRefreshing] = useState(false)

  async function cargar() {
    try {
      const [items, pop, neu] = await Promise.all([
        api<Producto[]>('/catalogo/productos', s.token),
        api<Producto[]>('/catalogo/productos?ordenar=popularidad', s.token),
        api<Producto[]>('/catalogo/productos?ordenar=novedades', s.token),
      ])
      setProducts(items)
      setPopular(pop.slice(0, 4))
      setNovedades((neu.length ? neu : items).slice(0, 4))
      s.setError('')
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'No pudimos cargar la selección')
    }
  }

  useEffect(() => {
    void cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hero = novedades[0] ?? products[0]
  const look = products.slice(0, 3)

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void cargar().finally(() => setRefreshing(false)) }} />}
    >
      <View style={styles.hero}>
        {hero && fotoDe(hero) ? (
          <Image source={{ uri: assetUrl(fotoDe(hero)!) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <View style={styles.heroDim} />
        <Text style={styles.heroEye}>EDICIÓN 01 · OTOÑO</Text>
        <Text style={styles.heroTitle}>La nueva{'\n'}sofisticación</Text>
        <Text style={styles.heroLead}>Prendas contemporáneas, tonos serenos y cortes que permanecen.</Text>
        <Pressable style={styles.heroCta} onPress={() => s.abrirCatalogo()}>
          <Text style={styles.heroCtaText}>DESCUBRIR COLECCIÓN</Text>
        </Pressable>
      </View>
      <View style={styles.campaign}>
        <Text style={styles.campaignText}>OFERTA DE TEMPORADA · HASTA 25%</Text>
      </View>
      <Rail title="La nueva sofisticación" eyebrow="NOVEDADES" items={novedades} onAll={() => s.abrirCatalogo('novedades')} />
      <Rail title="Favoritos de la semana" eyebrow="LOS MÁS ELEGIDOS" items={popular} onAll={() => s.abrirCatalogo()} />
      <View style={styles.pad}>
        <Text style={styles.eyebrow}>DESCUBRE POR OCASIÓN</Text>
        <Text style={styles.h2}>Vestir cada momento</Text>
        <View style={styles.occGrid}>
          {['Trabajo', 'Fiesta', 'Casual', 'Temporada'].map((oc) => (
            <Pressable key={oc} style={styles.occ} onPress={() => s.abrirCatalogo('ocasiones', oc.toLowerCase())}>
              <Text style={styles.occText}>{oc}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.eyebrow}>COMPRA EL LOOK</Text>
        <Text style={styles.h2}>Sastrería tonal</Text>
        {look.map((p) => (
          <Pressable key={p.id} style={styles.lookRow} onPress={() => s.push({ name: 'ficha', id: p.id })}>
            <Text style={styles.lookName}>{p.nombre}</Text>
            <Text>Bs {precioEfectivo(p).toFixed(0)}</Text>
          </Pressable>
        ))}
        <Btn
          label="AÑADIR LOOK COMPLETO"
          disabled={look.length < 3}
          onPress={() => {
            look.forEach((p) => {
              const v = p.variantes[0]
              if (!v) return
              s.addToCart({
                productoId: p.id,
                nombre: p.nombre,
                precio: precioEfectivo(p),
                varianteId: v.id,
                talla: v.talla,
                color: v.color,
                foto: v.urlFoto,
              })
            })
          }}
        />
        <View style={styles.benefits}>
          {['Envío nacional', 'Retiro en tienda', 'Cambios simples', 'Compra segura'].map((b) => (
            <Text key={b} style={styles.benefit}>{b}</Text>
          ))}
        </View>
        {s.sucursal ? (
          <Text style={styles.hint}>Sucursal seleccionada: {s.sucursal.nombre}{s.sucursal.ciudad ? ` · ${s.sucursal.ciudad}` : ''}</Text>
        ) : null}
      </View>
    </ScrollView>
  )
}

function Rail({
  title,
  eyebrow,
  items,
  onAll,
}: {
  title: string
  eyebrow: string
  items: Producto[]
  onAll: () => void
}) {
  const s = useSession()
  return (
    <View style={styles.rail}>
      <View style={styles.railHead}>
        <View>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.h2}>{title}</Text>
        </View>
        <Pressable onPress={onAll}><Text style={styles.link}>Ver todo</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
        {items.map((p) => (
          <View key={p.id} style={{ width: 160 }}>
            <ProductCard producto={p} onOpen={() => s.push({ name: 'ficha', id: p.id })} />
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

export function CatalogoScreen() {
  const s = useSession()
  const filtro = s.screen.name === 'catalogo' ? s.screen.filtro : undefined
  const ocasionInicial = s.screen.name === 'catalogo' ? s.screen.ocasion ?? '' : ''
  const [q, setQ] = useState('')
  const [ocasion, setOcasion] = useState(ocasionInicial)
  const [items, setItems] = useState<Producto[]>([])
  const [pagina, setPagina] = useState(1)
  const [hayMas, setHayMas] = useState(false)
  const [cargando, setCargando] = useState(false)

  const query = useMemo(() => {
    const p = new URLSearchParams()
    p.set('pagina', String(pagina))
    p.set('limite', '8')
    if (q.trim()) p.set('q', q.trim())
    if (ocasion) p.set('ocasion', ocasion)
    if (filtro === 'novedades') p.set('ordenar', 'novedades')
    if (filtro === 'ofertas') p.set('descuento', 'true')
    return p.toString()
  }, [pagina, q, ocasion, filtro])

  useEffect(() => {
    let vivo = true
    setCargando(true)
    void api<CatalogPage>(`/catalogo/productos?${query}`, s.token)
      .then((res) => {
        if (!vivo) return
        const lista = Array.isArray(res) ? res : res.items
        setItems((prev) => (pagina === 1 ? lista : [...prev, ...lista]))
        setHayMas(Array.isArray(res) ? false : res.hayMas)
        s.setError('')
      })
      .catch((e: unknown) => {
        if (vivo) s.setError(e instanceof Error ? e.message : 'Catálogo no disponible')
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [query, pagina, s])

  const titulo = filtro === 'novedades' ? 'Novedades' : filtro === 'ofertas' ? 'Ofertas' : filtro === 'ocasiones' ? 'Ocasiones' : 'Mujer'

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.eyebrow}>COLECCIÓN</Text>
      <Text style={styles.h1}>{titulo}</Text>
      <TextInput
        style={input}
        placeholder="Buscar prendas"
        placeholderTextColor={colors.taupe}
        value={q}
        onChangeText={(t) => {
          setPagina(1)
          setQ(t)
        }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
        {['', 'trabajo', 'fiesta', 'casual', 'temporada'].map((oc) => (
          <Pressable
            key={oc || 'todas'}
            style={[styles.chip, ocasion === oc && styles.chipOn]}
            onPress={() => {
              setPagina(1)
              setOcasion(oc)
            }}
          >
            <Text style={[styles.chipText, ocasion === oc && styles.chipTextOn]}>{oc || 'Todas'}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.grid}>
        {items.map((p) => (
          <View key={p.id} style={styles.cell}>
            <ProductCard producto={p} onOpen={() => s.push({ name: 'ficha', id: p.id })} />
          </View>
        ))}
      </View>
      {hayMas ? <Btn label={cargando ? 'CARGANDO' : 'VER MÁS'} ghost onPress={() => setPagina((n) => n + 1)} /> : null}
      {!cargando && items.length === 0 ? <Text style={styles.hint}>No hay prendas con ese filtro.</Text> : null}
    </ScrollView>
  )
}

export function FichaScreen() {
  const s = useSession()
  const id = s.screen.name === 'ficha' ? s.screen.id : ''
  const [p, setP] = useState<Producto | null>(null)
  const [color, setColor] = useState('')
  const [talla, setTalla] = useState('')
  const [opiniones, setOpiniones] = useState<{ promedio: number; cantidad: number; items: { id: string; puntuacion: number; comentario?: string; usuario?: { nombre: string } }[] } | null>(null)
  const [comentario, setComentario] = useState('')

  useEffect(() => {
    if (!id) return
    void api<Producto>(`/catalogo/productos/${id}`, s.token).then((prod) => {
      setP(prod)
      setColor(prod.variantes[0]?.color ?? '')
      setTalla(prod.variantes[0]?.talla ?? '')
    }).catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'Ficha no disponible'))
    void api<typeof opiniones>('/catalogo/productos/' + id + '/opiniones', null)
      .then(setOpiniones)
      .catch(() => undefined)
  }, [id, s])

  if (!p) return <Text style={styles.hint}>Cargando ficha…</Text>
  const colores = [...new Set(p.variantes.map((v) => v.color))]
  const tallas = [...new Set(p.variantes.filter((v) => v.color === color).map((v) => v.talla))]
  const variante = p.variantes.find((v) => v.color === color && v.talla === talla) ?? p.variantes[0]
  const fav = s.favs.includes(p.id)

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Pressable onPress={s.back}><Text style={styles.link}>← Volver</Text></Pressable>
      {variante ? <ProductImage producto={p} variante={variante} style={styles.fichaImg} /> : null}
      <Text style={styles.eyebrow}>{(p.ocasion || 'MUJER').toUpperCase()}</Text>
      <Text style={styles.h1}>{p.nombre}</Text>
      <Text style={styles.priceBig}>Bs {precioEfectivo(p).toFixed(0)}</Text>
      {p.descripcion ? <Text style={styles.lead}>{p.descripcion}</Text> : null}
      <Text style={styles.label}>Color</Text>
      <View style={styles.chips}>
        {colores.map((c) => (
          <Pressable key={c} style={[styles.chip, color === c && styles.chipOn]} onPress={() => { setColor(c); const next = p.variantes.find((v) => v.color === c); if (next) setTalla(next.talla) }}>
            <Text style={[styles.chipText, color === c && styles.chipTextOn]}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Talla</Text>
      <View style={styles.chips}>
        {tallas.map((t) => (
          <Pressable key={t} style={[styles.chip, talla === t && styles.chipOn]} onPress={() => setTalla(t)}>
            <Text style={[styles.chipText, talla === t && styles.chipTextOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      {variante ? (
        <Btn
          label="AÑADIR A LA BOLSA"
          onPress={() =>
            s.addToCart({
              productoId: p.id,
              nombre: p.nombre,
              precio: precioEfectivo(p),
              varianteId: variante.id,
              talla: variante.talla,
              color: variante.color,
              foto: variante.urlFoto,
            })
          }
        />
      ) : null}
      <Btn label={fav ? 'QUITAR DE FAVORITOS' : 'GUARDAR EN FAVORITOS'} ghost onPress={() => void s.toggleFav(p.id)} />
      {variante ? <Btn label="PROBAR CON CÁMARA" ghost onPress={() => s.push({ name: 'probar', varianteId: variante.id })} /> : null}
      <Btn label="PREGUNTAR AL ASISTENTE" ghost onPress={() => s.push({ name: 'asistente', productoId: p.id })} />
      {p.material ? <Text style={styles.hint}>Material: {p.material}</Text> : null}
      {p.cuidados ? <Text style={styles.hint}>Cuidados: {p.cuidados}</Text> : null}
      <Text style={styles.h2}>Opiniones {opiniones ? `· ${opiniones.promedio.toFixed(1)} (${opiniones.cantidad})` : ''}</Text>
      {opiniones?.items.map((op) => (
        <Text key={op.id} style={styles.hint}>{op.usuario?.nombre ?? 'Clienta'} · {'★'.repeat(op.puntuacion)} {op.comentario ?? ''}</Text>
      ))}
      {s.user?.rol === 'CLIENTA' ? (
        <>
          <TextInput style={[input, { marginTop: 8 }]} placeholder="Tu comentario" placeholderTextColor={colors.taupe} value={comentario} onChangeText={setComentario} />
          <Btn
            label="PUBLICAR OPINIÓN"
            ghost
            onPress={() => {
              void api(`/catalogo/productos/${p.id}/opiniones`, s.token, {
                method: 'POST',
                body: JSON.stringify({ puntuacion: 5, comentario }),
              }).then(() => {
                s.setAviso('Opinión publicada')
                setComentario('')
              }).catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'No se publicó'))
            }}
          />
        </>
      ) : null}
    </ScrollView>
  )
}

export function FavoritosScreen() {
  const s = useSession()
  const [items, setItems] = useState<Producto[]>([])
  useEffect(() => {
    void api<Producto[]>('/catalogo/productos', s.token)
      .then((all) => setItems(all.filter((p) => s.favs.includes(p.id))))
      .catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'No se cargaron favoritos'))
  }, [s])
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.eyebrow}>GUARDADOS</Text>
      <Text style={styles.h1}>Favoritos</Text>
      <View style={styles.grid}>
        {items.map((p) => (
          <View key={p.id} style={styles.cell}>
            <ProductCard producto={p} onOpen={() => s.push({ name: 'ficha', id: p.id })} />
          </View>
        ))}
      </View>
      {items.length === 0 ? <Text style={styles.hint}>Todavía no guardaste prendas.</Text> : null}
    </ScrollView>
  )
}

export function BolsaScreen() {
  const s = useSession()
  const [cupon, setCupon] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [pagoPendiente, setPagoPendiente] = useState<string | null>(null)

  async function comprar(medio: 'contra_entrega' | 'qr') {
    if (!s.token || !s.almacenId || !s.cart.length) {
      s.setError(s.almacenId ? 'La bolsa está vacía' : 'Elige una sucursal con almacén')
      return
    }
    setOcupado(true)
    try {
      const venta = await api<{ id: string; total: string; pago?: { id: string } | null }>('/ventas', s.token, {
        method: 'POST',
        body: JSON.stringify({
          uuid: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          canal: 'online',
          medioPago: medio,
          almacenId: s.almacenId,
          cuponCodigo: cupon.trim() || undefined,
          lineas: s.cart.map((l) => ({ varianteId: l.varianteId, cantidad: l.cantidad })),
        }),
      })
      if (medio === 'qr' && venta.pago?.id) {
        setPagoPendiente(venta.pago.id)
        s.setAviso(`Pedido ${venta.id.slice(0, 8)} pendiente de pago QR · Bs ${Number(venta.total).toFixed(2)}`)
      } else {
        s.setAviso(`Compra ${venta.id.slice(0, 8)} · Bs ${Number(venta.total).toFixed(2)}`)
        s.vaciar()
        setCupon('')
      }
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'La compra falló')
    } finally {
      setOcupado(false)
    }
  }

  async function simular(resultado: 'aprobado' | 'rechazado') {
    if (!pagoPendiente || !s.token) return
    try {
      await api(`/pagos/${pagoPendiente}/simular`, s.token, {
        method: 'POST',
        body: JSON.stringify({ resultado }),
      })
      s.setAviso(resultado === 'aprobado' ? 'Pago QR aprobado' : 'Pago QR rechazado')
      if (resultado === 'aprobado') s.vaciar()
      setPagoPendiente(null)
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'No se simuló el pago')
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.eyebrow}>TU SELECCIÓN</Text>
      <Text style={styles.h1}>Bolsa</Text>
      {s.cart.map((l) => (
        <View key={l.varianteId} style={styles.line}>
          <View style={{ flex: 1 }}>
            <Text style={styles.lookName}>{l.nombre}</Text>
            <Text style={styles.hint}>{l.talla} / {l.color} · Bs {(l.precio * l.cantidad).toFixed(2)}</Text>
          </View>
          <Pressable onPress={() => s.setQty(l.varianteId, l.cantidad - 1)}><Text style={styles.qty}>−</Text></Pressable>
          <Text style={styles.qtyN}>{l.cantidad}</Text>
          <Pressable onPress={() => s.setQty(l.varianteId, l.cantidad + 1)}><Text style={styles.qty}>+</Text></Pressable>
        </View>
      ))}
      {!s.cart.length ? <Text style={styles.hint}>La bolsa está vacía.</Text> : null}
      <Text style={styles.priceBig}>Total Bs {s.total.toFixed(2)}</Text>
      <Text style={styles.hint}>Despacho: {s.sucursal?.nombre ?? 'sin sucursal'}</Text>
      <Text style={styles.label}>Cupón</Text>
      <TextInput style={input} autoCapitalize="characters" placeholder="VESTA10" placeholderTextColor={colors.taupe} value={cupon} onChangeText={setCupon} />
      <Btn label="COMPRAR CONTRA ENTREGA" onPress={() => void comprar('contra_entrega')} loading={ocupado} disabled={!s.cart.length} />
      <Btn label="PAGAR CON QR" ghost onPress={() => void comprar('qr')} disabled={!s.cart.length || ocupado} />
      {pagoPendiente ? (
        <>
          <Btn label="SIMULAR QR APROBADO" onPress={() => void simular('aprobado')} />
          <Btn label="SIMULAR QR RECHAZADO" ghost onPress={() => void simular('rechazado')} />
        </>
      ) : null}
      <Btn label="RESERVAR EN TIENDA" ghost onPress={() => s.push({ name: 'reservas' })} disabled={!s.cart.length} />
    </ScrollView>
  )
}

export function ReservasScreen() {
  const s = useSession()
  const [lista, setLista] = useState<Reserva[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalId, setSucursalId] = useState(s.sucursalId)

  async function cargar() {
    const [mias, suc] = await Promise.all([
      api<Reserva[]>('/reservas/mias', s.token),
      api<Sucursal[]>('/catalogo/sucursales', null),
    ])
    setLista(mias)
    setSucursales(suc)
  }

  useEffect(() => {
    void cargar().catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'Reservas no disponibles'))
  }, [s])

  async function crear() {
    if (!s.cart.length || !sucursalId) {
      s.setError('Agrega prendas a la bolsa y elige sucursal')
      return
    }
    const horario = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    try {
      await api('/reservas', s.token, {
        method: 'POST',
        body: JSON.stringify({
          sucursalId,
          horario,
          lineas: s.cart.map((l) => ({ varianteId: l.varianteId, cantidad: l.cantidad })),
        }),
      })
      s.vaciar()
      s.setAviso('Reserva creada')
      await cargar()
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'No se creó la reserva')
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Pressable onPress={s.back}><Text style={styles.link}>← Volver</Text></Pressable>
      <Text style={styles.eyebrow}>PROBADOR EN TIENDA</Text>
      <Text style={styles.h1}>Reservas</Text>
      <Text style={styles.hint}>{s.cart.length} prenda(s) en la bolsa se reservan para dentro de 3 horas.</Text>
      <View style={styles.chips}>
        {sucursales.map((suc) => (
          <Pressable key={suc.id} style={[styles.chip, sucursalId === suc.id && styles.chipOn]} onPress={() => setSucursalId(suc.id)}>
            <Text style={[styles.chipText, sucursalId === suc.id && styles.chipTextOn]}>{suc.nombre}</Text>
          </Pressable>
        ))}
      </View>
      <Btn label="CREAR RESERVA" onPress={() => void crear()} disabled={!s.cart.length} />
      {lista.map((r) => (
        <View key={r.id} style={styles.block}>
          <Text style={styles.lookName}>{r.sucursal.nombre} · {r.estado}</Text>
          <Text style={styles.hint}>{new Date(r.horario).toLocaleString()}</Text>
          {r.lineas?.map((l, i) => (
            <Text key={`${r.id}-${i}`} style={styles.hint}>{l.variante.producto.nombre} {l.variante.talla}/{l.variante.color} × {l.cantidad}</Text>
          ))}
          {r.estado !== 'cancelada' && r.estado !== 'completada' ? (
            <Btn
              label="CANCELAR"
              ghost
              onPress={() => {
                void api(`/reservas/${r.id}/estado`, s.token, {
                  method: 'PATCH',
                  body: JSON.stringify({ estado: 'cancelada' }),
                }).then(() => cargar()).catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'No se canceló'))
              }}
            />
          ) : null}
        </View>
      ))}
    </ScrollView>
  )
}

export function HistorialScreen() {
  const s = useSession()
  const [ventas, setVentas] = useState<Venta[]>([])

  function cargar() {
    return api<Venta[]>('/ventas/historial', s.token).then(setVentas)
  }

  useEffect(() => {
    void cargar().catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'Sin historial'))
  }, [s])

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Pressable onPress={s.back}><Text style={styles.link}>← Volver</Text></Pressable>
      <Text style={styles.eyebrow}>TUS COMPRAS</Text>
      <Text style={styles.h1}>Pedidos</Text>
      {ventas.map((v) => (
        <View key={v.id} style={styles.block}>
          <Text style={styles.lookName}>{v.estado} · Bs {Number(v.total).toFixed(2)}</Text>
          <Text style={styles.hint}>{v.medioPago} · {new Date(v.creadaEn).toLocaleString()}</Text>
          {v.pedido ? <Text style={styles.hint}>Envío: {v.pedido.estado}{v.pedido.seguimiento ? ` · ${v.pedido.seguimiento}` : ''}</Text> : null}
          {v.lineas.map((l) => (
            <Text key={l.id} style={styles.hint}>{l.variante.producto.nombre} {l.variante.talla}/{l.variante.color} × {l.cantidad}</Text>
          ))}
          {v.pago?.estado === 'pendiente' ? (
            <Btn
              label="SIMULAR PAGO APROBADO"
              onPress={() => {
                void api(`/pagos/${v.pago!.id}/simular`, s.token, {
                  method: 'POST',
                  body: JSON.stringify({ resultado: 'aprobado' }),
                }).then(() => cargar()).catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'Pago no simulado'))
              }}
            />
          ) : null}
        </View>
      ))}
      {ventas.length === 0 ? <Text style={styles.hint}>Aún no hay compras.</Text> : null}
    </ScrollView>
  )
}

export function CuentaScreen() {
  const s = useSession()
  const [perfil, setPerfil] = useState<{ nombre: string; email: string; lealtad?: { puntos: number; nivel: string }; direcciones: { id: string; etiqueta: string; detalle: string; ciudad: string }[] } | null>(null)
  const [cupones, setCupones] = useState<{ id: string; codigo: string; porcentaje: number }[]>([])
  const [nombre, setNombre] = useState('')
  const [etiqueta, setEtiqueta] = useState('Casa')
  const [ciudad, setCiudad] = useState('Santa Cruz')
  const [detalle, setDetalle] = useState('')
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')

  useEffect(() => {
    if (s.user?.rol !== 'CLIENTA') return
    void api<NonNullable<typeof perfil>>('/cliente/perfil', s.token).then((p) => {
      setPerfil(p)
      setNombre(p.nombre)
    }).catch(() => undefined)
    void api<typeof cupones>('/cliente/cupones', s.token).then(setCupones).catch(() => undefined)
  }, [s])

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.eyebrow}>{s.user?.rol ?? ''}</Text>
      <Text style={styles.h1}>{s.user?.nombre}</Text>
      <Text style={styles.hint}>{s.user?.email}</Text>
      {perfil?.lealtad ? <Text style={styles.lead}>{perfil.lealtad.nivel} · {perfil.lealtad.puntos} puntos</Text> : null}
      {cupones.map((c) => (
        <Text key={c.id} style={styles.hint}>Cupón {c.codigo} · {c.porcentaje}%</Text>
      ))}
      <Btn label="MIS RESERVAS" ghost onPress={() => s.push({ name: 'reservas' })} />
      <Btn label="MIS PEDIDOS" ghost onPress={() => s.push({ name: 'historial' })} />
      <Btn label="ASISTENTE" ghost onPress={() => s.push({ name: 'asistente' })} />
      {s.user?.rol === 'CLIENTA' ? (
        <>
          <Text style={styles.label}>Nombre</Text>
          <TextInput style={input} value={nombre} onChangeText={setNombre} />
          <Btn
            label="GUARDAR NOMBRE"
            ghost
            onPress={() => {
              void api('/cliente/perfil', s.token, { method: 'PATCH', body: JSON.stringify({ nombre }) })
                .then(() => s.setAviso('Nombre actualizado'))
                .catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'No se guardó'))
            }}
          />
          <Text style={styles.h2}>Dirección</Text>
          <TextInput style={input} value={etiqueta} onChangeText={setEtiqueta} placeholder="Etiqueta" placeholderTextColor={colors.taupe} />
          <TextInput style={[input, { marginTop: 8 }]} value={ciudad} onChangeText={setCiudad} placeholder="Ciudad" placeholderTextColor={colors.taupe} />
          <TextInput style={[input, { marginTop: 8 }]} value={detalle} onChangeText={setDetalle} placeholder="Detalle" placeholderTextColor={colors.taupe} />
          <Btn
            label="AÑADIR DIRECCIÓN"
            ghost
            onPress={() => {
              void api('/cliente/direcciones', s.token, {
                method: 'POST',
                body: JSON.stringify({ etiqueta, ciudad, detalle }),
              }).then(() => s.setAviso('Dirección guardada')).catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'Dirección no guardada'))
            }}
          />
          {perfil?.direcciones.map((d) => (
            <Text key={d.id} style={styles.hint}>{d.etiqueta}: {d.detalle}, {d.ciudad}</Text>
          ))}
          <Text style={styles.h2}>Clave</Text>
          <TextInput style={input} secureTextEntry placeholder="Clave actual" placeholderTextColor={colors.taupe} value={actual} onChangeText={setActual} />
          <TextInput style={[input, { marginTop: 8 }]} secureTextEntry placeholder="Nueva clave (8+)" placeholderTextColor={colors.taupe} value={nueva} onChangeText={setNueva} />
          <Btn
            label="CAMBIAR CLAVE"
            ghost
            onPress={() => {
              void api('/auth/cambiar-clave', s.token, { method: 'POST', body: JSON.stringify({ actual, nueva }) })
                .then(() => s.setAviso('Clave actualizada'))
                .catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'Clave no cambiada'))
            }}
          />
        </>
      ) : (
        <Text style={styles.hint}>Esta app está pensada para la clienta. El personal opera desde la web.</Text>
      )}
      <Btn label="SALIR" onPress={() => void s.salir()} />
    </ScrollView>
  )
}

export function AsistenteScreen() {
  const s = useSession()
  const productoId = s.screen.name === 'asistente' ? s.screen.productoId : undefined
  const [texto, setTexto] = useState('')
  const [msgs, setMsgs] = useState<{ rol: 'clienta' | 'asistente'; texto: string }[]>([])
  const [ocupado, setOcupado] = useState(false)

  async function enviar() {
    const mensaje = texto.trim()
    if (mensaje.length < 2 || !s.token) return
    const historial = msgs
    setMsgs((m) => [...m, { rol: 'clienta', texto: mensaje }])
    setTexto('')
    setOcupado(true)
    try {
      const res = await api<{ respuesta: string }>('/ia/bot', s.token, {
        method: 'POST',
        body: JSON.stringify({ mensaje, productoId, historial }),
      })
      setMsgs((m) => [...m, { rol: 'asistente', texto: res.respuesta }])
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'El asistente no respondió')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      <Pressable onPress={s.back}><Text style={styles.link}>← Volver</Text></Pressable>
      <Text style={styles.eyebrow}>VESTA</Text>
      <Text style={styles.h1}>Asistente</Text>
      <Text style={styles.lead}>Pregunta por tallas, ocasiones o una prenda de la ficha.</Text>
      {msgs.map((m, i) => (
        <View key={`${i}-${m.rol}`} style={[styles.bubble, m.rol === 'clienta' && styles.bubbleMe]}>
          <Text style={m.rol === 'clienta' ? styles.bubbleMeText : styles.bubbleText}>{m.texto}</Text>
        </View>
      ))}
      <TextInput style={[input, { marginTop: 12 }]} value={texto} onChangeText={setTexto} placeholder="Escribe tu pregunta" placeholderTextColor={colors.taupe} />
      <Btn label="ENVIAR" onPress={() => void enviar()} loading={ocupado} />
    </ScrollView>
  )
}

export function ProbadorScreen() {
  const s = useSession()
  const varianteId = s.screen.name === 'probar' ? s.screen.varianteId : ''
  const [permiso, pedir] = useCameraPermissions()
  const [overlay, setOverlay] = useState<{ producto: string; talla: string; color: string; urlOverlay: string } | null>(null)
  const [hombros, setHombros] = useState<{ x: number; y: number }[]>([])

  useEffect(() => {
    if (!varianteId) return
    void api<{ producto: string; talla: string; color: string; urlOverlay: string }>(
      `/catalogo/variantes/${varianteId}/overlay`,
      null,
    ).then(setOverlay).catch(() => s.setError('No hay overlay para esta variante'))
    if (!permiso?.granted) void pedir()
  }, [varianteId, permiso, pedir, s])

  return (
    <View style={styles.camera}>
      {permiso?.granted ? <CameraView style={StyleSheet.absoluteFill} facing="front" /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#222' }]} />}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(ev) => {
          const { locationX, locationY } = ev.nativeEvent
          setHombros((h) => [...h, { x: locationX, y: locationY }].slice(-2))
        }}
      />
      {overlay ? (
        <Image
          source={{ uri: assetUrl(overlay.urlOverlay) }}
          style={hombros.length === 2 ? clothDesdeHombros(hombros[0], hombros[1]) : styles.cloth}
          resizeMode="contain"
        />
      ) : null}
      <View style={styles.hud}>
        <Text style={styles.hudText}>{overlay ? `${overlay.producto} · ${overlay.talla}/${overlay.color}` : 'Cargando prenda'}</Text>
        <Text style={styles.hudText}>Toca los dos hombros para ajustar la prenda.</Text>
        <Btn label="CERRAR" onPress={() => { setHombros([]); s.back() }} />
      </View>
    </View>
  )
}

function clothDesdeHombros(a: { x: number; y: number }, b: { x: number; y: number }) {
  const ancho = Math.max(80, Math.hypot(b.x - a.x, b.y - a.y) * 1.85)
  const midX = (a.x + b.x) / 2
  const midY = (a.y + b.y) / 2
  return {
    position: 'absolute' as const,
    left: midX - ancho / 2,
    top: midY - ancho * 0.12,
    width: ancho,
    height: ancho * 1.55,
  }
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40, gap: 8 },
  eyebrow: { letterSpacing: 2, color: colors.taupe, fontSize: 11, marginTop: 8 },
  h1: { fontSize: 32, fontWeight: '600', color: colors.ink, lineHeight: 36 },
  h2: { fontSize: 22, fontWeight: '600', color: colors.ink, marginTop: 8 },
  lead: { color: colors.ink, lineHeight: 20, marginVertical: 6 },
  label: { marginTop: 10, fontSize: 12, letterSpacing: 1, color: colors.taupe },
  hint: { color: colors.taupe, fontSize: 13, marginTop: 4 },
  link: { color: colors.wine, marginBottom: 8 },
  hero: { minHeight: 420, justifyContent: 'flex-end', padding: 20, backgroundColor: colors.wineDeep },
  heroDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,16,16,0.35)' },
  heroEye: { color: colors.gold, letterSpacing: 2, fontSize: 12 },
  heroTitle: { color: colors.white, fontSize: 40, lineHeight: 44, fontWeight: '600', marginTop: 8 },
  heroLead: { color: colors.white, marginTop: 8, maxWidth: 280 },
  heroCta: { marginTop: 16, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.white, paddingVertical: 12, paddingHorizontal: 16 },
  heroCtaText: { color: colors.white, letterSpacing: 1, fontSize: 12 },
  campaign: { backgroundColor: colors.dark, padding: 12 },
  campaignText: { color: colors.white, letterSpacing: 1, fontSize: 12, textAlign: 'center' },
  rail: { marginTop: 18 },
  railHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16 },
  cell: { width: '48%' },
  occGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  occ: { width: '48%', minHeight: 88, backgroundColor: colors.dark, justifyContent: 'flex-end', padding: 12 },
  occText: { color: colors.white, fontSize: 16 },
  lookRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 10 },
  lookName: { fontWeight: '600', color: colors.ink, flex: 1 },
  benefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  benefit: { width: '48%', borderWidth: 1, borderColor: colors.line, padding: 12, color: colors.ink },
  chip: { borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.dark, borderColor: colors.dark },
  chipText: { color: colors.ink, textTransform: 'capitalize' },
  chipTextOn: { color: colors.white },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fichaImg: { width: '100%', aspectRatio: 0.8, marginVertical: 8 },
  priceBig: { fontSize: 22, fontWeight: '700', marginVertical: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  qty: { fontSize: 22, paddingHorizontal: 8 },
  qtyN: { minWidth: 18, textAlign: 'center' },
  block: { borderWidth: 1, borderColor: colors.line, padding: 12, marginTop: 12, backgroundColor: colors.surface },
  bubble: { backgroundColor: colors.surface, padding: 12, marginTop: 8, borderWidth: 1, borderColor: colors.line },
  bubbleMe: { backgroundColor: colors.dark },
  bubbleText: { color: colors.ink },
  bubbleMeText: { color: colors.white },
  camera: { flex: 1, backgroundColor: '#111' },
  cloth: { position: 'absolute', left: '18%', top: '16%', width: '64%', height: '68%' },
  hud: { position: 'absolute', bottom: 28, left: 16, right: 16 },
  hudText: { color: colors.white, textAlign: 'center', marginBottom: 6 },
})
