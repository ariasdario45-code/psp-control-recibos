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
    console.log('🔍 Texto recibido para parsear:', text)

    // 1. NÚMERO DE RECIBO (5 dígitos)
    const reciboMatch = text.match(/\b(\d{5})\b/)
    if (reciboMatch) {
      result.numeroRecibo = reciboMatch[1]
      result.confidence.numeroRecibo = 90
      console.log('✅ N° Recibo detectado:', result.numeroRecibo)
    }

    // 2. FECHA (múltiples formatos tolerantes)
    // Busca: "26-10-26", "26/10/26", "2 OCT. 2026", "26 OCT 2026"
    const fechaPatterns = [
      /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,  // 26-10-26
      /(\d{1,2}\s+(?:OCT|NOV|DIC|ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP)\.?\s*\d{2,4})/i,  // 2 OCT. 2026
      /(?:Fecha|FE)[^0-9]*(\d{1,2}[-/]\d{1,2})/i,  // FE 26-10
    ]
    for (const pattern of fechaPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.fecha = this.normalizeDate(match[1])
        result.confidence.fecha = 85
        console.log('✅ Fecha detectada:', result.fecha)
        break
      }
    }

    // 3. PROVEEDOR (busca "CARGO PORT" o "CARGO" y "PORT" separados)
    if (upperText.includes('CARGO') && upperText.includes('PORT')) {
      result.proveedor = 'CARGO PORT'
      result.confidence.proveedor = 95
      console.log('✅ Proveedor detectado:', result.proveedor)
    } else {
      const proveedorMatch = text.match(/(?:Proveedor|Pvendor)[^A-Z]*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,30})/i)
      if (proveedorMatch) {
        result.proveedor = proveedorMatch[1].trim().toUpperCase()
        result.confidence.proveedor = 75
        console.log('✅ Proveedor detectado:', result.proveedor)
      }
    }

    // 4. MOTONAVE (tolerante a errores)
    const motonavePatterns = [
      /HONG\s+RUN\s+\d+/i,
      /HONG\s+BUN\s+\d+/i,
      /ECE\s+NOR\s+\w+/i,
      /CCE\s+NOR/i,
      /Motonave[^A-Z]*([A-ZÁÉÍÓÚÑ0-9\s]{3,40})/i,
    ]
    for (const pattern of motonavePatterns) {
      const match = text.match(pattern)
      if (match) {
        result.motonave = match[0].trim().toUpperCase().replace(/No\..*$/i, '').trim()
        result.confidence.motonave = 80
        console.log('✅ Motonave detectada:', result.motonave)
        break
      }
    }

    // 5. TIPO DE CARGA
    const tiposCarga = [
      { nombre: 'ACERO', patterns: [/ACERO/i, /acer/i] },
      { nombre: 'MAIZ', patterns: [/MAIZ/i, /MAÍZ/i] },
      { nombre: 'TRIGO', patterns: [/TRIGO/i] },
      { nombre: 'ARROZ', patterns: [/ARROZ/i, /aroz/i] },
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
          result.confidence.tipoCarga = 85
          console.log('✅ Tipo de carga detectado:', result.tipoCarga)
          break
        }
      }
      if (result.tipoCarga) break
    }

    // 6. EQUIPO (4 dígitos)
    const equipoMatch = text.match(/\b((?:CL-)?\d{4})\b/)
    if (equipoMatch && equipoMatch[1] !== result.numeroRecibo) {
      result.equipo = equipoMatch[1]
      result.confidence.equipo = 85
      console.log('✅ Equipo detectado:', result.equipo)
    }

    // 7. HORAS (busca CUALQUIER par de horas en el texto)
    // Patrones: "07:30 14:30", "19:30 07:30", "07:35"
    const horaPatterns = [
      /(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/,  // Dos horas juntas
      /(\d{1,2}:\d{2})/,  // Una sola hora
    ]
    for (const pattern of horaPatterns) {
      const match = text.match(pattern)
      if (match) {
        if (match[2]) {
          result.horaInicio = this.normalizeTime(match[1])
          result.horaFinal = this.normalizeTime(match[2])
        } else {
          result.horaInicio = this.normalizeTime(match[1])
        }
        result.confidence.horas = 85
        console.log('✅ Horas detectadas:', result.horaInicio, '-', result.horaFinal)
        break
      }
    }

    // 8. DETENCIONES (busca "HR", "HORA", "1 HR", "1 HORA")
    const detencionesPatterns = [
      /(\d+\s*(?:HORA|HR|HORAS)[^0-9]{3,30})/i,
      /(1\s*HR\s+\w+)/i,
      /(1\s*HORA\s+\w+)/i,
    ]
    for (const pattern of detencionesPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.detenciones = match[1].trim().toUpperCase()
        result.confidence.detenciones = 85
        console.log('✅ Detenciones detectadas:', result.detenciones)
        break
      }
    }

    // 9. OPERADOR (busca nombres comunes o "Nombre:")
    const operadorPatterns = [
      /(?:Nombre|none|Name)[^A-Z]*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]{5,40})/i,
      /(MARTIN\s+\w+)/i,
      /(DAVID\s+\w+)/i,
      /(JOEL\s+\w+)/i,
      /(LEONARDO\s+\w+)/i,
    ]
    for (const pattern of operadorPatterns) {
      const match = text.match(pattern)
      if (match) {
        let operador = match[1].trim()
        operador = operador.replace(/(?:cargo|caro|ope)[^A-Z]*$/i, '').trim()
        if (operador.length > 3 && operador.length < 40) {
          result.operador = operador.toUpperCase()
          result.confidence.operador = 75
          console.log('✅ Operador detectado:', result.operador)
          break
        }
      }
    }

    console.log('📊 Resultado final:', result)
    return result
  }

  private static normalizeDate(dateStr: string): string {
    // Manejar formatos como "2 OCT. 2026"
    const monthMap: { [key: string]: string } = {
      'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
      'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
    }
    
    const monthMatch = dateStr.match(/(\d{1,2})\s+(OCT|NOV|DIC|ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP)\.?\s*(\d{2,4})/i)
    if (monthMatch) {
      const day = monthMatch[1].padStart(2, '0')
      const month = monthMap[monthMatch[2].toUpperCase()]
      let year = monthMatch[3]
      if (year.length === 2) year = `20${year}`
      return `${year}-${month}-${day}`
    }
    
    // Formato numérico: 26-10-26
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