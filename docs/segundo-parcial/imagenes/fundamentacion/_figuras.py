# -*- coding: utf-8 -*-
"""Dibuja las figuras conceptuales de los capítulos de fundamentación (3, 4, 6 y 7)."""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch, Polygon, Rectangle

DIR = Path(__file__).resolve().parent
plt.rcParams.update({"font.family": "Times New Roman", "font.size": 11})

TINTA = "#1F2A44"
OSCURO = "#2F4B7C"
CLARO = "#E3E8F0"
MEDIO = "#B8C4D6"
BLANCO = "white"
FONDO = dict(fc="white", ec="none", pad=0.6)


def lienzo(ancho, alto):
    fig, ax = plt.subplots(figsize=(ancho, alto))
    ax.set_xlim(0, ancho)
    ax.set_ylim(0, alto)
    ax.axis("off")
    return fig, ax


def guardar(fig, nombre):
    fig.savefig(DIR / nombre, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def caja(ax, x, y, w, h, texto, fc=CLARO, ec=TINTA, color=TINTA, fs=11, peso="normal", redondeo=0.08, lw=1.2):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={redondeo}",
                                fc=fc, ec=ec, lw=lw))
    ax.text(x + w / 2, y + h / 2, texto, ha="center", va="center", fontsize=fs, color=color,
            fontweight=peso, linespacing=1.15)


def flecha(ax, a, b, texto="", estilo="-|>", discontinua=False, curva=0.0, fs=10, desp=(0, 0.12), color=TINTA):
    ax.annotate("", xy=b, xytext=a,
                arrowprops=dict(arrowstyle=estilo, color=color, lw=1.1, shrinkA=0, shrinkB=0,
                                linestyle="--" if discontinua else "-",
                                connectionstyle=f"arc3,rad={curva}"))
    if texto:
        ax.text((a[0] + b[0]) / 2 + desp[0], (a[1] + b[1]) / 2 + desp[1], texto, ha="center", va="bottom",
                fontsize=fs, color=TINTA, bbox=FONDO)


def cilindro(ax, x, y, w, h, texto="", fc=CLARO, fs=10):
    e = h * 0.18
    ax.add_patch(Rectangle((x, y + e / 2), w, h - e, fc=fc, ec="none"))
    ax.add_patch(Ellipse((x + w / 2, y + e / 2), w, e, fc=fc, ec=TINTA, lw=1.1))
    ax.add_patch(Rectangle((x, y + e / 2), w, h - e, fc=fc, ec="none"))
    ax.plot([x, x], [y + e / 2, y + h - e / 2], color=TINTA, lw=1.1)
    ax.plot([x + w, x + w], [y + e / 2, y + h - e / 2], color=TINTA, lw=1.1)
    ax.add_patch(Ellipse((x + w / 2, y + h - e / 2), w, e, fc=fc, ec=TINTA, lw=1.1))
    from matplotlib.patches import Arc
    ax.add_patch(Arc((x + w / 2, y + e / 2), w, e, theta1=180, theta2=360, ec=TINTA, lw=1.1))
    if texto:
        ax.text(x + w / 2, y + (h - e) / 2, texto, ha="center", va="center", fontsize=fs, color=TINTA)


# ---------- Diagramas de secuencia ----------

class Secuencia:
    def __init__(self, participantes, ancho, alto, margen_der=0.0):
        self.fig, self.ax = lienzo(ancho, alto)
        n = len(participantes)
        paso = (ancho - 0.4 - margen_der) / n
        self.x = {p: 0.2 + paso * (i + 0.5) for i, p in enumerate(participantes)}
        self.arriba = alto - 0.15
        self.abajo = 0.15
        cw = min(paso - 0.12, 1.6)
        for p, x in self.x.items():
            caja(self.ax, x - cw / 2, self.arriba - 0.55, cw, 0.55, p, fc=CLARO, fs=10, redondeo=0.02)
            self.ax.plot([x, x], [self.abajo, self.arriba - 0.55], color=TINTA, lw=0.8, ls=(0, (4, 3)))

    def msj(self, a, b, y, texto, retorno=False, fs=9.5):
        ax = self.ax
        if a == b:
            x = self.x[a]
            ax.annotate("", xy=(x + 0.02, y - 0.22), xytext=(x + 0.02, y),
                        arrowprops=dict(arrowstyle="-|>", color=TINTA, lw=1, connectionstyle="bar,fraction=-0.9",
                                        shrinkA=0, shrinkB=0))
            ax.text(x + 0.3, y - 0.11, texto, ha="left", va="center", fontsize=fs, color=TINTA, bbox=FONDO)
            return
        xa, xb = self.x[a], self.x[b]
        ax.annotate("", xy=(xb, y), xytext=(xa, y),
                    arrowprops=dict(arrowstyle="->" if retorno else "-|>", color=TINTA, lw=1,
                                    linestyle="--" if retorno else "-", shrinkA=0, shrinkB=0))
        ax.text((xa + xb) / 2, y + 0.05, texto, ha="center", va="bottom", fontsize=fs, color=TINTA, bbox=FONDO,
                linespacing=1.1)

    def nota(self, p, y, texto, w=1.9, h=0.42, dx=0.1):
        x = self.x[p] + dx
        ax = self.ax
        ax.add_patch(Polygon([(x, y), (x + w - 0.12, y), (x + w, y - 0.12), (x + w, y - h), (x, y - h)],
                             closed=True, fc="#FFF8DC", ec=TINTA, lw=0.8))
        ax.text(x + 0.07, y - h / 2, texto, ha="left", va="center", fontsize=9, color=TINTA, style="italic")

    def fragmento(self, x0, x1, y0, y1, etiqueta, guardas=(), divisiones=()):
        ax = self.ax
        ax.add_patch(Rectangle((x0, y1), x1 - x0, y0 - y1, fc="none", ec=TINTA, lw=1))
        w = 0.28 + 0.09 * len(etiqueta)
        ax.add_patch(Polygon([(x0, y0), (x0 + w, y0), (x0 + w, y0 - 0.2), (x0 + w - 0.1, y0 - 0.3), (x0, y0 - 0.3)],
                             closed=True, fc=BLANCO, ec=TINTA, lw=1))
        ax.text(x0 + 0.07, y0 - 0.15, etiqueta, fontsize=10, fontweight="bold", va="center", color=TINTA)
        for y in divisiones:
            ax.plot([x0, x1], [y, y], color=TINTA, lw=1, ls=(0, (5, 3)))
        for (gx, gy, g) in guardas:
            ax.text(gx, gy, g, fontsize=9.5, color=TINTA, va="center")


# ---------- Diagramas de estados ----------

def estado(ax, x, y, texto, w=1.6, h=0.5, fs=10.5):
    caja(ax, x - w / 2, y - h / 2, w, h, texto, fc=CLARO, fs=fs, redondeo=0.18)


def inicial(ax, x, y):
    ax.add_patch(Circle((x, y), 0.09, fc=TINTA, ec=TINTA))


def final(ax, x, y):
    ax.add_patch(Circle((x, y), 0.13, fc=BLANCO, ec=TINTA, lw=1.1))
    ax.add_patch(Circle((x, y), 0.08, fc=TINTA, ec=TINTA))


# =================== Figuras ===================

def fig_3_1():
    capas = ["Hardware e\ninstalaciones", "Sistema operativo\ny red", "Entorno de ejecución\ny base de datos",
             "Aplicación", "Datos y\nconfiguración"]
    modelos = ["On-premise", "ASP", "IaaS", "PaaS", "SaaS"]
    quien = [
        ["C", "P", "P", "P", "P"],
        ["C", "P", "C", "P", "P"],
        ["C", "P", "C", "P", "P"],
        ["C", "P", "C", "C", "P"],
        ["C", "C", "C", "C", "C"],
    ]
    fig, ax = lienzo(9, 5.2)
    x0, w, h = 1.9, 1.35, 0.72
    for j, m in enumerate(modelos):
        ax.text(x0 + j * w + w / 2, 4.75, m, ha="center", va="center", fontsize=11.5, fontweight="bold", color=TINTA)
    for i, capa in enumerate(capas):
        y = 0.55 + i * h
        ax.text(x0 - 0.12, y + h / 2, capa, ha="right", va="center", fontsize=10.5, color=TINTA)
        for j in range(5):
            cliente = quien[i][j] == "C"
            caja(ax, x0 + j * w + 0.05, y + 0.04, w - 0.1, h - 0.08, "Cliente" if cliente else "Proveedor",
                 fc=OSCURO if cliente else CLARO, color=BLANCO if cliente else TINTA, fs=10, redondeo=0.03)
    ax.add_patch(Rectangle((x0 + 4 * w, 0.52), w, 5 * h + 0.06, fc="none", ec=TINTA, lw=2.2))
    caja(ax, 1.9, 0.02, 0.3, 0.25, "", fc=OSCURO, redondeo=0.02)
    ax.text(2.3, 0.145, "Gestiona el cliente", va="center", fontsize=10)
    caja(ax, 4.3, 0.02, 0.3, 0.25, "", fc=CLARO, redondeo=0.02)
    ax.text(4.7, 0.145, "Gestiona el proveedor", va="center", fontsize=10)
    guardar(fig, "fig-3-1-pila-modelos.png")


def fig_3_2():
    fig, ax = lienzo(9.4, 4.7)
    ax.add_patch(FancyBboxPatch((0.2, 0.2), 5.0, 4.3, boxstyle="round,pad=0,rounding_size=0.1", fc="#F5F7FA", ec=TINTA, lw=1.3))
    ax.text(2.7, 4.15, "Plano de aplicación (multi-inquilino)", ha="center", fontsize=12, fontweight="bold", color=TINTA)
    for k, m in enumerate(["Catálogo", "Ventas", "Inventario", "Reportes"]):
        caja(ax, 0.45 + k * 1.2, 3.1, 1.05, 0.6, m, fs=10.5)
    ax.text(2.7, 2.75, "Filtro por tienda_id en cada consulta", ha="center", fontsize=10, style="italic", color=TINTA)
    ax.plot([0.45, 5.0], [2.6, 2.6], color=TINTA, lw=0.8, ls=(0, (4, 3)))
    for k, t in enumerate(["Datos\ntienda A", "Datos\ntienda B", "Datos\ntienda C"]):
        cilindro(ax, 0.5 + k * 1.3, 0.55, 1.0, 1.6, t, fs=10)
    ax.add_patch(FancyBboxPatch((6.1, 0.2), 3.1, 4.3, boxstyle="round,pad=0,rounding_size=0.1", fc="#EEF1F6", ec=TINTA, lw=1.3))
    ax.text(7.65, 4.15, "Plano de control (global)", ha="center", fontsize=12, fontweight="bold", color=TINTA)
    for k, m in enumerate(["Cuentas", "Planes", "Suscripciones", "Pagos", "Métricas"]):
        caja(ax, 6.45, 3.4 - k * 0.68, 2.4, 0.52, m, fc=MEDIO, fs=10.5)
    flecha(ax, (6.1, 1.35), (4.15, 1.35), discontinua=True)
    ax.text(5.15, 1.5, "ve a todas\nlas tiendas", ha="center", va="bottom", fontsize=9.5, style="italic", color=TINTA)
    guardar(fig, "fig-3-2-planos.png")


def fig_3_3():
    fig, ax = lienzo(9, 10.2)
    carriles = ["Cliente", "Plataforma EnsayAR", "Pasarela de pago"]
    cw = 3.0
    for i, c in enumerate(carriles):
        ax.add_patch(Rectangle((i * cw, 0), cw, 9.6, fc="none", ec=TINTA, lw=1.1))
        ax.add_patch(Rectangle((i * cw, 9.6), cw, 0.5, fc=CLARO, ec=TINTA, lw=1.1))
        ax.text(i * cw + cw / 2, 9.85, c, ha="center", va="center", fontsize=11.5, fontweight="bold", color=TINTA)
    cx = [1.5, 4.5, 7.5]
    W, H = 2.4, 0.55

    def accion(c, y, t):
        caja(ax, cx[c] - W / 2, y - H / 2, W, H, t, fs=10, redondeo=0.2)

    def rombo(c, y, t, lado="left"):
        x = cx[c]
        ax.add_patch(Polygon([(x, y + 0.3), (x + 0.3, y), (x, y - 0.3), (x - 0.3, y)], closed=True, fc=BLANCO, ec=TINTA, lw=1.1))
        ax.text(x + (0.4 if lado == "right" else -0.4), y + 0.22, t, ha="left" if lado == "right" else "right",
                fontsize=9.5, style="italic", color=TINTA)

    inicial(ax, cx[0], 9.3)
    accion(0, 8.7, "Elegir plan y registrarse")
    accion(0, 7.9, "Verificar correo")
    accion(1, 7.1, "Registrar solicitud de alta")
    accion(2, 6.3, "Cobrar suscripción")
    rombo(1, 5.5, "¿Cobro aprobado?")
    accion(1, 4.6, "Aprovisionar tienda\n(transacción local)")
    rombo(1, 3.75, "¿Aprovisionamiento\ncorrecto?")
    accion(1, 2.85, "Enviar acceso y bienvenida")
    accion(0, 2.05, "Operar la tienda")
    final(ax, cx[0], 1.3)
    accion(2, 2.85, "Reembolsar el cobro\n(compensación)")
    accion(0, 4.6, "Informar rechazo")
    accion(1, 1.3, "Informar el fallo")
    final(ax, cx[0], 3.85)
    final(ax, cx[1], 0.5)

    f = lambda a, b, t="", **k: flecha(ax, a, b, t, **k)
    f((cx[0], 9.21), (cx[0], 8.7 + H / 2))
    f((cx[0], 8.7 - H / 2), (cx[0], 7.9 + H / 2))
    f((cx[0] + W / 2, 7.9), (cx[1], 7.1 + H / 2))
    f((cx[1] + W / 2, 7.1), (cx[2], 6.3 + H / 2))
    f((cx[2], 6.3 - H / 2), (cx[1] + 0.3, 5.5))
    f((cx[1], 5.2), (cx[1], 4.6 + H / 2), "[sí]", desp=(0.25, -0.05))
    f((cx[1] - 0.3, 5.5), (cx[0], 4.6 + H / 2), "[no]", desp=(0, 0.05))
    f((cx[0], 4.6 - H / 2), (cx[0], 3.98))
    f((cx[1], 4.6 - H / 2), (cx[1], 4.05))
    f((cx[1], 3.45), (cx[1], 2.85 + H / 2), "[sí]", desp=(0.25, -0.05))
    f((cx[1] + 0.3, 3.75), (cx[2], 2.85 + H / 2), "[no]", desp=(0.1, 0.05))
    f((cx[1] - W / 2, 2.85), (cx[0], 2.05 + H / 2))
    f((cx[0], 2.05 - H / 2), (cx[0], 1.43))
    f((cx[2], 2.85 - H / 2), (cx[1] + W / 2, 1.3))
    f((cx[1], 1.3 - H / 2), (cx[1], 0.63))
    guardar(fig, "fig-3-3-ciclo-vida.png")


def fig_4_1():
    fig, ax = lienzo(9.6, 5.6)
    titulos = ["Silo: base por inquilino", "Bridge: esquema por inquilino", "Pool: tabla compartida"]
    for k, t in enumerate(titulos):
        x = 0.2 + k * 3.15
        ax.text(x + 1.5, 5.35, t, ha="center", fontsize=11.5, fontweight="bold", color=TINTA)
        caja(ax, x + 0.1, 4.25, 2.8, 0.7, "Aplicación EnsayAR\n(instancia compartida)", fc=MEDIO, fs=10)
    # silo
    for i, t in enumerate("ABC"):
        cilindro(ax, 0.35 + i * 0.95, 1.3, 0.8, 1.7, f"BD\ntienda {t}", fs=9.5)
        flecha(ax, (1.7, 4.25), (0.75 + i * 0.95, 3.0), curva=0)
    # bridge
    x = 3.35
    cilindro(ax, x + 0.1, 0.6, 2.8, 3.0, "")
    ax.text(x + 1.5, 2.75, "Una base de datos", ha="center", fontsize=10, color=TINTA)
    for i, t in enumerate("ABC"):
        caja(ax, x + 0.3 + i * 0.83, 1.35, 0.72, 1.3, f"Esquema\n{t}", fc=BLANCO, fs=9.5, redondeo=0.03)
    flecha(ax, (x + 1.5, 4.25), (x + 1.5, 3.62))
    # pool
    x = 6.5
    cilindro(ax, x + 0.1, 0.6, 2.8, 3.0, "")
    ax.text(x + 1.5, 2.75, "Una base, una tabla", ha="center", fontsize=10, color=TINTA)
    filas = [("tienda_id", "producto"), ("A", "Blusa lino"), ("B", "Vestido midi"), ("A", "Jean recto"), ("C", "Saco tejido")]
    for i, (a, b) in enumerate(filas):
        y = 2.3 - i * 0.32
        fc = MEDIO if i == 0 else BLANCO
        ax.add_patch(Rectangle((x + 0.4, y), 0.85, 0.33, fc=fc, ec=TINTA, lw=0.8))
        ax.add_patch(Rectangle((x + 1.25, y), 1.35, 0.33, fc=fc, ec=TINTA, lw=0.8))
        ax.text(x + 0.825, y + 0.165, a, ha="center", va="center", fontsize=9, fontweight="bold" if i == 0 else "normal")
        ax.text(x + 1.925, y + 0.165, b, ha="center", va="center", fontsize=9, fontweight="bold" if i == 0 else "normal")
    flecha(ax, (x + 1.5, 4.25), (x + 1.5, 3.62))
    ax.text(4.8, 0.15, "De izquierda a derecha aumenta la eficiencia de recursos y disminuye el aislamiento físico.",
            ha="center", fontsize=10, style="italic", color=TINTA)
    guardar(fig, "fig-4-1-modelos-multitenant.png")


def fig_4_2():
    fig, ax = lienzo(8, 5.6)
    capas = [
        ("#F5F7FA", "Borde: token firmado (JWT con tiendaId)"),
        ("#E3E8F0", "NestJS: TenantMiddleware y JwtAuthGuard"),
        ("#CDD6E3", "Prisma: extensión que filtra y completa tiendaId"),
        ("#B8C4D6", "PostgreSQL: RLS y valores por defecto"),
    ]
    for k, (fc, t) in enumerate(capas):
        m = k * 0.6
        ax.add_patch(FancyBboxPatch((0.2 + m, 0.2 + m), 7.6 - 2 * m, 5.2 - 2 * m,
                                    boxstyle="round,pad=0,rounding_size=0.15", fc=fc, ec=TINTA, lw=1.1))
        ax.text(4.0, 5.4 - m - 0.3, t, ha="center", va="center", fontsize=11, color=TINTA)
    caja(ax, 2.9, 2.15, 2.2, 0.75, "Datos de la tienda", fc=OSCURO, color=BLANCO, fs=12, peso="bold", redondeo=0.12)
    guardar(fig, "fig-4-2-capas-aislamiento.png")


def fig_4_3():
    ps = ["Cliente", "TenantMiddleware", "TenantContext", "JwtAuthGuard", "Controlador", "Servicio",
          "Extensión\nPrisma", "PostgreSQL"]
    s = Secuencia(ps, 13, 8.6)
    y = 7.45
    s.msj("Cliente", "TenantMiddleware", y, "GET /catalogo/productos", fs=9)
    s.msj("TenantMiddleware", "TenantContext", y - 0.55, "run(contexto, next)")
    s.msj("TenantMiddleware", "TenantMiddleware", y - 0.95, "resolver la tienda del token")
    s.msj("TenantMiddleware", "JwtAuthGuard", y - 1.6, "next()")
    s.msj("JwtAuthGuard", "TenantContext", y - 2.1, "fijar(tiendaId)")
    s.nota("JwtAuthGuard", y - 2.2, "Aquí se FIJA\nla tienda", w=1.2, dx=0.12)
    s.msj("JwtAuthGuard", "Controlador", y - 2.95, "acceso concedido")
    s.msj("Controlador", "Servicio", y - 3.45, "listar(filtros)")
    s.msj("Servicio", "Extensión\nPrisma", y - 3.95, "producto.findMany()")
    s.msj("Extensión\nPrisma", "TenantContext", y - 4.45, "tiendaId()")
    s.msj("TenantContext", "Extensión\nPrisma", y - 4.85, "tiendaId", retorno=True)
    s.msj("Extensión\nPrisma", "PostgreSQL", y - 5.55, "SELECT …\nWHERE tienda_id = $1", fs=9)
    s.nota("Servicio", y - 5.25, "Aquí se APLICA\nla tienda", w=1.35, dx=-1.47)
    s.msj("PostgreSQL", "Extensión\nPrisma", y - 6.0, "filas de la tienda", retorno=True)
    s.msj("Extensión\nPrisma", "Servicio", y - 6.35, "productos", retorno=True)
    s.msj("Servicio", "Controlador", y - 6.7, "productos", retorno=True)
    s.msj("Controlador", "Cliente", y - 7.05, "200 OK (JSON)", retorno=True)
    guardar(s.fig, "fig-4-3-secuencia-tenant.png")


def fig_6_1():
    fig, ax = lienzo(9, 4.0)

    def eje(y, titulo, izq, der, puntos_izq, puntos_der):
        ax.text(0.2, y + 0.45, titulo, fontsize=11.5, fontweight="bold", color=TINTA)
        flecha(ax, (4.5, y), (0.6, y), estilo="-|>")
        flecha(ax, (4.5, y), (8.4, y), estilo="-|>")
        ax.plot([4.5, 4.5], [y - 0.12, y + 0.12], color=TINTA, lw=1.1)
        ax.text(0.35, y, izq, ha="center", va="center", fontsize=12, fontweight="bold", color=TINTA)
        ax.text(8.65, y, der, ha="center", va="center", fontsize=12, fontweight="bold", color=TINTA)
        for k, t in enumerate(puntos_izq):
            caja(ax, 0.75 + k * 1.75, y - 0.65, 1.65, 0.45, t, fc=OSCURO, color=BLANCO, fs=10, redondeo=0.1)
        w = 1.15 if len(puntos_der) > 2 else 1.9
        for k, t in enumerate(puntos_der):
            caja(ax, 8.25 - (k + 1) * (w + 0.1), y - 0.65, w, 0.45, t, fc=MEDIO, fs=10, redondeo=0.1)

    eje(2.9, "Con partición de red (P)", "A", "C", ["Venta en efectivo", "Alta de clientas"],
        ["Cierre de caja", "Créditos", "Pago QR"])
    eje(1.0, "Sin partición (E)", "L", "C", ["Lectura de catálogo"], ["Confirmación de venta"])
    ax.text(4.5, -0.05, "A: disponibilidad · C: consistencia · L: latencia", ha="center", fontsize=10,
            style="italic", color=TINTA)
    guardar(fig, "fig-6-1-pacelc.png")


def fig_6_2():
    fig, ax = lienzo(11, 4.6)
    w = 1.5
    pos = {"Registrado": (1.2, 3.6), "Instalando": (4.0, 3.6), "En espera": (6.8, 3.6), "Activando": (9.6, 3.6),
           "Activo": (9.6, 0.8), "Redundante": (4.0, 0.8)}
    for k, (x, y) in pos.items():
        estado(ax, x, y, k, w=w)
    inicial(ax, 0.1, 3.6)
    flecha(ax, (0.19, 3.6), (1.2 - w / 2, 3.6))
    flecha(ax, (1.2 + w / 2, 3.6), (4.0 - w / 2, 3.6), "register()", fs=9.5)
    flecha(ax, (4.0 + w / 2, 3.6), (6.8 - w / 2, 3.6), "install", fs=9.5)
    flecha(ax, (6.8 + w / 2, 3.6), (9.6 - w / 2, 3.6), "sin clientes previos", fs=9.5)
    flecha(ax, (4.5, 3.35), (9.1, 3.35), curva=0.25)
    ax.text(6.8, 2.6, "skipWaiting(): el sw.js de EnsayAR omite la espera", ha="center", va="top", fontsize=9.5,
            color=TINTA, bbox=FONDO)
    flecha(ax, (9.6, 3.35), (9.6, 1.05))
    ax.text(9.7, 2.2, "activate: borra las cachés\nanteriores y llama a\nclients.claim()", ha="left", va="center",
            fontsize=9.5, color=TINTA)
    flecha(ax, (4.0, 3.35), (4.0, 1.05))
    ax.text(3.9, 1.75, "falla la\ninstalación", ha="right", va="center", fontsize=9.5, color=TINTA)
    flecha(ax, (9.6 - w / 2, 0.8), (4.0 + w / 2, 0.8), "lo reemplaza una versión nueva", fs=9.5)
    final(ax, 1.6, 0.8)
    flecha(ax, (4.0 - w / 2, 0.8), (1.73, 0.8))
    guardar(fig, "fig-6-2-ciclo-service-worker.png")


def fig_6_3():
    fig, ax = lienzo(10.8, 6.2)
    ax.set_xlim(-0.8, 10)
    inicial(ax, -0.6, 3.1)
    estado(ax, 1.6, 3.1, "pendiente", w=1.5)
    flecha(ax, (-0.51, 3.1), (0.85, 3.1))
    ax.text(0.17, 2.98, "guardar en\nla cola local", ha="center", va="top", fontsize=9.5, color=TINTA)
    destinos = [("aplicada", 5.6), ("repetida", 4.7), ("fusionada", 3.8), ("conflicto", 2.6), ("vencida", 1.5),
                ("rechazada", 0.6)]
    for nombre, y in destinos:
        estado(ax, 5.2, y, nombre, w=1.5)
        flecha(ax, (2.35, 3.1), (4.45, y))
    for nombre, y in destinos:
        if nombre != "conflicto":
            final(ax, 6.6, y)
            flecha(ax, (5.95, y), (6.47, y))
    ax.text(3.4, 5.7, "respuesta de POST /sync/lote", fontsize=9.5, style="italic", ha="center", color=TINTA)
    estado(ax, 8.4, 2.6, "descartada", w=1.5)
    flecha(ax, (5.95, 2.6), (7.65, 2.6), "resolución administrativa", fs=9.5)
    final(ax, 9.55, 2.6)
    flecha(ax, (9.15, 2.6), (9.42, 2.6))
    flecha(ax, (4.45, 2.45), (1.6, 2.85), curva=-0.55)
    ax.text(1.0, 1.75, "reintento con un UUID\nnuevo (vender lo\ndisponible)", ha="center", va="center", fontsize=9.5,
            color=TINTA)
    ax.annotate("", xy=(1.2, 3.35), xytext=(2.0, 3.35),
                arrowprops=dict(arrowstyle="-|>", color=TINTA, lw=1, connectionstyle="arc3,rad=1.6"))
    ax.text(1.6, 4.05, "en_curso / error:\nse reintenta", ha="center", fontsize=9.5, color=TINTA)
    guardar(fig, "fig-6-3-estados-operacion.png")


def fig_6_4():
    api = "API\nPOST /sync/lote"
    s = Secuencia(["Dispositivo A", "Dispositivo B", api, "PostgreSQL"], 11.5, 7.6, margen_der=2.0)
    y = 6.55
    s.msj("Dispositivo A", api, y, "lote [venta A, uuid-A]")
    s.msj("Dispositivo B", api, y - 0.45, "lote [venta B, uuid-B]")
    s.msj(api, "PostgreSQL", y - 1.15, "tx A: UPDATE stock …\nWHERE cantidad − reservado ≥ 1")
    s.msj("PostgreSQL", api, y - 1.55, "1 fila (queda bloqueada)", retorno=True)
    s.msj(api, "PostgreSQL", y - 2.0, "tx B: UPDATE sobre la misma fila")
    xp = s.x["PostgreSQL"]
    s.ax.add_patch(Rectangle((xp - 0.07, y - 3.75), 0.14, 1.75, fc=MEDIO, ec=TINTA, lw=0.8))
    s.nota("PostgreSQL", y - 2.05, "tx B espera el\nbloqueo de fila", w=1.45, dx=0.2)
    s.msj(api, "PostgreSQL", y - 2.85, "tx A: venta, movimiento,\nturno y auditoría; COMMIT")
    s.msj("PostgreSQL", "PostgreSQL", y - 3.15, "reevalúa WHERE:\n0 − 0 ≥ 1 es falso")
    s.msj("PostgreSQL", api, y - 3.75, "tx B: 0 filas afectadas", retorno=True)
    s.msj(api, "PostgreSQL", y - 4.3, "tx B: ROLLBACK\n(StockInsuficienteError)")
    s.msj(api, "Dispositivo A", y - 4.95, "uuid-A: aplicada", retorno=True)
    s.msj(api, "Dispositivo B", y - 5.5, "uuid-B: conflicto STOCK_INSUFICIENTE", retorno=True)
    guardar(s.fig, "fig-6-4-conflicto-stock.png")


def fig_6_5():
    ps = ["Orquestador\nde venta", "Ventas", "Inventario", "Caja", "Notificaciones"]
    s = Secuencia(ps, 10.5, 9.0)
    top = 8.05
    s.fragmento(0.25, 10.3, top + 0.1, 0.35, "alt", divisiones=(4.1,),
                guardas=((0.95, top - 0.15, "[todos los pasos se confirman]"), (0.45, 3.9, "[falla el paso 3: turno cerrado]")))
    o = "Orquestador\nde venta"
    y = top - 0.55
    for t, d in [("1. crear venta PENDIENTE", "Ventas"), ("2. descontar stock", "Inventario"),
                 ("3. sumar total al turno", "Caja"), ("4. marcar venta COBRADA", "Ventas"),
                 ("5. avisar a la clienta y responsables", "Notificaciones")]:
        s.msj(o, d, y, t)
        s.msj(d, o, y - 0.33, "ok", retorno=True)
        y -= 0.72
    y = 3.45
    for t, d in [("1. crear venta PENDIENTE", "Ventas"), ("2. descontar stock", "Inventario"),
                 ("3. sumar total al turno", "Caja")]:
        s.msj(o, d, y, t)
        s.msj(d, o, y - 0.3, "ok" if d != "Caja" else "error: turno cerrado", retorno=True)
        y -= 0.62
    s.msj(o, "Inventario", y - 0.05, "compensa 2: reingresar stock")
    s.msj(o, "Ventas", y - 0.6, "compensa 1: anular venta")
    guardar(s.fig, "fig-6-5-saga-venta.png")


def fig_7_1():
    fig, ax = lienzo(13.2, 3.0)
    pasos = ["Captura\n(texto o voz)", "Normalización", "Interpretación\n(Azure OpenAI,\nrespaldo por\nreglas)",
             "Validación\ncontra el\ncatálogo", "Compilación\na SQL\nparametrizado", "Ejecución\n(transacción\ncon la tienda\nfijada)",
             "Presentación\n(tabla, barras,\nnarración,\nPDF o Excel)", "Auditoría"]
    w, sep = 1.45, 0.2
    xs = []
    for k, t in enumerate(pasos):
        x = 0.1 + k * (w + sep)
        xs.append(x)
        caja(ax, x, 1.35, w, 1.5, t, fs=10)
        if k:
            flecha(ax, (x - sep, 2.1), (x, 2.1))
    caja(ax, xs[2], 0.1, xs[4] + w - xs[2], 0.7,
         "Capa semántica: dimensiones, medidas,\nrelaciones y reglas de cálculo", fc=OSCURO, color=BLANCO, fs=10)
    for k in (2, 3, 4):
        flecha(ax, (xs[k] + w / 2, 0.8), (xs[k] + w / 2, 1.35))
    guardar(fig, "fig-7-1-tuberia-reporte.png")


if __name__ == "__main__":
    for f in (fig_3_1, fig_3_2, fig_3_3, fig_4_1, fig_4_2, fig_4_3, fig_6_1, fig_6_2, fig_6_3, fig_6_4, fig_6_5, fig_7_1):
        f()
        print(f.__name__)
