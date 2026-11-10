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
          "lotes 1 a 5 son los nuevos del segundo ciclo. Las relaciones «include» y «extend» son las siguientes:\n",
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
         "Los mensajes de retorno se dibujan punteados. La arquitectura técnica que la robustez omitía (el guard JWT, "
         "el contexto de tienda y la clave de idempotencia) no se repite en cada secuencia: se aplica a todas las "
         "rutas por el mismo mecanismo y se muestra una sola vez en la arquitectura.\n"]
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
          "de las que dependen.\n"]
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
          "guardan una cola local para operar sin red.\n",
          fig("arq-componentes", "Componentes del monolito modular"),
          fig("arq-despliegue", "Despliegue"),
          "## 9.3.3 Revisión crítica de diseño (CDR)\n",
          "| Verificación | Resultado |", "|---|---|",
          f"| Cada caso tiene secuencia y coincide con su texto | Sí, {len(CASOS)} secuencias |",
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
         "## 9.4.1 Pruebas de integración\n",
         "Los scripts de verificación del backend se ejecutan contra la API levantada y una base real. Cada chequeo "
         "nombra un escenario de un caso de uso y verifica su poscondición.\n",
         "| Script | Casos de uso que verifica | Escenarios |", "|---|---|---|",
         "| `npm run verificar:tenancy` | UC01, UC10, UC15, UC19 | Lecturas filtradas por tienda, fallo sin tienda en contexto, registros ajenos invisibles e inmodificables |",
         "| `npm run verificar:saas` | UC14, UC23, UC24, UC36 a UC41 | 15 chequeos: verificación de correo, pago rechazado y aprobado, reintento sin doble cobro, catálogos aislados, límites del plan, cambio de tienda, suscripción vencida y métricas |",
         "| `npm run verificar:offline` | UC05 a UC07, UC09, UC35, UC42 a UC46 | 14 chequeos: uuid del dispositivo, última unidad en dos cajas, reversión, reenvío sin duplicados, envíos simultáneos, pago QR sin red rechazado y ventana de siete días |",
         "| `npm run verificar:reportes` | UC33, UC48 a UC51 | 24 chequeos: pedidos dictados complejos, agrupación y orden, parámetros separados del SQL, inyección, aislamiento, Excel y PDF, crédito y abonos repetidos o simultáneos |",
         "",
         "## 9.4.2 Pruebas unitarias\n",
         "| Prueba | Control que verifica |", "|---|---|",
         "| `catalogo.service.spec.ts` | Filtrar productos y obtener producto (UC01, UC02, UC09) |",
         "| `ventas.spike-b.spec.ts` | Descontar stock condicional con ventas concurrentes (UC05, UC07) |",
         "| `sql-seguro.spec.ts` | Validar consulta y fijar tienda (UC10) |",
         "| `ficha.spec.ts` | Armar contexto de la ficha y respuesta por reglas (UC04) |",
         "",
         "## 9.4.3 Matriz de trazabilidad\n",
         "La matriz une cada caso con sus requisitos, la ruta que lo atiende, la clase y la operación que lo realizan "
         "y la prueba que lo verifica. Se lee en ambos sentidos: desde un requisito hasta su prueba, o desde una clase "
         "hasta el caso que la justifica.\n",
         "| Caso | Requisitos | Ruta | Realizado por | Prueba |", "|---|---|---|---|---|"]
    for c in CASOS:
        o.append(f"| {c['id']} {c['nombre']} | {', '.join(c['req'])} | {('`' + c['ruta'] + '`') if c['ruta'] else 'Cliente'} | "
                 f"{realiza(c)} | {c['prueba']} |")
    o += ["",
          "## 9.4.4 Revisión de código y sincronización del modelo\n",
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
