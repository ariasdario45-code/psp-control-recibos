/**
 * Catálogo estático de datos que NO cambian frecuentemente
 * - Tipos de carga
 * - Fases
 * - Formatos de fecha/hora
 * - Patrones de equipos
 * - Palabras clave del recibo COREMAR
 */

// ============================================
// TIPOS DE CARGA (estático - no cambia)
// ============================================
export interface TipoCargaItem {
  id: string
  nombre: string
  sinonimos: string[]
  keywords: string[]
}

export const tiposCargaCatalogo: TipoCargaItem[] = [
  { 
    id: 'ACERO', 
    nombre: 'ACERO',
    sinonimos: ['ACER', 'STEEL', 'ACERO', 'ACR', 'ASERO'],
    keywords: ['ACERO', 'STEEL']
  },
  { 
    id: 'MAIZ', 
    nombre: 'MAIZ',
    sinonimos: ['MAÍZ', 'CORN', 'MAIZ', 'MAIZ'],
    keywords: ['MAIZ', 'MAÍZ', 'CORN']
  },
  { 
    id: 'TRIGO', 
    nombre: 'TRIGO',
    sinonimos: ['TRIGO', 'WHEAT'],
    keywords: ['TRIGO', 'WHEAT']
  },
  { 
    id: 'ARROZ', 
    nombre: 'ARROZ',
    sinonimos: ['ARROZ', 'RICE', 'AROZ'],
    keywords: ['ARROZ', 'RICE']
  },
  { 
    id: 'FERTILIZANTE', 
    nombre: 'FERTILIZANTE',
    sinonimos: ['FERTILIZANTE', 'FERTILIZAN', 'FERTILIZER', 'FERTILIZAN'],
    keywords: ['FERTILIZANTE', 'FERTILIZER']
  },
  { 
    id: 'DESTILADO', 
    nombre: 'DESTILADO',
    sinonimos: ['DESTILADO', 'DESTILAD', 'DISTILLATE'],
    keywords: ['DESTILADO', 'DISTILLATE']
  },
  { 
    id: 'P. INDUSTRIAL', 
    nombre: 'P. INDUSTRIAL',
    sinonimos: ['P. INDUSTRIAL', 'PINDUSTRIAL', 'PRODUCTO INDUSTRIAL'],
    keywords: ['P. INDUSTRIAL', 'PINDUSTRIAL']
  },
  { 
    id: 'COQUE', 
    nombre: 'COQUE',
    sinonimos: ['COQUE', 'COAL', 'COAUE', 'COKE'],
    keywords: ['COQUE', 'COAL', 'COKE']
  },
  { 
    id: 'TORTA', 
    nombre: 'TORTA',
    sinonimos: ['TORTA', 'CAKE'],
    keywords: ['TORTA', 'CAKE']
  },
  { 
    id: 'GLUTEN', 
    nombre: 'GLUTEN',
    sinonimos: ['GLUTEN'],
    keywords: ['GLUTEN']
  },
  { 
    id: 'TUBERIA', 
    nombre: 'TUBERIA',
    sinonimos: ['TUBERIA', 'TUBERÍA', 'PIPES', 'TUBOS'],
    keywords: ['TUBERIA', 'TUBERÍA', 'PIPES']
  },
  { 
    id: 'BARREDURAS', 
    nombre: 'BARREDURAS',
    sinonimos: ['BARREDURAS', 'SWEEPS'],
    keywords: ['BARREDURAS', 'SWEEPS']
  },
  { 
    id: 'COOKIE', 
    nombre: 'COOKIE',
    sinonimos: ['COOKIE', 'COOKIES'],
    keywords: ['COOKIE', 'COOKIES']
  },
  { 
    id: 'CONTENEDORES', 
    nombre: 'CONTENEDORES',
    sinonimos: ['CONTENEDORES', 'CONTENEDOR', 'CONTAINERS'],
    keywords: ['CONTENEDOR', 'CONTAINERS']
  },
  { 
    id: 'CARGA GENERAL', 
    nombre: 'CARGA GENERAL',
    sinonimos: ['CARGA GENERAL', 'GENERAL CARGO'],
    keywords: ['CARGA GENERAL', 'GENERAL CARGO']
  },
]

// ============================================
// FASES (estático - no cambia)
// ============================================
export interface FaseItem {
  id: string
  nombre: string
  sinonimos: string[]
}

export const fasesCatalogo: FaseItem[] = [
  { 
    id: '1RA FASE', 
    nombre: '1RA FASE', 
    sinonimos: ['1RA FASE', 'PRIMERA FASE', '1 FASE', 'FASE 1', '1RA'] 
  },
  { 
    id: '2DA FASE', 
    nombre: '2DA FASE', 
    sinonimos: ['2DA FASE', 'SEGUNDA FASE', '2 FASE', 'FASE 2', '2DA'] 
  },
]

// ============================================
// PATRONES DE EQUIPOS (formatos, no nombres específicos)
// ============================================
export interface PatronEquipo {
  formato: string
  regex: RegExp
  descripcion: string
}

export const patronesEquipos: PatronEquipo[] = [
  { formato: 'TC-XX', regex: /TC[-\s]?\d{2}/i, descripcion: 'Tractocamión' },
  { formato: 'CL-XXXX', regex: /CL[-\s]?\d{4}/i, descripcion: 'Cargador' },
  { formato: 'EL-XXXX', regex: /EL[-\s]?\d{4}/i, descripcion: 'Elevador' },
  { formato: 'GR-XXXX', regex: /GR[-\s]?\d{4}/i, descripcion: 'Grúa' },
  { formato: 'XXXX (4 dígitos)', regex: /\b\d{4}\b/, descripcion: 'Equipo genérico' },
]

// ============================================
// FORMATOS DE FECHA (estático)
// ============================================
export interface FormatoFecha {
  regex: RegExp
  formato: string
}

export const formatosFecha: FormatoFecha[] = [
  { regex: /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/, formato: 'DD-MM-YY o DD-MM-YYYY' },
  { regex: /(\d{1,2}\s+(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\.?\s*\d{2,4})/i, formato: 'DD MES YYYY' },
]

// ============================================
// FORMATOS DE HORA (estático)
// ============================================
export interface FormatoHora {
  regex: RegExp
  formato: string
}

export const formatosHora: FormatoHora[] = [
  { regex: /(\d{1,2}:\d{2})/, formato: 'H:MM o HH:MM' },
]

// ============================================
// PALABRAS CLAVE DEL RECIBO COREMAR (estático)
// ============================================
export const palabrasClaveRecibo = {
  numeroRecibo: ['ORDEN DE SERVICIO', 'No.', 'N°', 'NUMERO'],
  fecha: ['Fecha de solicitud', 'Fecha', 'FECHA'],
  proveedor: ['Proveedor', 'Pvendor', 'PROVEEDOR'],
  motonave: ['Motonave', 'MOTO NAVE', 'DATOS DE LA MOTO NAVE', 'MOTONAVE'],
  tipoCarga: ['TIPO DE PRODUCTO', 'TIPO DE CARGA', 'PRODUCTO'],
  equipo: ['EQUIPO', 'EQUIP', 'EQUIPO'],
  horaInicio: ['HORA INICIO', 'HORA INICIAL', 'H.INICIO'],
  horaFinal: ['HORA FINAL', 'HORA FIN', 'H.FINAL'],
  detenciones: ['DETENCIONES', 'DETENCION', 'DETENCIONES'],
  operador: ['DATOS DE QUIEN PRESTA EL SERVICIO', 'Nombre', 'FIRMA DEL REPRESENTANTE', 'NOMBRE'],
  observaciones: ['OBSERVACIONES', 'OBSERVACIÓN', 'OBSERVACION'],
}

// ============================================
// PATRONES DE DETENCIONES (estático)
// ============================================
export const patronesDetenciones: RegExp[] = [
  /(\d+\s*(?:HORA|HR|HORAS)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,30})/i,
  /(1\s*HORA\s*ALIMENTO)/i,
  /(1\s*HR\s*HSEQ)/i,
  /(\d+\s*HR\s*\w+)/i,
]

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Buscar tipo de carga en el catálogo estático
 */
export function buscarTipoCarga(textoOCR: string): { nombre: string, confianza: number } | null {
  const upperText = textoOCR.toUpperCase()
  
  for (const tipo of tiposCargaCatalogo) {
    // Búsqueda exacta por keywords
    for (const keyword of tipo.keywords) {
      if (upperText.includes(keyword.toUpperCase())) {
        return { nombre: tipo.nombre, confianza: 95 }
      }
    }
    
    // Búsqueda por sinónimos
    for (const sinonimo of tipo.sinonimos) {
      if (upperText.includes(sinonimo.toUpperCase())) {
        return { nombre: tipo.nombre, confianza: 85 }
      }
    }
  }
  
  return null
}

/**
 * Buscar fase en el catálogo estático
 */
export function buscarFase(textoOCR: string): { nombre: string, confianza: number } | null {
  const upperText = textoOCR.toUpperCase()
  
  for (const fase of fasesCatalogo) {
    for (const sinonimo of fase.sinonimos) {
      if (upperText.includes(sinonimo.toUpperCase())) {
        return { nombre: fase.nombre, confianza: 90 }
      }
    }
  }
  
  return null
}

/**
 * Detectar formato de equipo en el texto
 */
export function detectarFormatoEquipo(textoOCR: string): { formato: string, valor: string, confianza: number } | null {
  for (const patron of patronesEquipos) {
    const match = textoOCR.match(patron.regex)
    if (match) {
      return { 
        formato: patron.formato, 
        valor: match[0].toUpperCase(), 
        confianza: 75 
      }
    }
  }
  
  return null
}

/**
 * Extraer fecha del texto
 */
export function extraerFecha(textoOCR: string): { fecha: string, confianza: number } | null {
  for (const formato of formatosFecha) {
    const match = textoOCR.match(formato.regex)
    if (match) {
      return { fecha: match[1], confianza: 85 }
    }
  }
  
  return null
}

/**
 * Extraer hora del texto
 */
export function extraerHora(textoOCR: string): { hora: string, confianza: number } | null {
  for (const formato of formatosHora) {
    const match = textoOCR.match(formato.regex)
    if (match) {
      return { hora: match[1], confianza: 85 }
    }
  }
  
  return null
}

/**
 * Extraer detenciones del texto
 */
export function extraerDetenciones(textoOCR: string): { detenciones: string, confianza: number } | null {
  for (const patron of patronesDetenciones) {
    const match = textoOCR.match(patron)
    if (match) {
      return { detenciones: match[1].trim().toUpperCase(), confianza: 85 }
    }
  }
  
  return null
}