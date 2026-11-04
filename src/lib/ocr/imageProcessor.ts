export class ImageProcessor {
  static async process(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()
      
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        // Escalar a tamaño óptimo para OCR (ancho 2000px)
        const maxWidth = 2000
        const scale = Math.min(maxWidth / img.width, 1)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        // Obtener datos de píxeles
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // 1. Convertir a escala de grises (SUAVE)
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
          data[i] = avg
          data[i + 1] = avg
          data[i + 2] = avg
        }
        
        // 2. Aumentar contraste MODERADO (NO binario)
        const contrast = 1.5
        const intercept = 128 * (1 - contrast)
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, data[i] * contrast + intercept))
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * contrast + intercept))
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * contrast + intercept))
        }
        
        ctx.putImageData(imageData, 0, 0)
        
        resolve(canvas.toDataURL('image/png'))
      }
      
      img.onerror = reject
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}