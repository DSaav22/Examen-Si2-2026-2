# -*- coding: utf-8 -*-
"""Diagramas de arquitectura UML 2.5 (despliegue, componentes y manifestación) del modelo ICONIX.

Uso independiente:  python arquitectura.py   (rehace solo el paquete "7 Arquitectura" y exporta sus imágenes)
generar_ea.py lo llama al reconstruir el modelo completo.
"""
import os

# Profundidad de anidamiento -> orden de dibujo en EA (mayor = más atrás).
ORDEN = {0: 40, 1: 30, 2: 20, 3: 10}

VARIABLES_API = ["PORT", "DATABASE_URL", "JWT_SECRET", "JWT_EXPIRES_IN", "FRONTEND_URL", "AZURE_OPENAI_ENDPOINT",
                 "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_DEPLOYMENT", "SMTP_HOST / SMTP_PORT / SMTP_USER",
                 "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY", "APPLICATIONINSIGHTS_CONNECTION_STRING"]


class Arquitectura:
    def __init__(self, ea, paquete):
        self.ea, self.paq = ea, paquete
        self.diagramas = []

    # ---- utilidades
    def nuevo(self, nombre, tipo, estereotipo="", padre=None, notas=""):
        coleccion = padre.Elements if padre is not None else self.paq.Elements
        e = coleccion.AddNew(nombre, tipo)
        if estereotipo:
            e.Stereotype = estereotipo
        if notas:
            e.Notes = notas
        e.Update()
        return e

    def embebido(self, componente, nombre, tipo):
        e = componente.EmbeddedElements.AddNew(nombre, tipo)
        e.Update()
        return e

    def atributos(self, e, nombres):
        for n in nombres:
            a = e.Attributes.AddNew(n, "")
            a.Visibility = "Public"
            a.Update()
        e.Attributes.Refresh()

    def camino(self, a, b, estereotipo, nombre):
        c = a.Connectors.AddNew(nombre, "CommunicationPath")
        c.SupplierID = b.ElementID
        c.Stereotype = estereotipo
        c.Direction = "Unspecified"
        c.Update()
        return c

    def ensamblar(self, requerida, provista, interfaz=""):
        c = requerida.Connectors.AddNew(interfaz, "Assembly")
        c.SupplierID = provista.ElementID
        c.Update()
        return c

    def ruta(self, d, conector, puntos):
        """Fija los quiebres de una línea; EA guarda la Y en negativo."""
        link = d.DiagramLinks.AddNew("", "")
        link.ConnectorID = conector.ConnectorID
        link.Path = ";".join(f"{x}:{-y}" for x, y in puntos) + ";"
        link.Update()

    def dependencia(self, a, b, estereotipo, nombre=""):
        c = a.Connectors.AddNew(nombre, "Dependency")
        c.SupplierID = b.ElementID
        c.Stereotype = estereotipo
        c.Update()
        return c

    def colocar(self, d, elementos):
        """elementos: [(elemento, x, y, ancho, alto, profundidad)]"""
        for e, x, y, w, h, prof in elementos:
            o = d.DiagramObjects.AddNew(f"l={x};r={x + w};t={y};b={y + h};", "")
            o.ElementID = e.ElementID
            o.Update()
        d.Update()
        for e, *_, prof in elementos:
            self.ea.r.Execute(f"UPDATE t_diagramobjects SET Sequence={ORDEN[prof]} "
                              f"WHERE Diagram_ID={d.DiagramID} AND Object_ID={e.ElementID}")

    def puntos(self, d, elementos):
        """Interfaces y puertos embebidos: [(elemento, x, y)] con el centro sobre el borde del componente."""
        for e, x, y in elementos:
            o = d.DiagramObjects.AddNew(f"l={x - 8};r={x + 8};t={y - 8};b={y + 8};", "")
            o.ElementID = e.ElementID
            o.Update()
        d.Update()

    # ---- despliegue
    def despliegue(self):
        n = self.nuevo
        pc = n("PC o tablet (tienda o clienta)", "Node", "device")
        nav = n("Navegador web (Chrome, Edge, Safari)", "ExecutionEnvironment", "", pc)
        a_web = n("ensayar-web: index.html + assets/*.js", "Artifact", "", nav)
        a_sw = n("sw.js (service worker v2)", "Artifact", "", nav)
        a_man = n("manifest.webmanifest", "Artifact", "", nav)
        a_idb = n("IndexedDB ensayar-offline (cola de operaciones)", "Artifact", "", nav)
        a_cache = n("Cache Storage ensayar-shell / estaticos / api", "Artifact", "", nav)
        a_ls = n("localStorage (sesión, caché de datos, dispositivoId)", "Artifact", "", nav)

        tel = n("Teléfono Android", "Node", "device")
        rn = n("React Native 0.79 / Expo SDK 53 (Hermes)", "ExecutionEnvironment", "", tel)
        a_apk = n("ensayar.apk (bundle JS)", "Artifact", "", rn)
        a_sql = n("ensayar-offline.db (SQLite: operaciones, cache)", "Artifact", "", rn)

        nube = n("Amazon Web Services (AWS)", "Node", "device")
        ec2 = n("Instancia Amazon EC2 Linux (examensi2.duckdns.org)", "Node", "", nube)
        proxy = n("Servidor web con TLS (proxy inverso :443)", "ExecutionEnvironment", "", ec2)
        a_dist = n("frontend/dist (PWA compilada)", "Artifact", "", proxy)
        spec_web = n("ensayar-web.env", "DeploymentSpecification", "", proxy)
        self.atributos(spec_web, ["VITE_API_URL = /api"])
        node_api = n("Node.js 20 LTS: ensayar-api :3000", "ExecutionEnvironment", "", ec2)
        a_api = n("ensayar-api: dist/main.js", "Artifact", "", node_api)
        a_prisma = n("prisma: schema.prisma + migraciones", "Artifact", "", node_api)
        spec_api = n("ensayar-api.env", "DeploymentSpecification", "", node_api)
        self.atributos(spec_api, VARIABLES_API)
        pg = n("PostgreSQL 16", "ExecutionEnvironment", "", ec2)
        a_bd = n("base ensayar (tablas de negocio con tienda_id)", "Artifact", "", pg)

        aoai = n("Azure OpenAI (servicio externo de IA)", "Node", "device")
        push = n("Servicio Web Push del navegador (FCM, Mozilla, Apple)", "Node", "device")
        smtp = n("Servidor SMTP", "Node", "device")
        pasarela = n("Pasarela de pago (sandbox)", "Node", "device")

        self.camino(nav, proxy, "HTTPS", "PWA y REST/JSON /api + Idempotency-Key :443")
        movil = self.camino(rn, proxy, "HTTPS", "REST/JSON /api + Idempotency-Key :443")
        self.camino(proxy, node_api, "HTTP", "/api → localhost:3000")
        self.camino(node_api, pg, "TCP", "Prisma localhost:5432")
        self.camino(node_api, aoai, "HTTPS", "chat completions")
        self.camino(node_api, push, "HTTPS", "Web Push (VAPID)")
        aviso = self.camino(push, nav, "HTTPS", "notificación push al service worker")
        self.camino(node_api, smtp, "SMTP/TLS", ":587")
        self.camino(node_api, pasarela, "HTTPS", "cobro + webhook")

        nota = self.nuevo("Nota despliegue", "Note", notas=(
            "Una sola instancia EC2 de AWS aloja el proxy inverso con TLS, la API y PostgreSQL; el dominio "
            "examensi2.duckdns.org apunta a su IP pública. En desarrollo los mismos artefactos corren en localhost: API en :3000 y web en :5173. "
            "Sin red, el navegador y el teléfono siguen operando con IndexedDB y SQLite, y sincronizan "
            "por el mismo camino HTTPS al reconectar."))

        d = self.ea.diagrama(self.paq, "Despliegue", "Deployment")
        self.colocar(d, [
            (pc, 20, 60, 440, 400, 0), (nav, 35, 115, 410, 330, 1),
            (a_web, 50, 165, 185, 50, 2), (a_sw, 245, 165, 185, 50, 2),
            (a_man, 50, 230, 185, 50, 2), (a_idb, 245, 230, 185, 60, 2),
            (a_cache, 50, 305, 185, 60, 2), (a_ls, 245, 305, 185, 60, 2),
            (tel, 20, 500, 440, 230, 0), (rn, 35, 555, 410, 160, 1),
            (a_apk, 50, 610, 185, 50, 2), (a_sql, 245, 610, 185, 60, 2),
            (nube, 540, 60, 700, 800, 0), (ec2, 555, 110, 670, 735, 1),
            (proxy, 570, 150, 640, 120, 2), (a_dist, 585, 195, 270, 50, 3), (spec_web, 880, 190, 310, 65, 3),
            (node_api, 570, 290, 640, 320, 2), (a_api, 585, 340, 270, 45, 3), (a_prisma, 585, 400, 270, 45, 3),
            (spec_api, 880, 335, 310, 250, 3),
            (pg, 570, 640, 640, 180, 2), (a_bd, 585, 700, 300, 50, 3),
            (aoai, 1310, 90, 260, 90, 0),
            (push, 1310, 230, 260, 90, 0), (smtp, 1310, 380, 260, 80, 0), (pasarela, 1310, 520, 260, 80, 0),
            (nota, 20, 770, 440, 90, 0),
        ])
        self.ruta(d, aviso, [(1440, 25), (240, 25)])
        self.ruta(d, movil, [(500, 630), (500, 250)])
        self.diagramas.append((d, "arq-despliegue"))
        return {"web": a_dist, "sw": a_sw, "api": a_api, "apk": a_apk, "bd": a_bd, "prisma": a_prisma}

    # ---- componentes del backend
    def componentes_backend(self):
        n = self.nuevo
        cliente_web = n("Web PWA", "Component", "client")
        cliente_movil = n("App móvil", "Component", "client")
        api = n("API EnsayAR (monolito modular NestJS)", "Component", "subsystem")
        puerto = self.embebido(api, "http :3000/api", "Port")
        api_rest = self.embebido(puerto, "API REST", "ProvidedInterface")
        self.ensamblar(cliente_web, api_rest, "API REST")
        self.ensamblar(cliente_movil, api_rest, "API REST")

        nombres = {
            "Plataforma": "Planes, registro, suscripción y alta de tiendas; métricas SaaS",
            "Catálogo": "Productos, variantes y límites de plan",
            "Sync": "Lotes de operaciones offline, estados y conflictos",
            "Operación": "Caja, Créditos, Reservas, Devoluciones, Pedidos, Pagos, Proveedores, Usuarios, Admin",
            "Reportes": "Reportes inteligentes: capa semántica, validador y compilador SQL",
            "Auth": "Cuentas, tokens JWT, guards de rol y plataforma",
            "Ventas": "Cobro de ventas con descuento condicional de stock",
            "IA": "Cliente del modelo de lenguaje (ModeloClient)",
            "Tenancy": "Contexto de tienda (AsyncLocalStorage), tiendas y límites del plan",
            "Inventario": "Stock por almacén y movimientos",
            "Notificaciones": "Avisos en la aplicación, correo y push",
            "Prisma": "Acceso a datos con extensión multi-tienda (falla cerrada)",
            "Correo": "Envío SMTP (simulado sin servidor)",
            "Push": "Envío Web Push con VAPID",
        }
        c = {k: n(k, "Component", notas=v) for k, v in nombres.items()}
        uniones = [  # (requiere, provee, interfaz)
            ("Plataforma", "Auth", "IAutenticacion"), ("Plataforma", "Tenancy", "ITiendas, IPlanLimites"),
            ("Catálogo", "Tenancy", "IPlanLimites"),
            ("Auth", "Tenancy", "ITiendas"), ("Auth", "Correo", "ICorreo"),
            ("Sync", "Ventas", "IVentas"), ("Sync", "Inventario", "IInventario"),
            ("Sync", "Notificaciones", "INotificaciones"),
            ("Operación", "Ventas", "IVentas"), ("Operación", "Inventario", "IInventario"),
            ("Reportes", "IA", "IModeloLenguaje"),
            ("Ventas", "Inventario", "IInventario"), ("Ventas", "Notificaciones", "INotificaciones"),
            ("Notificaciones", "Push", "IPush"), ("Notificaciones", "Correo", "ICorreo"),
            ("Prisma", "Tenancy", "IContextoTienda"),
        ]
        con = {(a, b): self.ensamblar(c[a], c[b], i) for a, b, i in uniones}

        bd = n("PostgreSQL 16", "Component", "database")
        aoai = n("Azure OpenAI", "Component", "external")
        smtp = n("Servidor SMTP", "Component", "external")
        webpush = n("Servicio Web Push", "Component", "external")
        pasarela = n("Pasarela de pago (sandbox)", "Component", "external")
        self.ensamblar(c["Prisma"], bd, "SQL")
        for a, b, t in [(c["IA"], aoai, "HTTPS chat completions"), (c["Correo"], smtp, "SMTP/TLS"),
                        (c["Push"], webpush, "HTTPS VAPID"), (c["Plataforma"], pasarela, "IPasarelaSuscripcion")]:
            self.dependencia(a, b, "use", t)

        nota = n("Nota componentes", "Note", notas=(
            "Cada línea con bola y cuenca es un conector de ensamblaje: el componente de origen requiere la interfaz "
            "nombrada y el de destino la provee. Todos los módulos de negocio requieren además IAutenticacion (guards "
            "JWT y de rol) e IAccesoDatos (Prisma); esas líneas se omiten para que el diagrama se lea. Un solo proceso "
            "y una sola base: lo que cruza módulos es una transacción local, no una saga."))

        d = self.ea.diagrama(self.paq, "Componentes del backend", "Component")
        X0, Y0, W, H = 260, 130, 190, 70
        filas = [Y0 + 70, Y0 + 250, Y0 + 420, Y0 + 590]
        pos = {"Plataforma": (300, 0), "Catálogo": (530, 0), "Sync": (760, 0), "Operación": (1040, 0),
               "Reportes": (1270, 0),
               "Auth": (560, 1), "Ventas": (1040, 1), "IA": (1270, 1),
               "Tenancy": (300, 2), "Inventario": (760, 2), "Notificaciones": (1040, 2),
               "Prisma": (300, 3), "Correo": (560, 3), "Push": (1040, 3)}
        elementos = [(api, X0, Y0, 1240, 700, 0),
                     (cliente_web, 20, 290, 170, 70, 0), (cliente_movil, 20, 490, 170, 70, 0)]
        elementos += [(c[k], x, filas[f], W, H, 1) for k, (x, f) in pos.items()]
        elementos += [(pasarela, 300, 20, 190, 60, 0), (aoai, 1560, filas[1], 180, 70, 0),
                      (bd, 20, filas[3], 170, 70, 0), (smtp, 560, 880, 190, 60, 0), (webpush, 1040, 880, 190, 60, 0),
                      (nota, X0, 960, 1240, 70, 0)]
        self.colocar(d, elementos)
        self.puntos(d, [(puerto, X0, 425), (api_rest, X0 - 30, 425)])
        self.ruta(d, con[("Plataforma", "Tenancy")], [(280, filas[0] + 35), (280, filas[2] + 35)])
        self.diagramas.append((d, "arq-componentes"))
        return api, cliente_web, cliente_movil

    # ---- componentes del cliente
    def componentes_cliente(self):
        n = self.nuevo
        web = n("Web PWA (React 19 + Vite)", "Component", "subsystem")
        movil = n("App móvil (Expo / React Native)", "Component", "subsystem")
        api = n("API EnsayAR", "Component", "subsystem")
        rest = self.embebido(api, "API REST", "ProvidedInterface")
        w = {k: n(k, "Component", notas=v) for k, v in {
            "Páginas y pantallas": "POS, catálogo, sincronización, reportes, plataforma",
            "Cola offline (cola.ts)": "Guarda y lista operaciones en IndexedDB hasta que el servidor las confirme",
            "Red e identidad (red.ts)": "uuid(), dispositivoId(), esFalloRed()",
            "Motor de sincronización (sync.ts)": "Envía lotes a /sync/lote cada 30 s o al reconectar; actualiza estados",
            "Cliente HTTP (api.ts)": "fetch con token JWT y cabecera X-Tienda",
            "Caché de datos (cache.ts)": "Última copia de catálogo, stock y política offline",
            "Service worker (sw.js)": "App shell y datos en Cache Storage; recibe Web Push",
        }.items()}
        m = {k: n(k, "Component", notas=v) for k, v in {
            "Pantallas móviles": "Caja, catálogo, reportes y sincronización",
            "Almacén offline (almacen.native.ts)": "SQLite ensayar-offline.db: tablas operaciones y cache",
            "Sync móvil (sync.ts)": "NetInfo detecta la red y envía los lotes pendientes",
            "Cliente HTTP móvil (api.ts)": "fetch con token JWT y cabecera X-Tienda",
        }.items()}
        idb = n("IndexedDB", "Component", "browser API")
        cs = n("Cache Storage", "Component", "browser API")
        sqlite = n("expo-sqlite", "Component", "native module")

        pag, cola, red, sync, http, cache, sw = (w[k] for k in w)
        pan, alm, msync, mhttp = (m[k] for k in m)
        uniones = [
            (pag, cola, "ICola"), (pag, sync, "ISincronizar"), (pag, red, "IIdentidad"), (pag, cache, "ICache"),
            (pag, http, "IApi"), (sync, cola, "ICola"), (sync, http, "IApi"), (cola, idb, "IDBDatabase"),
            (sw, cs, "CacheStorage"), (http, rest, "API REST"),
            (pan, alm, "IAlmacen"), (pan, msync, "ISincronizar"), (pan, mhttp, "IApi"), (msync, alm, "IAlmacen"),
            (msync, mhttp, "IApi"), (alm, sqlite, "SQLiteDatabase"), (mhttp, rest, "API REST"),
        ]
        con = {(a.ElementID, b.ElementID): self.ensamblar(a, b, i) for a, b, i in uniones}

        d = self.ea.diagrama(self.paq, "Componentes del cliente", "Component")
        self.colocar(d, [
            (web, 20, 20, 900, 470, 0), (movil, 20, 530, 900, 270, 0), (api, 1080, 420, 200, 110, 0),
            (pag, 50, 80, 200, 80, 1), (cola, 370, 80, 210, 80, 1), (idb, 700, 80, 170, 70, 1),
            (red, 50, 250, 200, 80, 1), (sync, 370, 250, 210, 80, 1), (http, 700, 250, 170, 80, 1),
            (cache, 50, 390, 200, 70, 1), (sw, 370, 390, 210, 70, 1), (cs, 700, 390, 170, 70, 1),
            (pan, 50, 590, 200, 80, 1), (alm, 370, 590, 210, 80, 1), (sqlite, 700, 590, 170, 60, 1),
            (msync, 370, 700, 210, 70, 1), (mhttp, 700, 710, 170, 60, 1),
        ])
        self.puntos(d, [(rest, 1080, 475)])
        self.ruta(d, con[(pag.ElementID, cache.ElementID)], [(35, 120), (35, 425)])
        self.ruta(d, con[(pan.ElementID, mhttp.ElementID)], [(150, 785), (785, 785)])
        self.diagramas.append((d, "arq-componentes-cliente"))
        return web, movil

    # ---- manifestación
    def manifestacion(self, artefactos, api, web, movil):
        n = self.nuevo
        sw = n("Service worker", "Component")
        d = self.ea.diagrama(self.paq, "Artefactos y componentes", "Deployment")
        pares = [(artefactos["api"], api), (artefactos["prisma"], api), (artefactos["web"], web),
                 (artefactos["sw"], sw), (artefactos["apk"], movil)]
        for a, comp in pares:
            c = a.Connectors.AddNew("", "Manifest")
            c.SupplierID = comp.ElementID
            c.Update()
        filas = []
        for i, (a, comp) in enumerate(pares):
            filas.append((a, 30, 30 + i * 100, 260, 55, 0))
        vistos = []
        for i, (a, comp) in enumerate(pares):
            if comp.ElementID not in [v.ElementID for v in vistos]:
                vistos.append(comp)
        for j, comp in enumerate(vistos):
            filas.append((comp, 470, 30 + j * 125, 300, 70, 0))
        self.colocar(d, filas)
        self.diagramas.append((d, "arq-manifestacion"))

    def construir(self):
        artefactos = self.despliegue()
        api, _, _ = self.componentes_backend()
        web, movil = self.componentes_cliente()
        self.manifestacion(artefactos, api, web, movil)
        return self.diagramas


def main():
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from generar_ea import EA, IMAGENES, PAQUETE
    ea = EA()
    try:
        base = ea.r.Models.GetAt(0).Packages.GetByName("EnsayAR").Packages.GetByName(PAQUETE)
        for i in range(base.Packages.Count - 1, -1, -1):
            if base.Packages.GetAt(i).Name == "7 Arquitectura":
                base.Packages.DeleteAt(i, True)
        base.Packages.Refresh()
        paq = ea.paquete(base, "7 Arquitectura")
        diagramas = Arquitectura(ea, paq).construir()
        ids = ",".join(str(d.DiagramID) for d, _ in diagramas)
        ea.r.Execute(f"UPDATE t_diagram SET ShowForeign=0 WHERE Diagram_ID IN ({ids})")
        for d, archivo in diagramas:
            ea.proj.PutDiagramImageToFile(d.DiagramGUID, os.path.join(IMAGENES, archivo + ".png"), 1)
            print(archivo)
    finally:
        ea.r.CloseFile()
        ea.r.Exit()


if __name__ == "__main__":
    main()
