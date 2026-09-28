"""Genera un cardigan piloto riggeado y exporta un GLB para el probador.

Ejecutar con Blender en modo fondo:
  blender --background --python generar_cardigan_rigged.py -- <ruta-salida.glb>

El archivo se genera fuera de models/catalogo para no reemplazar los modelos
anteriores antes de validarlo visualmente en el navegador.
"""

import os
import sys
import bpy


def material(nombre, color, metal=0.0):
    mat = bpy.data.materials.new(nombre)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.72
    bsdf.inputs["Metallic"].default_value = metal
    return mat


ROSA = material("Tejido rosa", (0.54, 0.16, 0.28))
VINO = material("Rayas vino", (0.20, 0.025, 0.07))
BOTON = material("Botones", (0.88, 0.69, 0.35), 0.35)


def cubo(nombre, ubicacion, escala, mat, bisel=0.06):
    bpy.ops.mesh.primitive_cube_add(location=ubicacion)
    obj = bpy.context.object
    obj.name = nombre
    obj.scale = (escala[0] / 2, escala[1] / 2, escala[2] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("Bordes tejidos", "BEVEL")
    bevel.width = bisel
    bevel.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.data.materials.append(mat)
    return obj


def cilindro(nombre, ubicacion, radio, profundidad, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radio, depth=profundidad, location=ubicacion, rotation=rot)
    obj = bpy.context.object
    obj.name = nombre
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Bordes suaves", "BEVEL")
    bevel.width = 0.035
    bevel.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


def limpiar_escena():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials):
        if datablocks is bpy.data.materials:
            continue


def crear_armature():
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    rig = bpy.context.object
    rig.name = "EnsayAR_Garment_Rig"
    rig.data.name = "EnsayAR_Garment_Rig"
    root = rig.data.edit_bones[0]
    root.name = "Root"
    root.head = (0, 0, 0)
    root.tail = (0, 0, 0.7)
    chest = rig.data.edit_bones.new("Chest")
    chest.head = (0, 0, 0.7)
    chest.tail = (0, 0, 2.25)
    chest.parent = root
    shoulder_l = rig.data.edit_bones.new("UpperArm.L")
    shoulder_l.head = (-0.42, 0, 1.95)
    shoulder_l.tail = (-1.15, 0, 1.62)
    shoulder_l.parent = chest
    shoulder_r = rig.data.edit_bones.new("UpperArm.R")
    shoulder_r.head = (0.42, 0, 1.95)
    shoulder_r.tail = (1.15, 0, 1.62)
    shoulder_r.parent = chest
    bpy.ops.object.mode_set(mode="OBJECT")
    return rig


def unir_y_riggear(prendas, rig):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in prendas:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = prendas[0]
    bpy.ops.object.join()
    mesh = bpy.context.object
    mesh.name = "Cardigan_Rayado_Rosa_Vino_III"

    grupos = {name: mesh.vertex_groups.new(name=name) for name in ("Chest", "UpperArm.L", "UpperArm.R")}
    for vertice in mesh.data.vertices:
        x = vertice.co.x
        z = vertice.co.z
        if x < -0.52 and z > 1.0:
            grupos["UpperArm.L"].add([vertice.index], 1.0, "REPLACE")
        elif x > 0.52 and z > 1.0:
            grupos["UpperArm.R"].add([vertice.index], 1.0, "REPLACE")
        else:
            grupos["Chest"].add([vertice.index], 1.0, "REPLACE")

    modificador = mesh.modifiers.new("Armature", "ARMATURE")
    modificador.object = rig
    return mesh


def construir_cardigan():
    prendas = []
    # Paneles frontal y trasero, con abertura central del cardigan.
    prendas.append(cubo("Panel frontal izquierdo", (-0.29, -0.06, 1.35), (0.54, 0.18, 1.30), ROSA))
    prendas.append(cubo("Panel frontal derecho", (0.29, -0.06, 1.35), (0.54, 0.18, 1.30), ROSA))
    prendas.append(cubo("Espalda", (0, 0.11, 1.35), (1.13, 0.18, 1.30), ROSA))
    prendas.append(cubo("Cuello", (0, -0.03, 2.03), (1.12, 0.20, 0.16), VINO, 0.04))
    # Mangas extendidas desde el hombro; eje X, estándar para el rig.
    prendas.append(cilindro("Manga izquierda", (-0.91, 0.02, 1.65), 0.20, 0.88, ROSA, (0, 1.18, 0)))
    prendas.append(cilindro("Manga derecha", (0.91, 0.02, 1.65), 0.20, 0.88, ROSA, (0, 1.18, 0)))
    # Rayas horizontales visibles para identificar la variante en la prueba.
    for z in (0.90, 1.20, 1.50, 1.80):
        prendas.append(cubo("Raya", (0, -0.165, z), (1.08, 0.035, 0.10), VINO, 0.015))
    for z in (1.62, 1.36, 1.10):
        prendas.append(cilindro("Botón", (0.035, -0.18, z), 0.045, 0.035, BOTON, (1.5708, 0, 0)))
    return prendas


def salida_desde_argumentos():
    args = sys.argv
    if "--" in args:
        args = args[args.index("--") + 1 :]
    if not args:
        raise RuntimeError("Indicá la ruta de salida .glb después de --")
    return os.path.abspath(args[0])


def main():
    salida = salida_desde_argumentos()
    os.makedirs(os.path.dirname(salida), exist_ok=True)
    limpiar_escena()
    rig = crear_armature()
    mesh = unir_y_riggear(construir_cardigan(), rig)
    # Convención de salida: Y vertical en glTF/Three.js; la exportación glTF
    # realiza la conversión Blender Z-up -> glTF Y-up.
    bpy.context.view_layer.objects.active = mesh
    mesh.select_set(True)
    rig.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=salida,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_animations=True,
        export_materials="EXPORT",
    )
    print("GLB generado:", salida)


if __name__ == "__main__":
    main()
