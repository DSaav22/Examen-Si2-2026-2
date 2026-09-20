import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, assetUrl } from './src/api';

type User = { id: string; email: string; nombre: string; rol: string };
type Variante = {
  id: string;
  talla: string;
  color: string;
  sku: string;
  urlOverlay: string;
};
type Producto = {
  id: string;
  nombre: string;
  precioBase: string | number;
  descuentoPct?: string | number;
  variantes: Variante[];
};
type Overlay = {
  varianteId: string;
  talla: string;
  color: string;
  urlOverlay: string;
  producto: string;
};
type Linea = {
  varianteId: string;
  nombre: string;
  talla: string;
  color: string;
  precio: number;
  cantidad: number;
};
type Sucursal = {
  id: string;
  nombre: string;
  almacenes: { id: string; nombre: string }[];
};
type Reserva = {
  id: string;
  estado: string;
  horario: string;
  sucursal: { nombre: string };
};

function precioEfectivo(p: { precioBase: string | number; descuentoPct?: string | number }) {
  const base = Number(p.precioBase);
  const pct = Math.min(100, Math.max(0, Number(p.descuentoPct ?? 0)));
  return Math.round(base * (1 - pct / 100) * 100) / 100;
}

export default function App() {
  const [email, setEmail] = useState('clienta@ensayar.bo');
  const [password, setPassword] = useState('diego');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [carrito, setCarrito] = useState<Linea[]>([]);
  const [tab, setTab] = useState<'cat' | 'cart' | 'res'>('cat');
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [almacenId, setAlmacenId] = useState('');
  const [sucursalId, setSucursalId] = useState('');
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [cargando, setCargando] = useState(false);
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [hombros, setHombros] = useState<{ x: number; y: number }[]>([]);

  async function entrar() {
    setError('');
    setCargando(true);
    try {
      const res = await api<{ accessToken: string; user: User }>(
        '/auth/login',
        null,
        { method: 'POST', body: JSON.stringify({ email, password }) },
      );
      setToken(res.accessToken);
      setUser(res.user);
      setProductos(await api<Producto[]>('/catalogo/productos', res.accessToken));
      const s = await api<Sucursal[]>('/catalogo/sucursales', res.accessToken);
      setSucursales(s);
      setAlmacenId(s[0]?.almacenes[0]?.id ?? '');
      setSucursalId(s[0]?.id ?? '');
      if (res.user.rol === 'CLIENTA') {
        setReservas(await api<Reserva[]>('/reservas/mias', res.accessToken));
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message.startsWith('API_NO_ALCANZABLE')
          ? e.message
          : 'Correo o clave incorrectos, o la API no responde.',
      );
    } finally {
      setCargando(false);
    }
  }

  async function probar(id: string) {
    setError('');
    try {
      setOverlay(await api<Overlay>(`/catalogo/variantes/${id}/overlay`, token));
    } catch {
      setError('No hay overlay para esta variante.');
    }
  }

  function alCarrito(p: Producto, v: Variante) {
    setCarrito((prev) => {
      const i = prev.findIndex((l) => l.varianteId === v.id);
      if (i >= 0) {
        return prev.map((l, idx) =>
          idx === i ? { ...l, cantidad: l.cantidad + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          varianteId: v.id,
          nombre: p.nombre,
          talla: v.talla,
          color: v.color,
          precio: precioEfectivo(p),
          cantidad: 1,
        },
      ];
    });
    setOk(`${p.nombre} al carrito`);
  }

  async function comprar(medio: 'contra_entrega' | 'qr') {
    if (!token || !almacenId || !carrito.length) return;
    try {
      const venta = await api<{ id: string; total: string; pago?: { id: string } }>(
        '/ventas',
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            uuid: `${Date.now()}-${Math.random()}`,
            canal: 'online',
            medioPago: medio,
            almacenId,
            lineas: carrito.map((l) => ({
              varianteId: l.varianteId,
              cantidad: l.cantidad,
            })),
          }),
        },
      );
      if (venta.pago?.id) {
        await api(`/pagos/${venta.pago.id}/simular`, token, {
          method: 'POST',
          body: JSON.stringify({ resultado: 'aprobado' }),
        });
      }
      setOk(`Compra ${venta.id.slice(0, 8)} · Bs ${Number(venta.total).toFixed(2)}`);
      setCarrito([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compra falló');
    }
  }

  async function reservar() {
    if (!token || !sucursalId || !carrito.length) return;
    const horario = new Date();
    horario.setHours(horario.getHours() + 3);
    try {
      await api('/reservas', token, {
        method: 'POST',
        body: JSON.stringify({
          sucursalId,
          horario: horario.toISOString(),
          lineas: carrito.map((l) => ({
            varianteId: l.varianteId,
            cantidad: l.cantidad,
          })),
        }),
      });
      setOk('Reserva creada');
      setCarrito([]);
      setReservas(await api<Reserva[]>('/reservas/mias', token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reserva falló');
    }
  }

  useEffect(() => {
    if (overlay && !permiso?.granted) void pedirPermiso();
  }, [overlay, permiso, pedirPermiso]);

  if (!token || !user) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <Text style={styles.eyebrow}>EnsayAR móvil</Text>
        <Text style={styles.title}>Omnicanal</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.btn} onPress={entrar} disabled={cargando}>
          {cargando ? (
            <ActivityIndicator color="#fff8f2" />
          ) : (
            <Text style={styles.btnText}>Entrar</Text>
          )}
        </Pressable>
      </View>
    );
  }

  if (overlay) {
    return (
      <View style={styles.cameraBox}>
        <StatusBar style="light" />
        {permiso?.granted ? (
          <CameraView style={StyleSheet.absoluteFill} facing="front" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback]} />
        )}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(ev) => {
            const { locationX, locationY } = ev.nativeEvent;
            setHombros((h) => [...h, { x: locationX, y: locationY }].slice(-2));
          }}
        />
        <Image
          source={{ uri: assetUrl(overlay.urlOverlay) }}
          style={
            hombros.length === 2
              ? clothDesdeHombros(hombros[0], hombros[1])
              : styles.cloth
          }
          resizeMode="contain"
        />
        <View style={styles.hud}>
          <Text style={styles.hudText}>
            {overlay.producto} · {overlay.talla}/{overlay.color}
          </Text>
          <Pressable
            style={styles.btn}
            onPress={() => {
              setOverlay(null);
              setHombros([]);
            }}
          >
            <Text style={styles.btnText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <StatusBar style="dark" />
      <Text style={styles.eyebrow}>{user.nombre}</Text>
      <View style={styles.tabs}>
        <Pressable style={styles.ghost} onPress={() => setTab('cat')}>
          <Text>Catálogo</Text>
        </Pressable>
        <Pressable style={styles.ghost} onPress={() => setTab('cart')}>
          <Text>Carrito ({carrito.length})</Text>
        </Pressable>
        <Pressable style={styles.ghost} onPress={() => setTab('res')}>
          <Text>Reservas</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {ok ? <Text style={styles.ok}>{ok}</Text> : null}

      {tab === 'cat'
        ? productos.map((p) => (
            <View key={p.id} style={styles.card}>
              <Text style={styles.cardTitle}>{p.nombre}</Text>
              <Text>Bs {precioEfectivo(p).toFixed(2)}</Text>
              {p.variantes.map((v) => (
                <View key={v.id} style={{ gap: 6 }}>
                  <Pressable style={styles.ghost} onPress={() => void probar(v.id)}>
                    <Text>
                      Probar {v.talla}/{v.color}
                    </Text>
                  </Pressable>
                  {user.rol === 'CLIENTA' ? (
                    <Pressable style={styles.btn} onPress={() => alCarrito(p, v)}>
                      <Text style={styles.btnText}>Al carrito</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ))
        : null}

      {tab === 'cart' ? (
        <View style={styles.card}>
          {carrito.map((l) => (
            <Text key={l.varianteId}>
              {l.nombre} {l.talla}/{l.color} × {l.cantidad}
            </Text>
          ))}
          <Text>
            Total Bs{' '}
            {carrito.reduce((a, l) => a + l.precio * l.cantidad, 0).toFixed(2)}
          </Text>
          <Text style={styles.hint}>Almacén: {almacenId.slice(0, 8)}…</Text>
          <Pressable style={styles.btn} onPress={() => void comprar('contra_entrega')}>
            <Text style={styles.btnText}>Comprar contra entrega</Text>
          </Pressable>
          <Pressable style={styles.ghost} onPress={() => void comprar('qr')}>
            <Text>Comprar QR (auto-aprueba)</Text>
          </Pressable>
          <Pressable style={styles.ghost} onPress={() => void reservar()}>
            <Text>Reservar para tienda</Text>
          </Pressable>
        </View>
      ) : null}

      {tab === 'res'
        ? reservas.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {r.sucursal.nombre} · {r.estado}
              </Text>
              <Text>{new Date(r.horario).toLocaleString()}</Text>
            </View>
          ))
        : null}

      <Pressable
        style={styles.ghost}
        onPress={() => {
          setToken(null);
          setUser(null);
          setCarrito([]);
        }}
      >
        <Text>Salir</Text>
      </Pressable>
    </ScrollView>
  );
}

function clothDesdeHombros(a: { x: number; y: number }, b: { x: number; y: number }) {
  const ancho = Math.max(80, Math.hypot(b.x - a.x, b.y - a.y) * 1.85);
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  return {
    position: 'absolute' as const,
    left: midX - ancho / 2,
    top: midY - ancho * 0.12,
    width: ancho,
    height: ancho * 1.55,
  };
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 24, paddingTop: 56, backgroundColor: '#f6efe6', gap: 12 },
  eyebrow: { letterSpacing: 2, color: '#7a2430', textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '700', color: '#1c1412' },
  input: {
    borderWidth: 1,
    borderColor: '#e4d6c8',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
  },
  btn: { backgroundColor: '#7a2430', borderRadius: 999, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff8f2', fontWeight: '600' },
  hint: { color: '#6d5c56' },
  error: { color: '#7a2430' },
  ok: { color: '#2f6b4f' },
  card: { backgroundColor: '#fffaf4', padding: 16, borderRadius: 16, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  ghost: {
    borderWidth: 1,
    borderColor: '#e4d6c8',
    borderRadius: 999,
    padding: 10,
    alignItems: 'center',
  },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cameraBox: { flex: 1, backgroundColor: '#111' },
  fallback: { backgroundColor: '#222' },
  cloth: { position: 'absolute', left: '18%', top: '16%', width: '64%', height: '68%' },
  hud: { position: 'absolute', bottom: 32, left: 20, right: 20, gap: 10 },
  hudText: { color: '#fff8f2', textAlign: 'center' },
});
