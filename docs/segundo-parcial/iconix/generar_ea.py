# -*- coding: utf-8 -*-
"""Genera el modelo ICONIX de EnsayAR dentro de Enterprise Architect y exporta los diagramas.

Uso:  python generar_ea.py [--solo UC07,UC44] [--sin-exportar]

Necesita EA 15 con "Use JET 4.0" activo (clave JET4=1 en las opciones de EA) y pywin32.
Reemplaza el paquete "ICONIX segundo parcial" cada vez que corre; el resto del modelo no se toca.
"""
import argparse
import os
import re
import sys
import time
import unicodedata

import win32com.client

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from casos import (ACCION_CONTROLADOR, ACTORES, CASOS, ENTIDADES, LOTES,  # noqa: E402
                   RELACIONES_CU, REQUISITOS)

RAIZ = os.path.abspath(os.path.join(AQUI, "..", "..", ".."))
MODELO = os.path.join(RAIZ, "docs", "segundo-parcial", "diagramas", "EnsayAR-ICONIX.eapx")
SCHEMA = os.path.join(RAIZ, "backend", "prisma", "schema.prisma")
IMAGENES = os.path.join(RAIZ, "docs", "segundo-parcial", "imagenes", "ea")
PAQUETE = "ICONIX segundo parcial"

EXTERNOS_POR_ACTOR = {
    "Servicio de IA": "Interfaz Azure OpenAI",
    "Pasarela de pago": "Interfaz pasarela",
    "Dispositivo sin red": "Cola local",
}

# Casos cuya secuencia repite pasos por elemento: fragmento loop en lugar del alt del curso alterno.
BUCLES = {"UC44": "por cada operación del lote"}
# Fragmento alt por caso: (índice del curso alterno, grupos de control antes de la decisión,
# mensajes del servicio cuando el alterno se recupera en lugar de cortar el flujo).
# None: el alterno ocurre solo en el dispositivo o es una invariante, no una bifurcación del servidor.
DEGRADA = ("responder con reglas", "usar respuesta del modelo")
ALTERNOS = {
    "UC03": None, "UC19": None, "UC26": None, "UC28": None, "UC47": None,
    "UC04": (0, 2, DEGRADA), "UC29": (1, 2, DEGRADA),
    "UC48": (0, 1, ("armar especificación por reglas", "usar especificación del modelo")),
    "UC49": (1, 0, None), "UC10": (1, 2, None),
    "UC27": (0, 2, None), "UC38": (0, 2, None), "UC39": (0, 2, None), "UC54": (0, 2, None),
    "UC08": (0, 0, None), "UC34": (0, 0, None), "UC41": (0, 0, None),
}


def slug(texto):
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", t).strip("-").lower()


def fijar_opcion(estilo, clave, valor):
    estilo = estilo or ""
    if re.search(rf"(^|;){clave}=", estilo):
        return re.sub(rf"(^|;){clave}=[^;]*", rf"\g<1>{clave}={valor}", estilo)
    return estilo + f"{clave}={valor};"


def camel(texto):
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    p = re.findall(r"[a-zA-Z0-9]+", t)
    return p[0].lower() + "".join(x.capitalize() for x in p[1:]) if p else texto


# --------------------------------------------------------------------------- schema.prisma
def leer_schema():
    texto = open(SCHEMA, encoding="utf-8").read()
    modelos, enums = {}, set(re.findall(r"^enum (\w+)", texto, re.M))
    for nombre, cuerpo in re.findall(r"^model (\w+) \{(.*?)^\}", texto, re.M | re.S):
        campos = []
        for linea in cuerpo.splitlines():
            m = re.match(r"\s+(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)", linea)
            if m and not linea.strip().startswith("@@"):
                campos.append(dict(nombre=m.group(1), tipo=m.group(2), lista=bool(m.group(3)),
                                   opcional=bool(m.group(4)), resto=m.group(5)))
        modelos[nombre] = campos
    return modelos, enums


TIPOS = {"String": "string", "Int": "int", "Decimal": "decimal", "DateTime": "fecha",
         "Boolean": "bool", "Json": "json", "Float": "float", "BigInt": "int"}


# --------------------------------------------------------------------------- firmas TypeScript del backend
BACKEND = os.path.join(RAIZ, "backend", "src")
CONTROLES_TS = ("if", "for", "while", "switch", "catch", "return")


def separar(texto):
    """Parte por comas de primer nivel (respeta genéricos, tipos objeto y flechas =>)."""
    partes, nivel, actual, previo = [], 0, "", ""
    for ch in texto:
        if ch in "<([{":
            nivel += 1
        elif ch in ")]}" or (ch == ">" and previo != "="):
            nivel -= 1
        if ch == "," and nivel == 0:
            partes.append(actual)
            actual = ""
        else:
            actual += ch
        previo = ch
    partes.append(actual)
    return [p.strip() for p in partes if p.strip()]


def tipo_corto(tipo):
    tipo = re.sub(r"\s+", " ", tipo or "").strip()
    return "object" if "{" in tipo else tipo


def leer_firmas():
    """{Clase: ({metodo: (visibilidad, [(param, tipo)], retorno)}, [(dependencia, tipo)])}"""
    firmas = {}
    for raiz, _, archivos in os.walk(BACKEND):
        for archivo in archivos:
            if not archivo.endswith(".ts") or archivo.endswith(".spec.ts"):
                continue
            texto = open(os.path.join(raiz, archivo), encoding="utf-8").read()
            for m in re.finditer(r"^export class (\w+)[^{]*\{(.*?)^\}", texto, re.M | re.S):
                metodos, deps = {}, []
                for f in re.finditer(r"^  (?:(public|private|protected) )?(?:static )?(?:async )?(\w+)"
                                     r"\(((?:[^()]|\((?:[^()]|\([^()]*\))*\))*)\)\s*(?::\s*([^{]+?))?\s*\{",
                                     m.group(2), re.M):
                    vis, nombre, params, ret = f.groups()
                    if nombre in CONTROLES_TS:
                        continue
                    limpios = re.sub(r"@\w+\((?:[^()]|\([^()]*\))*\)\s*", "", params)
                    lista = []
                    for p in separar(limpios):
                        mod = re.match(r"(?:(?:private|public|protected|readonly)\s+)+", p)
                        pm = re.match(r"(\w+)(\?)?\s*(?::\s*(.+?))?\s*(?:=.*)?$", p[mod.end():] if mod else p, re.S)
                        if not pm:
                            continue
                        if nombre == "constructor":
                            if mod:
                                deps.append((pm.group(1), tipo_corto(pm.group(3))))
                        else:
                            lista.append((pm.group(1) + ("?" if pm.group(2) else ""), tipo_corto(pm.group(3))))
                    if nombre != "constructor":
                        metodos.setdefault(nombre, ((vis or "public").capitalize(), lista, tipo_corto(ret)))
                firmas[m.group(1)] = (metodos, deps)
    return firmas


# --------------------------------------------------------------------------- EA helpers
class EA:
    def __init__(self):
        self.r = win32com.client.Dispatch("EA.Repository")
        if not self.r.OpenFile(MODELO):
            raise SystemExit("EA no abrió el modelo (¿JET4 activo?)")
        self.proj = self.r.GetProjectInterface()

    def paquete(self, padre, nombre):
        p = padre.Packages.AddNew(nombre, "")
        p.Update()
        padre.Packages.Refresh()
        return p

    def elemento(self, paquete, nombre, tipo, estereotipo="", notas=""):
        e = paquete.Elements.AddNew(nombre, tipo)
        if estereotipo:
            e.Stereotype = estereotipo
        if notas:
            e.Notes = notas
        e.Update()
        return e

    def conector(self, origen, destino, tipo="Association", nombre="", estereotipo=""):
        c = origen.Connectors.AddNew(nombre, tipo)
        c.SupplierID = destino.ElementID
        if estereotipo:
            c.Stereotype = estereotipo
        c.Update()
        return c

    def diagrama(self, paquete, nombre, tipo):
        d = paquete.Diagrams.AddNew(nombre, tipo)
        d.Update()
        d.StyleEx = (d.StyleEx or "") + "SuppressBrackets=1;"
        d.Update()
        self.r.Execute(f"UPDATE t_diagram SET ShowForeign=0 WHERE Diagram_ID={d.DiagramID}")
        return d

    def poner(self, d, e, x, y, w, h):
        o = d.DiagramObjects.AddNew(f"l={x};r={x + w};t={y};b={y + h};", "")
        o.ElementID = e.ElementID
        o.Update()
        return o

    def ocultar(self, d, conector_id):
        link = d.DiagramLinks.AddNew("", "")
        link.ConnectorID = conector_id
        link.IsHidden = True
        link.Update()


# --------------------------------------------------------------------------- construcción
class Generador:
    def __init__(self, ea, solo=None):
        self.ea, self.solo = ea, solo
        self.diagramas = []          # (diagrama, nombre de archivo)
        self.actores, self.fronteras, self.entidades_rob = {}, {}, {}
        self.dominio, self.clases, self.casos_el, self.reqs = {}, {}, {}, {}
        self.asociaciones = set()
        self.firmas = leer_firmas()

    # ---- raíz
    def preparar(self):
        modelo = self.ea.r.Models.GetAt(0)
        base = modelo.Packages.GetByName("EnsayAR")
        for i in range(base.Packages.Count - 1, -1, -1):
            if base.Packages.GetAt(i).Name == PAQUETE:
                base.Packages.DeleteAt(i, True)
        base.Packages.Refresh()
        self.base = self.ea.paquete(base, PAQUETE)
        nombres = ["1 Requisitos", "2 Modelo de dominio", "3 Casos de uso", "4 Robustez",
                   "5 Secuencias", "6 Diseno detallado", "7 Arquitectura", "8 Estados", "9 Fundamentacion"]
        self.p = {n: self.ea.paquete(self.base, n) for n in nombres}

    def registrar(self, d, archivo):
        self.diagramas.append((d, archivo))

    # ---- actores (reutiliza los del primer parcial)
    def actores_(self):
        existentes = {}
        filas = self.ea.r.GetElementSet("SELECT Object_ID FROM t_object WHERE Object_Type='Actor'", 2)
        for i in range(filas.Count):
            e = filas.GetAt(i)
            if not self.ea.r.GetPackageByID(e.PackageID).Name.startswith(PAQUETE):
                existentes.setdefault(e.Name, e)
        paq = self.ea.paquete(self.p["3 Casos de uso"], "Actores")
        for nombre, desc in ACTORES.items():
            if nombre in existentes:
                e = existentes[nombre]
            else:
                e = self.ea.elemento(paq, nombre, "Actor", notas=desc)
            self.actores[nombre] = e

    # ---- requisitos
    def requisitos_(self):
        paq = self.p["1 Requisitos"]
        for codigo, area, texto in REQUISITOS:
            self.reqs[codigo] = self.ea.elemento(paq, f"{codigo} {texto.rstrip('.')}", "Requirement",
                                                 notas=f"[{area}] {texto}")

    def requisitos_diagramas(self):
        areas = {}
        for codigo, area, _ in REQUISITOS:
            areas.setdefault(area, []).append(codigo)
        for area, codigos in areas.items():
            if area == "Base":
                continue
            d = self.ea.diagrama(self.p["1 Requisitos"], f"Requisitos {area}", "Logical")
            casos = [c for c in CASOS if set(c["req"]) & set(codigos) and c["id"] in self.casos_el]
            for i, cod in enumerate(codigos):
                self.ea.poner(d, self.reqs[cod], 30 + (i % 3) * 250, 30 + (i // 3) * 120, 220, 85)
            y0 = 60 + ((len(codigos) + 2) // 3) * 120
            for i, c in enumerate(casos):
                self.ea.poner(d, self.casos_el[c["id"]], 30 + (i % 4) * 180, y0 + (i // 4) * 100, 160, 60)
            d.Update()
            self.registrar(d, f"req-{slug(area)}")

    # ---- dominio
    def dominio_(self):
        modelos, enums = leer_schema()
        paq = self.p["2 Modelo de dominio"]
        for nombre, desc in ENTIDADES.items():
            nota = desc if nombre in modelos else desc + " Clase prevista; se confirma con el código del compañero."
            e = self.ea.elemento(paq, nombre, "Class", notas=nota)
            for campo in modelos.get(nombre, []):
                tipo = campo["tipo"]
                if campo["nombre"] in ("id", "tiendaId") or tipo in modelos or "@relation" in campo["resto"]:
                    continue
                if campo["nombre"].endswith("Id") and len(campo["nombre"]) > 2:
                    continue
                a = e.Attributes.AddNew(campo["nombre"], TIPOS.get(tipo, tipo))
                a.Visibility = "Private"
                a.Update()
            e.Attributes.Refresh()
            self.dominio[nombre] = e
        for nombre, campos in modelos.items():
            if nombre not in self.dominio:
                continue
            for campo in campos:
                destino = campo["tipo"]
                if destino not in self.dominio or campo["lista"] or "fields:" not in campo["resto"]:
                    continue
                inverso = [f for f in modelos[destino] if f["tipo"] == nombre]
                mult_origen = "0..1" if inverso and not inverso[0]["lista"] else "0..*"
                mult_destino = "0..1" if campo["opcional"] else "1"
                clave = (nombre, destino, campo["nombre"])
                if clave in self.asociaciones:
                    continue
                self.asociaciones.add(clave)
                c = self.dominio[nombre].Connectors.AddNew("", "Association")
                c.SupplierID = self.dominio[destino].ElementID
                c.ClientEnd.Cardinality = mult_origen
                c.SupplierEnd.Cardinality = mult_destino
                if campo["nombre"].lower() != destino.lower():
                    c.SupplierEnd.Role = campo["nombre"]
                c.Update()
        # tiendaId se llena desde la sesión (sin @relation), pero el dominio sí pertenece a la tienda.
        for origen in ("Usuario", "Sucursal", "Producto", "Venta"):
            c = self.dominio[origen].Connectors.AddNew("pertenece a", "Association")
            c.SupplierID = self.dominio["Tienda"].ElementID
            c.ClientEnd.Cardinality = "0..*"
            c.SupplierEnd.Cardinality = "1"
            c.Update()

    def dominio_diagramas(self):
        vistas = [
            ("Dominio plataforma SaaS", ["Tienda", "Cuenta", "Plan", "Suscripcion", "PagoSuscripcion", "Usuario", "Sucursal", "Almacen"]),
            ("Dominio catalogo e inventario", ["Producto", "Variante", "Categoria", "Temporada", "Coleccion", "Proveedor",
                                               "StockAlmacen", "MovimientoInventario", "Almacen", "Opinion", "AlertaProducto", "Favorito"]),
            ("Dominio ventas caja y credito", ["Venta", "LineaVenta", "CajaTurno", "PagoSimulado", "Cupon", "Pedido",
                                               "Devolucion", "Reserva", "CuentaCobrar", "AbonoCredito", "Usuario", "Variante", "Almacen"]),
            ("Dominio sincronizacion reportes y avisos", ["Dispositivo", "OperacionSync", "PushSuscripcion", "Notificacion",
                                                         "ReporteEjecucion", "Auditoria", "TokenRevocado", "EventoAnalitica", "Usuario"]),
            ("Dominio analitica y pagos", ["ModeloPredictivo", "SegmentoCliente", "TransaccionPasarela", "Venta", "Usuario", "EventoAnalitica"]),
            ("Modelo de dominio completo", list(ENTIDADES)),
        ]
        completo = list(dict.fromkeys(c for _, clases in vistas[:-1] for c in clases))
        completo += [c for c in ENTIDADES if c not in completo]
        vistas[-1] = ("Modelo de dominio completo", completo)
        for nombre, clases in vistas:
            d = self.ea.diagrama(self.p["2 Modelo de dominio"], nombre, "Logical")
            if nombre == "Modelo de dominio completo":
                d.ExtendedStyle = (d.ExtendedStyle or "") + "HideAtts=1;HideOps=1;"
                for i, c in enumerate(clases):
                    self.ea.poner(d, self.dominio[c], 30 + (i % 7) * 200, 30 + (i // 7) * 120, 150, 40)
                d.Update()
            else:
                for i, c in enumerate(clases):
                    e = self.dominio[c]
                    self.ea.poner(d, e, 30 + (i % 4) * 230, 30 + (i // 4) * 230, 180, 40 + 14 * min(e.Attributes.Count, 12))
                d.Update()
                self.ea.proj.LayoutDiagramEx(d.DiagramGUID, 0x40000000 | 0x10000000 | 0x04000000 | 0x00020000, 4, 40, 40, True)
            self.registrar(d, f"dom-{slug(nombre.replace('Dominio ', ''))}")

    # ---- casos de uso
    def casos_(self):
        paq_cu = self.p["3 Casos de uso"]
        lotes = {n: self.ea.paquete(paq_cu, f"{LOTES[n][0]} {LOTES[n][1]}") for n in LOTES}
        for c in CASOS:
            notas = "\n".join([f"Requisitos: {', '.join(c['req'])}", "", "Curso básico:"]
                              + [f"{i}. {p}" for i, p in enumerate(c["basico"], 1)]
                              + ["", "Cursos alternos:"] + [f"{a}. {t}" for a, t in c["alternos"]])
            e = self.ea.elemento(lotes[c["lote"]], f"{c['id']} {c['nombre']}", "UseCase", notas=notas)
            self.casos_el[c["id"]] = e
            for a in c["actores"]:
                self.ea.conector(self.actores[a], e)
            for r in c["req"]:
                if r in self.reqs:
                    self.ea.conector(e, self.reqs[r], "Realisation")
        for origen, tipo, destino in RELACIONES_CU:
            self.ea.conector(self.casos_el[origen], self.casos_el[destino], "UseCase", estereotipo=tipo)

        grupos = []
        lote0 = [c for c in CASOS if c["lote"] == 0]
        for paquete in dict.fromkeys(c["paquete"] for c in lote0):
            grupos.append((f"CU lote 0 {paquete}", [c for c in lote0 if c["paquete"] == paquete], paquete))
        for n in range(1, 6):
            grupos.append((f"CU {LOTES[n][0].lower()} {LOTES[n][1]}", [c for c in CASOS if c["lote"] == n], LOTES[n][1]))
        FILA, Y0, XB, ANCHO_B = 100, 75, 190, 300
        for nombre, casos, titulo in grupos:
            paq = lotes[casos[0]["lote"]]
            d = self.ea.diagrama(paq, nombre, "Use Case")
            actores = list(dict.fromkeys(a for c in casos for a in c["actores"]))
            principales = [a for a in actores if a not in EXTERNOS_POR_ACTOR]
            secundarios = [a for a in actores if a in EXTERNOS_POR_ACTOR]
            # Baricentro alternado: casos según sus actores y actores según sus casos, para cruzar menos líneas.
            casos = list(casos)
            escala = (len(casos) - 1) / max(len(principales) - 1, 1)
            rango = {a: i * escala for i, a in enumerate(principales)}
            for _ in range(4):
                casos.sort(key=lambda c: (min(rango[a] for a in c["actores"] if a in rango) * 0.3
                                          + sum(rango[a] for a in c["actores"] if a in rango)
                                          / max(sum(a in rango for a in c["actores"]), 1) * 0.7
                                          if any(a in rango for a in c["actores"]) else len(casos), c["id"]))
                fila = {c["id"]: i for i, c in enumerate(casos)}
                principales.sort(key=lambda a: sum(fila[c["id"]] for c in casos if a in c["actores"])
                                 / sum(a in c["actores"] for c in casos))
                rango = {a: i * escala for i, a in enumerate(principales)}
            ycu = {c["id"]: Y0 + i * FILA for i, c in enumerate(casos)}
            sujeto = self.ea.elemento(paq, f"EnsayAR: {titulo}", "Boundary")
            alto = Y0 + len(casos) * FILA
            self.ea.poner(d, sujeto, XB, 20, ANCHO_B, alto - 20)
            for c in casos:
                self.ea.poner(d, self.casos_el[c["id"]], XB + 55, ycu[c["id"]], 190, 70)

            def columna(lista, x):
                deseadas = []
                for a in lista:
                    ys = [ycu[c["id"]] for c in casos if a in c["actores"]]
                    deseadas.append((sum(ys) / len(ys) - 10, a))
                ultimo = -999
                for y, a in sorted(deseadas):
                    y = max(y, ultimo + 120, 20)
                    self.ea.poner(d, self.actores[a], x, int(y), 45, 90)
                    ultimo = y
            columna(principales, 40)
            columna(secundarios, XB + ANCHO_B + 90)
            d.Update()
            self.ea.r.Execute(f"UPDATE t_diagramobjects SET Sequence=10 WHERE Diagram_ID={d.DiagramID}")
            self.ea.r.Execute(f"UPDATE t_diagramobjects SET Sequence=50 WHERE Diagram_ID={d.DiagramID} "
                              f"AND Object_ID={sujeto.ElementID}")
            self.registrar(d, f"cu-{slug(nombre[3:])}")

    # ---- robustez
    def frontera(self, nombre):
        if nombre not in self.fronteras:
            if not hasattr(self, "paq_fronteras"):
                self.paq_fronteras = self.ea.paquete(self.p["4 Robustez"], "Fronteras")
            self.fronteras[nombre] = self.ea.elemento(self.paq_fronteras, nombre, "Class", "boundary")
        return self.fronteras[nombre]

    def entidad(self, nombre):
        if nombre not in self.entidades_rob:
            if not hasattr(self, "paq_entidades"):
                self.paq_entidades = self.ea.paquete(self.p["4 Robustez"], "Entidades")
            e = self.ea.elemento(self.paq_entidades, nombre, "Class", "entity", notas=ENTIDADES[nombre])
            self.ea.conector(e, self.dominio[nombre], "Dependency", estereotipo="trace")
            self.entidades_rob[nombre] = e
        return self.entidades_rob[nombre]

    def asociar_una_vez(self, a, b):
        clave = (a.ElementID, b.ElementID)
        if clave not in self.asociaciones and (clave[1], clave[0]) not in self.asociaciones:
            self.asociaciones.add(clave)
            self.ea.conector(a, b)

    def robustez(self, c):
        paq = self.ea.paquete(self.p["4 Robustez"], f"{c['id']} {c['nombre']}")
        externos = {x for _, usa in c["controles"] for x in usa if x not in ENTIDADES}
        ui = [self.frontera(f) for f in c["fronteras"] if f not in externos]
        controles = [self.ea.elemento(paq, nombre, "Class", "control") for nombre, _ in c["controles"]]
        d = self.ea.diagrama(paq, f"Robustez {c['id']} {c['nombre']}", "Analysis")
        principales = [a for a in c["actores"] if a not in EXTERNOS_POR_ACTOR]
        secundarios = [a for a in c["actores"] if a in EXTERNOS_POR_ACTOR]
        alto = max(len(controles), len(ui), 2) * 120
        for i, a in enumerate(principales):
            self.ea.poner(d, self.actores[a], 20, 40 + i * 120, 45, 90)
        for i, f in enumerate(ui):
            self.ea.poner(d, f, 190, 50 + i * (alto // max(len(ui), 1)), 60, 60)
            for a in principales:
                self.asociar_una_vez(self.actores[a], f)
            if controles:
                self.ea.conector(f, controles[0])
        for i, ctrl in enumerate(controles):
            self.ea.poner(d, ctrl, 390 + (i % 2) * 60, 50 + i * 120, 60, 60)
            if i:
                self.ea.conector(controles[i - 1], ctrl)
        if len(controles) > 1 and ui:
            self.ea.conector(controles[-1], ui[0], nombre="muestra resultado")
        colocados, y = set(), 40
        for ctrl, (_, usa) in zip(controles, c["controles"]):
            for nombre in usa:
                destino = self.entidad(nombre) if nombre in ENTIDADES else self.frontera(nombre)
                if nombre not in colocados:
                    colocados.add(nombre)
                    x = 640 if nombre in ENTIDADES else 820
                    self.ea.poner(d, destino, x, y, 60, 60)
                    y += 95
                self.ea.conector(ctrl, destino)
        for a in secundarios:
            ext = self.frontera(EXTERNOS_POR_ACTOR[a])
            self.ea.poner(d, self.actores[a], 980, 60, 45, 90)
            self.asociar_una_vez(ext, self.actores[a])
        d.Update()
        self.registrar(d, f"rob-{c['id'].lower()}")

    # ---- clases de diseño
    def clase(self, nombre, modulo):
        if nombre not in self.clases:
            if not hasattr(self, "paq_modulos"):
                self.paq_modulos = {}
            if modulo not in self.paq_modulos:
                self.paq_modulos[modulo] = self.ea.paquete(self.p["6 Diseno detallado"], modulo)
            estereotipo = next((s for s in ("Controller", "Service") if nombre.endswith(s)), "").lower()
            e = self.ea.elemento(self.paq_modulos[modulo], nombre, "Class", estereotipo)
            for dep, tipo in self.firmas.get(nombre, ({}, []))[1]:
                a = e.Attributes.AddNew(dep, tipo)
                a.Visibility = "Private"
                a.IsConst = True
                a.Update()
            e.Attributes.Refresh()
            self.clases[nombre] = (e, modulo, set())
        return self.clases[nombre][0]

    def firma(self, nombre_clase, op):
        return self.firmas.get(nombre_clase, ({}, []))[0].get(op)

    def argumentos(self, nombre_clase, op):
        f = self.firma(nombre_clase, op)
        return ", ".join(p.rstrip("?") for p, _ in f[1]) if f else ""

    def operacion(self, nombre_clase, op):
        e, _, ops = self.clases[nombre_clase]
        if op not in ops:
            ops.add(op)
            o = e.Methods.AddNew(op, "")
            o.Visibility = "Public"
            f = self.firma(nombre_clase, op)
            if f:
                o.Visibility = f[0]
                if f[2]:
                    o.ReturnType = f[2]
            o.Update()
            if f:
                for k, (p, tipo) in enumerate(f[1]):
                    par = o.Parameters.AddNew(p.rstrip("?"), tipo)
                    par.Position = k
                    par.Kind = "in"
                    par.Update()
                o.Parameters.Refresh()

    def inyeccion(self, ctrl_n, serv_n):
        """Controlador -> servicio como asociación navegable con el nombre del atributo inyectado."""
        ctrl, serv = self.clases[ctrl_n][0], self.clases[serv_n][0]
        rol = next((n for n, t in self.firmas.get(ctrl_n, ({}, []))[1] if t == serv_n), "")
        c = ctrl.Connectors.AddNew("", "Association")
        c.SupplierID = serv.ElementID
        c.Direction = "Source -> Destination"
        c.SupplierEnd.Role = rol
        c.SupplierEnd.Visibility = "Private"
        c.SupplierEnd.Navigable = "Navigable"
        c.SupplierEnd.Cardinality = "1"
        c.Update()

    # ---- secuencia
    def secuencia(self, c):
        paq = self.p["5 Secuencias"]
        d = self.ea.diagrama(paq, f"Secuencia {c['id']} {c['nombre']}", "Sequence")
        actor = c["actores"][0]
        mensajes, fragmentos = [], []
        if c["secuencia"]:
            def resolver(n):
                if n in self.actores:
                    return self.actores[n]
                if n in c["fronteras"] or n in self.fronteras:
                    return self.frontera(n)
                return self.clase(n, "Cliente offline")
            for a, b, m in c["secuencia"]:
                mensajes.append((resolver(a), resolver(b), m, False))
                if b not in self.actores and b not in c["fronteras"] and b != a:
                    self.operacion(b, m.split("(")[0] if "(" in m else camel(m))
        else:
            ctrl_n, serv_n = c["clases"]
            modulo = c["paquete"]
            ctrl = self.clase(ctrl_n, modulo)
            serv = self.clase(serv_n, modulo) if serv_n else None
            accion = ACCION_CONTROLADOR.get(c["id"], c["metodo"])
            self.operacion(ctrl_n, accion)
            if serv:
                self.operacion(serv_n, c["metodo"])
            pantalla = self.frontera(next(f for f in c["fronteras"] if f not in
                                          {x for _, u in c["controles"] for x in u}))
            persona = self.actores[actor]
            ejecutor = serv or ctrl
            mensajes.append((persona, pantalla, c["nombre"].lower(), False))
            mensajes.append((pantalla, ctrl, f"{c['ruta']}: {accion}({self.argumentos(ctrl_n, accion)})", False))
            if serv:
                mensajes.append((ctrl, serv, f"{c['metodo']}({self.argumentos(serv_n, c['metodo'])})", False))
            pasos = []
            for nombre, usa in c["controles"]:
                grupo = []
                if not usa:
                    grupo.append((ejecutor, ejecutor, camel(nombre) + "()", False))
                for u in usa:
                    destino = self.entidad(u) if u in ENTIDADES else self.frontera(u)
                    texto = nombre[0].lower() + nombre[1:]
                    if len(usa) > 1:
                        texto = f"{texto.split()[0]} {u}"
                    grupo.append((ejecutor, destino, texto, False))
                    if u not in ENTIDADES:
                        grupo.append((destino, ejecutor, "respuesta", True))
                    if u in self.dominio and (ejecutor.ElementID, u) not in self.asociaciones:
                        self.asociaciones.add((ejecutor.ElementID, u))
                        self.ea.conector(ejecutor, self.dominio[u], "Dependency", estereotipo="use")
                pasos.append(grupo)
            if serv and (ctrl.ElementID, serv.ElementID) not in self.asociaciones:
                self.asociaciones.add((ctrl.ElementID, serv.ElementID))
                self.inyeccion(ctrl_n, serv_n)

            bucle = BUCLES.get(c["id"])
            # Por defecto el primer control valida o consulta y la decisión ocurre después.
            ajuste = ALTERNOS.get(c["id"], (0, 1 if len(pasos) > 1 else 0, None))
            alterno = degrada = None
            antes = 1 if len(pasos) > 1 else 0
            if not bucle and ajuste and c["alternos"]:
                alterno = c["alternos"][ajuste[0]]
                antes, degrada = ajuste[1], ajuste[2]
            elif not bucle:
                antes = 0
            previos = [m for g in pasos[:antes] for m in g]
            resto = [m for g in pasos[antes:] for m in g]
            mensajes += previos
            cierre = ([(serv, ctrl, "resultado", True)] if serv else []) + [
                (ctrl, pantalla, "HTTP 2xx + JSON", True), (pantalla, persona, "muestra el resultado", True)]
            if bucle:
                fragmentos.append(("loop", len(mensajes), len(mensajes) + len(resto) - 1, [bucle]))
                mensajes += resto + cierre
            elif alterno:
                cod, texto = alterno
                guarda = texto.split(":")[0].strip().rstrip(".")
                inicio = len(mensajes)
                if degrada:
                    mensajes.append((ejecutor, ejecutor, camel(degrada[0]) + "()", False))
                    otro = len(mensajes)
                    mensajes.append((ejecutor, ejecutor, camel(degrada[1]) + "()", False))
                    fragmentos.append(("alt", inicio, otro, [f"{guarda} ({cod})", "else"], otro))
                    mensajes += resto + cierre
                else:
                    if serv:
                        mensajes.append((serv, ctrl, f"excepción del curso {cod}", True))
                    mensajes += [(ctrl, pantalla, "respuesta con el motivo", True),
                                 (pantalla, persona, "muestra el motivo", True)]
                    otro = len(mensajes)
                    mensajes += resto + cierre
                    fragmentos.append(("alt", inicio, len(mensajes) - 1, [f"{guarda} ({cod})", "else"], otro))
            else:
                mensajes += resto + cierre

        unicos = {}
        for m in mensajes:
            for e in m[:2]:
                unicos.setdefault(e.ElementID, e)
        lineas = list(unicos.values())
        lineas.sort(key=lambda e: 0 if e.Type == "Actor" else 1)

        # EA reparte los mensajes con paso fijo e ignora PtStartY; los fragmentos se calculan con ese paso.
        Y = [136 + 34.9 * i for i in range(len(mensajes))]
        alto = int(Y[-1]) + 60 - 50
        x = 30
        for e in lineas:
            ancho = 170 if e.Stereotype in ("", "controller", "service") and e.Type == "Class" else 110
            self.ea.poner(d, e, x, 50, ancho, alto)
            x += ancho + 50
        d.Update()
        ids = []
        for n, (a, b, m, ret) in enumerate(mensajes, 1):
            con = a.Connectors.AddNew(m, "Sequence")
            con.SupplierID = b.ElementID
            con.DiagramID = d.DiagramID
            con.SequenceNo = n
            con.Update()
            if ret:
                ids.append(con.ConnectorID)
        if ids:
            self.ea.r.Execute(f"UPDATE t_connector SET PDATA4='1' WHERE Connector_ID IN ({','.join(map(str, ids))})")
        for tipo, ini, fin, guardas, *otro in fragmentos:
            bajo = int(Y[fin] + (24 if mensajes[fin][0].ElementID == mensajes[fin][1].ElementID else 14))
            margen = 10 if tipo == "alt" else 20
            arriba = int(Y[ini] - 27)
            f = paq.Elements.AddNew("", "InteractionFragment")
            f.Subtype = {"alt": 0, "loop": 4}[tipo]
            f.Update()
            cortes = [arriba] + [int(Y[o] - 20) for o in otro] + [bajo]
            for k, guarda in enumerate(guardas):
                p = f.Partitions.AddNew(guarda, "")
                p.Size = cortes[k + 1] - cortes[k]
            f.Update()
            o = d.DiagramObjects.AddNew(f"l={margen};r={x - 50 + margen};t={arriba};b={bajo};", "")
            o.ElementID = f.ElementID
            o.Update()
        en_diagrama = {e.ElementID for e in lineas}
        for e in lineas:
            e.Connectors.Refresh()
            for k in range(e.Connectors.Count):
                con = e.Connectors.GetAt(k)
                if con.Type != "Sequence" and con.ClientID == e.ElementID and con.SupplierID in en_diagrama:
                    self.ea.ocultar(d, con.ConnectorID)
        d.Update()
        self.registrar(d, f"seq-{c['id'].lower()}")

    @staticmethod
    def medida(e):
        """Ancho y alto para que se lean completos atributos y operaciones con su firma."""
        e.Attributes.Refresh()
        e.Methods.Refresh()
        textos = [e.Name] + [f"- {a.Name}: {a.Type}" for a in (e.Attributes.GetAt(i) for i in range(e.Attributes.Count))]
        for i in range(e.Methods.Count):
            m = e.Methods.GetAt(i)
            ps = ", ".join(f"{m.Parameters.GetAt(k).Name}: {m.Parameters.GetAt(k).Type}" for k in range(m.Parameters.Count))
            textos.append(f"+ {m.Name}({ps}): {m.ReturnType}")
        ancho = int(min(560, max(170, 40 + 6.2 * max(len(t) for t in textos))))
        return ancho, 52 + 15 * (e.Attributes.Count + e.Methods.Count) + (14 if e.Stereotype else 0)

    def diseno_diagramas(self):
        for modulo, paq in self.paq_modulos.items():
            clases = [(n, e) for n, (e, m, _) in self.clases.items() if m == modulo]
            d = self.ea.diagrama(paq, f"Clases de diseno {modulo}", "Logical")
            usados = []
            for i, (n, e) in enumerate(clases):
                self.ea.poner(d, e, 30 + i * 300, 30, *self.medida(e))
                e.Connectors.Refresh()
                for k in range(e.Connectors.Count):
                    con = e.Connectors.GetAt(k)
                    if con.Type == "Dependency":
                        for dn, de in self.dominio.items():
                            if de.ElementID == con.SupplierID and de not in usados:
                                usados.append(de)
            for i, de in enumerate(usados):
                self.ea.poner(d, de, 30 + (i % 6) * 230, 500 + (i // 6) * 260, *self.medida(de))
            d.Update()
            self.ea.proj.LayoutDiagramEx(d.DiagramGUID, 0x40000000 | 0x10000000 | 0x04000000 | 0x00020000, 4, 40, 40, True)
            self.ea.r.Execute(f"UPDATE t_diagram SET ShowForeign=0 WHERE Diagram_ID={d.DiagramID}")
            self.registrar(d, f"dis-{slug(modulo)}")

    # ---- arquitectura
    def arquitectura(self):
        from arquitectura import Arquitectura
        from estados import Estados
        from fundamentacion import Fundamentacion
        self.diagramas += Arquitectura(self.ea, self.p["7 Arquitectura"]).construir()
        self.diagramas += Estados(self.ea, self.p["8 Estados"]).construir()
        self.diagramas += Fundamentacion(self.ea, self.p["9 Fundamentacion"]).construir()

    # ---- todo
    def correr(self):
        t = time.time()
        self.ea.r.EnableUIUpdates = False
        self.preparar()
        self.actores_()
        self.requisitos_()
        self.dominio_()
        print(f"dominio listo ({time.time() - t:.0f}s)", flush=True)
        self.casos_()
        self.dominio_diagramas()
        self.requisitos_diagramas()
        print(f"casos de uso listos ({time.time() - t:.0f}s)", flush=True)
        for c in CASOS:
            if self.solo and c["id"] not in self.solo:
                continue
            self.robustez(c)
            self.secuencia(c)
            print(f"  {c['id']} ({time.time() - t:.0f}s)", flush=True)
        self.diseno_diagramas()
        self.arquitectura()
        for d, _ in self.diagramas:
            dd = self.ea.r.GetDiagramByID(d.DiagramID)
            dd.ExtendedStyle = fijar_opcion(dd.ExtendedStyle, "OpParams", "2")
            dd.Update()
        ids = ",".join(str(d.DiagramID) for d, _ in self.diagramas)
        self.ea.r.Execute(f"UPDATE t_diagram SET ShowForeign=0 WHERE Diagram_ID IN ({ids})")
        self.ea.r.EnableUIUpdates = True
        print(f"modelo listo: {len(self.diagramas)} diagramas ({time.time() - t:.0f}s)", flush=True)

    def exportar(self, filtro=None):
        os.makedirs(IMAGENES, exist_ok=True)
        guids = [(d.DiagramGUID, archivo) for d, archivo in self.diagramas]
        # Reabrir descarta la copia en memoria que dejan LayoutDiagramEx y los cambios de estilo por SQL.
        self.ea.r.CloseFile()
        self.ea.r.OpenFile(MODELO)
        self.ea.proj = self.ea.r.GetProjectInterface()
        for guid, archivo in guids:
            if filtro and not filtro(archivo):
                continue
            ruta = os.path.join(IMAGENES, archivo + ".png")
            self.ea.proj.PutDiagramImageToFile(guid, ruta, 1)
        print(f"imágenes en {IMAGENES}", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--solo", default="")
    ap.add_argument("--sin-exportar", action="store_true")
    args = ap.parse_args()
    ea = EA()
    try:
        g = Generador(ea, set(filter(None, args.solo.split(","))) or None)
        g.correr()
        if not args.sin_exportar:
            g.exportar()
    finally:
        ea.r.CloseFile()
        ea.r.Exit()


if __name__ == "__main__":
    main()
