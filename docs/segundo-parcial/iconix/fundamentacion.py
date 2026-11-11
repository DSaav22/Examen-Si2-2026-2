# -*- coding: utf-8 -*-
"""Diagramas UML 2.5 de los capítulos de fundamentación (3, 4, 6 y 7).

Uso independiente:  python fundamentacion.py   (rehace solo el paquete "9 Fundamentacion" y exporta sus imágenes)
generar_ea.py lo llama al reconstruir el modelo completo.
"""
import os

from estados import FINAL, INICIAL, Estados

ACT_INICIAL, ACT_FINAL = 100, 101
FRAGMENTO = {"alt": 0, "loop": 4}


class Fundamentacion(Estados):
    def flujo(self, a, b, guarda="", tipo="ControlFlow"):
        c = a.Connectors.AddNew("", tipo)
        c.SupplierID = b.ElementID
        if guarda:
            c.TransitionGuard = guarda
        c.Update()
        return c

    def nodo(self, subtipo):
        return self.pseudo(subtipo)

    # ---- 3.2 planos de control y de aplicación
    def planos(self):
        n = self.nuevo
        usuaria = n("Usuaria de una tienda", "Actor")
        dueno = n("Dueño de la plataforma", "Actor")
        app = n("Plano de aplicación (multi-inquilino)", "Component", "subsystem")
        ctrl = n("Plano de control (global)", "Component", "subsystem")
        modulos_app = [n(m, "Component", "", app) for m in ("Catálogo", "Ventas", "Inventario", "Reportes")]
        modulos_ctrl = [n(m, "Component", "", ctrl) for m in ("Cuentas", "Planes", "Suscripciones", "Pagos", "Métricas")]
        negocio = n("Tablas de negocio (con tienda_id)", "Artifact", "table")
        plataforma = n("Tablas de plataforma (public)", "Artifact", "table")
        self.ea.conector(usuaria, app)
        self.ea.conector(dueno, ctrl)
        self.dependencia(app, negocio, "use", "solo filas de su tienda")
        self.dependencia(ctrl, plataforma, "use")
        global_ = self.dependencia(ctrl, negocio, "use", "métricas de todas las tiendas")

        d = self.ea.diagrama(self.paq, "Plano de aplicación y plano de control", "Component")
        lista = [(usuaria, 20, 150, 60, 90, 0), (app, 140, 60, 420, 280, 0),
                 (ctrl, 680, 60, 300, 380, 0), (dueno, 1060, 200, 60, 90, 0),
                 (negocio, 230, 440, 240, 70, 0), (plataforma, 710, 520, 240, 70, 0)]
        for i, m in enumerate(modulos_app):
            lista.append((m, 165 + (i % 2) * 195, 120 + (i // 2) * 100, 175, 70, 1))
        for i, m in enumerate(modulos_ctrl):
            lista.append((m, 720, 110 + i * 64, 220, 50, 1))
        self.colocar(d, lista)
        self.ruta(d, global_, [(700, 475)])
        self.diagramas.append((d, "fun-planos"))

    # ---- 3.3 ciclo de vida de la suscripción
    def ciclo_suscripcion(self):
        n = self.nuevo
        carriles = [n(c, "ActivityPartition") for c in ("Cliente", "Plataforma EnsayAR", "Pasarela de pago")]
        acc = lambda t: n(t, "Action")
        ini, f1, f2, f3 = self.nodo(ACT_INICIAL), self.nodo(ACT_FINAL), self.nodo(ACT_FINAL), self.nodo(ACT_FINAL)
        elegir, verificar = acc("Elegir plan y registrarse"), acc("Verificar correo")
        solicitud, cobrar = acc("Registrar solicitud de alta"), acc("Cobrar suscripción")
        d1, d2 = n("", "Decision"), n("", "Decision")
        rechazo, aprov = acc("Informar rechazo"), acc("Aprovisionar tienda en una transacción local")
        acceso, operar = acc("Enviar acceso y bienvenida"), acc("Operar la tienda")
        reembolso, fallo = acc("Reembolsar el cobro (compensación)"), acc("Informar el fallo")

        f = self.flujo
        f(ini, elegir); f(elegir, verificar); f(verificar, solicitud); f(solicitud, cobrar); f(cobrar, d1)
        f(d1, aprov, "cobro aprobado"); f(d1, rechazo, "cobro rechazado"); f(rechazo, f1)
        f(aprov, d2); f(d2, acceso, "alta correcta"); f(d2, reembolso, "falla el alta")
        f(acceso, operar); f(operar, f2); f(reembolso, fallo); f(fallo, f3)

        d = self.ea.diagrama(self.paq, "Ciclo de vida de la suscripción", "Activity")
        cx = {0: 170, 1: 490, 2: 810}
        W, H = 220, 55

        def accion(e, carril, y):
            return (e, cx[carril] - W // 2, y, W, H, 1)

        lista = [(c, 20 + i * 320, 20, 320, 980, 0) for i, c in enumerate(carriles)]
        lista += [
            (ini, cx[0] - 10, 70, 20, 20, 1), accion(elegir, 0, 120), accion(verificar, 0, 210),
            accion(solicitud, 1, 300), accion(cobrar, 2, 390), (d1, cx[1] - 25, 480, 50, 50, 1),
            accion(rechazo, 0, 560), (f1, cx[0] - 12, 660, 24, 24, 1),
            accion(aprov, 1, 570), (d2, cx[1] - 25, 660, 50, 50, 1),
            accion(acceso, 1, 750), accion(operar, 0, 830), (f2, cx[0] - 12, 930, 24, 24, 1),
            accion(reembolso, 2, 750), accion(fallo, 2, 840), (f3, cx[2] + 140, 855, 24, 24, 1),
        ]
        self.colocar(d, lista)
        self.diagramas.append((d, "fun-ciclo-suscripcion"))

    # ---- 4.1 modelos silo, bridge y pool
    def modelos_aislamiento(self):
        n = self.nuevo
        app = n("Aplicación EnsayAR (instancia compartida)", "Component", "subsystem")
        silo = n("Silo: una base por tienda", "Node", "device")
        silo_pg = n("PostgreSQL", "ExecutionEnvironment", "", silo)
        bases = [n(f"BD tienda {t}", "Artifact", "database", silo_pg) for t in "ABC"]
        bridge = n("Bridge: un esquema por tienda", "Node", "device")
        bridge_pg = n("PostgreSQL: base ensayar", "ExecutionEnvironment", "", bridge)
        esquemas = [n(f"tienda_{t}", "Artifact", "schema", bridge_pg) for t in "abc"]
        publico = n("public (plataforma)", "Artifact", "schema", bridge_pg)
        pool = n("Pool: tablas compartidas", "Node", "device")
        pool_pg = n("PostgreSQL: base ensayar", "ExecutionEnvironment", "", pool)
        tabla = n("productos", "Artifact", "table", pool_pg)
        for nombre, tipo in (("tienda_id", "uuid"), ("id", "uuid"), ("nombre", "text")):
            a = tabla.Attributes.AddNew(nombre, tipo)
            a.Visibility = "Public"
            a.Update()
        for destino, texto in ((silo_pg, "una conexión por tienda"), (bridge_pg, "cliente por esquema"),
                               (pool_pg, "filtro por tienda_id")):
            self.camino(app, destino, "TCP/TLS", texto)

        d = self.ea.diagrama(self.paq, "Modelos de aislamiento silo, bridge y pool", "Deployment")
        lista = [(app, 430, 20, 400, 70, 0),
                 (silo, 20, 230, 400, 300, 0), (silo_pg, 35, 280, 370, 235, 1),
                 (bridge, 460, 230, 400, 300, 0), (bridge_pg, 475, 280, 370, 235, 1), (publico, 490, 445, 340, 50, 2),
                 (pool, 900, 230, 340, 300, 0), (pool_pg, 915, 280, 310, 235, 1), (tabla, 950, 335, 240, 120, 2)]
        lista += [(b, 50 + i * 118, 345, 108, 80, 2) for i, b in enumerate(bases)]
        lista += [(e, 490 + i * 116, 335, 108, 80, 2) for i, e in enumerate(esquemas)]
        self.colocar(d, lista)
        self.diagramas.append((d, "fun-modelos-aislamiento"))

    # ---- 4.2 capas de aislamiento (defensa en profundidad)
    def capas_aislamiento(self):
        n = self.nuevo
        borde = n("Borde: token firmado (JWT con tiendaId)", "Component", "layer")
        nest = n("NestJS: TenantMiddleware y JwtAuthGuard", "Component", "layer", borde)
        prisma = n("Prisma: extensión que filtra y completa tiendaId", "Component", "layer", nest)
        pg = n("PostgreSQL: DEFAULT current_setting y RLS", "Component", "layer", prisma)
        datos = n("Datos de la tienda", "Artifact", "table", pg)
        d = self.ea.diagrama(self.paq, "Capas de aislamiento entre inquilinos", "Component")
        self.colocar(d, [(borde, 20, 20, 760, 470, 0), (nest, 70, 80, 660, 380, 1),
                         (prisma, 120, 140, 560, 290, 2), (pg, 170, 200, 460, 200, 3), (datos, 290, 280, 220, 70, 3)])
        self.ea.r.Execute(f"UPDATE t_diagramobjects SET Sequence=5 WHERE Diagram_ID={d.DiagramID} "
                          f"AND Object_ID={datos.ElementID}")
        self.diagramas.append((d, "fun-capas-aislamiento"))

    # ---- secuencias
    def secuencia(self, nombre, archivo, lineas, mensajes, fragmentos=(), izquierda=10):
        e = {k: self.nuevo(t, tipo) for k, t, tipo in lineas}
        d = self.ea.diagrama(self.paq, nombre, "Sequence")
        Y = [136 + 34.9 * i for i in range(len(mensajes))]
        alto = int(Y[-1]) + 30
        x = 30
        for k, _, tipo in lineas:
            ancho = 90 if tipo == "Actor" else 150
            self.ea.poner(d, e[k], x, 50, ancho, alto)
            x += ancho + (170 if tipo == "Actor" and fragmentos else 45)
        d.Update()
        retornos = []
        for i, (a, b, texto, *ret) in enumerate(mensajes, 1):
            con = e[a].Connectors.AddNew(texto, "Sequence")
            con.SupplierID = e[b].ElementID
            con.DiagramID = d.DiagramID
            con.SequenceNo = i
            con.Update()
            if ret:
                retornos.append(con.ConnectorID)
        # PDATA4 vacío deja que EA deduzca el retorno y dibuja discontinuas las llamadas hacia la izquierda.
        self.ea.r.Execute(f"UPDATE t_connector SET PDATA4='0' WHERE DiagramID={d.DiagramID}")
        if retornos:
            self.ea.r.Execute(f"UPDATE t_connector SET PDATA4='1' WHERE Connector_ID IN ({','.join(map(str, retornos))})")
        for tipo, ini, fin, guardas, *otros in fragmentos:
            bajo = int(Y[fin] + (24 if mensajes[fin][0] == mensajes[fin][1] else 14))
            arriba = int(Y[ini] - 27)
            f = self.paq.Elements.AddNew("", "InteractionFragment")
            f.Subtype = FRAGMENTO[tipo]
            f.Update()
            cortes = [arriba] + [int(Y[o] - 20) for o in otros] + [bajo]
            for k, guarda in enumerate(guardas):
                p = f.Partitions.AddNew(guarda, "")
                p.Size = cortes[k + 1] - cortes[k]
            f.Update()
            o = d.DiagramObjects.AddNew(f"l={izquierda};r={x - 35};t={arriba};b={bajo};", "")
            o.ElementID = f.ElementID
            o.Update()
        d.Update()
        self.diagramas.append((d, archivo))

    def secuencia_tenant(self):
        lineas = [("cli", ":Web PWA", "Object"), ("mw", ":TenantMiddleware", "Object"),
                  ("ctx", ":TenantContext", "Object"), ("guard", ":JwtAuthGuard", "Object"),
                  ("ctrl", ":CatalogoController", "Object"), ("serv", ":CatalogoService", "Object"),
                  ("ext", ":ExtensionPrismaTenant", "Object"), ("pg", ":PostgreSQL", "Object")]
        m = [("cli", "mw", "GET /catalogo/productos (Bearer)"),
             ("mw", "mw", "resolver(req)"),
             ("mw", "ctx", "run(contexto, next)"),
             ("ctx", "mw", "contexto abierto", 1),
             ("mw", "guard", "next()"),
             ("guard", "guard", "verificar firma y revocación"),
             ("guard", "ctx", "fijar(tiendaId)"),
             ("ctx", "guard", "tienda fijada", 1),
             ("guard", "ctrl", "listar(filtros)"),
             ("ctrl", "serv", "listar(filtros)"),
             ("serv", "ext", "producto.findMany(args)"),
             ("ext", "ctx", "tiendaId()"),
             ("ctx", "ext", "tiendaId", 1),
             ("ext", "pg", "SELECT … WHERE tienda_id = $1"),
             ("pg", "ext", "filas de la tienda", 1),
             ("ext", "serv", "productos", 1),
             ("serv", "ctrl", "productos", 1),
             ("ctrl", "cli", "200 OK + JSON", 1)]
        self.secuencia("Resolución de la tienda en una petición", "fun-seq-tenant", lineas, m)

    def secuencia_conflicto(self):
        lineas = [("a", "A:POS", "Object"), ("b", "B:POS", "Object"),
                  ("api", ":SyncController", "Object"), ("pg", ":PostgreSQL", "Object")]
        m = [("a", "api", "POST /sync/lote (venta uuid-A)"),
             ("b", "api", "POST /sync/lote (venta uuid-B)"),
             ("api", "pg", "tx A: UPDATE stock … WHERE cantidad − reservado ≥ 1"),
             ("pg", "api", "1 fila; la fila queda bloqueada", 1),
             ("api", "pg", "tx B: UPDATE sobre la misma fila"),
             ("pg", "pg", "tx B espera el bloqueo de fila"),
             ("api", "pg", "tx A: venta, movimiento y turno; COMMIT"),
             ("pg", "pg", "reevalúa WHERE: 0 − 0 ≥ 1 es falso"),
             ("pg", "api", "tx B: 0 filas afectadas", 1),
             ("api", "pg", "tx B: ROLLBACK (StockInsuficienteError)"),
             ("api", "a", "uuid-A: aplicada", 1),
             ("api", "b", "uuid-B: conflicto STOCK_INSUFICIENTE", 1)]
        self.secuencia("Conflicto por la última unidad de stock", "fun-seq-conflicto", lineas, m)

    def secuencia_saga(self):
        lineas = [("caj", "Cajero", "Actor"), ("orq", ":OrquestadorVenta", "Object"), ("ven", ":Ventas", "Object"),
                  ("inv", ":Inventario", "Object"), ("caja", ":Caja", "Object"), ("not", ":Notificaciones", "Object")]
        m = [("caj", "orq", "registrar venta"),
             ("orq", "ven", "1. crear venta PENDIENTE"), ("ven", "orq", "ok", 1),
             ("orq", "inv", "2. descontar stock"), ("inv", "orq", "ok", 1),
             ("orq", "caja", "3. sumar total al turno"), ("caja", "orq", "ok", 1),
             ("orq", "ven", "4. marcar venta COBRADA"), ("ven", "orq", "ok", 1),
             ("orq", "not", "5. avisar a la clienta y a los responsables"),
             ("orq", "ven", "1. crear venta PENDIENTE"), ("ven", "orq", "ok", 1),
             ("orq", "inv", "2. descontar stock"), ("inv", "orq", "ok", 1),
             ("orq", "caja", "3. sumar total al turno"), ("caja", "orq", "error: turno cerrado", 1),
             ("orq", "inv", "compensar 2: reingresar stock"),
             ("orq", "ven", "compensar 1: anular venta"),
             ("orq", "caj", "venta rechazada", 1)]
        self.secuencia("Saga orquestada de una venta", "fun-seq-saga", lineas, m,
                       [("alt", 1, 17, ["todos los pasos se confirman", "falla el paso 3: turno cerrado"], 10)],
                       izquierda=150)

    # ---- 6.2 ciclo de vida del service worker
    def estados_service_worker(self):
        n = self.nuevo
        ini, fin = self.pseudo(INICIAL), self.pseudo(FINAL)
        instalando = n("Instalando", "State", notas="install: precarga /, el manifiesto y el favicon")
        espera = n("En espera", "State", notas="Otra versión controla páginas abiertas")
        activando = n("Activando", "State", notas="activate: borra las cachés ajenas a la versión vigente")
        activo = n("Activo", "State", notas="Intercepta las peticiones de las páginas que controla")
        redundante = n("Redundante", "State")
        t = self.transicion
        t(ini, instalando, "", "", "navigator.serviceWorker.register('/sw.js')")
        t(instalando, espera, "install completado", "otra versión activa")
        salto = t(instalando, activando, "install completado", "skipWaiting() (sw.js de EnsayAR)")
        t(espera, activando, "", "ninguna página usa la versión anterior")
        t(activando, activo, "activate completado", "", "clients.claim()")
        t(instalando, redundante, "", "falla la instalación")
        t(activo, redundante, "", "una versión nueva se activa")
        t(redundante, fin)
        d = self.ea.diagrama(self.paq, "Ciclo de vida del service worker", "Statechart")
        self.colocar(d, [(ini, 30, 135, 20, 20, 0), (instalando, 280, 115, 190, 60, 0), (espera, 560, 30, 190, 60, 0),
                         (activando, 940, 115, 190, 60, 0), (activo, 940, 330, 190, 60, 0),
                         (redundante, 280, 330, 190, 60, 0), (fin, 120, 350, 20, 20, 0)])
        self.ruta(d, salto, [(705, 200)])
        self.diagramas.append((d, "fun-estados-service-worker"))

    # ---- 7.1 tubería del reporte inteligente
    def tuberia_reporte(self):
        n = self.nuevo
        ini, fin = self.nodo(ACT_INICIAL), self.nodo(ACT_FINAL)
        nombres = ["Capturar el pedido (texto o voz)", "Normalizar el texto",
                   "Interpretar (Azure OpenAI o reglas)", "Validar contra el catálogo",
                   "Compilar a SQL parametrizado", "Ejecutar en una transacción con la tienda fijada",
                   "Presentar tabla, gráfico, PDF o Excel", "Registrar la auditoría"]
        acciones = [n(t, "Action") for t in nombres]
        capa = n("Capa semántica", "Object", "datastore")
        self.flujo(ini, acciones[0])
        for a, b in zip(acciones, acciones[1:]):
            self.flujo(a, b)
        self.flujo(acciones[-1], fin)
        for i in (2, 3, 4):
            self.flujo(capa, acciones[i], tipo="ObjectFlow")
        d = self.ea.diagrama(self.paq, "Tubería del reporte inteligente", "Activity")
        W, H = 200, 60
        lista = [(ini, 20, 50, 20, 20, 0), (fin, 26, 335, 24, 24, 0)]
        for i, a in enumerate(acciones[:4]):
            lista.append((a, 80 + i * 260, 30, W, H, 0))
        for i, a in enumerate(acciones[4:]):
            lista.append((a, 80 + (3 - i) * 260, 315, W, H, 0))
        lista.append((capa, 600, 175, 220, 60, 0))
        self.colocar(d, lista)
        self.diagramas.append((d, "fun-tuberia-reporte"))

    def construir(self):
        self.planos()
        self.ciclo_suscripcion()
        self.modelos_aislamiento()
        self.capas_aislamiento()
        self.secuencia_tenant()
        self.secuencia_conflicto()
        self.secuencia_saga()
        self.estados_service_worker()
        self.tuberia_reporte()
        return self.diagramas


def main():
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from generar_ea import EA, IMAGENES, MODELO, PAQUETE
    ea = EA()
    try:
        base = ea.r.Models.GetAt(0).Packages.GetByName("EnsayAR").Packages.GetByName(PAQUETE)
        for i in range(base.Packages.Count - 1, -1, -1):
            if base.Packages.GetAt(i).Name == "9 Fundamentacion":
                base.Packages.DeleteAt(i, True)
        base.Packages.Refresh()
        paq = ea.paquete(base, "9 Fundamentacion")
        diagramas = Fundamentacion(ea, paq).construir()
        ids = ",".join(str(d.DiagramID) for d, _ in diagramas)
        ea.r.Execute(f"UPDATE t_diagram SET ShowForeign=0 WHERE Diagram_ID IN ({ids})")
        guids = [(d.DiagramGUID, archivo) for d, archivo in diagramas]
        estados = base.Packages.GetByName("8 Estados")
        for i in range(estados.Diagrams.Count):
            if estados.Diagrams.GetAt(i).Name == "Estados de una operación offline":
                guids.append((estados.Diagrams.GetAt(i).DiagramGUID, "fun-estados-operacion"))
        ea.r.CloseFile()
        ea.r.OpenFile(MODELO)
        ea.proj = ea.r.GetProjectInterface()
        for guid, archivo in guids:
            ea.proj.PutDiagramImageToFile(guid, os.path.join(IMAGENES, archivo + ".png"), 1)
            print(archivo)
    finally:
        ea.r.CloseFile()
        ea.r.Exit()


if __name__ == "__main__":
    main()
