"""Genera una prenda base con OpenSew-2 y la exporta como GLB riggeado.

Uso:
  blender --background --python generar_opensew_piloto.py -- salida.glb

No intenta convertir una foto directamente en malla: OpenSew genera el patrón,
lo cose y lo liga al rig; la textura de las cuatro vistas se añadirá después.
"""
import os
import sys
import bpy


def arguments():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if not args:
        raise RuntimeError('Falta la ruta GLB de salida después de --')
    texture = os.environ.get('ENSAYAR_TEXTURE_360') or (args[1] if len(args) > 1 else None)
    return os.path.abspath(args[0]), os.path.abspath(texture) if texture else None


def material_desde_vistas(path):
    """Crea cuatro materiales desde el montaje: frente, izq., espalda, der."""
    image = bpy.data.images.load(path, check_existing=True)
    image.pack()
    materials = []
    for index, name in enumerate(('Frente', 'Lateral izquierdo', 'Espalda', 'Lateral derecho')):
        material = bpy.data.materials.new('Cardigan ' + name)
        material.use_nodes = True
        nodes, links = material.node_tree.nodes, material.node_tree.links
        principled = nodes.get('Principled BSDF')
        principled.inputs['Roughness'].default_value = 0.68
        coords = nodes.new('ShaderNodeTexCoord')
        separate = nodes.new('ShaderNodeSeparateXYZ')
        combine = nodes.new('ShaderNodeCombineXYZ')
        mapping = nodes.new('ShaderNodeMapping')
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = image
        # X y Z locales se proyectan sobre una franja del montaje 4x1.
        mapping.inputs['Scale'].default_value[0] = 0.25
        mapping.inputs['Location'].default_value[0] = index * 0.25
        links.new(coords.outputs['Generated'], separate.inputs['Vector'])
        links.new(separate.outputs['X'], combine.inputs['X'])
        links.new(separate.outputs['Z'], combine.inputs['Y'])
        links.new(combine.outputs['Vector'], mapping.inputs['Vector'])
        links.new(mapping.outputs['Vector'], texture.inputs['Vector'])
        links.new(texture.outputs['Color'], principled.inputs['Base Color'])
        materials.append(material)
    return materials


def asignar_vistas(garment, materials):
    for material in materials:
        garment.data.materials.append(material)
    # El patrón de OpenSew queda en el sistema local del avatar: +/-Y son
    # frente/espalda y +/-X los laterales. Cada cara recibe su vista 360.
    for polygon in garment.data.polygons:
        normal = polygon.normal
        if abs(normal.y) >= abs(normal.x):
            polygon.material_index = 0 if normal.y < 0 else 2
        else:
            polygon.material_index = 1 if normal.x < 0 else 3


def main():
    target, texture_source = arguments()
    os.makedirs(os.path.dirname(target), exist_ok=True)
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.preferences.addon_enable(module='clothing_design')
    from clothing_design import build

    bpy.ops.cd.import_character(figure='WOMAN')
    bpy.ops.cd.add_garment(preset='JACKET', fit=0.08)
    garment = build.garment_object(bpy.context, create=False)
    if garment is None:
        raise RuntimeError('OpenSew no creó la prenda')
    bpy.ops.cd.sew()
    bpy.ops.cd.finalize()

    garment = build.garment_object(bpy.context, create=False)
    garment.name = 'OpenSew_Jacket_Base'
    if texture_source:
        if not os.path.isfile(texture_source):
            raise RuntimeError('No existe la imagen 360: ' + texture_source)
        asignar_vistas(garment, material_desde_vistas(texture_source))
    armature = garment.parent if garment.parent and garment.parent.type == 'ARMATURE' else None
    if armature is None:
        armature = next((modifier.object for modifier in garment.modifiers
                         if modifier.type == 'ARMATURE' and modifier.object), None)
    if armature is None:
        raise RuntimeError('OpenSew no vinculó la prenda a un armature')
    bpy.ops.object.select_all(action='DESELECT')
    garment.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = garment
    bpy.ops.export_scene.gltf(
        filepath=target,
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_animations=True,
        export_materials='EXPORT',
    )
    print('OPENSEW_GLB=', target)
    print('VERTICES=', len(garment.data.vertices), 'BONES=', len(armature.pose.bones),
          'TEXTURE=', bool(texture_source))


if __name__ == '__main__':
    main()
