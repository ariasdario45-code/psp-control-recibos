/**
 * Procesador de imágenes para OCR
 * Usa Canvas API nativa (sin dependencias externas)
 */
export class ImageProcessor {
  /**
   * Pipeline completo de preprocesamiento
   */
  static async process(imageFile: File): Promise<string> {
    const base64 = await this.fileToBase64(imageFile)
    const canvas = await this.loadImageToCanvas(base64)
    const processedCanvas = await this.enhanceImage(canvas)
    return processedCanvas.toDataURL('image/png', 0.95)
  }

  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  private static loadImageToCanvas(base64: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 2048
        let width = img.width
        let height = img.height

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas)
      }
      img.onerror = reject
      img.src = base64
    })
  }

  private static async enhanceImage(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    this.grayscale(imageData)
    this.stretchContrast(imageData)
    this.otsuThreshold(imageData)

    ctx.putImageData(imageData, 0, 0)
    return canvas
  }

  private static grayscale(imageData: ImageData): void {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)
      data[i] = data[i + 1] = data[i + 2] = avg
    }
  }

  private static stretchContrast(imageData: ImageData): void {
    const data = imageData.data
    let min = 255, max = 0

    for (let i = 0; i < data.length; i += 4) {
      const val = data[i]
      if (val < min) min = val
      if (val > max) max = val
    }

    const range = max - min
    if (range === 0) return

    for (let i = 0; i < data.length; i += 4) {
      const val = ((data[i] - min) / range) * 255
      data[i] = data[i + 1] = data[i + 2] = val
    }
  }

  private static otsuThreshold(imageData: ImageData): void {
    const data = imageData.data
    const histogram = new Array(256).fill(0)

    for (let i = 0; i < data.length; i += 4) {
      histogram[data[i]]++
    }

    const total = data.length / 4
    let sum = 0
    for (let i = 0; i < 256; i++) sum += i * histogram[i]

    let sumB = 0, wB = 0, wF = 0
    let maxVariance = 0, threshold = 0

    for (let t = 0; t < 256; t++) {
      wB += histogram[t]
      if (wB === 0) continue
      wF = total - wB
      if (wF === 0) break

      sumB += t * histogram[t]
      const mB = sumB / wB
      const mF = (sum - sumB) / wF
      const variance = wB * wF * Math.pow(mB - mF, 2)

      if (variance > maxVariance) {
        maxVariance = variance
        threshold = t
      }
    }

    for (let i = 0; i < data.length; i += 4) {
      const val = data[i] < threshold ? 0 : 255
      data[i] = data[i + 1] = data[i + 2] = val
    }
  }
}