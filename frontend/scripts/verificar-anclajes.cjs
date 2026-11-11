/* Comprueba los cálculos del probador sin requerir cámara ni descargar MediaPipe. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  module._compile(js, filename)
}
const base = path.resolve(__dirname, '../src/features/tryon3d')
const { garmentProfile } = require(path.join(base, 'garmentProfile.ts'))
const { anchorFromLandmarks, projectToPreview } = require(path.join(base, 'garment2d.ts'))
const { poseFromMediaPipe } = require(path.join(base, 'mediapipePoseAdapter.ts'))

const upper = garmentProfile('blusas', 'Blusa')
const skirt = garmentProfile('faldas', 'Falda')
const pants = garmentProfile('pantalones', 'Pantalón')
assert.equal(upper.reference, 'hombros')
assert.equal(skirt.reference, 'caderas')
assert.equal(pants.reference, 'caderas')
assert.equal(garmentProfile('shorts').kind, 'pantalon')
assert.equal(garmentProfile('vestidos').kind, 'vestido')
assert.equal(garmentProfile('calzado').kind, 'no-compatible')
assert.equal(garmentProfile('faldas', 'blusa').kind, 'falda')

const puntos = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }))
puntos[11] = { x: 0.3, y: 0.2, visibility: 1 }
puntos[12] = { x: 0.7, y: 0.2, visibility: 1 }
puntos[23] = { x: 0.38, y: 0.6, visibility: 1 }
puntos[24] = { x: 0.62, y: 0.6, visibility: 1 }
puntos[25] = { x: 0.4, y: 0.85, visibility: 1 }
puntos[26] = { x: 0.6, y: 0.85, visibility: 1 }
const pixels = puntos.map(p => projectToPreview(p, 640, 480, 400, 600))
const torso = anchorFromLandmarks(pixels, upper)
const cintura = anchorFromLandmarks(pixels, skirt)
assert.ok(torso && cintura && cintura.y > torso.y, 'La falda debe colocarse debajo de los hombros')
assert.ok(cintura.width < torso.width, 'Los anchos de falda y blusa usan parámetros distintos')
assert.notEqual(anchorFromLandmarks(pixels, pants).width, cintura.width)
const poseUpper = poseFromMediaPipe(puntos, upper, 640, 480, 400, 600)
const poseLower = poseFromMediaPipe(puntos, pants, 640, 480, 400, 600)
assert.ok(poseUpper && poseLower && poseLower.torsoY > poseUpper.torsoY)
puntos[23].visibility = 0.1
const ocultos = puntos.map(p => projectToPreview(p, 640, 480, 400, 600))
assert.equal(anchorFromLandmarks(ocultos, skirt), null, 'Sin ambas caderas no se debe colocar una falda')
assert.equal(poseFromMediaPipe(puntos, pants, 640, 480, 400, 600), null)
assert.ok(anchorFromLandmarks(ocultos, upper), 'Una blusa debe seguir funcionando con hombros visibles')
assert.equal(anchorFromLandmarks(pixels, garmentProfile('calzado')), null)
console.log('Anclajes: categorías, hombros, caderas, escala, 3D y puntos no visibles verificados.')
