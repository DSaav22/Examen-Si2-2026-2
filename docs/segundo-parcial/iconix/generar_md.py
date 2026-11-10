# -*- coding: utf-8 -*-
"""Escribe los apartados 9.1 a 9.4 (ICONIX) a partir de casos.py.

Uso: python generar_md.py
"""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from casos import ACTORES, CASOS, ENTIDADES, LOTES, RELACIONES_CU, REQUISITOS  # noqa: E402
from generar_ea import slug  # noqa: E402

SALIDA = os.path.join(AQUI, "..", "02-iconix")
IMG = "../imagenes/ea"
POR_ID = {c["id"]: c for c in CASOS}


FIGURAS = {"seccion": "9.1", "n": 0}

RNF = [
    ("RNF01", "Seguridad: solo usuarios autenticados y con el rol adecuado operan, y las credenciales nunca se guardan en claro",
     "Contraseñas con bcrypt; token JWT con expiración y revocación al cerrar sesión (TokenRevocado); guards de rol en cada ruta; validación estricta de la entrada (los campos no declarados se rechazan); los secretos solo en variables de entorno",
     "Pruebas de roles en `verificar:saas`; auditoría de login, logout y cambio de clave"),
    ("RNF02", "Aislamiento: ninguna tienda lee ni modifica datos de otra",
     "Base compartida con `tiendaId`; la extensión de Prisma filtra y completa la tienda desde el contexto de la petición y falla cerrada si no la hay; el SQL de reportes fija `app.tienda_id` con `set_config` dentro de la transacción",
     "`verificar:tenancy`; capítulo 4"),
    ("RNF03", "Persistencia offline: lo registrado sin red sobrevive al cierre de la aplicación y al reinicio del equipo",
     "Cola en IndexedDB (web) y SQLite (móvil); una operación solo se borra cuando el servidor responde un estado definitivo",
     "Recorrido manual con la red cortada y recarga del navegador; máquina de estados de 9.3"),
    ("RNF04", "Integridad transaccional: una venta se guarda completa o no se guarda",
     "Venta, líneas, movimiento de inventario y suma al turno en una sola transacción; descuento condicional de stock (nunca negativo)",
     "`ventas.spike-b.spec.ts`; reversión en `verificar:offline`"),
    ("RNF05", "Idempotencia: repetir un envío no duplica ventas, cobros ni abonos",
     "Clave `Idempotency-Key` en 11 rutas que cambian dinero o stock; en la sincronización el id de la operación es la clave (OperacionSync)",
     "Reenvío sin duplicados en `verificar:offline`; doble pago en `verificar:saas`; abonos repetidos en `verificar:reportes`"),
    ("RNF06", "Recuperación ante fallos: un corte a mitad del envío no pierde ni duplica operaciones",
     "El cliente reintenta con la misma clave; las respuestas `en_curso` y `error` dejan la operación pendiente; una operación en curso abandonada por más de un minuto se retoma",
     "Envíos simultáneos y reintentos en `verificar:offline`"),
    ("RNF07", "Mantenibilidad: cada área se puede cambiar sin tocar las demás",
     "Monolito modular NestJS con un módulo por área y dependencias explícitas por interfaz; TypeScript en los tres proyectos",
     "Diagrama de componentes (9.3.2)"),
    ("RNF08", "Compatibilidad: funciona en los navegadores y teléfonos que usan las tiendas",
     "PWA instalable en Chrome, Edge y Safari; app Android con Expo; interfaz adaptable a celular, tablet y PC",
     "Diagrama de despliegue (9.3.2); guías del capítulo 10"),
    ("RNF09", "Rendimiento: el punto de venta responde aunque la red sea lenta",
     "Catálogo, stock y política offline en caché local; la sincronización envía lotes de hasta 50 operaciones en segundo plano",
     "Recorridos del capítulo 10"),
    ("RNF10", "Observabilidad: se puede saber qué pasó con cada operación",
     "Application Insights y Log Analytics en Azure; tabla Auditoria para acciones sensibles; estado de cada operación offline visible en la Pantalla Sincronización",
     "Pantalla Sincronización (9.1.3); diagrama de despliegue"),
    ("RNF11", "Calidad: el comportamiento crítico se verifica de forma automática",
     "Pruebas unitarias y cuatro guiones de verificación de integración contra la API y una base real",
     "9.4"),
    ("RNF12", "Coherencia documental: los diagramas representan la solución construida",
     "El modelo de Enterprise Architect se regenera desde `casos.py`, `schema.prisma` y las firmas del código TypeScript",
     "9.4.6; anexo 14.6"),
]

CASOS_PRUEBA = [
    ("CP01", "UC01 (básico)", "Usuario de Vesta lista productos", "Solo aparecen productos de Vesta", "`verificar:tenancy`"),
    ("CP02", "Transversal (RNF02)", "Usuario de una tienda intenta leer o modificar un registro de otra por su id", "No lo encuentra y no lo cambia", "`verificar:tenancy`"),
    ("CP03", "Transversal (RNF02)", "Consulta ejecutada sin tienda en el contexto", "Error; la extensión falla cerrada y no devuelve datos", "`verificar:tenancy`"),
    ("CP04", "UC37 (2b)", "Cuenta nueva sin verificar intenta suscribirse", "Se rechaza hasta abrir el enlace de verificación", "`verificar:saas`"),
    ("CP05", "UC38 (3a)", "Pago con la tarjeta de prueba de rechazo", "No se crea la tienda; se puede reintentar", "`verificar:saas`"),
    ("CP06", "UC38 (3b)", "Dos pedidos de pago con la misma clave de idempotencia", "Un solo cobro y una sola tienda", "`verificar:saas`"),
    ("CP07", "UC23 (3a)", "Alta de un usuario por encima del límite del plan", "Rechazo con el límite del plan", "`verificar:saas`"),
    ("CP08", "UC40 (básico)", "La misma cuenta cambia de Vesta a Aurora Boutique", "Token nuevo; solo ve datos de la tienda elegida", "`verificar:saas`"),
    ("CP09", "UC42 (básico)", "Venta en efectivo con la red cortada y recarga del navegador", "La venta sigue en la cola como pendiente", "Recorrido manual; `verificar:offline`"),
    ("CP10", "UC42 (1a)", "Venta con QR sin red", "No se permite y se explica el motivo", "`verificar:offline`"),
    ("CP11", "UC44 (2a)", "El mismo lote enviado dos veces", "La segunda respuesta es repetida; no hay ventas duplicadas", "`verificar:offline`"),
    ("CP12", "UC44 (3b) y UC45", "Dos cajas venden sin red la última unidad y sincronizan", "Una venta aplicada y otra en conflicto; el stock queda en cero, no negativo", "`verificar:offline`"),
    ("CP13", "UC42 (4a)", "Operación creada antes de la ventana offline de siete días", "Llega como vencida", "`verificar:offline`"),
    ("CP14", "UC44 (transversal RNF04)", "Falla dentro de la transacción de una operación", "Rollback completo; nada parcial en la base", "`verificar:offline`"),
    ("CP15", "UC48 (básico)", "Pedido dictado con filtros, agrupación y orden", "Reporte correcto con SQL parametrizado", "`verificar:reportes`"),
    ("CP16", "UC48 (alterno)", "Pedido con texto que intenta inyectar SQL", "Se rechaza o se trata como texto; no se ejecuta nada extra", "`verificar:reportes`"),
    ("CP17", "UC49 (básico)", "Exportar el reporte a Excel y a PDF", "Se descargan los dos archivos con los mismos datos", "`verificar:reportes`"),
    ("CP18", "UC51 (3b)", "Dos abonos simultáneos por el saldo total", "Uno pasa y el otro se rechaza; el saldo no queda negativo", "`verificar:reportes`"),
    ("CP19", "UC07 (básico, concurrencia)", "Ventas concurrentes sobre el mismo stock", "Nunca se vende más de lo disponible", "`ventas.spike-b.spec.ts`"),
]

REGLAS = [
    ("RN01", "La tienda y la sucursal de una operación salen de la sesión, nunca de los datos que envía el cliente", "Contexto de tienda y extensión de Prisma", "Todos"),
    ("RN02", "No se cobra sin un turno de caja abierto en la sucursal", "VentasService, también al sincronizar", "UC06, UC07, UC42"),
    ("RN03", "El stock nunca queda negativo: si dos cajas venden la última unidad, solo una venta se aplica", "Actualización condicional de StockAlmacen", "UC07, UC44, UC45"),
    ("RN04", "Sin red solo se cobra en efectivo y sin cupón; QR, tarjeta y crédito requieren conexión", "Pantalla Punto de venta y validación del lote", "UC42"),
    ("RN05", "Una operación offline solo se acepta si se creó dentro de la ventana de la tienda (1 a 30 días, 7 por defecto)", "SyncService; política en la Pantalla Sincronización", "UC44, UC46"),
    ("RN06", "Cada operación tiene un id único generado en el dispositivo y se aplica una sola vez", "uuid() en el cliente; OperacionSync en el servidor", "UC42, UC43, UC44"),
    ("RN07", "Una operación no desaparece del dispositivo por haber intentado enviarla: solo sale de la cola con un estado definitivo", "Motor de sincronización del cliente", "UC44"),
    ("RN08", "Un conflicto lo resuelve una persona, vendiendo lo disponible o descartando; descartar en el servidor exige rol Encargado o Admin", "Pantalla Sincronización y SyncService", "UC45"),
    ("RN09", "No se cierra la caja con operaciones offline pendientes o en conflicto", "Pantalla Punto de venta", "UC08"),
    ("RN10", "Cada plan limita usuarios, sucursales y productos (Inicial: 3, 1 y 200)", "PlanLimitesService", "UC09, UC23, UC24"),
    ("RN11", "La tienda se crea solo con el pago de la suscripción aprobado, y en una sola transacción", "PlataformaService", "UC38"),
    ("RN12", "El correo del suscriptor se verifica antes de activar la cuenta", "AuthService y CorreoService", "UC36, UC37"),
    ("RN13", "Un abono nunca deja el saldo de la cuenta por cobrar en negativo", "Descuento condicional de CuentaCobrar", "UC51"),
    ("RN14", "No se devuelven más unidades que las vendidas; devolver una venta al crédito reduce la deuda y no saca efectivo", "Devoluciones", "UC33"),
    ("RN15", "El modelo de lenguaje no accede a la base: solo propone una especificación que se valida contra la capa semántica y se compila a SQL parametrizado con la tienda fijada", "ReportesService", "UC48, UC49"),
]


def seccion(s):
    FIGURAS.update(seccion=s, n=0)


def fig(archivo, titulo, carpeta=IMG):
    FIGURAS["n"] += 1
    return f"![Figura {FIGURAS['seccion']}.{FIGURAS['n']}: {titulo}]({carpeta}/{archivo}.png)\n"


def lista(items):
    return ", ".join(items[:-1]) + (" y " + items[-1] if len(items) > 1 else items[0]) if items else ""


def realiza(c):
    if not c["clases"]:
        return "Lógica del cliente (web y móvil)"
    ctrl, serv = c["clases"]
    return f"{serv}.{c['metodo']}" if serv else f"{ctrl}.{c['metodo']}"


# --------------------------------------------------------------------------- 9.1
def requisitos():
    seccion("9.1")
    o = ["# 9.1 Requisitos\n",
         "La etapa de requisitos de ICONIX produce cuatro artefactos que se revisan juntos: la lista de requisitos, "
         "el modelo de dominio, los prototipos de interfaz y los casos de uso. Para el segundo ciclo se partió de la "
         "consigna de la cátedra, de las fichas UC01 a UC35 del primer parcial y de las pantallas ya construidas en la "
         "web y en la app móvil.\n",
         "## 9.1.1 Requisitos del segundo ciclo\n",
         "Los requisitos se mantienen como una lista separada del texto de los casos de uso, como pide ICONIX. Cada "
         "código se asigna a uno o más casos de uso en el modelo de Enterprise Architect mediante una relación de "
         "realización, y esa asignación es la que permite trazar el requisito hasta la prueba.\n",
         "| Código | Área | Requisito | Casos de uso que lo realizan |", "|---|---|---|---|"]
    for cod, area, texto in REQUISITOS:
        casos = [c["id"] for c in CASOS if cod in c["req"]]
        if cod == "B1":
            casos_txt = "UC01 a UC35"
        elif cod == "S8":
            casos_txt = "Decisión de arquitectura (capítulo 4); se verifica en todos los casos"
        elif cod in ("P2", "P4"):
            casos_txt = "Estudio del capítulo 5"
        else:
            casos_txt = ", ".join(casos) or "—"
        o.append(f"| {cod} | {area} | {texto} | {casos_txt} |")
    o += ["",
          "Además de los requisitos funcionales rigen restricciones que no son diálogos con un actor y que ICONIX trata "
          "como requisitos transversales: toda consulta se ejecuta con la tienda de la sesión fijada (S8), toda "
          "operación que cambia dinero o stock acepta una clave de idempotencia (O6), ninguna operación deja stock "
          "negativo (O5) y el reporte generativo solo ejecuta SQL compilado desde una especificación validada (R2).\n"]
    for area in ("SaaS", "Offline", "Reportes", "Analítica", "Pagos"):
        o.append(fig(f"req-{slug(area)}", f"Asignación de los requisitos de {area} a casos de uso"))
    o += ["### Requisitos no funcionales\n",
          "Los requisitos no funcionales no son diálogos con un actor, pero condicionan a todos los casos. Cada uno se "
          "expresa como una propiedad verificable, junto con el mecanismo que la cumple en EnsayAR y la evidencia que "
          "la comprueba.\n",
          "| Código | Requisito | Cómo se cumple en EnsayAR | Evidencia |", "|---|---|---|---|"] + [
        f"| {a} | {b} | {c} | {d} |" for a, b, c, d in RNF] + [
          "",
          "### Reglas de negocio\n",
          "Las reglas de negocio son políticas de la tienda que el sistema hace cumplir siempre, con o sin red. Se "
          "aplican en el backend, de modo que un cliente modificado no puede saltarlas. Las que dependen del "
          "dispositivo se validan dos veces: en el cliente para avisar a tiempo y en el servidor al sincronizar.\n",
          "| Código | Regla | Dónde se aplica | Casos de uso |", "|---|---|---|---|"] + [
        f"| {a} | {b} | {c} | {d} |" for a, b, c, d in REGLAS] + [""]

    o += ["## 9.1.2 Modelo de dominio\n",
          "El modelo de dominio fija el vocabulario: cada sustantivo que aparece en un caso de uso con mayúscula inicial "
          "(Venta, StockAlmacen, CuentaCobrar) es una clase de este modelo, escrita igual. Se construyó en dos pasos. "
          "Primero, por inspección gramatical de la consigna y de las fichas del primer ciclo; después, durante la "
          "robustez, se agregaron las clases que los casos nuevos necesitaban (Cuenta, Plan, Suscripcion, "
          "PagoSuscripcion, Dispositivo, OperacionSync, PushSuscripcion, CuentaCobrar, AbonoCredito). Los atributos y "
          "las multiplicidades se toman del esquema de Prisma, de modo que el dominio y la base no pueden divergir.\n",
          "Toda clase de negocio pertenece a una Tienda. En el esquema eso es un campo tiendaId que la base completa "
          "desde la sesión, sin relación declarada; en el dominio se muestra como la asociación «pertenece a» para "
          "Usuario, Sucursal, Producto y Venta, que son las raíces de cada agregado.\n"]
    for archivo, titulo in [("dom-plataforma-saas", "plataforma SaaS"), ("dom-catalogo-e-inventario", "catálogo e inventario"),
                            ("dom-ventas-caja-y-credito", "ventas, caja y crédito"),
                            ("dom-sincronizacion-reportes-y-avisos", "sincronización, reportes y avisos"),
                            ("dom-analitica-y-pagos", "analítica y pagos (por confirmar)"),
                            ("dom-modelo-de-dominio-completo", "modelo de dominio completo")]:
        o.append(fig(archivo, f"Dominio, {titulo}"))
    o += ["| Clase | Significado |", "|---|---|"]
    o += [f"| {k} | {v} |" for k, v in ENTIDADES.items()]
    o += ["",
          "## 9.1.3 Prototipos de interfaz\n",
          "En ICONIX los casos de uso describen el diálogo con pantallas concretas, por lo que cada caso nombra su "
          "frontera. En el segundo ciclo los prototipos son las pantallas ya implementadas: se diseñaron como bocetos "
          "antes de programar y hoy funcionan como prototipos validados. Las fronteras usadas en los casos de uso son:\n",
          "| Frontera | Casos de uso |", "|---|---|"]
    fronteras = {}
    for c in CASOS:
        for f in c["fronteras"]:
            fronteras.setdefault(f, []).append(c["id"])
    o += [f"| {f} | {', '.join(ids)} |" for f, ids in sorted(fronteras.items())]
    o += ["", "Las pantallas principales del incremento, tomadas del sistema en funcionamiento con los datos de demostración, "
          "sirven como prototipo de GUI: cada texto de caso de uso nombra estos elementos tal como aparecen.\n"]
    for archivo, titulo in [
        ("gui-planes", "Pantalla Planes: módulos, planes y precios por período (UC36)"),
        ("gui-empezar", "Pantalla Empezar: registro de la cuenta, paso 1 de 3 (UC36)"),
        ("gui-plataforma", "Panel de plataforma: MRR, ARR, ARPU, churn y proyección (UC41)"),
        ("gui-pos-offline", "Pantalla Punto de venta sin conexión (UC42)"),
        ("gui-sincronizacion", "Pantalla Sincronización: estado del dispositivo y política offline (UC44 a UC46)"),
        ("gui-reporte", "Pantalla Reportes: reporte inteligente desde lenguaje natural (UC48)"),
    ]:
        o.append(fig(archivo, titulo, "../imagenes/gui"))

    o += ["## 9.1.4 Actores\n", "| Actor | Descripción |", "|---|---|"]
    o += [f"| {k} | {v} |" for k, v in ACTORES.items()]
    o += ["", "Servicio de IA, Pasarela de pago y Dispositivo sin red son actores secundarios: no inician casos de uso, "
          "pero el sistema dialoga con ellos a través de una frontera propia (Interfaz Azure OpenAI, Interfaz pasarela "
          "y Cola local).\n"]

    o += ["## 9.1.5 Diagramas de casos de uso\n",
          "Los casos se agrupan por lote. El lote 0 reúne los 35 casos heredados, divididos por paquete funcional; los "
          "lotes 1 a 5 son los nuevos del segundo ciclo. Cada diagrama dibuja el sujeto UML 2.5 (el rectángulo "
          "\"EnsayAR: …\"), que marca el límite del sistema: los casos de uso quedan dentro y los actores fuera. Los "
          "actores que inician casos van a la izquierda y los secundarios (Servicio de IA, Pasarela de pago y "
          "Dispositivo sin red) a la derecha. Las relaciones «include» y «extend» son las siguientes:\n",
          "| Caso | Relación | Caso base |", "|---|---|---|"]
    for a, t, b in RELACIONES_CU:
        o.append(f"| {a} {POR_ID[a]['nombre']} | «{t}» | {b} {POR_ID[b]['nombre']} |")
    o.append("")
    lote0 = list(dict.fromkeys(c["paquete"] for c in CASOS if c["lote"] == 0))
    for p in lote0:
        o.append(fig(f"cu-lote-0-{slug(p)}", f"Casos de uso del lote 0, paquete {p}"))
    for lote in range(1, 6):
        nombre = f"{LOTES[lote][0].lower()} {LOTES[lote][1]}"
        o.append(fig(f"cu-{slug(nombre)}", f"Casos de uso del {LOTES[lote][0].lower()}, {LOTES[lote][1]}"))

    o += ["## 9.1.6 Texto de los casos de uso\n",
          "Cada caso se escribe con las reglas de ICONIX: voz activa, evento y respuesta, sustantivos tomados del "
          "dominio y fronteras con nombre. El curso básico es el camino en que todo sale bien; cada curso alterno se "
          "numera con el paso donde se desvía (4a, 4b) y dice cómo termina. Los casos UC01 a UC35 son las fichas del "
          "primer ciclo reescritas con estas reglas.\n"]
    for lote in LOTES:
        o.append(f"### {LOTES[lote][0]}: {LOTES[lote][1]}\n")
        if lote in (4, 5):
            o.append("> Alcance acordado con el integrante a cargo; el texto se ajusta a su implementación.\n")
        for c in [x for x in CASOS if x["lote"] == lote]:
            o.append(f"#### {c['id']} {c['nombre']}\n")
            o.append(f"**Actores:** {lista(c['actores'])}. **Paquete:** {c['paquete']}. "
                     f"**Requisitos:** {', '.join(c['req'])}. **Pantallas:** {lista(c['fronteras'])}.\n")
            o.append("**Curso básico**\n")
            o += [f"{i}. {p}" for i, p in enumerate(c["basico"], 1)]
            o.append("\n**Cursos alternos**\n")
            o += [f"- **{a}.** {t}" for a, t in c["alternos"]]
            o.append("")

    o += ["## 9.1.7 Revisión de requisitos\n",
          "La revisión se hizo por lotes, justo antes de pasar cada uno a robustez, con la lista de verificación de "
          "ICONIX. El acta resume lo encontrado y lo corregido.\n",
          "| Verificación | Resultado |", "|---|---|",
          "| Cada requisito S, O, R, A y P está asignado a al menos un caso o a una decisión documentada | Sí. S8, P2 y P4 se cubren con capítulos, no con diálogos |",
          "| Cada caso tiene curso básico y al menos un curso alterno | Sí, en los 54 casos |",
          "| Los sustantivos de los casos existen en el dominio con el mismo nombre | Sí, tras agregar Cuenta, Plan, Suscripcion, PagoSuscripcion, Dispositivo, OperacionSync, PushSuscripcion, CuentaCobrar y AbonoCredito |",
          "| Cada caso nombra su pantalla | Sí; se nombraron fronteras que estaban implícitas, como Cola local y Selector de tienda |",
          "| Los casos heredados contemplan la tienda y la falta de red | Se agregaron alternos sin red a UC01, UC07, UC08, UC09 y UC27, y el control de límites del plan a UC09, UC23 y UC24 |",
          "| No hay requisitos del tipo \"el sistema deberá\" dentro del texto | Se movieron a la lista de requisitos |",
          ""]
    return "\n".join(o)


# --------------------------------------------------------------------------- 9.2
HALLAZGOS = {
    "UC07": "La robustez mostró que el cobro toca cuatro entidades y que el turno de caja debe verificarse antes del stock; el orden de los controladores quedó fijado así en el texto.",
    "UC08": "Al dibujar el cierre apareció la dependencia con la cola offline: un turno no debe cerrarse con operaciones pendientes. Se agregó el alterno 1a.",
    "UC15": "El inicio de sesión necesitaba dos entidades distintas: Cuenta (identidad global) y Usuario (membresía en una tienda). El dominio se separó en consecuencia.",
    "UC23": "El alta de usuarios no tenía control de límites. La robustez agregó el control Verificar límite del plan y las entidades Plan y Suscripcion.",
    "UC33": "Al conectar la devolución con las entidades apareció CuentaCobrar: devolver una venta al crédito debe reducir la deuda y no sacar efectivo de la caja.",
    "UC38": "El pago y la creación de la tienda debían ser una sola unidad. La robustez separó Cobrar suscripción de Aprovisionar tienda para que el segundo solo ocurra con el pago aprobado.",
    "UC42": "La venta sin red no llega al servidor: sus controladores viven en el cliente (los módulos red, cola y caché de la PWA) y la frontera es la Cola local, no la API.",
    "UC44": "El control Verificar duplicado necesitaba una entidad propia para recordar qué uuid ya se aplicó; así nació OperacionSync.",
    "UC48": "La robustez separó interpretar (IA o reglas), validar y compilar. Solo el compilador produce SQL, y lo hace desde una especificación validada.",
    "UC51": "Descontar el saldo debía ser condicional para que dos abonos simultáneos no lo dejen negativo; el control lleva ese nombre a propósito.",
}


def robustez():
    seccion("9.2")
    o = ["# 9.2 Análisis y diseño preliminar\n",
         "Para cada caso de uso se dibujó su diagrama de robustez con los tres estereotipos de ICONIX: fronteras "
         "(pantallas e interfaces externas), controles (funciones lógicas, que son verbos) y entidades (clases del "
         "dominio). Las conexiones respetan las reglas del proceso: el actor solo habla con fronteras, las fronteras "
         "solo con controles y las entidades solo con controles. Cada entidad de robustez está vinculada por «trace» "
         "a su clase del dominio.\n",
         "Cada diagrama se lee de izquierda a derecha siguiendo el curso básico: actor, pantalla, cadena de controles "
         "en el orden del texto y, a la derecha, las entidades que cada control lee o modifica. Cuando un control "
         "habla con un sistema externo, la frontera de ese sistema y su actor secundario aparecen en el extremo "
         "derecho.\n"]
    for lote in LOTES:
        o.append(f"## {LOTES[lote][0]}: {LOTES[lote][1]}\n")
        for c in [x for x in CASOS if x["lote"] == lote]:
            o.append(f"### Robustez {c['id']} {c['nombre']}\n")
            o.append(fig(f"rob-{c['id'].lower()}", f"Robustez de {c['id']} {c['nombre']}"))
            o.append("| Control | Entidades o fronteras que usa |")
            o.append("|---|---|")
            for nombre, usa in c["controles"]:
                o.append(f"| {nombre} | {lista(usa) or 'Cálculo interno'} |")
            o.append("")
            if c["id"] in HALLAZGOS:
                o.append(f"**Hallazgo de la robustez.** {HALLAZGOS[c['id']]}\n")
    o += ["## 9.2.1 Revisión de diseño preliminar (PDR)\n",
          "La PDR aplicó la prueba del resaltador: se recorrió cada frase del curso básico y de los alternos y se marcó "
          "el elemento del diagrama que la realiza, hasta que no quedó texto sin objeto ni objeto sin texto.\n",
          "| Verificación | Resultado |", "|---|---|",
          f"| Cada caso tiene diagrama de robustez | Sí, {len(CASOS)} diagramas |",
          f"| Número de controles por caso dentro de lo recomendado (2 a 5) | Sí; el máximo es {max(len(c['controles']) for c in CASOS)} (UC48) |",
          "| Ninguna frontera habla con una entidad | Sí; se verificó al generar el modelo |",
          "| Todas las entidades existen en el dominio | Sí; las de los lotes 4 y 5 están marcadas como previstas |",
          "| Los hallazgos se corrigieron en el texto y en el dominio | Sí; ver los hallazgos de cada caso |",
          "| No hay detalle de diseño prematuro (tablas, SQL, frameworks) | Sí; los nombres de tablas y métodos aparecen recién en la secuencia |",
          ""]
    return "\n".join(o)


# --------------------------------------------------------------------------- 9.3
def diseno():
    seccion("9.3")
    o = ["# 9.3 Diseño detallado\n",
         "El diseño detallado asigna comportamiento a las clases. Hay un diagrama de secuencia por caso de uso, y sus "
         "líneas de vida son las de la robustez: el actor, la pantalla, las entidades y las interfaces externas. A "
         "ellas se suman las clases del backend que realizan el caso. Cada control de la robustez reaparece como un "
         "mensaje del servicio hacia la entidad que toca.\n",
         "En NestJS, la clase que recibe la petición HTTP se llama controller, pero en términos de ICONIX es una "
         "frontera del lado del servidor: valida la entrada, toma el usuario y la tienda del token, y delega. Los "
         "controles de ICONIX quedan como operaciones del servicio. En los módulos sin servicio propio (Créditos, "
         "Pagos, Devoluciones, Pedidos, Usuarios, Cliente y Administración), el controller ejecuta los controles "
         "directamente sobre Prisma; la CDR lo registra como deuda técnica.\n",
         "Los diagramas siguen la notación de secuencia de UML 2.5:\n",
         "- **Mensajes síncronos con argumentos reales.** El mensaje a la API lleva la ruta y la operación del "
         "controller con sus parámetros (por ejemplo `POST /ventas: crear(user, dto)`), y el mensaje al servicio "
         "nombra la operación y sus argumentos tal como están en el código (`cobrar(dto, actor, opciones)`).",
         "- **Mensajes de respuesta.** Se dibujan con línea punteada y flecha abierta.",
         "- **Fragmento combinado `alt`.** ICONIX pide que la secuencia cubra el curso básico y los alternos. El "
         "fragmento se abre en el mensaje donde el sistema toma la decisión: después de validar o consultar, o "
         "después del cobro cuando el alterno es un pago rechazado (UC27, UC38, UC39, UC54). El primer operando "
         "tiene como guarda la condición del curso alterno (por ejemplo `[Sin turno abierto o sin stock (3a)]`) y "
         "devuelve el motivo hasta la pantalla. El segundo, `[else]`, sigue el curso básico. Cuando el alterno no "
         "corta el caso sino que lo resuelve de otra forma, como el respaldo por reglas si el Servicio de IA no "
         "responde (UC04, UC29, UC48), los dos operandos continúan hacia el mismo cierre. Los alternos que ocurren "
         "solo en el dispositivo (permiso de cámara o de notificaciones) se cubren en la robustez y no en la "
         "secuencia del servidor.",
         "- **Fragmento combinado `loop`.** Se usa cuando el caso repite pasos por elemento. En UC44 el servidor "
         "procesa cada operación del lote en su propia transacción: `loop [por cada operación del lote]`.\n",
         "La arquitectura técnica que la robustez omitía (el guard JWT, el contexto de tienda y la clave de "
         "idempotencia) no se repite en cada secuencia: se aplica a todas las rutas por el mismo mecanismo y se "
         "muestra una sola vez en la arquitectura (9.3.2).\n"]
    for lote in LOTES:
        o.append(f"## {LOTES[lote][0]}: {LOTES[lote][1]}\n")
        for c in [x for x in CASOS if x["lote"] == lote]:
            o.append(f"### Secuencia {c['id']} {c['nombre']}\n")
            o.append(fig(f"seq-{c['id'].lower()}", f"Secuencia de {c['id']} {c['nombre']}"))
            if c["ruta"]:
                o.append(f"Ruta `{c['ruta']}`, realizada por `{realiza(c)}`.\n")
            else:
                o.append("El caso se realiza en el cliente, sin pasar por la API hasta la sincronización.\n")
    o += ["## 9.3.1 Modelo estático de diseño\n",
          "Al dibujar cada mensaje, la operación se agregó a la clase que lo recibe. El resultado es el modelo de clases "
          "de diseño por módulo: arriba, los controllers y servicios con sus operaciones; abajo, las clases del dominio "
          "de las que dependen. Las firmas no se escribieron a mano: el generador del modelo lee el código TypeScript "
          "del backend, así que cada clase muestra lo que realmente existe.\n",
          "| Elemento del diagrama | Notación UML 2.5 | Ejemplo |", "|---|---|---|",
          "| Clase con estereotipo | «controller» o «service» sobre el nombre | «service» SyncService |",
          "| Atributo | Visibilidad, nombre, tipo y propiedad | `- sync: SyncService {readOnly}` (dependencia inyectada por el constructor) |",
          "| Operación | Visibilidad, nombre, parámetros con tipo | `+ lote(user: JwtPayload, dto: LoteSyncDto)` |",
          "| Asociación navegable | Línea con flecha, nombre de rol y multiplicidad en el extremo | SyncController → SyncService, rol `-sync`, multiplicidad 1 |",
          "| Dependencia de uso | Línea punteada con flecha y «use» | SyncService ··> OperacionSync |",
          "| Asociación del dominio | Línea con multiplicidades en ambos extremos | Venta 0..* — 0..1 Usuario (rol clienta) |",
          ""]
    # Como en generar_ea.py: cada clase queda en el módulo del primer caso que la usa.
    modulo_de = {}
    for c in CASOS:
        if c["secuencia"]:
            modulo_de.setdefault("__cliente__", "Cliente offline")
        else:
            for n in c["clases"] or ():
                if n:
                    modulo_de.setdefault(n, c["paquete"])
    for m in dict.fromkeys(modulo_de.values()):
        o.append(fig(f"dis-{slug(m)}", f"Clases de diseño del módulo {m}"))
    o += ["## 9.3.2 Arquitectura\n",
          "Las decisiones de arquitectura vienen del primer ciclo y de los capítulos de fundamentación, y entran al "
          "diseño detallado como restricciones. La aplicación es un monolito modular: un proceso NestJS con un módulo "
          "por área, una sola base PostgreSQL compartida por todas las tiendas y dos clientes (web PWA y app Expo) que "
          "guardan una cola local para operar sin red. La arquitectura se documenta con cuatro diagramas UML 2.5: "
          "despliegue, componentes del backend, componentes de los clientes y manifestación de artefactos.\n",
          "### Diagrama de despliegue\n",
          fig("arq-despliegue", "Despliegue de EnsayAR en Azure y en los dispositivos"),
          "El diagrama muestra dónde se ejecuta cada pieza en producción. Sigue `infra/app.bicep`, que crea toda la "
          "infraestructura con `azd up`.\n",
          "| Elemento UML | Qué representa en EnsayAR |", "|---|---|",
          "| Nodo «device» | Hardware físico o un recurso que se contrata como unidad: la PC o tablet de la tienda o de la clienta, el teléfono Android, el grupo de recursos de Azure y los servicios externos (Web Push, SMTP y pasarela de pago) |",
          "| Nodo anidado | Recurso de Azure dentro del grupo: el App Service Plan Linux, el servidor PostgreSQL Flexible (Standard_B1ms), Application Insights con Log Analytics y Azure OpenAI |",
          "| «executionEnvironment» | Software que hospeda a los artefactos: el navegador web, el runtime React Native con Hermes, Node.js 20 LTS (uno por App Service) y PostgreSQL 16 |",
          "| Artefacto | Archivo concreto que se despliega o se crea en el dispositivo: `dist/main.js`, el esquema y las migraciones de Prisma, `frontend/dist`, `sw.js`, `manifest.webmanifest`, la base IndexedDB `ensayar-offline`, Cache Storage, `localStorage`, el `.apk` y la base SQLite `ensayar-offline.db` |",
          "| «deployment spec» | Configuración con la que se despliega un artefacto: `ensayar-api.env`, con las 11 variables que lee la API (sin valores, porque son secretos), y `ensayar-web.env`, con `VITE_API_URL` |",
          "| Camino de comunicación | Enlace entre nodos con su protocolo como estereotipo y su puerto o uso como nombre: «HTTPS» REST/JSON con `Idempotency-Key` en el puerto 443, «TCP/TLS» Prisma en el 5432, «SMTP/TLS» en el 587 y «HTTPS» Web Push firmado con VAPID |",
          "",
          "Se leen tres recorridos. El primero es la descarga de la PWA desde el App Service web y su instalación en el "
          "navegador. El segundo son las llamadas REST de ambos clientes a la API, que con red operan en línea y sin "
          "red guardan en IndexedDB o SQLite y luego reenvían por el mismo camino. El tercero es el aviso push: la API "
          "lo firma con VAPID, el servicio push del navegador lo entrega y el service worker lo muestra aunque la "
          "aplicación esté cerrada.\n",
          "### Diagrama de componentes del backend\n",
          fig("arq-componentes", "Componentes del backend (monolito modular NestJS)"),
          "El subsistema «subsystem» API EnsayAR expone un puerto `http :3000/api` que provee la interfaz API REST. "
          "Los dos clientes la requieren y se conectan con un conector de ensamblaje. Dentro del subsistema, cada "
          "módulo NestJS es un componente. Cada línea con el símbolo de bola y cuenca es un conector de ensamblaje: "
          "el componente de origen requiere la interfaz nombrada y el de destino la provee. Por ejemplo, Sync "
          "requiere IVentas, IInventario e INotificaciones, y Prisma requiere IContextoTienda de Tenancy para filtrar "
          "por tienda. Las dependencias con sistemas externos (Azure OpenAI, SMTP, Web Push y la pasarela) se "
          "dibujan como «use», y Prisma requiere la interfaz SQL de PostgreSQL. Para que el diagrama se lea se "
          "omiten dos dependencias que tienen todos los módulos: IAutenticacion (guards) e IAccesoDatos (Prisma).\n",
          "### Diagrama de componentes de los clientes\n",
          fig("arq-componentes-cliente", "Componentes de la PWA y de la app móvil"),
          "La web y la app repiten la misma estructura. Las pantallas usan la cola offline, el motor de "
          "sincronización y el cliente HTTP. La cola persiste en IndexedDB (web) o en SQLite (móvil). El motor de "
          "sincronización vacía la cola contra la API REST, la misma interfaz del diagrama anterior. En la web, el "
          "service worker guarda el app shell y los datos en Cache Storage, y es quien recibe los avisos push.\n",
          "### Manifestación de artefactos\n",
          fig("arq-manifestacion", "Artefactos que manifiestan a cada componente"),
          "La relación «manifest» une el diseño lógico con el físico: dice qué archivo desplegado implementa cada "
          "componente. `dist/main.js` y el esquema de Prisma manifiestan la API, `frontend/dist` la PWA, `sw.js` el "
          "service worker y el `.apk` la app móvil. Con esto, cada componente del diagrama de componentes se puede "
          "seguir hasta un nodo del diagrama de despliegue.\n",
          "## 9.3.3 Máquinas de estado de la sincronización\n",
          "La operación offline es el único objeto del sistema cuyo comportamiento depende de su historia: la misma "
          "venta puede estar pendiente en el teléfono, aplicada en el servidor o detenida en un conflicto. Por eso, "
          "además de las secuencias, se modela con dos máquinas de estado UML 2.5. Cada transición se escribe como "
          "`evento [guarda] / efecto`.\n",
          fig("est-operacion-offline", "Estados de una operación offline en el dispositivo"),
          "En el dispositivo, la operación nace Pendiente dentro del estado compuesto *Guardada en el dispositivo*, "
          "que agrupa todo lo que está persistido en IndexedDB o SQLite. Al reconectar, o cada 30 segundos, pasa a "
          "En envío. Solo un estado definitivo del servidor (aplicada, repetida o fusionada) la saca de la cola. Si "
          "llega en_curso, error o se corta la red, vuelve a Pendiente. Un conflicto, un rechazo o un vencimiento "
          "la dejan guardada con el motivo hasta que la persona la reintenta o la descarta. Así se cumple que una "
          "operación nunca desaparece por el solo hecho de haber intentado enviarla (RN07).\n",
          fig("est-operacion-sync", "Estados de OperacionSync en el servidor"),
          "En el servidor, cada operación recibida crea una fila OperacionSync En curso y abre su propia "
          "transacción. Si se confirma, termina Aplicada (o Fusionada, si la clienta ya existía). Si falta stock o el "
          "turno ya no es válido, termina en Conflicto con rollback. Un reenvío del mismo id sobre una operación "
          "Aplicada no vuelve a ejecutar nada: responde *repetida* (transición sobre sí misma). Los estados se "
          "corresponden con los que el usuario ve en la Pantalla Sincronización.\n",
          "| Estado en el dispositivo | Significado para la persona | Estado en el servidor |", "|---|---|---|",
          "| Pendiente | Registrada localmente, todavía no enviada | (sin fila) |",
          "| En envío | Enviada en un lote, esperando respuesta | En curso |",
          "| (sale de la cola) | Confirmada | Aplicada o Fusionada |",
          "| En conflicto | Requiere decisión: vender lo disponible o descartar | Conflicto, y luego Descartada si se descarta |",
          "| Rechazada | Datos inválidos o sin permiso | Rechazada |",
          "| Vencida | Fuera de la ventana offline de la tienda | Vencida |",
          "",
          "## 9.3.4 Revisión crítica de diseño (CDR)\n",
          "| Verificación | Resultado |", "|---|---|",
          f"| Cada caso tiene secuencia y coincide con su texto | Sí, {len(CASOS)} secuencias |",
          "| La secuencia cubre el curso básico y los alternos | Sí; el alterno que decide en el servidor queda en un fragmento `alt` ubicado en el paso donde ocurre, y el lote de sincronización en un `loop` |",
          "| Las firmas del diseño coinciden con el código | Sí; se leen de los archivos TypeScript al regenerar el modelo |",
          "| Cada control de robustez aparece como mensaje | Sí; los mensajes se derivan de los controles |",
          "| Las operaciones están en la clase que tiene la información | Sí en los servicios. Créditos, Pagos y Devoluciones concentran lógica en el controller: deuda técnica aceptada para este ciclo |",
          "| Las operaciones que cambian dinero o stock son idempotentes | Sí; la clave de idempotencia está en 11 rutas |",
          "| Ninguna operación consulta datos sin la tienda de la sesión | Sí; la extensión de Prisma falla cerrada sin tienda y el SQL de reportes usa set_config |",
          "| Existe un plan de pruebas por caso | Sí; ver 9.4 |",
          ""]
    return "\n".join(o)


# --------------------------------------------------------------------------- 9.4
def implementacion():
    o = ["# 9.4 Implementación y pruebas\n",
         "El código se escribió a partir del diseño de cada lote. ICONIX organiza las pruebas en dos niveles. Las "
         "unitarias verifican controles aislados, como el compilador de SQL seguro o los filtros del catálogo. Las "
         "de integración recorren un caso de uso completo contra el sistema en ejecución, con su curso básico y sus "
         "alternos.\n",
         "## 9.4.1 Plan de pruebas\n",
         "| Aspecto | Definición |", "|---|---|",
         "| Objetivo | Demostrar que cada caso de uso cumple su curso básico y sus alternos, y que se cumplen los requisitos no funcionales RNF02 a RNF06 (aislamiento, persistencia offline, integridad, idempotencia y recuperación) |",
         "| Niveles | Unitarias sobre controles aislados; integración por caso de uso contra la API y una base PostgreSQL real; sistema, con recorridos manuales en navegador y en Expo con la red cortada |",
         "| Datos | Semilla de demostración con al menos tres tiendas (Vesta, Aurora Boutique y Andes Moda) bajo una misma cuenta, más tiendas `demo-*` creadas por autoservicio; tarjetas de prueba de la pasarela sandbox |",
         "| Entorno | Backend en el puerto 3000 y web en el 5173, con la base local migrada (`prisma migrate deploy`) y la semilla cargada |",
         "| Escenarios críticos | Dos tiendas con datos parecidos (aislamiento); dos cajas que venden la última unidad sin red; el mismo lote enviado dos veces; un corte de red a mitad del envío; una operación fuera de la ventana offline; pedidos de reporte ambiguos o maliciosos |",
         "| Criterio de aceptación | Todos los chequeos de los cuatro guiones en verde, ninguna lectura con datos de otra tienda, ningún stock o saldo negativo y ninguna operación duplicada |",
         "| Registro | Cada guion imprime el escenario, el resultado esperado y el obtenido; los fallos detienen la ejecución con código distinto de cero |",
         "",
         "## 9.4.2 Casos de prueba\n",
         "Cada caso de prueba nombra el caso de uso y el curso que verifica, la entrada, el resultado esperado y el "
         "guion que lo automatiza. Se eligieron los que cubren los requisitos de mayor riesgo.\n",
         "| Id | Caso de uso (curso) | Entrada | Resultado esperado | Verificación |", "|---|---|---|---|---|"] + [
        f"| {a} | {b} | {c} | {d} | {e} |" for a, b, c, d, e in CASOS_PRUEBA] + [
         "",
         "## 9.4.3 Pruebas de integración\n",
         "Los scripts de verificación del backend se ejecutan contra la API levantada y una base real. Cada chequeo "
         "nombra un escenario de un caso de uso y verifica su poscondición.\n",
         "| Script | Casos de uso que verifica | Escenarios |", "|---|---|---|",
         "| `npm run verificar:tenancy` | UC01, UC10, UC15, UC19 | Lecturas filtradas por tienda, fallo sin tienda en contexto, registros ajenos invisibles e inmodificables |",
         "| `npm run verificar:saas` | UC14, UC23, UC24, UC36 a UC41 | 15 chequeos: verificación de correo, pago rechazado y aprobado, reintento sin doble cobro, catálogos aislados, límites del plan, cambio de tienda, suscripción vencida y métricas |",
         "| `npm run verificar:offline` | UC05 a UC07, UC09, UC35, UC42 a UC46 | 14 chequeos: uuid del dispositivo, última unidad en dos cajas, reversión, reenvío sin duplicados, envíos simultáneos, pago QR sin red rechazado y ventana de siete días |",
         "| `npm run verificar:reportes` | UC33, UC48 a UC51 | 24 chequeos: pedidos dictados complejos, agrupación y orden, parámetros separados del SQL, inyección, aislamiento, Excel y PDF, crédito y abonos repetidos o simultáneos |",
         "",
         "## 9.4.4 Pruebas unitarias\n",
         "| Prueba | Control que verifica |", "|---|---|",
         "| `catalogo.service.spec.ts` | Filtrar productos y obtener producto (UC01, UC02, UC09) |",
         "| `ventas.spike-b.spec.ts` | Descontar stock condicional con ventas concurrentes (UC05, UC07) |",
         "| `sql-seguro.spec.ts` | Validar consulta y fijar tienda (UC10) |",
         "| `ficha.spec.ts` | Armar contexto de la ficha y respuesta por reglas (UC04) |",
         "",
         "## 9.4.5 Matriz de trazabilidad\n",
         "La matriz une cada caso con sus requisitos, la ruta que lo atiende, la clase y la operación que lo realizan "
         "y la prueba que lo verifica. Se lee en ambos sentidos: desde un requisito hasta su prueba, o desde una clase "
         "hasta el caso que la justifica.\n",
         "| Caso | Requisitos | Ruta | Realizado por | Prueba |", "|---|---|---|---|---|"]
    for c in CASOS:
        o.append(f"| {c['id']} {c['nombre']} | {', '.join(c['req'])} | {('`' + c['ruta'] + '`') if c['ruta'] else 'Cliente'} | "
                 f"{realiza(c)} | {c['prueba']} |")
    o += ["",
          "## 9.4.6 Revisión de código y sincronización del modelo\n",
          "Al cerrar cada lote, el modelo se regeneró desde `casos.py` y se comparó con el código: rutas, nombres de "
          "métodos y modelos de Prisma. Las diferencias encontradas se corrigieron en el modelo (por ejemplo, la "
          "operación del catálogo es `listarProductos` y el ingreso de mercadería es `ingresoProveedor`), y los "
          "módulos sin servicio quedaron registrados como deuda técnica. Como el dominio se lee de `schema.prisma` "
          "cada vez, una migración nueva aparece en el modelo sin trabajo manual.\n"]
    return "\n".join(o)


def main():
    os.makedirs(SALIDA, exist_ok=True)
    for nombre, f in [("01-requisitos.md", requisitos), ("02-robustez.md", robustez),
                      ("03-diseno-detallado.md", diseno), ("04-implementacion-pruebas.md", implementacion)]:
        with open(os.path.join(SALIDA, nombre), "w", encoding="utf-8") as fh:
            fh.write(f())
        print("escrito", nombre)


if __name__ == "__main__":
    main()
