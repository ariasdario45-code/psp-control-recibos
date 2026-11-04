/**
 * Preprocesamiento de imagen profesional (Inspirado en Lovable)
 * - Escala lado corto a 2000px
 * - Contraste suave (1.1)
 * - Prueba rotación 90° si es vertical
 */

export class ImageProcessor {
  static async process(file: File): Promise<{ src: string; grados: number }[]> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()
      
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      
      img.onload = () => {
        try {
          const corto = Math.min(img.naturalWidth, img.naturalHeight)
          const largo = Math.max(img.naturalWidth, img.naturalHeight)
          const escala = Math.min(Math.max(1, 2000 / corto), 4000 / largo)
          const w = Math.round(img.naturalWidth * escala)
          const h = Math.round(img.naturalHeight * escala)
          
          const render = (grados: number) => {
            const c = document.createElement('canvas')
            const rot = grados % 180 !== 0
            c.width = rot ? h : w
            c.height = rot ? w : h
            const ctx = c.getContext('2d')!
            ctx.filter = 'contrast(1.1)'
            ctx.translate(c.width / 2, c.height / 2)
            ctx.rotate((grados * Math.PI) / 180)
            ctx.drawImage(img, -w / 2, -h / 2, w, h)
            return { src: c.toDataURL('image/png'), grados }
          }
          
          const out = [render(0)]
          if (h > w) out.push(render(90)) // Agregar variante vertical si es necesario
          
          resolve(out)
        } catch (e) {
          console.warn('[OCR] Preprocesamiento falló, usando original:', e)
          resolve([{ src: img.src, grados: 0 }])
        }
      }
      
      img.onerror = reject
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}