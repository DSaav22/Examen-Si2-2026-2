# -*- coding: utf-8 -*-
"""Máquinas de estado UML 2.5 de una operación offline (cliente) y de OperacionSync (servidor).

Uso independiente:  python estados.py   (rehace solo el paquete "8 Estados" y exporta sus imágenes)
generar_ea.py lo llama al reconstruir el modelo completo.
"""
import os

from arquitectura import Arquitectura

INICIAL, FINAL = 3, 4


class Estados(Arquitectura):
    def pseudo(self, subtipo, padre=None):
        coleccion = padre.Elements if padre is not None else self.paq.Elements
        e = coleccion.AddNew("", "StateNode")
        e.Subtype = subtipo
        e.Update()
        return e

    def transicion(self, a, b, evento="", guarda="", efecto=""):
        c = a.Connectors.AddNew("", "StateFlow")
        c.SupplierID = b.ElementID
        c.TransitionEvent = evento
        c.TransitionGuard = guarda
        c.TransitionAction = efecto
        c.Update()
        return c

    def cliente(self):
        n = self.nuevo
        ini = self.pseudo(INICIAL)
        guardada = n("Guardada en el dispositivo", "State", notas="IndexedDB ensayar-offline en la web; SQLite ensayar-offline.db en la app")
        pendiente = n("Pendiente", "State", padre=guardada, notas="Espera red; sobrevive al cierre de la app y al reinicio del equipo")
        conflicto = n("En conflicto", "State", padre=guardada, notas="El servidor no pudo aplicarla con el stock o el turno actuales")
        rechazada = n("Rechazada", "State", padre=guardada, notas="Datos inválidos, sin permiso o uuid ya usado por otra venta")
        vencida = n("Vencida", "State", padre=guardada, notas="Creada antes de la ventana offline de la tienda")
        envio = n("En envío", "State", notas="Forma parte de un lote POST /sync/lote")
        fin = self.pseudo(FINAL)
        fin2 = self.pseudo(FINAL)

        self.transicion(ini, pendiente, "", "", "encolar(): id = uuid()")
        self.transicion(pendiente, envio, "reconexión o cada 30 s", "hay sesión", "enviar lote con dispositivoId")
        vuelta = self.transicion(envio, pendiente, "resultado", "en_curso, error o falla de red", "reintentar en la próxima pasada")
        self.transicion(envio, fin, "resultado", "aplicada, repetida o fusionada", "quitarOp(id)")
        self.transicion(envio, conflicto, "resultado", "conflicto", "guardarOp(op con error)")
        self.transicion(envio, rechazada, "resultado", "rechazada", "guardarOp(op con error)")
        self.transicion(envio, vencida, "resultado", "vencida", "guardarOp(op con error)")
        self.transicion(conflicto, pendiente, "reintentar(cambios)", "", "id nuevo, misma creadaEn")
        for e in (conflicto, rechazada, vencida):
            self.transicion(e, fin2, "descartar")

        d = self.ea.diagrama(self.paq, "Estados de una operación offline", "Statechart")
        self.colocar(d, [
            (ini, 40, 125, 20, 20, 0),
            (guardada, 260, 30, 640, 400, 0),
            (pendiente, 300, 105, 170, 60, 1),
            (conflicto, 300, 330, 170, 60, 1), (rechazada, 510, 330, 170, 60, 1), (vencida, 710, 330, 170, 60, 1),
            (envio, 1050, 105, 180, 60, 0),
            (fin, 1350, 125, 20, 20, 0), (fin2, 580, 500, 20, 20, 0),
        ])
        self.ruta(d, vuelta, [(1140, 230), (385, 230)])
        self.diagramas.append((d, "est-operacion-offline"))

    def servidor(self):
        n = self.nuevo
        ini = self.pseudo(INICIAL)
        curso = n("En curso", "State", notas="Fila OperacionSync creada con el id de la operación; la transacción está abierta")
        estados = {k: n(k, "State", notas=v) for k, v in {
            "Aplicada": "La venta, clienta o producto quedó registrado; estado definitivo",
            "Fusionada": "La clienta ya existía por email; se devuelve el id existente",
            "Conflicto": "Falta stock o el turno de caja ya no es válido; transacción revertida",
            "Rechazada": "Datos inválidos, sin permiso o uuid en uso; transacción revertida",
            "Vencida": "creadaEn fuera de la ventana offline de la tienda",
            "Error": "Falla temporal del servidor; transacción revertida",
            "Descartada": "Un encargado o administrador decidió no aplicarla",
        }.items()}

        self.transicion(ini, curso, "", "", "crear OperacionSync")
        self.transicion(curso, estados["Aplicada"], "", "transacción confirmada")
        self.transicion(curso, estados["Fusionada"], "", "clienta con email existente")
        self.transicion(curso, estados["Conflicto"], "", "stock insuficiente o turno inválido", "rollback")
        self.transicion(curso, estados["Rechazada"], "", "datos inválidos o uuid en uso", "rollback")
        self.transicion(curso, estados["Vencida"], "", "fuera de la ventana offline")
        self.transicion(curso, estados["Error"], "", "falla temporal", "rollback")
        reintento = self.transicion(estados["Error"], curso, "mismo id reenviado", "", "reintentar")
        self.transicion(estados["Aplicada"], estados["Aplicada"], "mismo id reenviado", "", "responder repetida")
        self.transicion(estados["Conflicto"], estados["Descartada"], "descartar(id)", "rol Encargado o Admin")

        nota = n("Nota estados servidor", "Note", notas=(
            "Idempotencia: el id de la operación es la clave. Un reenvío de una operación ya Aplicada o Fusionada "
            "no vuelve a ejecutarse: responde repetida con el resultado original. Una fila En curso abandonada por "
            "más de un minuto se considera huérfana y se puede retomar."))

        d = self.ea.diagrama(self.paq, "Estados de OperacionSync en el servidor", "Statechart")
        x, filas = 670, [20, 110, 200, 290, 380, 470]
        lista = [(ini, 40, 245, 20, 20, 0), (curso, 280, 225, 180, 60, 0)]
        for (nombre, e), y in zip(list(estados.items())[:6], filas):
            lista.append((e, x, y, 180, 60, 0))
        lista += [(estados["Descartada"], 1010, 200, 180, 60, 0), (nota, 1010, 330, 300, 110, 0)]
        self.colocar(d, lista)
        self.ruta(d, reintento, [(760, 575), (370, 575)])
        self.diagramas.append((d, "est-operacion-sync"))

    def construir(self):
        self.cliente()
        self.servidor()
        return self.diagramas


def main():
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from generar_ea import EA, IMAGENES, PAQUETE
    ea = EA()
    try:
        base = ea.r.Models.GetAt(0).Packages.GetByName("EnsayAR").Packages.GetByName(PAQUETE)
        for i in range(base.Packages.Count - 1, -1, -1):
            if base.Packages.GetAt(i).Name == "8 Estados":
                base.Packages.DeleteAt(i, True)
        base.Packages.Refresh()
        paq = ea.paquete(base, "8 Estados")
        diagramas = Estados(ea, paq).construir()
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
