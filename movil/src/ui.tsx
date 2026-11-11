import { useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { assetUrl, tiendaActiva } from './api'
import { useSync } from './offline/sync'
import { useSession } from './session'
import { colors } from './theme'
import { precioEfectivo, type Producto, type Variante } from './types'

export function ProductImage({
  producto,
  variante,
  style,
}: {
  producto: Producto
  variante?: Variante
  style?: object
}) {
  const [failed, setFailed] = useState(false)
  const source = variante?.urlFoto || producto.variantes[0]?.urlFoto
  if (failed || !source) {
    return (
      <View style={[styles.ph, style]}>
        <Text style={styles.phText}>VESTA</Text>
      </View>
    )
  }
  return (
    <Image
      source={{ uri: assetUrl(source) }}
      style={[styles.ph, style]}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  )
}

export function ProductCard({
  producto,
  onOpen,
}: {
  producto: Producto
  onOpen: () => void
}) {
  const s = useSession()
  const variante = producto.variantes[0]
  const dto = Number(producto.descuentoPct ?? 0)
  const fav = s.favs.includes(producto.id)
  return (
    <Pressable style={styles.card} onPress={onOpen}>
      <View>
        <ProductImage producto={producto} variante={variante} style={styles.cardImg} />
        {dto > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{dto}%</Text>
          </View>
        ) : null}
        <Pressable style={styles.heart} onPress={() => void s.toggleFav(producto.id)}>
          <Text style={styles.heartText}>{fav ? '♥' : '♡'}</Text>
        </Pressable>
      </View>
      <Text style={styles.cardName} numberOfLines={2}>
        {producto.nombre}
      </Text>
      <Text style={styles.cardMeta}>{producto.ocasion || producto.categoria || 'Mujer'}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{`Bs ${precioEfectivo(producto).toFixed(0)}`}</Text>
        {dto > 0 ? (
          <Text style={styles.old}>{`Bs ${Number(producto.precioBase).toFixed(0)}`}</Text>
        ) : null}
      </View>
      {variante ? (
        <Pressable
          style={styles.add}
          onPress={() =>
            s.addToCart({
              productoId: producto.id,
              nombre: producto.nombre,
              precio: precioEfectivo(producto),
              varianteId: variante.id,
              talla: variante.talla,
              color: variante.color,
              foto: variante.urlFoto,
            })
          }
        >
          <Text style={styles.addText}>AÑADIR A LA BOLSA</Text>
        </Pressable>
      ) : null}
    </Pressable>
  )
}

export function Btn({
  label,
  onPress,
  ghost,
  disabled,
  loading,
  light,
}: {
  label: string
  onPress: () => void
  ghost?: boolean
  disabled?: boolean
  loading?: boolean
  /** Para fondos oscuros (probador) */
  light?: boolean
}) {
  return (
    <Pressable
      style={[
        styles.btn,
        ghost && styles.btnGhost,
        light && !ghost && styles.btnLight,
        ghost && light && styles.btnGhostLight,
        disabled && styles.btnOff,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <View style={styles.btnInner}>
        {loading ? (
          <ActivityIndicator color={ghost && !light ? colors.ink : light && !ghost ? colors.ink : colors.white} />
        ) : (
          <Text
            style={[
              styles.btnText,
              ghost && styles.btnTextGhost,
              light && !ghost && styles.btnTextLight,
              ghost && light && styles.btnTextGhostLight,
            ]}
          >
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  )
}

function shortSucursal(nombre?: string | null) {
  if (!nombre) return 'Sucursal'
  if (nombre.includes(' · ')) {
    const part = nombre.split(' · ')[0]?.trim()
    return part || 'Sucursal'
  }
  return nombre.length > 14 ? `${nombre.slice(0, 13)}…` : nombre
}

export function Header() {
  const s = useSession()
  const sync = useSync()
  const auth = s.screen.name === 'login' || s.screen.name === 'registro'
  const brandName = s.tiendaActual?.nombre?.toUpperCase() || 'VESTA'
  return (
    <View style={styles.header}>
      {auth ? (
        <Text style={styles.brand}>{brandName}</Text>
      ) : (
        <>
          <Pressable onPress={() => s.setMenu(true)} hitSlop={8}>
            <Text style={styles.icon}>☰</Text>
          </Pressable>
          <Pressable onPress={() => s.goTab('inicio')}>
            <Text style={styles.brandSm}>{brandName.length > 12 ? `${brandName.slice(0, 11)}…` : brandName}</Text>
          </Pressable>
          <View style={styles.headerRight}>
            <View style={[styles.netBadge, sync.online ? styles.netOnline : styles.netOffline]}>
              <Text style={[styles.netBadgeText, sync.online ? styles.netOnlineText : styles.netOfflineText]}>
                {sync.online ? (sync.ops.length ? `● ${sync.ops.length}` : '● Red') : '○ Sin red'}
              </Text>
            </View>
            <Pressable style={styles.branch} onPress={() => s.setElegir(true)}>
              <Text style={styles.branchText} numberOfLines={1}>
                {shortSucursal(s.sucursal?.nombre)}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  )
}

export function BottomNav() {
  const s = useSession()
  const items: {
    id: 'inicio' | 'catalogo' | 'favoritos' | 'bolsa' | 'cuenta'
    label: string
    off: string
    on: string
    badge?: number
  }[] = [
    { id: 'inicio', label: 'Inicio', off: '⌂', on: '⌂' },
    { id: 'catalogo', label: 'Catálogo', off: '▦', on: '▣' },
    {
      id: 'favoritos',
      label: 'Favoritos',
      off: '♡',
      on: '♥',
      badge: s.favs.length > 0 ? s.favs.length : undefined,
    },
    {
      id: 'bolsa',
      label: 'Bolsa',
      off: '◫',
      on: '◼',
      badge: s.cart.length > 0 ? s.cart.length : undefined,
    },
    { id: 'cuenta', label: 'Cuenta', off: '○', on: '●' },
  ]

  return (
    <View style={styles.nav}>
      {items.map(it => {
        const selected =
          s.screen.name === it.id ||
          (it.id === 'catalogo' && s.screen.name === 'ficha') ||
          (it.id === 'cuenta' &&
            (s.screen.name === 'reservas' ||
              s.screen.name === 'historial' ||
              s.screen.name === 'asistente'))
        return (
          <Pressable
            key={it.id}
            style={styles.navItem}
            onPress={() => s.goTab(it.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={it.label}
          >
            {selected ? <View style={styles.navIndicator} /> : <View style={styles.navIndicatorSlot} />}
            <View style={styles.navIconWrap}>
              <Text style={[styles.navIcon, selected && styles.navIconOn]}>
                {selected ? it.on : it.off}
              </Text>
              {it.badge ? (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeText}>{it.badge > 9 ? '9+' : it.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.navText, selected && styles.navOn]}>{it.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Capas() {
  const s = useSession()
  const iniciales = (s.user?.nombre?.trim()?.[0] || 'V').toUpperCase()
  const drawerW = Math.min(340, Math.round(Dimensions.get('window').width * 0.88))

  function go(action: () => void) {
    s.setMenu(false)
    action()
  }

  return (
    <>
      <Modal visible={s.menu} animationType="fade" transparent onRequestClose={() => s.setMenu(false)}>
        <View style={styles.menuRoot}>
          <Pressable style={styles.menuScrim} onPress={() => s.setMenu(false)} />
          <View style={[styles.menuDrawer, { width: drawerW }]}>
            <View style={styles.menuDrawerInner}>
            <View style={styles.menuHero}>
              <View style={styles.menuHeroTop}>
                <Text style={styles.menuBrand}>{s.tiendaActual?.nombre?.toUpperCase() || 'VESTA'}</Text>
                <Pressable onPress={() => s.setMenu(false)} hitSlop={10} style={styles.menuClose}>
                  <Text style={styles.menuCloseText}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.menuTag}>{s.tiendaActual?.plan ? `Plan ${s.tiendaActual.plan}` : 'Edición boutique'}</Text>
              {s.user ? (
                <View style={styles.menuUser}>
                  <View style={styles.menuAvatar}>
                    <Text style={styles.menuAvatarText}>{iniciales}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuHello}>Hola</Text>
                    <Text style={styles.menuName} numberOfLines={1}>
                      {s.user.nombre}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <ScrollView
              style={styles.menuScroll}
              contentContainerStyle={styles.menuScrollPad}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.menuSection}>Colección</Text>
              <MenuRow
                label="Inicio"
                hint="Edición de temporada"
                onPress={() => go(() => s.goTab('inicio'))}
              />
              <MenuRow
                label="Catálogo"
                hint="Toda la colección"
                onPress={() => go(() => s.abrirCatalogo())}
              />
              <MenuRow
                label="Novedades"
                hint="Acaban de llegar"
                onPress={() => go(() => s.abrirCatalogo('novedades'))}
              />
              <MenuRow
                label="Ocasiones"
                hint="Trabajo, fiesta, casual"
                onPress={() => go(() => s.abrirCatalogo('ocasiones'))}
              />
              <MenuRow
                label="Ofertas"
                hint="Hasta 25%"
                accent
                onPress={() => go(() => s.abrirCatalogo('ofertas'))}
              />

              <Text style={styles.menuSection}>Tu cuenta</Text>
              <MenuRow
                label="Favoritos"
                hint="Prendas guardadas"
                onPress={() => go(() => s.goTab('favoritos'))}
              />
              <MenuRow
                label="Bolsa"
                hint={s.cart.length ? `${s.cart.length} prenda(s)` : 'Vacía por ahora'}
                onPress={() => go(() => s.goTab('bolsa'))}
              />
              <MenuRow
                label="Reservas"
                hint="Probar en tienda"
                onPress={() => go(() => s.push({ name: 'reservas' }))}
              />
              <MenuRow
                label="Pedidos"
                hint="Compras y seguimiento"
                onPress={() => go(() => s.push({ name: 'historial' }))}
              />
              <MenuRow
                label="Asistente"
                hint="Tallas, stock y pedidos"
                onPress={() => go(() => s.push({ name: 'asistente' }))}
              />
              <MenuRow
                label="Mi cuenta"
                hint={s.user?.email ?? 'Perfil'}
                onPress={() => go(() => s.goTab('cuenta'))}
              />
              {s.user?.rol !== 'CLIENTA' ? (
                <MenuRow
                  label="Operaciones"
                  hint={`Panel ${s.user?.rol ?? ''}`}
                  accent
                  onPress={() => go(() => s.push({ name: 'operaciones' }))}
                />
              ) : null}

              <Pressable
                style={styles.menuBranch}
                onPress={() => {
                  s.setMenu(false)
                  s.setElegir(true)
                }}
              >
                <Text style={styles.menuBranchLabel}>Retiro en tienda</Text>
                <Text style={styles.menuBranchValue} numberOfLines={1}>
                  {s.sucursal?.nombre ?? 'Elegir sucursal'}
                  {s.sucursal?.ciudad ? ` · ${s.sucursal.ciudad}` : ''}
                </Text>
              </Pressable>
            </ScrollView>

            <View style={styles.menuFoot}>
              <Pressable
                style={styles.menuLogout}
                onPress={() => {
                  s.setMenu(false)
                  void s.salir()
                }}
              >
                <Text style={styles.menuLogoutText}>Cerrar sesión</Text>
              </Pressable>
            </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={s.elegir} animationType="slide" transparent onRequestClose={() => s.setElegir(false)}>
        <Pressable style={styles.scrim} onPress={() => s.setElegir(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>SUCURSAL</Text>
              <Pressable onPress={() => s.setElegir(false)} hitSlop={8}>
                <Text style={styles.sheetClose}>Cerrar</Text>
              </Pressable>
            </View>
            <Text style={styles.sheetLead}>Elegí dónde retirar o ver stock.</Text>
            {s.sucursales.map(suc => {
              const on = suc.id === s.sucursalId
              return (
                <Pressable
                  key={suc.id}
                  style={[styles.branchRow, on && styles.branchRowOn]}
                  onPress={() => void s.elegirSucursal(suc.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.branchRowTitle, on && styles.branchRowTitleOn]}>
                      {suc.nombre}
                    </Text>
                    {suc.ciudad ? (
                      <Text style={[styles.branchRowMeta, on && styles.branchRowMetaOn]}>
                        {suc.ciudad}
                      </Text>
                    ) : null}
                  </View>
                  {on ? <Text style={styles.branchCheck}>✓</Text> : null}
                </Pressable>
              )
            })}
            {s.sucursales.length === 0 ? (
              <Text style={styles.muted}>No hay sucursales. Revisá la API.</Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

function MenuRow({
  label,
  hint,
  onPress,
  accent,
}: {
  label: string
  hint?: string
  onPress: () => void
  accent?: boolean
}) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuRowLabel, accent && styles.menuRowAccent]}>{label}</Text>
        {hint ? <Text style={styles.menuRowHint}>{hint}</Text> : null}
      </View>
      <Text style={styles.menuChevron}>›</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  ph: { backgroundColor: '#ece7df', alignItems: 'center', justifyContent: 'center' },
  phText: { letterSpacing: 3, color: colors.taupe, fontSize: 12 },
  card: { width: '100%', marginBottom: 22, backgroundColor: colors.paper },
  cardImg: { width: '100%', aspectRatio: 0.72 },
  badge: {
    position: 'absolute',
    left: 8,
    top: 8,
    zIndex: 2,
    backgroundColor: colors.dark,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeText: { color: colors.white, fontSize: 11, letterSpacing: 0.4, fontWeight: '700' },
  heart: { position: 'absolute', right: 6, top: 6, zIndex: 2, padding: 6 },
  heartText: { color: colors.ink, fontSize: 18 },
  cardName: { marginTop: 8, fontSize: 14, color: colors.ink, fontWeight: '600' },
  cardMeta: { color: colors.taupe, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  priceRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  price: { fontWeight: '700', color: colors.ink },
  old: { color: colors.taupe, textDecorationLine: 'line-through', fontSize: 12 },
  add: { marginTop: 8, borderWidth: 1, borderColor: colors.ink, paddingVertical: 8, alignItems: 'center' },
  addText: { fontSize: 10, letterSpacing: 0.8, color: colors.ink },
  btn: {
    backgroundColor: colors.dark,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 8,
    width: '100%',
    alignSelf: 'stretch',
  },
  btnInner: {
    width: '100%',
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.ink },
  btnLight: { backgroundColor: colors.white },
  btnGhostLight: { backgroundColor: 'transparent', borderColor: colors.white },
  btnOff: { opacity: 0.45 },
  btnText: {
    color: colors.white,
    letterSpacing: 1.2,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  btnTextLight: { color: colors.ink },
  btnTextGhost: { color: colors.ink },
  btnTextGhostLight: { color: colors.white },
  header: {
    backgroundColor: colors.dark,
    paddingTop: 46,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: { color: colors.white, letterSpacing: 6, fontSize: 22, fontWeight: '700', textAlign: 'center', flex: 1 },
  brandSm: { color: colors.white, letterSpacing: 4, fontSize: 16, fontWeight: '700' },
  icon: { color: colors.white, fontSize: 22 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  netBadge: { paddingVertical: 4, paddingHorizontal: 7, borderWidth: 1, borderRadius: 2 },
  netOnline: { borderColor: '#4e8760', backgroundColor: 'rgba(47,107,79,0.2)' },
  netOffline: { borderColor: '#c4934e', backgroundColor: 'rgba(138,90,18,0.25)' },
  netBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  netOnlineText: { color: '#74c48f' },
  netOfflineText: { color: '#f0c878' },
  branch: { maxWidth: 120, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', paddingHorizontal: 8, paddingVertical: 6 },
  branchText: { color: colors.white, fontSize: 11 },
  nav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    paddingBottom: 18,
    paddingTop: 4,
    shadowColor: '#111',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 4,
    minHeight: 56,
  },
  navIndicator: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.wine,
    marginBottom: 4,
  },
  navIndicatorSlot: {
    width: 22,
    height: 3,
    marginBottom: 4,
  },
  navIconWrap: {
    position: 'relative',
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  navIcon: {
    fontSize: 18,
    color: colors.taupe,
    lineHeight: 22,
  },
  navIconOn: {
    color: colors.wine,
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -12,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.wine,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  navBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  navText: {
    fontSize: 10,
    color: colors.taupe,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  navOn: {
    color: colors.wine,
    fontWeight: '700',
  },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, padding: 20, paddingBottom: 36, maxHeight: '70%' },
  sheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sheetTitle: { letterSpacing: 3, fontSize: 12, color: colors.taupe },
  sheetClose: { color: colors.wine, fontSize: 13 },
  sheetLead: { color: colors.taupe, fontSize: 13, marginBottom: 12 },
  branchRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  branchRowOn: { borderColor: colors.dark, backgroundColor: colors.dark },
  branchRowTitle: { fontSize: 16, color: colors.ink, fontWeight: '600' },
  branchRowTitleOn: { color: colors.white },
  branchRowMeta: { fontSize: 12, color: colors.taupe, marginTop: 2 },
  branchRowMetaOn: { color: 'rgba(255,255,255,0.75)' },
  branchCheck: { color: colors.gold, fontSize: 16, fontWeight: '700' },
  menuRoot: { flex: 1, flexDirection: 'row' },
  menuScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  menuDrawer: {
    height: '100%',
    zIndex: 3,
    elevation: 12,
  },
  menuDrawerInner: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  menuHero: {
    backgroundColor: colors.wineDeep,
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  menuHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuBrand: {
    color: colors.white,
    letterSpacing: 6,
    fontSize: 22,
    fontWeight: '700',
  },
  menuClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  menuCloseText: { color: colors.white, fontSize: 16 },
  menuTag: {
    marginTop: 10,
    color: colors.gold,
    letterSpacing: 2,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  menuUser: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.wine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuAvatarText: { color: colors.white, fontWeight: '700', fontSize: 18 },
  menuHello: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  menuName: { color: colors.white, fontSize: 17, fontWeight: '600' },
  menuScroll: { flex: 1 },
  menuScrollPad: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  menuSection: {
    marginTop: 18,
    marginBottom: 6,
    letterSpacing: 2,
    fontSize: 11,
    color: colors.taupe,
    textTransform: 'uppercase',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 8,
  },
  menuRowLabel: { fontSize: 17, color: colors.ink, fontWeight: '600' },
  menuRowAccent: { color: colors.wine },
  menuRowHint: { marginTop: 2, fontSize: 12, color: colors.taupe },
  menuChevron: { color: colors.taupe, fontSize: 22, paddingLeft: 4 },
  menuBranch: {
    marginTop: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  menuBranchLabel: {
    letterSpacing: 1.5,
    fontSize: 11,
    color: colors.taupe,
    textTransform: 'uppercase',
  },
  menuBranchValue: { marginTop: 6, fontSize: 15, color: colors.ink, fontWeight: '600' },
  menuFoot: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    padding: 16,
    paddingBottom: 28,
  },
  menuLogout: {
    borderWidth: 1,
    borderColor: colors.ink,
    paddingVertical: 14,
    alignItems: 'center',
  },
  menuLogoutText: {
    letterSpacing: 1.2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  muted: { color: colors.taupe, marginTop: 8 },
})
