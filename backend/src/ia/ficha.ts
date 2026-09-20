type ProductoFicha = {
  nombre: string
  descripcion: string
  categoria: string
  ocasion: string
  precioBase: { toString(): string } | string | number
  variantes: { talla: string; color: string }[]
}

export function responderFicha(producto: ProductoFicha, pregunta: string) {
  const q = pregunta.toLowerCase()
  const tallas = [...new Set(producto.variantes.map((v) => v.talla))].join(', ')
  const colores = [...new Set(producto.variantes.map((v) => v.color))].join(', ')
  const precio = Number(producto.precioBase).toFixed(2)

  if (/\b(precio|cuesta|vale|cuánto|cuanto)\b/.test(q)) {
    return {
      respuesta: `${producto.nombre} cuesta Bs ${precio}.`,
      fuente: 'precioBase',
    }
  }
  if (/\b(talla|talle|medida|size)\b/.test(q)) {
    return {
      respuesta: tallas
        ? `${producto.nombre} está en tallas ${tallas}.`
        : 'Esta prenda aún no tiene tallas cargadas.',
      fuente: 'variantes.talla',
    }
  }
  if (/\b(color|colores)\b/.test(q)) {
    return {
      respuesta: colores
        ? `Colores disponibles: ${colores}.`
        : 'No hay colores cargados.',
      fuente: 'variantes.color',
    }
  }
  if (/\b(ocasi[oó]n|usar|combin|trabajo|fiesta|casual)\b/.test(q)) {
    return {
      respuesta: `Es de categoría ${producto.categoria}, pensada para ocasión ${producto.ocasion}.`,
      fuente: 'ocasion',
    }
  }
  if (/\b(material|cuidado|lavar|tela)\b/.test(q)) {
    return {
      respuesta:
        producto.descripcion ||
        'No hay ficha de material. Preguntá en tienda o al admin que complete la descripción.',
      fuente: 'descripcion',
    }
  }

  return {
    respuesta: `${producto.nombre}: ${producto.categoria} / ${producto.ocasion}, Bs ${precio}. ${
      producto.descripcion || 'Sin descripción extra.'
    } Tallas: ${tallas || '—'}. Colores: ${colores || '—'}.`,
    fuente: 'ficha',
  }
}
