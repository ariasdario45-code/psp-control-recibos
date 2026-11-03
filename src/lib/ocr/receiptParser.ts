export interface ExtractedData {
  numeroRecibo?: string
  fecha?: string
  motonave?: string
  proveedor?: string
  equipo?: string
  horaInicio?: string
  horaFinal?: string
  operador?: string
  tipoCarga?: string
  observaciones?: string
  confidence: {
    numeroRecibo: number
    fecha: number
    motonave: number
    equipo: number
    horas: number
  }
}

export class ReceiptParser {
  static parse(text: string, confidence: number): ExtractedData {
    const result: ExtractedData = {
      confidence: {
        numeroRecibo: 0,
        fecha: 0,
        motonave: 0,
        equipo: 0,
        horas: 0,
      },
    }

    // 1. Número de recibo (texto rojo grande)
    const reciboMatch = text.match(/\b(\d{4,6})\b/)
    if (reciboMatch) {
      result.numeroRecibo = reciboMatch[1]
      result.confidence.numeroRecibo = 95
    }

    // 2. Fecha
    const fechaMatch = text.match(/\b(\d{2}[-/]\d{2}[-/]\d{2,4})\b/)
    if (fechaMatch) {
      result.fecha = this.normalizeDate(fechaMatch[1])
      result.confidence.fecha = 85
    }

    // 3. Motonave
    const motonaveMatch = text.match(/(?:Motonave|No\.\s*de\s*Recalada)[:\s]*([A-Z0-9\s]{3,30})/i)
    if (motonaveMatch) {
      result.motonave = motonaveMatch[1].trim()
      result.confidence.motonave = 75
    }

    // 4. Equipo
    const equipoMatch = text.match(/\b(\d{4})\b/)
    if (equipoMatch && equipoMatch[1] !== result.numeroRecibo) {
      result.equipo = equipoMatch[1]
      result.confidence.equipo = 80
    }

    // 5. Horas
    const horasMatch = text.match(/\b(\d{1,2}:\d{2})\s+[-/]\s+(\d{1,2}:\d{2})\b/)
    if (horasMatch) {
      result.horaInicio = horasMatch[1]
      result.horaFinal = horasMatch[2]
      result.confidence.horas = 85
    }

    // 6. Tipo de carga
    const tiposCarga = ['MAIZ', 'TRIGO', 'FRIJOL', 'GLUTEN', 'TORTA', 'ARROZ',
      'FERTILIZANTE', 'DESTILADO', 'P. INDUSTRIAL', 'COQUE', 'ACERO',
      'TUBERIA', 'BARREDURAS', 'COOKIE', 'CONTENEDORES', 'CARGA GENERAL']

    for (const tipo of tiposCarga) {
      if (text.toUpperCase().includes(tipo)) {
        result.tipoCarga = tipo
        break
      }
    }

    // 7. Observaciones
    const obsMatch = text.match(/Observaciones[:\s]*([^\n]{5,100})/i)
    if (obsMatch) {
      result.observaciones = obsMatch[1].trim()
    }

    return result
  }

  private static normalizeDate(dateStr: string): string {
    const parts = dateStr.split(/[-/]/)
    if (parts.length === 3) {
      let [day, month, year] = parts
      if (year.length === 2) year = `20${year}`
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    return dateStr
  }
}