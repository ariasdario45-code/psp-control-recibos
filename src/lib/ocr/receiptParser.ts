/**
 * Parser profesional de recibos COREMAR con arquitectura tipo Lovable
 * - Extracción dirigida por rótulos
 * - Patrones regex de respaldo
 * - Sistema de scoring y respaldo de campos
 */

import { buscarTipoCarga, detectarFormatoEquipo, extraerDetenciones } from './local/catalogo-estatico'
import { buscarMotonaveEnBD, buscarEquipoEnBD, buscarOperadorEnBD } from './local/busquedaDinamica'

// ============================================
// INTERFACES (Mantenemos la que ya usa la app)
// ============================================

export interface CampoRespaldo {
  valor: string | null
  texto_original: string | null
  confianza: 'alta' | 'media' | 'baja' | null
  requiere_revision: boolean
}

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
    observaciones: number
  }
  texto_crudo?: string
  verificar?: string[]
  respaldo_campos?: Record<string, CampoRespaldo>
}

// ============================================
// DICCIONARIO Y RÓTULOS (Arquitectura Lovable)
// ============================================

const ROTULOS_CAMPO: Record<string, string[]> = {
  numeroRecibo: ["ORDEN DE SERVICIO", "No.", "N°", "NUMERO", "RECIBO"],
  fecha: ["Fecha de solicitud", "Fecha", "FECHA"],
  proveedor: ["Proveedor", "Pvendor", "PROVEEDOR"],
  motonave: ["Motonave", "MOTO NAVE", "DATOS DE LA MOTO NAVE", "MOTONAVE"],
  tipoCarga: ["TIPO DE PRODUCTO", "TIPO DE CARGA", "PRODUCTO", "CARGA"],
  equipo: ["EQUIPO", "EQUIP", "EQUIPMENT"],
  horaInicio: ["HORA INICIO", "HORA INICIAL", "H.INICIO"],
  horaFinal: ["HORA FINAL", "HORA FIN", "H.FINAL"],
  detenciones: ["DETENCIONES", "DETENCION", "STOPPAGES"],
  operador: ["DATOS DE QUIEN PRESTA EL SERVICIO", "Nombre", "FIRMA DEL REPRESENTANTE", "NOMBRE"],
  observaciones: ["OBSERVACIONES", "OBSERVACIÓN", "OBSERVACION"]
}

const PATRONES = {
  numeroRecibo: /\b(\d{5})\b/,
  fecha: /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,
  hora: /(\d{1,2}:\d{2})/,
  detenciones: /(\d+\s*(?:HORA|HR|HORAS)\s*[A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,30})/i,
  operador: /Nombre[:\s]+([A-Za-z\s]{5,40})/i,
  observaciones: /OBSERVACIONES[:\s]+([^\n]{5,100})/i
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function crearRespaldo(valor: string | null, original: string | null, score: number): CampoRespaldo {
  return {
    valor: valor,
    texto_original: original,
    confianza: score >= 90 ? 'alta' : score > 70 ? 'media' : 'baja',
    requiere_revision: score < 90
  }
}

function extraerPorRotulo(texto: string, campo: keyof typeof ROTULOS_CAMPO): { valor: string | null; original: string | null } {
  for (const rotulo of ROTULOS_CAMPO[campo] ?? []) {
    const re = new RegExp(
      `(?:^|[\\s|;])${rotulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:NO\\.?|N[º°]\\.?|#)?\\s*[:：=]?\\s*([^\\n|;]+)`,
      "i"
    )
    const m = texto.match(re)
    if (!m?.[1]) continue
    const valor = m[1].replace(/[|;.\s]+$/, "").trim()
    if (!valor || valor.length < 2 || !/[\p{L}\d]/u.test(valor)) continue
    // Evitar que el valor sea otro rótulo
    if (Object.values(ROTULOS_CAMPO).flat().some((r) => new RegExp(`^${r}$`, "i").test(valor))) continue
    return { valor: valor.toUpperCase(), original: m[0].trim() }
  }
  return { valor: null, original: null }
}

function extraerCampoRegex(texto: string, patron: RegExp): { valor: string | null; original: string | null } {
  const match = texto.match(patron)
  if (match) {
    for (let i = 1; i < match.length; i++) {
      if (match[i] !== undefined && match[i].trim() !== '') {
        return { valor: match[i].trim(), original: match[0].trim() }
      }
    }
    return { valor: match[0].trim(), original: match[0].trim() }
  }
  return { valor: null, original: null }
}

// ============================================
// CLASE PRINCIPAL (Compatible con la app)
// ============================================

export class ReceiptParser {
  static async parse(texto: string, _confianzaOCR: number): Promise<ExtractedData> {
    const resultado: ExtractedData = {
      confidence: {
        numeroRecibo: 0, fecha: 0, proveedor: 0, motonave: 0,
        equipo: 0, horas: 0, detenciones: 0, operador: 0, tipoCarga: 0, observaciones: 0,
      },
      texto_crudo: texto,
      verificar: [],
      respaldo_campos: {}
    }

    // 1. NÚMERO DE RECIBO
    const nrRot = extraerPorRotulo(texto, 'numeroRecibo')
    const nrPat = extraerCampoRegex(texto, PATRONES.numeroRecibo)
    const nr = nrRot.valor ? nrRot : nrPat
    resultado.numeroRecibo = nr.valor || undefined
    resultado.confidence.numeroRecibo = nr.valor ? 90 : 0
    if (resultado.respaldo_campos) resultado.respaldo_campos['numeroRecibo'] = crearRespaldo(nr.valor, nr.original, nr.valor ? 90 : 0)
    if (nr.valor && resultado.verificar) resultado.verificar.push('numeroRecibo')

    // 2. FECHA
    const fechaRot = extraerPorRotulo(texto, 'fecha')
    const fechaPat = extraerCampoRegex(texto, PATRONES.fecha)
    const fecha = fechaRot.valor ? fechaRot : fechaPat
    if (fecha.valor) {
      resultado.fecha = this.normalizeDate(fecha.valor)
      resultado.confidence.fecha = 85
      if (resultado.respaldo_campos) resultado.respaldo_campos['fecha'] = crearRespaldo(resultado.fecha, fecha.original, 85)
      if (resultado.verificar) resultado.verificar.push('fecha')
    }

    // 3. PROVEEDOR
    const provRot = extraerPorRotulo(texto, 'proveedor')
    if (provRot.valor || (texto.toUpperCase().includes('CARGO') && texto.toUpperCase().includes('PORT'))) {
      resultado.proveedor = 'CARGO PORT'
      resultado.confidence.proveedor = 95
      if (resultado.respaldo_campos) resultado.respaldo_campos['proveedor'] = crearRespaldo('CARGO PORT', provRot.original || 'CARGO PORT', 95)
    } else if (provRot.valor) {
      resultado.proveedor = provRot.valor
      resultado.confidence.proveedor = 70
      if (resultado.respaldo_campos) resultado.respaldo_campos['proveedor'] = crearRespaldo(provRot.valor, provRot.original, 70)
      if (resultado.verificar) resultado.verificar.push('proveedor')
    }

    // 4. MOTONAVE
    const mnRot = extraerPorRotulo(texto, 'motonave')
    if (mnRot.valor) {
      const busqueda = await buscarMotonaveEnBD(mnRot.valor)
      resultado.motonave = busqueda.encontrado ? busqueda.nombre : mnRot.valor
      resultado.confidence.motonave = busqueda.encontrado ? busqueda.confianza : 60
      if (resultado.respaldo_campos) resultado.respaldo_campos['motonave'] = crearRespaldo(resultado.motonave, mnRot.original, resultado.confidence.motonave)
      if (resultado.verificar && resultado.confidence.motonave < 90) resultado.verificar.push('motonave')
    }

    // 5. TIPO DE CARGA
    const tc = buscarTipoCarga(texto)
    if (tc) {
      resultado.tipoCarga = tc.nombre
      resultado.confidence.tipoCarga = tc.confianza
      if (resultado.respaldo_campos) resultado.respaldo_campos['tipoCarga'] = crearRespaldo(tc.nombre, tc.nombre, tc.confianza)
    }

    // 6. EQUIPO
    const eq = detectarFormatoEquipo(texto)
    if (eq) {
      const busqueda = await buscarEquipoEnBD(eq.valor)
      resultado.equipo = busqueda.encontrado ? busqueda.nombre : eq.valor
      resultado.confidence.equipo = busqueda.encontrado ? busqueda.confianza : 60
      if (resultado.respaldo_campos) resultado.respaldo_campos['equipo'] = crearRespaldo(resultado.equipo, eq.valor, resultado.confidence.equipo)
      if (resultado.verificar && resultado.confidence.equipo < 90) resultado.verificar.push('equipo')
    }

    // 7. HORAS
    const hiRot = extraerPorRotulo(texto, 'horaInicio')
    const hfRot = extraerPorRotulo(texto, 'horaFinal')
    const horasPat = extraerCampoRegex(texto, /(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/)
    
    if (horasPat.valor && horasPat.original) {
      const partes = horasPat.valor.split(/\s+/)
      resultado.horaInicio = this.normalizeTime(partes[0])
      resultado.horaFinal = this.normalizeTime(partes[1])
      resultado.confidence.horas = 90
      if (resultado.respaldo_campos) {
        resultado.respaldo_campos['horaInicio'] = crearRespaldo(resultado.horaInicio, horasPat.original, 90)
        resultado.respaldo_campos['horaFinal'] = crearRespaldo(resultado.horaFinal, horasPat.original, 90)
      }
    } else {
      if (hiRot.valor) {
        resultado.horaInicio = this.normalizeTime(hiRot.valor)
        resultado.confidence.horas = Math.max(resultado.confidence.horas, 70)
        if (resultado.respaldo_campos) resultado.respaldo_campos['horaInicio'] = crearRespaldo(resultado.horaInicio, hiRot.original, 70)
        if (resultado.verificar) resultado.verificar.push('horaInicio')
      }
      if (hfRot.valor) {
        resultado.horaFinal = this.normalizeTime(hfRot.valor)
        resultado.confidence.horas = Math.max(resultado.confidence.horas, 70)
        if (resultado.respaldo_campos) resultado.respaldo_campos['horaFinal'] = crearRespaldo(resultado.horaFinal, hfRot.original, 70)
        if (resultado.verificar) resultado.verificar.push('horaFinal')
      }
    }

    // 8. DETENCIONES
    const det = extraerDetenciones(texto)
    if (det) {
      resultado.detenciones = det.detenciones
      resultado.confidence.detenciones = det.confianza
      if (resultado.respaldo_campos) resultado.respaldo_campos['detenciones'] = crearRespaldo(det.detenciones, det.detenciones, det.confianza)
    }

    // 9. OPERADOR
    const opRot = extraerPorRotulo(texto, 'operador')
    const opPat = extraerCampoRegex(texto, PATRONES.operador)
    const op = opRot.valor ? opRot : opPat
    if (op.valor) {
      const busqueda = await buscarOperadorEnBD(op.valor)
      resultado.operador = busqueda.encontrado ? busqueda.nombre : op.valor
      resultado.confidence.operador = busqueda.encontrado ? busqueda.confianza : 60
      if (resultado.respaldo_campos) resultado.respaldo_campos['operador'] = crearRespaldo(resultado.operador, op.original, resultado.confidence.operador)
      if (resultado.verificar && resultado.confidence.operador < 90) resultado.verificar.push('operador')
    }

    // 10. OBSERVACIONES
    const obs = extraerCampoRegex(texto, PATRONES.observaciones)
    if (obs.valor) {
      resultado.observaciones = obs.valor
      resultado.confidence.observaciones = 75
      if (resultado.respaldo_campos) resultado.respaldo_campos['observaciones'] = crearRespaldo(obs.valor, obs.original, 75)
      if (resultado.verificar) resultado.verificar.push('observaciones')
    }

    console.log('📊 Resultado Parser Profesional:', resultado)
    return resultado
  }

  private static normalizeDate(dateStr: string): string {
    const monthMap: { [key: string]: string } = {
      'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
      'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
    }
    const monthMatch = dateStr.match(/(\d{1,2})\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\.?\s*(\d{2,4})/i)
    if (monthMatch) {
      const day = monthMatch[1].padStart(2, '0')
      const month = monthMap[monthMatch[2].toUpperCase()]
      let year = monthMatch[3]
      if (year.length === 2) year = `20${year}`
      return `${year}-${month}-${day}`
    }
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