# -*- coding: utf-8 -*-
"""Toma las capturas de GUI de 9.1.3 con la API (3000) y la web (5173) en marcha. Cuentas de la semilla demo."""
from pathlib import Path

from playwright.sync_api import sync_playwright

WEB = "http://localhost:5173"
CLAVE = "diego"
SALIDA = Path(__file__).resolve().parent.parent / "imagenes" / "gui"


def entrar(page, ruta_login, email):
    page.goto(WEB + ruta_login)
    page.fill("input[type=email]", email)
    page.fill("input[type=password]", CLAVE)
    page.press("input[type=password]", "Enter")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)


def foto(page, nombre, completa=False):
    page.wait_for_timeout(1200)
    page.screenshot(path=str(SALIDA / f"{nombre}.png"), full_page=completa)
    print(nombre)


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        nav = p.chromium.launch(channel="msedge")
        vista = {"viewport": {"width": 1366, "height": 800}, "locale": "es-BO"}

        ctx = nav.new_context(**vista)
        page = ctx.new_page()
        page.goto(WEB + "/planes")
        page.wait_for_load_state("networkidle")
        foto(page, "gui-planes")
        page.goto(WEB + "/empezar")
        page.wait_for_load_state("networkidle")
        foto(page, "gui-empezar")
        ctx.close()

        ctx = nav.new_context(**vista)
        page = ctx.new_page()
        entrar(page, "/plataforma/login", "superadmin@ensayar.bo")
        page.goto(WEB + "/plataforma/admin")
        page.wait_for_load_state("networkidle")
        foto(page, "gui-plataforma")
        ctx.close()

        ctx = nav.new_context(**vista)
        page = ctx.new_page()
        entrar(page, "/login", "admin@ensayar.bo")
        page.goto(WEB + "/reportes")
        page.wait_for_load_state("networkidle")
        page.fill("textarea", "clientes con nombre, dirección y email que me deben de 500 a 3000 Bs por ventas al crédito")
        page.click("form.ri-form button[type=submit]")
        page.wait_for_timeout(6000)
        foto(page, "gui-reporte")
        ctx.close()

        ctx = nav.new_context(**vista)
        page = ctx.new_page()
        entrar(page, "/login", "cajero@ensayar.bo")
        page.goto(WEB + "/pos")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        ctx.set_offline(True)
        page.evaluate("window.dispatchEvent(new Event('offline'))")
        foto(page, "gui-pos-offline")
        ctx.set_offline(False)
        page.evaluate("window.dispatchEvent(new Event('online'))")
        page.goto(WEB + "/sincronizacion")
        page.wait_for_load_state("networkidle")
        foto(page, "gui-sincronizacion")
        ctx.close()

        nav.close()


if __name__ == "__main__":
    main()
