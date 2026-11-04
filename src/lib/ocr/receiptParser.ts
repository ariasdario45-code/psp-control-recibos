export interface ExtractedData {
  numeroRecibo?: string
  fecha?: string
  proveedor?: string
  motonave?: string
  equipo?: string
  horaInicio?: string
  horaFinal?: string
  detenciones?: string
  operador?: string
  tipoCarga?: string
  observaciones?: string
  confidence: {
    numeroRecibo: number
    fecha: number
    proveedor: number
    motonave: number
    equipo: number
    horas: number
    detenciones: number
    operador: number
    tipoCarga: number
  }
}

export class ReceiptParser {
  static parse(text: string, confidence: number): ExtractedData {
    const result: ExtractedData = {
      confidence: {
        numeroRecibo: 0,
        fecha: 0,
        proveedor: 0,
        motonave: 0,
        equipo: 0,
        horas: 0,
        detenciones: 0,
        operador: 0,
        tipoCarga: 0,
      },
    }

    const upperText = text.toUpperCase()
    console.log('🔍 Texto OCR completo:', text)
    console.log('🔍 Texto en mayúsculas:', upperText)

    // 1. NÚMERO DE RECIBO (5 dígitos en esquina superior derecha)
    // Patrón: busca 5 dígitos consecutivos, preferiblemente al inicio
    const reciboPatterns = [
      /^(\d{5})/,  // Al inicio del texto
      /(\d{5})/,   // En cualquier parte
    ]
    for (const pattern of reciboPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.numeroRecibo = match[1]
        result.confidence.numeroRecibo = 85
        console.log('✅ N° Recibo:', result.numeroRecibo)
        break
      }
    }

    // 2. FECHA (formatos: 3/11/26, 03/11/26, 3-11-26, 03 NOV 2026)
    const fechaPatterns = [
      /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,  // 3/11/26 o 03-11-26
      /(\d{1,2}\s+(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\.?\s*\d{2,4})/i,  // 03 NOV 2026
    ]
    for (const pattern of fechaPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.fecha = this.normalizeDate(match[1])
        result.confidence.fecha = 85
        console.log('✅ Fecha:', result.fecha)
        break
      }
    }

    // 3. PROVEEDOR (busca "Cargo Port" o "CARGO PORT")
    if (upperText.includes('CARGO') && upperText.includes('PORT')) {
      result.proveedor = 'CARGO PORT'
      result.confidence.proveedor = 95
      console.log('✅ Proveedor:', result.proveedor)
    } else if (upperText.includes('CARGO')) {
      result.proveedor = 'CARGO PORT'
      result.confidence.proveedor = 80
      console.log('✅ Proveedor (parcial):', result.proveedor)
    }

    // 4. MOTONAVE (después de "Motonave:" o "MOTO NAVE")
    // Patrones reales: "Great fortune", "HONG RUN 16", "ECE NOR BAYAKTAR"
    const motonavePatterns = [
      /Motonave[:\s]+([A-Za-z\s]{5,40})/i,
      /MOTO\s+NAVE[:\s]+([A-Za-z\s]{5,40})/i,
      /(Great\s+Fortune)/i,
      /(HONG\s+RUN\s+\d+)/i,
      /(ECE\s+NOR\s+\w+)/i,
      /(CCE\s+NOR)/i,
    ]
    for (const pattern of motonavePatterns) {
      const match = text.match(pattern)
      if (match) {
        result.motonave = match[1].trim()
        result.confidence.motonave = 75
        console.log('✅ Motonave:', result.motonave)
        break
      }
    }

    // 5. TIPO DE CARGA (checkbox marcado)
    const tiposCarga = [
      { nombre: 'ACERO', patterns: [/ACERO/i, /acer/i] },
      { nombre: 'MAIZ', patterns: [/MAIZ/i, /MAÍZ/i] },
      { nombre: 'TRIGO', patterns: [/TRIGO/i] },
      { nombre: 'ARROZ', patterns: [/ARROZ/i] },
      { nombre: 'FERTILIZANTE', patterns: [/FERTILIZANTE/i] },
      { nombre: 'COOKIE', patterns: [/COOKIE/i] },
      { nombre: 'COQUE', patterns: [/COQUE/i] },
      { nombre: 'TORTA', patterns: [/TORTA/i] },
      { nombre: 'GLUTEN', patterns: [/GLUTEN/i] },
      { nombre: 'DESTILADO', patterns: [/DESTILADO/i] },
      { nombre: 'P. INDUSTRIAL', patterns: [/P\.\s*INDUSTRIAL/i] },
      { nombre: 'TUBERIA', patterns: [/TUBERIA/i] },
      { nombre: 'BARREDURAS', patterns: [/BARREDURAS/i] },
      { nombre: 'CONTENEDORES', patterns: [/CONTENEDORES/i] },
      { nombre: 'CARGA GENERAL', patterns: [/CARGA GENERAL/i] },
    ]
    
    for (const tipo of tiposCarga) {
      for (const pattern of tipo.patterns) {
        if (pattern.test(text)) {
          result.tipoCarga = tipo.nombre
          result.confidence.tipoCarga = 90
          console.log('✅ Tipo Carga:', result.tipoCarga)
          break
        }
      }
      if (result.tipoCarga) break
    }

    // 6. EQUIPO (formato: TC-02, CL-1611, 1608, etc.)
    // Busca patrones como "TC-02", "TC 02", "CL-1611", "1608"
    const equipoPatterns = [
      /(TC[-\s]?\d{2})/i,  // TC-02, TC 02, TC02
      /(CL[-\s]?\d{4})/i,  // CL-1611
      /\b(\d{4})\b/,       // 1608
    ]
    for (const pattern of equipoPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.equipo = match[1].trim().toUpperCase()
        result.confidence.equipo = 85
        console.log('✅ Equipo:', result.equipo)
        break
      }
    }

    // 7. HORAS (busca pares de horas en formato HH:MM)
    // Patrones: "7:30 19:30", "07:30 19:30", "7:30" y "19:30" separados
    const horaPatterns = [
      /(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/,  // 7:30 19:30
      /(\d{1,2}:\d{2})/,  // Una sola hora
    ]
    
    const horasEncontradas: string[] = []
    for (const pattern of horaPatterns) {
      const matches = text.matchAll(new RegExp(pattern.source, 'g'))
      for (const match of matches) {
        horasEncontradas.push(match[1])
      }
    }
    
    if (horasEncontradas.length >= 2) {
      result.horaInicio = this.normalizeTime(horasEncontradas[0])
      result.horaFinal = this.normalizeTime(horasEncontradas[1])
      result.confidence.horas = 90
      console.log('✅ Horas:', result.horaInicio, '-', result.horaFinal)
    } else if (horasEncontradas.length === 1) {
      result.horaInicio = this.normalizeTime(horasEncontradas[0])
      result.confidence.horas = 70
      console.log('✅ Hora Inicio:', result.horaInicio)
    }

    // 8. DETENCIONES (busca "1H", "1 HR", "1 HORA")
    const detencionesPatterns = [
      /(1\s*H\s*(?:ALIMENTO|HSEQ|ALIM))/i,
      /(1\s*HR\s*\w+)/i,
      /(1\s*HORA\s*\w+)/i,
      /(\d+\s*H\s*\w+)/i,
    ]
    for (const pattern of detencionesPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.detenciones = match[1].trim().toUpperCase()
        result.confidence.detenciones = 85
        console.log('✅ Detenciones:', result.detenciones)
        break
      }
    }

    // 9. OPERADOR (después de "Nombre:")
    const operadorPatterns = [
      /Nombre[:\s]+([A-Za-z\s]{5,40})/i,
      /(Genes\s+\w+)/i,
      /(Martin\s+\w+)/i,
      /(David\s+\w+)/i,
      /(Joel\s+\w+)/i,
      /(Leonardo\s+\w+)/i,
    ]
    for (const pattern of operadorPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.operador = match[1].trim()
        result.confidence.operador = 75
        console.log('✅ Operador:', result.operador)
        break
      }
    }

    console.log('📊 Resultado final:', result)
    return result
  }

  private static normalizeDate(dateStr: string): string {
    const monthMap: { [key: string]: string } = {
      'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
      'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
    }
    
    // Formato: 03 NOV 2026
    const monthMatch = dateStr.match(/(\d{1,2})\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\.?\s*(\d{2,4})/i)
    if (monthMatch) {
      const day = monthMatch[1].padStart(2, '0')
      const month = monthMap[monthMatch[2].toUpperCase()]
      let year = monthMatch[3]
      if (year.length === 2) year = `20${year}`
      return `${year}-${month}-${day}`
    }
    
    // Formato: 3/11/26 o 03-11-26
    const parts = dateStr.split(/[-/]/)
    if (parts.length === 3) {
      let [day, month, year] = parts
      if (year.length === 2) year = `20${year}`
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    return dateStr
  }

  private static normalizeTime(timeStr: string): string {
    const parts = timeStr.split(':')
    if (parts.length === 2) {
      const [hours, minutes] = parts
      return `${hours.padStart(2, '0')}:${minutes}`
    }
    return timeStr
  }
}