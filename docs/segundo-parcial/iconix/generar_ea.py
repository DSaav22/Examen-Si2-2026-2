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


def slug(texto):
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", t).strip("-").lower()


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
                   "5 Secuencias", "6 Diseno detallado", "7 Arquitectura"]
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
            grupos.append((f"CU lote 0 {paquete}", [c for c in lote0 if c["paquete"] == paquete]))
        for n in range(1, 6):
            grupos.append((f"CU {LOTES[n][0].lower()} {LOTES[n][1]}", [c for c in CASOS if c["lote"] == n]))
        for nombre, casos in grupos:
            d = self.ea.diagrama(lotes[casos[0]["lote"]], nombre, "Use Case")
            actores = list(dict.fromkeys(a for c in casos for a in c["actores"]))
            principales = [a for a in actores if a not in EXTERNOS_POR_ACTOR]
            secundarios = [a for a in actores if a in EXTERNOS_POR_ACTOR]
            for i, a in enumerate(principales):
                self.ea.poner(d, self.actores[a], 20, 40 + i * 130, 45, 90)
            for i, c in enumerate(casos):
                self.ea.poner(d, self.casos_el[c["id"]], 190 + (i % 2) * 230, 30 + (i // 2) * 100, 190, 70)
            for i, a in enumerate(secundarios):
                self.ea.poner(d, self.actores[a], 720, 40 + i * 130, 45, 90)
            d.Update()
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
            self.clases[nombre] = (self.ea.elemento(self.paq_modulos[modulo], nombre, "Class"), modulo, set())
        return self.clases[nombre][0]

    def operacion(self, nombre_clase, op):
        e, _, ops = self.clases[nombre_clase]
        if op not in ops:
            ops.add(op)
            o = e.Methods.AddNew(op, "")
            o.Visibility = "Public"
            o.Update()

    # ---- secuencia
    def secuencia(self, c):
        paq = self.p["5 Secuencias"]
        d = self.ea.diagrama(paq, f"Secuencia {c['id']} {c['nombre']}", "Sequence")
        actor = c["actores"][0]
        mensajes = []
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
            ejecutor = serv or ctrl
            mensajes.append((self.actores[actor], pantalla, c["nombre"].lower(), False))
            mensajes.append((pantalla, ctrl, c["ruta"], False))
            if serv:
                mensajes.append((ctrl, serv, f"{c['metodo']}()", False))
            for nombre, usa in c["controles"]:
                if not usa:
                    mensajes.append((ejecutor, ejecutor, camel(nombre) + "()", False))
                for u in usa:
                    destino = self.entidad(u) if u in ENTIDADES else self.frontera(u)
                    texto = nombre[0].lower() + nombre[1:]
                    if len(usa) > 1:
                        texto = f"{texto.split()[0]} {u}"
                    mensajes.append((ejecutor, destino, texto, False))
                    if u not in ENTIDADES:
                        mensajes.append((destino, ejecutor, "respuesta", True))
                    if u in self.dominio and (ejecutor.ElementID, u) not in self.asociaciones:
                        self.asociaciones.add((ejecutor.ElementID, u))
                        self.ea.conector(ejecutor, self.dominio[u], "Dependency")
            if serv:
                mensajes.append((serv, ctrl, "resultado", True))
                if (ctrl.ElementID, serv.ElementID) not in self.asociaciones:
                    self.asociaciones.add((ctrl.ElementID, serv.ElementID))
                    self.ea.conector(ctrl, serv, "Dependency")
            mensajes.append((ctrl, pantalla, "HTTP 2xx + JSON", True))
            mensajes.append((pantalla, self.actores[actor], "muestra el resultado", True))

        unicos = {}
        for m in mensajes:
            for e in m[:2]:
                unicos.setdefault(e.ElementID, e)
        lineas = list(unicos.values())
        lineas.sort(key=lambda e: 0 if e.Type == "Actor" else 1)
        alto = 120 + 45 * len(mensajes)
        x = 30
        for e in lineas:
            ancho = 170 if e.Stereotype == "" and e.Type == "Class" else 110
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
        en_diagrama = {e.ElementID for e in lineas}
        for e in lineas:
            e.Connectors.Refresh()
            for k in range(e.Connectors.Count):
                con = e.Connectors.GetAt(k)
                if con.Type != "Sequence" and con.ClientID == e.ElementID and con.SupplierID in en_diagrama:
                    self.ea.ocultar(d, con.ConnectorID)
        d.Update()
        self.registrar(d, f"seq-{c['id'].lower()}")

    def diseno_diagramas(self):
        for modulo, paq in self.paq_modulos.items():
            clases = [(n, e) for n, (e, m, _) in self.clases.items() if m == modulo]
            d = self.ea.diagrama(paq, f"Clases de diseno {modulo}", "Logical")
            d.ExtendedStyle = (d.ExtendedStyle or "") + "HideAtts=1;"
            usados = []
            for i, (n, e) in enumerate(clases):
                e.Methods.Refresh()
                self.ea.poner(d, e, 30 + i * 260, 30, 220, 40 + 16 * e.Methods.Count)
                e.Connectors.Refresh()
                for k in range(e.Connectors.Count):
                    con = e.Connectors.GetAt(k)
                    if con.Type == "Dependency":
                        for dn, de in self.dominio.items():
                            if de.ElementID == con.SupplierID and de not in usados:
                                usados.append(de)
            y0 = 90 + 16 * max((e.Methods.Count for _, e in clases), default=1) + 80
            for i, de in enumerate(usados):
                self.ea.poner(d, de, 30 + (i % 6) * 190, y0 + (i // 6) * 110, 150, 40)
            d.Update()
            self.registrar(d, f"dis-{slug(modulo)}")

    # ---- arquitectura
    def arquitectura(self):
        paq = self.p["7 Arquitectura"]
        comp = lambda n, est="": self.ea.elemento(paq, n, "Component", est)
        web, movil = comp("Web React + PWA", "client"), comp("App móvil Expo", "client")
        api = comp("API NestJS (monolito modular)", "server")
        modulos = ["Plataforma", "Auth", "Tenancy", "Catalogo", "Inventario", "Ventas", "Caja", "Creditos",
                   "Pagos", "Sync", "Push", "Reportes", "Reportes inteligentes", "IA", "Notificaciones", "Prisma"]
        mods = {m: comp(f"Módulo {m}") for m in modulos}
        bd = comp("PostgreSQL", "database")
        ext = {n: comp(n, "external") for n in ["Azure OpenAI", "Pasarela de pago (sandbox)", "Servicio Web Push", "SMTP"]}
        self.ea.conector(web, api, "Dependency", "HTTPS")
        self.ea.conector(movil, api, "Dependency", "HTTPS")
        self.ea.conector(mods["Prisma"], mods["Tenancy"], "Dependency", "tienda de la sesión")
        self.ea.conector(mods["Prisma"], bd, "Dependency", "SQL")
        for m, n in [("IA", "Azure OpenAI"), ("Reportes inteligentes", "Azure OpenAI"), ("Plataforma", "Pasarela de pago (sandbox)"),
                     ("Pagos", "Pasarela de pago (sandbox)"), ("Push", "Servicio Web Push"), ("Notificaciones", "SMTP")]:
            self.ea.conector(mods[m], ext[n], "Dependency")
        nota = self.ea.elemento(paq, "Nota", "Note", notas="Cada módulo de negocio accede a la base solo por el módulo Prisma, "
                                "cuya extensión de Tenancy filtra y completa tienda_id. Un único proceso y una única base: "
                                "las operaciones que tocan varios módulos son una transacción local, no una saga.")
        d = self.ea.diagrama(paq, "Componentes monolito modular", "Component")
        self.ea.poner(d, web, 30, 120, 160, 60)
        self.ea.poner(d, movil, 30, 300, 160, 60)
        self.ea.poner(d, api, 240, 30, 720, 450)
        for i, m in enumerate(modulos):
            self.ea.poner(d, mods[m], 260 + (i % 4) * 175, 80 + (i // 4) * 95, 155, 55)
        self.ea.poner(d, bd, 1050, 420, 150, 60)
        for i, n in enumerate(ext):
            self.ea.poner(d, ext[n], 1050, 40 + i * 90, 170, 55)
        self.ea.poner(d, nota, 240, 510, 720, 60)
        d.Update()
        self.registrar(d, "arq-componentes")

        nodos = {}
        for n, est in [("Navegador (PWA)", "device"), ("Teléfono Android/iOS", "device"), ("Servidor de aplicaciones", "executionEnvironment"),
                       ("Servidor PostgreSQL", "device"), ("Azure", "executionEnvironment"), ("Pasarela de pago", "executionEnvironment")]:
            nodos[n] = self.ea.elemento(paq, n, "Node", est)
        artefactos = {n: self.ea.elemento(paq, n, "Artifact") for n in
                      ["dist web + sw.js", "IndexedDB (cola y caché)", "bundle Expo", "SQLite local", "node dist/src/main.js", "base ensayar"]}
        for nodo, art in [("Navegador (PWA)", "dist web + sw.js"), ("Navegador (PWA)", "IndexedDB (cola y caché)"),
                          ("Teléfono Android/iOS", "bundle Expo"), ("Teléfono Android/iOS", "SQLite local"),
                          ("Servidor de aplicaciones", "node dist/src/main.js"), ("Servidor PostgreSQL", "base ensayar")]:
            self.ea.conector(artefactos[art], nodos[nodo], "Dependency", "deploy")
        for a, b, n in [("Navegador (PWA)", "Servidor de aplicaciones", "HTTPS"), ("Teléfono Android/iOS", "Servidor de aplicaciones", "HTTPS"),
                        ("Servidor de aplicaciones", "Servidor PostgreSQL", "TCP 5432"), ("Servidor de aplicaciones", "Azure", "HTTPS"),
                        ("Servidor de aplicaciones", "Pasarela de pago", "HTTPS + webhook")]:
            self.ea.conector(nodos[a], nodos[b], "Association", n)
        d = self.ea.diagrama(paq, "Despliegue", "Deployment")
        pos = {"Navegador (PWA)": (30, 30), "Teléfono Android/iOS": (30, 300), "Servidor de aplicaciones": (420, 160),
               "Servidor PostgreSQL": (820, 30), "Azure": (820, 260), "Pasarela de pago": (820, 420)}
        for n, (x, y) in pos.items():
            self.ea.poner(d, nodos[n], x, y, 230, 150)
        for art, (x, y) in {"dist web + sw.js": (45, 70), "IndexedDB (cola y caché)": (45, 125), "bundle Expo": (45, 340),
                            "SQLite local": (45, 395), "node dist/src/main.js": (435, 220), "base ensayar": (835, 90)}.items():
            self.ea.poner(d, artefactos[art], x, y, 190, 40)
        d.Update()
        self.registrar(d, "arq-despliegue")

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
        ids = ",".join(str(d.DiagramID) for d, _ in self.diagramas)
        self.ea.r.Execute(f"UPDATE t_diagram SET ShowForeign=0 WHERE Diagram_ID IN ({ids})")
        self.ea.r.EnableUIUpdates = True
        print(f"modelo listo: {len(self.diagramas)} diagramas ({time.time() - t:.0f}s)", flush=True)

    def exportar(self, filtro=None):
        os.makedirs(IMAGENES, exist_ok=True)
        for d, archivo in self.diagramas:
            if filtro and not filtro(archivo):
                continue
            ruta = os.path.join(IMAGENES, archivo + ".png")
            self.ea.proj.PutDiagramImageToFile(d.DiagramGUID, ruta, 1)
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
