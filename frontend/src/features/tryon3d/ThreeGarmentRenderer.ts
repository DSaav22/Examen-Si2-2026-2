import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { GarmentRenderer, TryOnPose } from './domain'

/** Adaptador Three.js: carga un GLB, lo normaliza y lo posiciona sobre el video. */
export class ThreeGarmentRenderer implements GarmentRenderer {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  private readonly anchor = new Group()
  private readonly modelRoot = new Group()
  private model: Group | null = null
  private sourceWidth = 1
  private aspect = 1

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(new Color(0x000000), 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.camera.position.z = 4
    this.scene.add(new AmbientLight(0xffffff, 1.6))
    const key = new DirectionalLight(0xffffff, 2.4)
    key.position.set(2, 3, 4)
    this.scene.add(key)
    this.anchor.add(this.modelRoot)
    this.scene.add(this.anchor)
  }

  async load(modelUrl: string) {
    this.modelRoot.clear()
    this.model = null
    const gltf = await new GLTFLoader().loadAsync(modelUrl)
    const model = gltf.scene
    const bounds = new Box3().setFromObject(model)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    // Los GLB para este módulo usan X=ancho e Y=alto. Escalar por la mayor
    // dimensión hacía que mangas o prendas mal orientadas ocuparan la cámara.
    this.sourceWidth = Math.max(size.x, 0.001)
    model.position.sub(center)
    model.scale.setScalar(1)
    model.traverse(node => {
      if (node instanceof Mesh) {
        node.castShadow = false
        node.frustumCulled = true
      }
    })
    this.modelRoot.add(model)
    this.model = model
  }

  resize(width: number, height: number) {
    const aspect = Math.max(width / Math.max(height, 1), 0.1)
    this.aspect = aspect
    this.camera.left = -aspect
    this.camera.right = aspect
    this.camera.top = 1
    this.camera.bottom = -1
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  render(pose: TryOnPose | null, extraRotation = 0) {
    if (this.model && pose?.visible) {
      // El adaptador ya ajusta el ancho de la prenda según su categoría.
      const scale = (pose.shoulderWidth * 2 * this.aspect) / this.sourceWidth
      this.anchor.visible = true
      this.anchor.position.set((pose.torsoX - 0.5) * 2 * this.aspect, (0.5 - pose.torsoY) * 2, 0)
      this.anchor.scale.setScalar(scale)
      this.anchor.rotation.set(0, pose.turnRadians + extraRotation, 0)
    } else {
      this.anchor.visible = false
    }
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.model?.traverse(node => {
      if (node instanceof Mesh) {
        node.geometry.dispose()
        const materials = Array.isArray(node.material) ? node.material : [node.material]
        materials.forEach(material => material.dispose())
      }
    })
    this.renderer.dispose()
  }
}
