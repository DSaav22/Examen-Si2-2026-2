export type Point = { x: number; y: number; visibility?: number }
export type GarmentAnchor = { x: number; y: number; width: number; angle: number }

/** Mapea el fotograma a un contenedor con object-fit: contain y efecto espejo. */
export function projectToPreview(point: Point, frameWidth: number, frameHeight: number, width: number, height: number): Point {
  const scale = Math.min(width / frameWidth, height / frameHeight)
  const renderedWidth = frameWidth * scale
  const renderedHeight = frameHeight * scale
  return {
    x: (width - renderedWidth) / 2 + (1 - point.x) * renderedWidth,
    y: (height - renderedHeight) / 2 + point.y * renderedHeight,
    visibility: point.visibility,
  }
}

export function anchorFromShoulders(a: Point, b: Point): GarmentAnchor | null {
  if ((a.visibility ?? 1) < 0.35 || (b.visibility ?? 1) < 0.35) return null
  const [left, right] = a.x <= b.x ? [a, b] : [b, a]
  const dx = right.x - left.x
  const dy = right.y - left.y
  const span = Math.hypot(dx, dy)
  if (span < 10) return null
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2, width: span * 1.85, angle: Math.max(-0.6, Math.min(0.6, Math.atan2(dy, dx))) }
}

export function smoothAnchor(previous: GarmentAnchor | null, next: GarmentAnchor, alpha = 0.28): GarmentAnchor {
  if (!previous) return next
  return { x: previous.x + (next.x - previous.x) * alpha, y: previous.y + (next.y - previous.y) * alpha, width: previous.width + (next.width - previous.width) * alpha, angle: previous.angle + (next.angle - previous.angle) * alpha }
}

/** Quita sólo el fondo claro conectado a los bordes; no elimina blancos internos. */
export async function cutoutLightBackground(url: string): Promise<string> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = url
  await img.decode()
  const scale = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('No se pudo preparar la imagen')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const w = canvas.width, h = canvas.height, pixels = data.data
  const visited = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  let head = 0, tail = 0
  function enqueue(index: number) {
    if (visited[index]) return
    visited[index] = 1
    const i = index * 4
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
    if (r >= 220 && g >= 220 && b >= 220 && Math.max(r, g, b) - Math.min(r, g, b) < 22) queue[tail++] = index
  }
  for (let x = 0; x < w; x++) { enqueue(x); enqueue((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { enqueue(y * w); enqueue(y * w + w - 1) }
  while (head < tail) {
    const p = queue[head++]
    pixels[p * 4 + 3] = 0
    const x = p % w, y = Math.floor(p / w)
    if (x > 0) enqueue(p - 1)
    if (x < w - 1) enqueue(p + 1)
    if (y > 0) enqueue(p - w)
    if (y < h - 1) enqueue(p + w)
  }
  if (tail < w * h * 0.05) throw new Error('La foto no tiene un fondo claro adecuado para el recorte automático')
  ctx.putImageData(data, 0, 0)
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (pixels[(y * w + x) * 4 + 3] > 0) {
      minX = Math.min(minX, x); minY = Math.min(minY, y)
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
    }
  }
  if (maxX < minX || maxY < minY) throw new Error('No se pudo identificar la prenda')
  const cropped = document.createElement('canvas')
  cropped.width = maxX - minX + 1; cropped.height = maxY - minY + 1
  cropped.getContext('2d')!.drawImage(canvas, minX, minY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height)
  return cropped.toDataURL('image/png')
}
