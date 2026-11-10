# -*- coding: utf-8 -*-
"""Dibuja la vista general del proceso ICONIX (Figura 9.0.1)."""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

SALIDA = Path(__file__).resolve().parent.parent / "imagenes" / "iconix-proceso.png"
AZUL, VERDE, GRIS, NARANJA = "#DCE3EE", "#E2EFDA", "#555555", "#C55A11"

fig, ax = plt.subplots(figsize=(13, 5.6), dpi=150)
ax.set_xlim(0, 13)
ax.set_ylim(0, 5.6)
ax.axis("off")


def caja(x, y, texto, color, w=2.2, h=0.85):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.04,rounding_size=0.12",
                                fc=color, ec="#1F2A44", lw=1.2))
    ax.text(x, y, texto, ha="center", va="center", fontsize=10.5, color="#1A1A1A")
    return x, y, w, h


def flecha(a, b, doble=False, estilo="-|>", color="#1F2A44", rad=0.0):
    (x1, y1, w1, h1), (x2, y2, w2, h2) = a, b
    if abs(y1 - y2) < 0.01:
        p1, p2 = (x1 + w1 / 2, y1), (x2 - w2 / 2, y2)
    elif abs(x1 - x2) < 0.01:
        s = 1 if y2 > y1 else -1
        p1, p2 = (x1, y1 + s * h1 / 2), (x2, y2 - s * h2 / 2)
    else:
        p1, p2 = (x1 + w1 / 2, y1), (x2 - w2 / 2, y2)
    ax.add_patch(FancyArrowPatch(p1, p2, arrowstyle=("<|-|>" if doble else estilo), mutation_scale=14,
                                 color=color, lw=1.3, connectionstyle=f"arc3,rad={rad}"))


ax.text(0.15, 4.35, "Línea dinámica", fontsize=11, fontweight="bold", color="#1F2A44", rotation=90, va="center")
ax.text(0.15, 1.55, "Línea estática", fontsize=11, fontweight="bold", color="#1F2A44", rotation=90, va="center")

gui = caja(1.6, 4.35, "Prototipo de GUI", AZUL)
cu = caja(4.2, 4.35, "Casos de uso", AZUL)
rob = caja(6.8, 4.35, "Análisis de robustez", AZUL)
seq = caja(9.4, 4.35, "Secuencia", AZUL)

dom = caja(1.6, 1.55, "Modelo de dominio", VERDE)
dom2 = caja(6.8, 1.55, "Dominio actualizado", VERDE)
cls = caja(9.4, 1.55, "Modelo de clases", VERDE)

cod = caja(11.9, 2.95, "Código y\npruebas", "#FCE4D6", w=1.7, h=1.1)

flecha(gui, cu)
flecha(cu, rob)
flecha(rob, seq)
flecha(dom, dom2)
flecha(dom2, cls)
flecha(rob, dom2, doble=True)
flecha(seq, cls, doble=True)
flecha(seq, cod, rad=-0.15)
flecha(cls, cod, rad=0.15)
ax.add_patch(FancyArrowPatch((2.3, 1.98), (3.6, 3.92), arrowstyle="-|>", mutation_scale=14, color="#1F2A44", lw=1.3))

hitos = [(5.5, "Requirements\nReview"), (8.1, "Preliminary Design\nReview (PDR)"), (10.78, "Critical Design\nReview (CDR)")]
for x, t in hitos:
    ax.plot([x, x], [0.55, 5.0], ls="--", color=NARANJA, lw=1.1)
    ax.text(x, 5.3, t, ha="center", va="center", fontsize=9, color=NARANJA, fontweight="bold")

for x, t in [(2.9, "Requisitos"), (6.8, "Análisis y diseño\npreliminar"), (9.45, "Diseño detallado"), (11.9, "Implementación")]:
    ax.text(x, 0.3, t, ha="center", va="center", fontsize=9.5, color=GRIS)

SALIDA.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(SALIDA, bbox_inches="tight", facecolor="white")
print(SALIDA)
