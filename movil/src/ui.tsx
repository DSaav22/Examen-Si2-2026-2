import { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { assetUrl } from './api'
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
}: {
  label: string
  onPress: () => void
  ghost?: boolean
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <Pressable
      style={[styles.btn, ghost && styles.btnGhost, disabled && styles.btnOff]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={ghost ? colors.ink : colors.white} />
      ) : (
        <Text style={[styles.btnText, ghost && styles.btnTextGhost]}>{label}</Text>
      )}
    </Pressable>
  )
}

export function Header() {
  const s = useSession()
  const auth = s.screen.name === 'login' || s.screen.name === 'registro'
  const titulo =
    s.screen.name === 'ficha'
      ? 'FICHA'
      : s.screen.name === 'reservas'
        ? 'RESERVAS'
        : s.screen.name === 'historial'
          ? 'PEDIDOS'
          : s.screen.name === 'asistente'
            ? 'ASISTENTE'
            : 'VESTA'
  return (
    <View style={styles.header}>
      {auth ? (
        <Text style={styles.brand}>VESTA</Text>
      ) : (
        <>
          <Pressable onPress={() => s.setMenu(true)} hitSlop={8}>
            <Text style={styles.icon}>☰</Text>
          </Pressable>
          <Pressable onPress={() => s.goTab('inicio')}>
            <Text style={styles.brandSm}>{titulo === 'VESTA' ? 'VESTA' : titulo}</Text>
          </Pressable>
          <Pressable style={styles.branch} onPress={() => s.setElegir(true)}>
            <Text style={styles.branchText} numberOfLines={1}>
              {s.sucursal?.nombre ?? 'Sucursal'}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

export function BottomNav() {
  const s = useSession()
  const items: { id: 'inicio' | 'catalogo' | 'favoritos' | 'bolsa' | 'cuenta'; label: string }[] = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'catalogo', label: 'Mujer' },
    { id: 'favoritos', label: 'Favoritos' },
    { id: 'bolsa', label: `Bolsa${s.cart.length ? ` ${s.cart.length}` : ''}` },
    { id: 'cuenta', label: 'Cuenta' },
  ]
  return (
    <View style={styles.nav}>
      {items.map((it) => {
        const on = s.screen.name === it.id
        return (
          <Pressable key={it.id} style={styles.navItem} onPress={() => s.goTab(it.id)}>
            <Text style={[styles.navText, on && styles.navOn]}>{it.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Capas() {
  const s = useSession()
  return (
    <>
      <Modal visible={s.menu} animationType="fade" transparent onRequestClose={() => s.setMenu(false)}>
        <Pressable style={styles.scrim} onPress={() => s.setMenu(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>MENÚ</Text>
            <MenuRow label="Inicio" onPress={() => s.goTab('inicio')} />
            <MenuRow label="Mujer" onPress={() => s.abrirCatalogo()} />
            <MenuRow label="Novedades" onPress={() => s.abrirCatalogo('novedades')} />
            <MenuRow label="Ocasiones" onPress={() => s.abrirCatalogo('ocasiones')} />
            <MenuRow label="Ofertas" onPress={() => s.abrirCatalogo('ofertas')} />
            <MenuRow label="Reservas" onPress={() => s.push({ name: 'reservas' })} />
            <MenuRow label="Pedidos" onPress={() => s.push({ name: 'historial' })} />
            <MenuRow label="Asistente" onPress={() => s.push({ name: 'asistente' })} />
            <MenuRow label="Salir" onPress={() => void s.salir()} />
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={s.elegir} animationType="slide" transparent onRequestClose={() => s.setElegir(false)}>
        <Pressable style={styles.scrim} onPress={() => s.setElegir(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>SUCURSAL</Text>
            {s.sucursales.map((suc) => (
              <MenuRow
                key={suc.id}
                label={`${suc.nombre}${suc.ciudad ? ` · ${suc.ciudad}` : ''}`}
                onPress={() => void s.elegirSucursal(suc.id)}
              />
            ))}
            {s.sucursales.length === 0 ? (
              <Text style={styles.muted}>No hay sucursales. Revisa la API.</Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

function MenuRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.rowText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  ph: { backgroundColor: '#ece7df', alignItems: 'center', justifyContent: 'center' },
  phText: { letterSpacing: 3, color: colors.taupe, fontSize: 12 },
  card: { width: '100%', marginBottom: 22, backgroundColor: colors.paper },
  cardImg: { width: '100%', aspectRatio: 0.72 },
  badge: { position: 'absolute', left: 8, top: 8, backgroundColor: colors.dark, paddingHorizontal: 6, paddingVertical: 3 },
  badgeText: { color: colors.white, fontSize: 11, letterSpacing: 0.4 },
  heart: { position: 'absolute', right: 6, top: 6, padding: 6 },
  heartText: { color: colors.ink, fontSize: 18 },
  cardName: { marginTop: 8, fontSize: 14, color: colors.ink, fontWeight: '600' },
  cardMeta: { color: colors.taupe, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  priceRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  price: { fontWeight: '700', color: colors.ink },
  old: { color: colors.taupe, textDecorationLine: 'line-through', fontSize: 12 },
  add: { marginTop: 8, borderWidth: 1, borderColor: colors.ink, paddingVertical: 8, alignItems: 'center' },
  addText: { fontSize: 10, letterSpacing: 0.8, color: colors.ink },
  btn: { backgroundColor: colors.dark, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.ink },
  btnOff: { opacity: 0.45 },
  btnText: { color: colors.white, letterSpacing: 1.2, fontSize: 12, fontWeight: '600' },
  btnTextGhost: { color: colors.ink },
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
  branch: { maxWidth: 120, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', paddingHorizontal: 8, paddingVertical: 6 },
  branchText: { color: colors.white, fontSize: 11 },
  nav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    paddingBottom: 10,
    paddingTop: 8,
  },
  navItem: { flex: 1, alignItems: 'center' },
  navText: { fontSize: 11, color: colors.taupe, letterSpacing: 0.2 },
  navOn: { color: colors.ink, fontWeight: '700' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, padding: 20, paddingBottom: 36, gap: 4 },
  sheetTitle: { letterSpacing: 3, fontSize: 12, color: colors.taupe, marginBottom: 8 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowText: { fontSize: 16, color: colors.ink },
  muted: { color: colors.taupe, marginTop: 8 },
})
