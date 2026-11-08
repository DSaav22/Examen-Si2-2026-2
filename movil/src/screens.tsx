import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { api, apiBase, assetUrl, guardarApiBase, guardarTienda, tiendaActiva } from './api'
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
import { editorialImage, lookImage, ocasionImages, storefrontHeroImage } from './vestaAssets'

const input = {
  borderWidth: 1,
  borderColor: colors.line,
  backgroundColor: colors.surface,
  padding: 12,
  color: colors.ink,
} as const

export function LoginScreen() {
  const s = useSession()
  const [email, setEmail] = useState('clienta@ensayar.bo')
  const [password, setPassword] = useState('diego')
  const [servidor, setServidor] = useState(apiBase())
  const [tienda, setTienda] = useState(tiendaActiva())
  const [mostrarApi, setMostrarApi] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function submit() {
    setCargando(true)
    s.setError('')
    try {
      await guardarApiBase(servidor)
      await guardarTienda(tienda)
      await s.entrar(email.trim(), password)
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'No se pudo entrar')
    } finally {
      setCargando(false)
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.authPage}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.authHero}>
        <Text style={styles.authBrand}>VESTA</Text>
        <Text style={styles.authTag}>Edición boutique</Text>
        <Text style={styles.authHeadline}>La nueva{'\n'}sofisticación</Text>
        <Text style={styles.authLead}>
          Entrá con tu cuenta para ver la colección, probar prendas y comprar.
        </Text>
      </View>

      <View style={styles.authForm}>
        <Text style={styles.authLabel}>Correo</Text>
        <TextInput
          style={styles.authInput}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          placeholderTextColor={colors.taupe}
        />
        <Text style={styles.authLabel}>Clave</Text>
        <TextInput
          style={styles.authInput}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Tu clave"
          placeholderTextColor={colors.taupe}
        />

        <View style={styles.authActions}>
          <Btn label="ENTRAR" onPress={() => void submit()} loading={cargando} />
          <Btn label="CREAR CUENTA" ghost onPress={() => s.push({ name: 'registro' })} />
        </View>

        <Pressable
          style={styles.authApiToggle}
          onPress={() => setMostrarApi(v => !v)}
          hitSlop={8}
        >
          <Text style={styles.authApiToggleText}>
            {mostrarApi ? 'Ocultar conexión' : 'Ajustar servidor'}
          </Text>
        </Pressable>

        {mostrarApi ? (
          <View style={styles.authApiBox}>
            <Text style={styles.authLabel}>Servidor API</Text>
            <TextInput
              style={styles.authInput}
              autoCapitalize="none"
              autoCorrect={false}
              value={servidor}
              onChangeText={setServidor}
              placeholder="http://192.168.x.x:3000"
              placeholderTextColor={colors.taupe}
            />
            <Text style={styles.authHint}>
              Actual: {apiBase()}. En teléfono usá la IP de tu PC. Emulador Android: http://10.0.2.2:3000
            </Text>
            <Text style={styles.authLabel}>Tienda</Text>
            <TextInput
              style={styles.authInput}
              autoCapitalize="none"
              autoCorrect={false}
              value={tienda}
              onChangeText={setTienda}
              placeholder="vesta"
              placeholderTextColor={colors.taupe}
            />
            <Text style={styles.authHint}>Dirección de la tienda (ensayar.app/t/…). Ej.: vesta, demo-aurora</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  )
}

export function RegistroScreen() {
  const s = useSession()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const claveSegura = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && !/\s/.test(password)

  async function submit() {
    if (nombre.trim().length < 2 || !emailValido || !claveSegura) {
      s.setError('Revisá nombre, correo y clave segura antes de continuar.')
      return
    }
    setCargando(true)
    s.setError('')
    try {
      await s.registrar(nombre.trim(), email.trim(), password)
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'No se pudo registrar')
    } finally {
      setCargando(false)
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.authPage}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.authHero}>
        <Text style={styles.authBrand}>VESTA</Text>
        <Text style={styles.authTag}>Cuenta nueva</Text>
        <Text style={styles.authHeadline}>Unite a la{'\n'}colección</Text>
        <Text style={styles.authLead}>
          Creá tu cuenta de clienta para favoritos, pedidos y el probador.
        </Text>
      </View>

      <View style={styles.authForm}>
        <Text style={styles.authLabel}>Nombre</Text>
        <TextInput
          style={styles.authInput}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Tu nombre"
          placeholderTextColor={colors.taupe}
        />
        <Text style={styles.authLabel}>Correo</Text>
        <TextInput
          style={styles.authInput}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          placeholderTextColor={colors.taupe}
        />
        <Text style={styles.authLabel}>Clave</Text>
        <TextInput
          style={styles.authInput}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="8+ caracteres, mayúscula, minúscula y número"
          placeholderTextColor={colors.taupe}
        />
        <Text style={[styles.authHint, email.length ? (emailValido ? styles.validHint : styles.invalidHint) : undefined]}>
          {email.length ? (emailValido ? '✓ Correo válido' : '× Revisá el formato del correo') : 'Ingresá un correo válido.'}
        </Text>
        <Text style={[styles.authHint, password.length ? (claveSegura ? styles.validHint : styles.invalidHint) : undefined]}>
          {password.length ? (claveSegura ? '✓ Clave segura' : '× Usá 8+ caracteres, mayúscula, minúscula y número, sin espacios.') : 'La clave se valida antes de crear la cuenta.'}
        </Text>

        <View style={styles.authActions}>
          <Btn
            label="CREAR CUENTA"
            onPress={() => void submit()}
            loading={cargando}
            disabled={nombre.trim().length < 2 || !emailValido || !claveSegura}
          />
          <Btn label="YA TENGO CUENTA" ghost onPress={s.back} />
        </View>
      </View>
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

  const look = products.slice(0, 3)

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void cargar().finally(() => setRefreshing(false))
          }}
        />
      }
    >
      <View style={styles.hero}>
        <Image source={{ uri: storefrontHeroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={styles.heroDim} />
        <Text style={styles.heroBrand}>VESTA</Text>
        <Text style={styles.heroEye}>EDICIÓN 01 · OTOÑO</Text>
        <Text style={styles.heroTitle}>La nueva{'\n'}sofisticación</Text>
        <Text style={styles.heroLead}>
          Prendas contemporáneas, tonos serenos y cortes que permanecen.
        </Text>
        <View style={styles.heroCtas}>
          <Pressable style={styles.heroCta} onPress={() => s.abrirCatalogo()}>
            <Text style={styles.heroCtaText}>DESCUBRIR COLECCIÓN</Text>
          </Pressable>
          <Pressable style={styles.heroCtaGhost} onPress={() => s.abrirCatalogo('ofertas')}>
            <Text style={styles.heroCtaGhostText}>VER OFERTAS</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.campaign} onPress={() => s.abrirCatalogo('ofertas')}>
        <Text style={styles.campaignText}>OFERTA DE TEMPORADA · HASTA 25%</Text>
        <Text style={styles.campaignLink}>Ver →</Text>
      </Pressable>

      <Rail
        title="La nueva sofisticación"
        eyebrow="NOVEDADES"
        items={novedades}
        onAll={() => s.abrirCatalogo('novedades')}
      />
      <Rail
        title="Favoritos de la semana"
        eyebrow="LOS MÁS ELEGIDOS"
        items={popular}
        onAll={() => s.abrirCatalogo()}
      />

      <View style={styles.pad}>
        <Text style={styles.eyebrow}>DESCUBRE POR OCASIÓN</Text>
        <Text style={styles.h2}>Vestir cada momento</Text>
        <View style={styles.occGrid}>
          {(['Trabajo', 'Fiesta', 'Casual', 'Temporada'] as const).map(oc => (
            <Pressable
              key={oc}
              style={styles.occ}
              onPress={() => s.abrirCatalogo('ocasiones', oc.toLowerCase())}
            >
              <Image
                source={{ uri: ocasionImages[oc] }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <View style={styles.occDim} />
              <Text style={styles.occText}>{oc}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.journal}>
          <Image source={{ uri: editorialImage }} style={styles.journalImg} resizeMode="cover" />
          <Text style={styles.eyebrow}>VESTA JOURNAL · 01</Text>
          <Text style={styles.h2}>Sastrería tonal</Text>
          <Text style={styles.lead}>
            Capas suaves, siluetas limpias y una paleta que viaja del vino al arena.
          </Text>
        </View>

        <Text style={styles.eyebrow}>COMPRA EL LOOK</Text>
        <Text style={styles.h2}>Armá el outfit</Text>
        <Image source={{ uri: lookImage }} style={styles.lookBanner} resizeMode="cover" />
        {look.map(p => (
          <Pressable
            key={p.id}
            style={styles.lookRow}
            onPress={() => s.push({ name: 'ficha', id: p.id })}
          >
            <Text style={styles.lookName}>{p.nombre}</Text>
            <Text>Bs {precioEfectivo(p).toFixed(0)}</Text>
          </Pressable>
        ))}
        <Btn
          label="AÑADIR LOOK COMPLETO"
          disabled={look.length < 3}
          onPress={() => {
            look.forEach(p => {
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
          {[
            'Envío gratis desde Bs 350',
            'Retiro en tienda',
            'Cambios simples',
            'Compra segura',
          ].map(b => (
            <Text key={b} style={styles.benefit}>
              {b}
            </Text>
          ))}
        </View>

        <View style={styles.attention}>
          <Text style={styles.eyebrow}>ATENCIÓN VESTA</Text>
          <Text style={styles.lead}>
            Tallas, stock y pedidos: escribile al asistente o reservá para probar en tienda.
          </Text>
          <Btn label="HABLAR CON EL ASISTENTE" ghost onPress={() => s.push({ name: 'asistente' })} />
        </View>

        {s.sucursal ? (
          <Pressable onPress={() => s.setElegir(true)}>
            <Text style={styles.hint}>
              Retiro: {s.sucursal.nombre}
              {s.sucursal.ciudad ? ` · ${s.sucursal.ciudad}` : ''} · Cambiar
            </Text>
          </Pressable>
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

  const titulo =
    filtro === 'novedades'
      ? 'Novedades'
      : filtro === 'ofertas'
        ? 'Ofertas'
        : filtro === 'ocasiones'
          ? 'Ocasiones'
          : 'Catálogo'

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.eyebrow}>EDICIÓN 01 · OTOÑO</Text>
      <Text style={styles.h1}>{titulo}</Text>
      <Text style={styles.lead}>
        {items.length ? `${items.length}+ piezas` : 'Explorá la colección'} · filtros por ocasión
      </Text>
      <TextInput
        style={input}
        placeholder="Buscar blazer, vestido, falda…"
        placeholderTextColor={colors.taupe}
        value={q}
        onChangeText={t => {
          setPagina(1)
          setQ(t)
        }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, marginTop: 12, marginBottom: 8 }}
      >
        {['', 'trabajo', 'fiesta', 'casual', 'temporada'].map(oc => (
          <Pressable
            key={oc || 'todas'}
            style={[styles.chip, ocasion === oc && styles.chipOn]}
            onPress={() => {
              setPagina(1)
              setOcasion(oc)
            }}
          >
            <Text style={[styles.chipText, ocasion === oc && styles.chipTextOn]}>
              {oc || 'Todas'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.grid}>
        {items.map(p => (
          <View key={p.id} style={styles.cell}>
            <ProductCard producto={p} onOpen={() => s.push({ name: 'ficha', id: p.id })} />
          </View>
        ))}
      </View>
      {hayMas ? (
        <Btn
          label={cargando ? 'CARGANDO' : 'VER MÁS'}
          ghost
          onPress={() => setPagina(n => n + 1)}
        />
      ) : null}
      {!cargando && items.length === 0 ? (
        <Text style={styles.hint}>No hay prendas con ese filtro.</Text>
      ) : null}
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
  const [puntuacion, setPuntuacion] = useState(5)

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
      <Pressable onPress={s.back}>
        <Text style={styles.link}>← Volver al catálogo</Text>
      </Pressable>
      {variante ? <ProductImage producto={p} variante={variante} style={styles.fichaImg} /> : null}
      <Text style={styles.eyebrow}>{(p.ocasion || p.categoria || 'MUJER').toUpperCase()}</Text>
      <Text style={styles.h1}>{p.nombre}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceBig}>Bs {precioEfectivo(p).toFixed(0)}</Text>
        {Number(p.descuentoPct ?? 0) > 0 ? (
          <Text style={styles.priceOld}>Bs {Number(p.precioBase).toFixed(0)}</Text>
        ) : null}
      </View>
      {p.descripcion ? <Text style={styles.lead}>{p.descripcion}</Text> : null}

      <Text style={styles.label}>Color · {color || '—'}</Text>
      <View style={styles.chips}>
        {colores.map(c => (
          <Pressable
            key={c}
            style={[styles.chip, color === c && styles.chipOn]}
            onPress={() => {
              setColor(c)
              const next = p.variantes.find(v => v.color === c)
              if (next) setTalla(next.talla)
            }}
          >
            <Text style={[styles.chipText, color === c && styles.chipTextOn]}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Talla · {talla || '—'}</Text>
      <View style={styles.chips}>
        {tallas.map(t => (
          <Pressable
            key={t}
            style={[styles.chip, talla === t && styles.chipOn]}
            onPress={() => setTalla(t)}
          >
            <Text style={[styles.chipText, talla === t && styles.chipTextOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.fichaActions}>
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
        {variante ? (
          <Btn
            label="PROBAR PRENDA"
            ghost
            onPress={() => s.push({ name: 'probar', varianteId: variante.id })}
          />
        ) : null}
        <View style={styles.fichaSecondary}>
          <Pressable onPress={() => void s.toggleFav(p.id)}>
            <Text style={styles.linkish}>{fav ? '♥ En favoritos' : '♡ Guardar'}</Text>
          </Pressable>
          <Pressable onPress={() => s.push({ name: 'asistente', productoId: p.id })}>
            <Text style={styles.linkish}>Preguntar al asistente</Text>
          </Pressable>
        </View>
        {s.user?.rol === 'CLIENTA' ? (
          <View style={styles.fichaSecondary}>
            <Pressable onPress={() => {
              void api(`/catalogo/productos/${p.id}/alertas`, s.token, {
                method: 'POST', body: JSON.stringify({ tipo: 'reposicion' }),
              }).then(() => s.setAviso('Te avisaremos cuando haya reposición.')).catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'No se activó la alerta'))
            }}><Text style={styles.linkish}>Avisarme si se agota mi talla</Text></Pressable>
            <Pressable onPress={() => {
              void api(`/catalogo/productos/${p.id}/alertas`, s.token, {
                method: 'POST', body: JSON.stringify({ tipo: 'precio' }),
              }).then(() => s.setAviso('Te avisaremos ante un cambio de precio.')).catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'No se activó la alerta'))
            }}><Text style={styles.linkish}>Avisarme si baja de precio</Text></Pressable>
          </View>
        ) : null}
      </View>

      {p.material ? <Text style={styles.metaLine}>Material · {p.material}</Text> : null}
      {p.cuidados ? <Text style={styles.metaLine}>Cuidados · {p.cuidados}</Text> : null}

      <Text style={styles.h2}>
        Opiniones
        {opiniones ? ` · ${opiniones.promedio.toFixed(1)} (${opiniones.cantidad})` : ''}
      </Text>
      {opiniones?.items.length ? (
        opiniones.items.map(op => (
          <View key={op.id} style={styles.opinionCard}>
            <Text style={styles.lookName}>
              {op.usuario?.nombre ?? 'Clienta'} · {'★'.repeat(op.puntuacion)}
            </Text>
            {op.comentario ? <Text style={styles.hint}>{op.comentario}</Text> : null}
          </View>
        ))
      ) : (
        <Text style={styles.hint}>Todavía no hay opiniones publicadas.</Text>
      )}
      {s.user?.rol === 'CLIENTA' ? (
        <>
          <Text style={styles.label}>Tu puntuación</Text>
          <View style={styles.chips}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} style={[styles.chip, puntuacion === n && styles.chipOn]} onPress={() => setPuntuacion(n)}>
                <Text style={[styles.chipText, puntuacion === n && styles.chipTextOn]}>{'★'.repeat(n)}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[input, { marginTop: 8 }]}
            placeholder="Tu comentario"
            placeholderTextColor={colors.taupe}
            value={comentario}
            onChangeText={setComentario}
          />
          <Btn
            label="PUBLICAR OPINIÓN"
            ghost
            onPress={() => {
              void api(`/catalogo/productos/${p.id}/opiniones`, s.token, {
                method: 'POST',
                body: JSON.stringify({ puntuacion, comentario }),
              })
                .then(() => {
                  s.setAviso('Opinión publicada')
                  setComentario('')
                })
                .catch((e: unknown) =>
                  s.setError(e instanceof Error ? e.message : 'No se publicó'),
                )
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
      .then(all => setItems(all.filter(p => s.favs.includes(p.id))))
      .catch((e: unknown) =>
        s.setError(e instanceof Error ? e.message : 'No se cargaron favoritos'),
      )
  }, [s])
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.eyebrow}>GUARDADOS</Text>
      <Text style={styles.h1}>Favoritos</Text>
      <Text style={styles.lead}>
        {items.length
          ? `${items.length} prenda${items.length === 1 ? '' : 's'} para volver a mirar.`
          : 'Las piezas que amás viven acá.'}
      </Text>
      <View style={styles.grid}>
        {items.map(p => (
          <View key={p.id} style={styles.cell}>
            <ProductCard producto={p} onOpen={() => s.push({ name: 'ficha', id: p.id })} />
          </View>
        ))}
      </View>
      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.h2}>Todavía vacío</Text>
          <Text style={styles.hint}>Explorá el catálogo y tocá el corazón en una prenda.</Text>
          <Btn label="IR AL CATÁLOGO" onPress={() => s.abrirCatalogo()} />
        </View>
      ) : null}
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
      <Text style={styles.h1}>Tu bolsa</Text>
      {s.cart.map(l => (
        <View key={l.varianteId} style={styles.bagLine}>
          {l.foto ? (
            <Image source={{ uri: assetUrl(l.foto) }} style={styles.bagThumb} resizeMode="cover" />
          ) : (
            <View style={[styles.bagThumb, styles.bagThumbPh]}>
              <Text style={styles.bagThumbPhText}>VESTA</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.lookName}>{l.nombre}</Text>
            <Text style={styles.hint}>
              {l.talla} / {l.color} · Bs {(l.precio * l.cantidad).toFixed(2)}
            </Text>
            <View style={styles.qtyRow}>
              <Pressable onPress={() => s.setQty(l.varianteId, l.cantidad - 1)}>
                <Text style={styles.qty}>−</Text>
              </Pressable>
              <Text style={styles.qtyN}>{l.cantidad}</Text>
              <Pressable onPress={() => s.setQty(l.varianteId, l.cantidad + 1)}>
                <Text style={styles.qty}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}
      {!s.cart.length ? (
        <View style={styles.emptyBox}>
          <Text style={styles.h2}>Bolsa vacía</Text>
          <Text style={styles.hint}>Sumá prendas desde el catálogo o la ficha.</Text>
          <Btn label="DESCUBRIR COLECCIÓN" onPress={() => s.abrirCatalogo()} />
        </View>
      ) : null}

      {s.cart.length ? (
        <View style={styles.summaryBox}>
          <Text style={styles.priceBig}>Total Bs {s.total.toFixed(2)}</Text>
          <Text style={styles.hint}>
            Retiro / despacho: {s.sucursal?.nombre ?? 'elegí sucursal'} ·{' '}
            <Text style={styles.linkInline} onPress={() => s.setElegir(true)}>
              Cambiar
            </Text>
          </Text>
          <Text style={styles.label}>Cupón</Text>
          <TextInput
            style={input}
            autoCapitalize="characters"
            placeholder="VESTA10"
            placeholderTextColor={colors.taupe}
            value={cupon}
            onChangeText={setCupon}
          />
          <Btn
            label="CONFIRMAR · CONTRA ENTREGA"
            onPress={() => void comprar('contra_entrega')}
            loading={ocupado}
            disabled={!s.cart.length}
          />
          <Btn
            label="PAGAR CON QR"
            ghost
            onPress={() => void comprar('qr')}
            disabled={!s.cart.length || ocupado}
          />
          {pagoPendiente ? (
            <View style={styles.qrBox}>
              <Text style={styles.lead}>Pago QR pendiente</Text>
              <Text style={styles.hint}>Confirmá el pago para cerrar el pedido (demo).</Text>
              <Btn label="CONFIRMAR PAGO QR" onPress={() => void simular('aprobado')} />
              <Btn label="CANCELAR PAGO" ghost onPress={() => void simular('rechazado')} />
            </View>
          ) : null}
          <Btn
            label="RESERVAR PARA PROBAR EN TIENDA"
            ghost
            onPress={() => s.push({ name: 'reservas' })}
            disabled={!s.cart.length}
          />
        </View>
      ) : null}
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
      <Pressable onPress={s.back}>
        <Text style={styles.link}>← Volver</Text>
      </Pressable>
      <Text style={styles.eyebrow}>PROBAR EN TIENDA</Text>
      <Text style={styles.h1}>Reservas</Text>
      <Text style={styles.lead}>
        Reservá las prendas de tu bolsa para probarlas en sucursal (horario sugerido: +3 h).
      </Text>
      <Text style={styles.hint}>
        {s.cart.length
          ? `${s.cart.length} prenda(s) listas para reservar.`
          : 'Primero sumá prendas a la bolsa.'}
      </Text>
      <Text style={styles.label}>Sucursal</Text>
      <View style={styles.chips}>
        {sucursales.map(suc => (
          <Pressable
            key={suc.id}
            style={[styles.chip, sucursalId === suc.id && styles.chipOn]}
            onPress={() => setSucursalId(suc.id)}
          >
            <Text style={[styles.chipText, sucursalId === suc.id && styles.chipTextOn]}>
              {suc.nombre}
            </Text>
          </Pressable>
        ))}
      </View>
      <Btn label="RESERVAR PARA PROBAR EN TIENDA" onPress={() => void crear()} disabled={!s.cart.length} />
      <Text style={styles.h2}>Mis reservas</Text>
      {lista.map(r => (
        <View key={r.id} style={styles.block}>
          <Text style={styles.lookName}>
            {r.sucursal.nombre} · {r.estado}
          </Text>
          <Text style={styles.hint}>{new Date(r.horario).toLocaleString()}</Text>
          {r.lineas?.map((l, i) => (
            <Text key={`${r.id}-${i}`} style={styles.hint}>
              {l.variante.producto.nombre} {l.variante.talla}/{l.variante.color} × {l.cantidad}
            </Text>
          ))}
          {r.estado !== 'cancelada' && r.estado !== 'completada' ? (
            <Btn
              label="CANCELAR"
              ghost
              onPress={() => {
                void api(`/reservas/${r.id}/estado`, s.token, {
                  method: 'PATCH',
                  body: JSON.stringify({ estado: 'cancelada' }),
                })
                  .then(() => cargar())
                  .catch((e: unknown) =>
                    s.setError(e instanceof Error ? e.message : 'No se canceló'),
                  )
              }}
            />
          ) : null}
        </View>
      ))}
      {lista.length === 0 ? <Text style={styles.hint}>Aún no tenés reservas.</Text> : null}
    </ScrollView>
  )
}

export function HistorialScreen() {
  const s = useSession()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [ocupada, setOcupada] = useState('')

  function cargar() {
    return api<Venta[]>('/ventas/historial', s.token).then(setVentas)
  }

  useEffect(() => {
    void cargar().catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'Sin historial'))
  }, [s])

  async function devolver(v: Venta) {
    if (!s.token || !v.lineas.length) return
    setOcupada(v.id)
    try {
      await api('/devoluciones', s.token, {
        method: 'POST',
        body: JSON.stringify({ ventaId: v.id, lineas: v.lineas.map(l => ({ lineaId: l.id, cantidad: l.cantidad })) }),
      })
      s.setAviso('Devolución registrada. El stock fue restituido según las reglas del sistema.')
      await cargar()
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'No se pudo registrar la devolución')
    } finally { setOcupada('') }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Pressable onPress={s.back}>
        <Text style={styles.link}>← Volver</Text>
      </Pressable>
      <Text style={styles.eyebrow}>MIS COMPRAS</Text>
      <Text style={styles.h1}>Pedidos</Text>
      <Text style={styles.lead}>Pedidos, facturas y seguimiento de envío.</Text>
      {ventas.map(v => (
        <View key={v.id} style={styles.block}>
          <Text style={styles.lookName}>
            {v.estado} · Bs {Number(v.total).toFixed(2)}
          </Text>
          <Text style={styles.hint}>
            {v.medioPago} · {new Date(v.creadaEn).toLocaleString()}
          </Text>
          {v.pedido ? (
            <Text style={styles.hint}>
              Envío: {v.pedido.estado}
              {v.pedido.seguimiento ? ` · ${v.pedido.seguimiento}` : ''}
            </Text>
          ) : null}
          {v.lineas.map(l => (
            <Text key={l.id} style={styles.hint}>
              {l.variante.producto.nombre} {l.variante.talla}/{l.variante.color} × {l.cantidad}
            </Text>
          ))}
          {v.pago?.estado === 'pendiente' ? (
            <Btn
              label="CONFIRMAR PAGO PENDIENTE"
              ghost
              onPress={() => {
                void api(`/pagos/${v.pago!.id}/simular`, s.token, {
                  method: 'POST',
                  body: JSON.stringify({ resultado: 'aprobado' }),
                })
                  .then(() => cargar())
                  .catch((e: unknown) =>
                    s.setError(e instanceof Error ? e.message : 'Pago no confirmado'),
                  )
              }}
            />
          ) : null}
          <Btn
            label="ENVIAR COMPROBANTE"
            ghost
            onPress={() => {
              void api(`/ventas/${v.id}/enviar-factura`, s.token, { method: 'POST' })
                .then(() => s.setAviso('Comprobante enviado a tu correo.'))
                .catch((e: unknown) => s.setError(e instanceof Error ? e.message : 'No se pudo enviar el comprobante'))
            }}
          />
          {['cobrada', 'devuelta_parcial'].includes(v.estado) ? (
            <Btn
              label={ocupada === v.id ? 'REGISTRANDO DEVOLUCIÓN…' : 'SOLICITAR DEVOLUCIÓN TOTAL'}
              ghost
              disabled={ocupada === v.id}
              onPress={() => void devolver(v)}
            />
          ) : null}
        </View>
      ))}
      {ventas.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.h2}>Sin pedidos aún</Text>
          <Text style={styles.hint}>Cuando confirmes una compra, aparece acá.</Text>
          <Btn label="IR AL CATÁLOGO" onPress={() => s.abrirCatalogo()} />
        </View>
      ) : null}
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
      <View style={styles.profileHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(s.user?.nombre ?? 'V').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>{s.user?.nombre ?? 'Cuenta'}</Text>
          <Text style={styles.hint}>{s.user?.email}</Text>
          {perfil?.lealtad ? (
            <Text style={styles.lead}>
              {perfil.lealtad.nivel} · {perfil.lealtad.puntos} puntos
            </Text>
          ) : null}
        </View>
      </View>

      <Pressable style={styles.accountCard} onPress={() => s.push({ name: 'historial' })}>
        <Text style={styles.lookName}>Mis compras</Text>
        <Text style={styles.hint}>Pedidos, facturas y seguimiento</Text>
      </Pressable>
      <Pressable style={styles.accountCard} onPress={() => s.push({ name: 'reservas' })}>
        <Text style={styles.lookName}>Reservas en tienda</Text>
        <Text style={styles.hint}>Probar prendas en sucursal</Text>
      </Pressable>
      <Pressable style={styles.accountCard} onPress={() => s.push({ name: 'asistente' })}>
        <Text style={styles.lookName}>Asistente Vesta</Text>
        <Text style={styles.hint}>Tallas, stock y pedidos</Text>
      </Pressable>

      {s.user?.rol !== 'CLIENTA' ? (
        <Pressable style={styles.accountCard} onPress={() => s.push({ name: 'operaciones' })}>
          <Text style={styles.lookName}>Operaciones</Text>
          <Text style={styles.hint}>Herramientas habilitadas para tu rol: {s.user?.rol}</Text>
        </Pressable>
      ) : null}

      {cupones.length ? (
        <View style={styles.block}>
          <Text style={styles.eyebrow}>CUPONES</Text>
          {cupones.map(c => (
            <Text key={c.id} style={styles.hint}>
              {c.codigo} · {c.porcentaje}% off
            </Text>
          ))}
        </View>
      ) : null}

      {s.user?.rol === 'CLIENTA' ? (
        <>
          <Text style={styles.h2}>Perfil</Text>
          <Text style={styles.label}>Nombre</Text>
          <TextInput style={input} value={nombre} onChangeText={setNombre} />
          <Btn
            label="GUARDAR NOMBRE"
            ghost
            onPress={() => {
              void api('/cliente/perfil', s.token, {
                method: 'PATCH',
                body: JSON.stringify({ nombre }),
              })
                .then(() => s.setAviso('Nombre actualizado'))
                .catch((e: unknown) =>
                  s.setError(e instanceof Error ? e.message : 'No se guardó'),
                )
            }}
          />
          <Text style={styles.h2}>Dirección</Text>
          <TextInput
            style={input}
            value={etiqueta}
            onChangeText={setEtiqueta}
            placeholder="Etiqueta"
            placeholderTextColor={colors.taupe}
          />
          <TextInput
            style={[input, { marginTop: 8 }]}
            value={ciudad}
            onChangeText={setCiudad}
            placeholder="Ciudad"
            placeholderTextColor={colors.taupe}
          />
          <TextInput
            style={[input, { marginTop: 8 }]}
            value={detalle}
            onChangeText={setDetalle}
            placeholder="Detalle"
            placeholderTextColor={colors.taupe}
          />
          <Btn
            label="AÑADIR DIRECCIÓN"
            ghost
            onPress={() => {
              void api('/cliente/direcciones', s.token, {
                method: 'POST',
                body: JSON.stringify({ etiqueta, ciudad, detalle }),
              })
                .then(() => s.setAviso('Dirección guardada'))
                .catch((e: unknown) =>
                  s.setError(e instanceof Error ? e.message : 'Dirección no guardada'),
                )
            }}
          />
          {perfil?.direcciones.map(d => (
            <Text key={d.id} style={styles.hint}>
              {d.etiqueta}: {d.detalle}, {d.ciudad}
            </Text>
          ))}
          <Text style={styles.h2}>Clave</Text>
          <TextInput
            style={input}
            secureTextEntry
            placeholder="Clave actual"
            placeholderTextColor={colors.taupe}
            value={actual}
            onChangeText={setActual}
          />
          <TextInput
            style={[input, { marginTop: 8 }]}
            secureTextEntry
            placeholder="Nueva clave (8+)"
            placeholderTextColor={colors.taupe}
            value={nueva}
            onChangeText={setNueva}
          />
          <Btn
            label="CAMBIAR CLAVE"
            ghost
            onPress={() => {
              void api('/auth/cambiar-clave', s.token, {
                method: 'POST',
                body: JSON.stringify({ actual, nueva }),
              })
                .then(() => s.setAviso('Clave actualizada'))
                .catch((e: unknown) =>
                  s.setError(e instanceof Error ? e.message : 'Clave no cambiada'),
                )
            }}
          />
        </>
      ) : (
        <Text style={styles.hint}>
          Esta app está pensada para la clienta. El personal opera desde la web.
        </Text>
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

  const sugerencias = [
    '¿Qué talla me conviene?',
    '¿Hay stock en La Paz?',
    '¿Cómo va mi pedido?',
    'Ocasiones de otoño',
  ]

  async function enviar(prefill?: string) {
    const mensaje = (prefill ?? texto).trim()
    if (mensaje.length < 2 || !s.token) return
    const historial = msgs
    setMsgs(m => [...m, { rol: 'clienta', texto: mensaje }])
    setTexto('')
    setOcupado(true)
    try {
      const res = await api<{ respuesta: string }>('/ia/bot', s.token, {
        method: 'POST',
        body: JSON.stringify({ mensaje, productoId, historial }),
      })
      setMsgs(m => [...m, { rol: 'asistente', texto: res.respuesta }])
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'El asistente no respondió')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      <Pressable onPress={s.back}>
        <Text style={styles.link}>← Volver</Text>
      </Pressable>
      <Text style={styles.eyebrow}>ATENCIÓN VESTA</Text>
      <Text style={styles.h1}>Asistente</Text>
      <Text style={styles.lead}>
        Preguntá por tallas, stock, ocasiones
        {productoId ? ' o esta prenda abierta' : ' o el estado de tus pedidos'}.
      </Text>
      {msgs.length === 0 ? (
        <View style={styles.chips}>
          {sugerencias.map(sg => (
            <Pressable
              key={sg}
              style={styles.chip}
              onPress={() => void enviar(sg)}
              disabled={ocupado}
            >
              <Text style={styles.chipText}>{sg}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {msgs.map((m, i) => (
        <View key={`${i}-${m.rol}`} style={[styles.bubble, m.rol === 'clienta' && styles.bubbleMe]}>
          <Text style={m.rol === 'clienta' ? styles.bubbleMeText : styles.bubbleText}>{m.texto}</Text>
        </View>
      ))}
      <TextInput
        style={[input, { marginTop: 12 }]}
        value={texto}
        onChangeText={setTexto}
        placeholder="Escribí tu pregunta"
        placeholderTextColor={colors.taupe}
      />
      <Btn label="ENVIAR" onPress={() => void enviar()} loading={ocupado} />
    </ScrollView>
  )
}

export function ProbadorScreen() {
  const s = useSession()
  const setError = s.setError
  const setAviso = s.setAviso
  const varianteId = s.screen.name === 'probar' ? s.screen.varianteId : ''
  const camRef = useRef<CameraView>(null)
  const [permiso, pedir] = useCameraPermissions()
  const [overlay, setOverlay] = useState<{
    producto: string
    talla: string
    color: string
    urlOverlay: string
  } | null>(null)
  const [hombros, setHombros] = useState<{ x: number; y: number }[]>([])
  const [resultadoIa, setResultadoIa] = useState('')
  const [generando, setGenerando] = useState(false)
  /** Foto subida / demo cuando no hay cámara (p. ej. web en PC). */
  const [fotoLocal, setFotoLocal] = useState<{ uri: string; dataUrl?: string } | null>(null)

  const overlayEsPlaceholder =
    !overlay?.urlOverlay || overlay.urlOverlay.includes('overlay-polera')
  const tieneCamara = Boolean(permiso?.granted)
  const puedeIa = !generando && Boolean(varianteId && s.token && (tieneCamara || fotoLocal?.dataUrl))

  useEffect(() => {
    if (!varianteId) return
    setResultadoIa('')
    setHombros([])
    setFotoLocal(null)
    void api<{ producto: string; talla: string; color: string; urlOverlay: string }>(
      `/catalogo/variantes/${varianteId}/overlay`,
      null,
    )
      .then(setOverlay)
      .catch(() => setError('No hay overlay para esta variante'))
    if (!permiso?.granted) void pedir()
  }, [varianteId, permiso?.granted, pedir, setError])

  async function uriToDataUrl(uri: string, mime = 'image/jpeg'): Promise<string> {
    // Prefer FileReader (web). Fallback fetch+blob.
    const res = await fetch(uri)
    const blob = await res.blob()
    if (typeof FileReader !== 'undefined') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('No se pudo leer la foto'))
        reader.readAsDataURL(blob)
      })
    }
    // RN nativo sin FileReader: base64 vía arrayBuffer
    const buf = await blob.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
    // btoa disponible en Hermes/JSC modernos
    const b64 = globalThis.btoa(binary)
    return `data:${mime};base64,${b64}`
  }

  async function elegirFoto() {
    setError('')
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setError('Necesitamos acceso a tus fotos para la vista realista sin cámara.')
      return
    }
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    })
    if (pick.canceled || !pick.assets?.[0]) return
    const asset = pick.assets[0]
    const dataUrl = asset.base64
      ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
      : await uriToDataUrl(asset.uri)
    setFotoLocal({ uri: asset.uri, dataUrl })
    setAviso('Foto lista. Tocá Vista realista.')
  }

  async function usarDemo() {
    setError('')
    try {
      const uri = assetUrl('/cuerpo-demo.svg')
      const dataUrl = await uriToDataUrl(uri)
      setFotoLocal({ uri, dataUrl })
      setAviso('Silueta demo lista. Tocá Vista realista.')
    } catch {
      setError('No se pudo cargar la silueta demo. Revisá la API.')
    }
  }

  async function generarVistaIa() {
    if (!varianteId || !s.token) {
      setError('Entrá como clienta para la vista realista.')
      return
    }
    if (
      s.user?.rol &&
      s.user.rol !== 'CLIENTA' &&
      s.user.rol !== 'ADMIN' &&
      s.user.rol !== 'SUPERADMIN'
    ) {
      setError('La vista realista está disponible para la cuenta de clienta.')
      return
    }

    setGenerando(true)
    setError('')
    setAviso('')
    try {
      let dataUrl = fotoLocal?.dataUrl || ''
      if (!dataUrl && tieneCamara && camRef.current) {
        const pic = await camRef.current.takePictureAsync({
          base64: true,
          quality: 0.65,
          skipProcessing: true,
        })
        if (!pic?.base64) throw new Error('No se capturó la foto')
        dataUrl = `data:image/jpeg;base64,${pic.base64}`
      }
      if (!dataUrl) {
        setError('Subí una foto, usá la silueta demo o permití la cámara.')
        return
      }
      if (dataUrl.length > 4_500_000) {
        setError('La foto es muy pesada. Probá con una más liviana.')
        return
      }
      const out = await api<{ url: string; aviso?: string }>('/ia/probar', s.token, {
        method: 'POST',
        body: JSON.stringify({
          varianteId,
          imagenBase64: dataUrl,
        }),
        signal: AbortSignal.timeout(130_000),
      })
      setResultadoIa(out.url.startsWith('http') ? out.url : assetUrl(out.url))
      setAviso(out.aviso ?? 'Vista realista lista (aproximada).')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se generó la vista')
    } finally {
      setGenerando(false)
    }
  }

  if (resultadoIa) {
    return (
      <View style={styles.camera}>
        <View style={styles.stage}>
          <Image source={{ uri: resultadoIa }} style={styles.stageImg} resizeMode="contain" />
        </View>
        <View style={styles.hudPanel}>
          <Text style={styles.hudTitle}>
            {overlay ? `${overlay.producto} · vista realista` : 'Vista realista'}
          </Text>
          <Text style={styles.hudHint}>Aproximada · no modifica stock</Text>
          <Btn label="OTRA FOTO" light onPress={() => setResultadoIa('')} />
          <Btn
            label="CERRAR"
            ghost
            light
            onPress={() => {
              setResultadoIa('')
              setHombros([])
              s.back()
            }}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.camera}>
      <View style={styles.stage}>
        {tieneCamara ? (
          <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="front" />
        ) : fotoLocal ? (
          <Image source={{ uri: fotoLocal.uri }} style={styles.stageImg} resizeMode="contain" />
        ) : (
          <View style={styles.stageEmpty}>
            <Text style={styles.stageEmptyTitle}>Sin cámara en este equipo</Text>
            <Text style={styles.stageEmptyBody}>
              Subí una foto o usá la silueta demo para la vista realista con IA.
            </Text>
            <Btn label="PERMITIR CÁMARA" light onPress={() => void pedir()} />
          </View>
        )}
        <Pressable
          style={StyleSheet.absoluteFill}
          pointerEvents={overlayEsPlaceholder || fotoLocal || !tieneCamara ? 'none' : 'box-only'}
          onPress={ev => {
            if (overlayEsPlaceholder || fotoLocal || !tieneCamara) return
            const { locationX, locationY } = ev.nativeEvent
            setHombros(h => [...h, { x: locationX, y: locationY }].slice(-2))
          }}
        />
        {overlay && !overlayEsPlaceholder && tieneCamara && !fotoLocal ? (
          <View
            pointerEvents="none"
            style={hombros.length === 2 ? clothDesdeHombros(hombros[0], hombros[1]) : styles.cloth}
          >
            <Image
              source={{ uri: assetUrl(overlay.urlOverlay) }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
          </View>
        ) : null}
      </View>

      <View style={styles.hudPanel}>
        <Text style={styles.hudTitle} numberOfLines={1}>
          {overlay ? `${overlay.producto} · ${overlay.talla}/${overlay.color}` : 'Cargando prenda'}
        </Text>
        <Text style={styles.hudHint}>
          {fotoLocal
            ? 'Foto lista · tocá Vista realista'
            : overlayEsPlaceholder
              ? 'Sin overlay 2D. Subí una foto o usá la cámara para la vista IA.'
              : tieneCamara
                ? 'Tocá los dos hombros para ajustar, o usá vista realista.'
                : 'Subí una foto o permití la cámara.'}
        </Text>
        {generando ? (
          <Text style={[styles.hudHint, { color: colors.gold }]}>
            Generando con IA… puede tardar hasta 2 min.
          </Text>
        ) : null}
        <View style={styles.hudRow}>
          <View style={{ flex: 1 }}>
            <Btn label="SUBIR FOTO" ghost light onPress={() => void elegirFoto()} disabled={generando} />
          </View>
          <View style={{ flex: 1 }}>
            <Btn label="SILUETA DEMO" ghost light onPress={() => void usarDemo()} disabled={generando} />
          </View>
        </View>
        <Btn
          label={generando ? 'GENERANDO…' : 'VISTA REALISTA (IA)'}
          light
          onPress={() => void generarVistaIa()}
          loading={generando}
          disabled={!puedeIa}
        />
        <Btn
          label="CERRAR"
          ghost
          light
          onPress={() => {
            setHombros([])
            setFotoLocal(null)
            s.back()
          }}
        />
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
  authPage: {
    backgroundColor: colors.paper,
    paddingBottom: 48,
  },
  authHero: {
    backgroundColor: colors.wineDeep,
    paddingTop: 48,
    paddingHorizontal: 22,
    paddingBottom: 28,
  },
  authBrand: {
    color: colors.white,
    letterSpacing: 8,
    fontSize: 26,
    fontWeight: '700',
  },
  authTag: {
    marginTop: 16,
    color: colors.gold,
    letterSpacing: 2.5,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  authHeadline: {
    marginTop: 8,
    color: colors.white,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '600',
  },
  authLead: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  authForm: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 8,
    width: '100%',
  },
  authLabel: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 12,
    letterSpacing: 1.4,
    color: colors.ink,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  authInput: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 16,
  },
  authActions: {
    marginTop: 24,
  },
  authApiToggle: {
    marginTop: 24,
    alignSelf: 'center',
    paddingVertical: 8,
  },
  authApiToggleText: {
    color: colors.taupe,
    fontSize: 13,
    letterSpacing: 0.4,
    textDecorationLine: 'underline',
  },
  authApiBox: {
    marginTop: 8,
    paddingTop: 4,
  },
  authHint: {
    color: colors.taupe,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  validHint: { color: colors.ok },
  invalidHint: { color: colors.error },
  eyebrow: { letterSpacing: 2, color: colors.taupe, fontSize: 11, marginTop: 8 },
  h1: { fontSize: 32, fontWeight: '600', color: colors.ink, lineHeight: 36 },
  h2: { fontSize: 22, fontWeight: '600', color: colors.ink, marginTop: 8 },
  lead: { color: colors.ink, lineHeight: 20, marginVertical: 6 },
  label: { marginTop: 10, fontSize: 12, letterSpacing: 1, color: colors.taupe },
  hint: { color: colors.taupe, fontSize: 13, marginTop: 4 },
  link: { color: colors.wine, marginBottom: 8 },
  hero: {
    minHeight: 460,
    justifyContent: 'flex-end',
    padding: 22,
    backgroundColor: colors.wineDeep,
  },
  heroDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,16,16,0.42)' },
  heroBrand: {
    color: colors.white,
    letterSpacing: 8,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  heroEye: { color: colors.gold, letterSpacing: 2, fontSize: 12 },
  heroTitle: { color: colors.white, fontSize: 40, lineHeight: 44, fontWeight: '600', marginTop: 8 },
  heroLead: { color: colors.white, marginTop: 8, maxWidth: 300, lineHeight: 20 },
  heroCtas: { marginTop: 18, gap: 10 },
  heroCta: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  heroCtaText: { color: colors.white, letterSpacing: 1, fontSize: 12 },
  heroCtaGhost: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  heroCtaGhostText: {
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  campaign: {
    backgroundColor: colors.dark,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  campaignText: { color: colors.white, letterSpacing: 1, fontSize: 11, flex: 1 },
  campaignLink: { color: colors.gold, fontSize: 12, marginLeft: 8 },
  rail: { marginTop: 18 },
  railHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16 },
  cell: { width: '48%' },
  occGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  occ: {
    width: '48%',
    minHeight: 110,
    backgroundColor: colors.dark,
    justifyContent: 'flex-end',
    padding: 12,
    overflow: 'hidden',
  },
  occDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  occText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  journal: { marginTop: 20, marginBottom: 8 },
  journalImg: { width: '100%', height: 180, marginBottom: 12 },
  lookBanner: { width: '100%', height: 140, marginVertical: 10 },
  lookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 10,
  },
  lookName: { fontWeight: '600', color: colors.ink, flex: 1 },
  benefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  benefit: {
    width: '48%',
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    color: colors.ink,
    fontSize: 13,
  },
  attention: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginVertical: 6 },
  priceOld: { color: colors.taupe, textDecorationLine: 'line-through', fontSize: 14 },
  fichaActions: { marginTop: 12, gap: 4 },
  fichaSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  linkish: { color: colors.wine, fontSize: 14 },
  linkInline: { color: colors.wine, textDecorationLine: 'underline' },
  metaLine: { color: colors.taupe, fontSize: 13, marginTop: 4 },
  opinionCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 10,
  },
  emptyBox: {
    marginTop: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: 8,
  },
  bagLine: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  bagThumb: { width: 72, height: 88, backgroundColor: '#ece7df' },
  bagThumbPh: { alignItems: 'center', justifyContent: 'center' },
  bagThumbPhText: { letterSpacing: 2, fontSize: 10, color: colors.taupe },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  summaryBox: { marginTop: 16, gap: 4 },
  qrBox: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  profileHead: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.wine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 24, fontWeight: '700' },
  accountCard: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 10,
  },
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
  stage: { flex: 1, backgroundColor: '#0a0a0a', overflow: 'hidden', position: 'relative' },
  stageImg: { width: '100%', height: '100%' },
  stageEmpty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#1a1a1a',
  },
  stageEmptyTitle: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  stageEmptyBody: {
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  cloth: { position: 'absolute', left: '18%', top: '16%', width: '64%', height: '68%' },
  hudPanel: {
    backgroundColor: '#141414',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 2,
  },
  hudTitle: {
    color: colors.white,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  hudHint: {
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 16,
  },
  hudRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
})
