import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import {
  AsistenteScreen,
  BolsaScreen,
  CatalogoScreen,
  CuentaScreen,
  FavoritosScreen,
  FichaScreen,
  HistorialScreen,
  HomeScreen,
  LoginScreen,
  ProbadorScreen,
  RegistroScreen,
  ReservasScreen,
} from './src/screens'
import { OperacionesScreen } from './src/operaciones'
import { SessionProvider, useSession } from './src/session'
import { colors } from './src/theme'
import { BottomNav, Capas, Header } from './src/ui'

/**
 * Punto de entrada móvil. La navegación se modela como una pila tipada en
 * SessionProvider en vez de React Navigation; al sumar una pantalla hay que
 * declararla en `Screen` (session.tsx) y renderizarla en este selector.
 */
function Root() {
  const s = useSession()
  if (!s.listo) {
    return (
      <View style={styles.splash}>
        <Text style={styles.brand}>VESTA</Text>
        <ActivityIndicator color={colors.white} />
      </View>
    )
  }
  if (s.screen.name === 'probar') {
    return (
      <View style={styles.app}>
        <StatusBar style="light" />
        {s.error ? <Text style={styles.error}>{s.error}</Text> : null}
        {s.aviso ? <Text style={styles.ok}>{s.aviso}</Text> : null}
        <View style={styles.body}>
          <ProbadorScreen />
        </View>
      </View>
    )
  }
  const esAuth = s.screen.name === 'login' || s.screen.name === 'registro'
  const conNav = !esAuth
  return (
    <View style={styles.app}>
      <StatusBar style="light" />
      {!esAuth ? <Header /> : null}
      {s.error ? <Text style={styles.error}>{s.error}</Text> : null}
      {s.aviso ? <Text style={styles.ok}>{s.aviso}</Text> : null}
      <View style={styles.body}>
        {s.screen.name === 'login' ? <LoginScreen /> : null}
        {s.screen.name === 'registro' ? <RegistroScreen /> : null}
        {s.screen.name === 'inicio' ? <HomeScreen /> : null}
        {s.screen.name === 'catalogo' ? <CatalogoScreen /> : null}
        {s.screen.name === 'favoritos' ? <FavoritosScreen /> : null}
        {s.screen.name === 'bolsa' ? <BolsaScreen /> : null}
        {s.screen.name === 'cuenta' ? <CuentaScreen /> : null}
        {s.screen.name === 'ficha' ? <FichaScreen /> : null}
        {s.screen.name === 'reservas' ? <ReservasScreen /> : null}
        {s.screen.name === 'historial' ? <HistorialScreen /> : null}
        {s.screen.name === 'asistente' ? <AsistenteScreen /> : null}
        {s.screen.name === 'operaciones' ? <OperacionesScreen /> : null}
      </View>
      {conNav ? <BottomNav /> : null}
      <Capas />
    </View>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <Root />
    </SessionProvider>
  )
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.paper },
  body: { flex: 1 },
  splash: { flex: 1, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center', gap: 16 },
  brand: { color: colors.white, letterSpacing: 8, fontSize: 28, fontWeight: '700' },
  error: { backgroundColor: '#f8e8eb', color: colors.error, paddingHorizontal: 16, paddingVertical: 8 },
  ok: { backgroundColor: '#e7f2eb', color: colors.ok, paddingHorizontal: 16, paddingVertical: 8 },
})
