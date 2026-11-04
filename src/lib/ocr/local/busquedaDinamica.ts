/**
 * Búsqueda dinámica en Supabase con Fuzzy Matching
 * - Motonaves (cambian constantemente)
 * - Equipos (cambian ocasionalmente)
 * - Proveedores (cambian ocasionalmente)
 * - Operadores (cambian constantemente)
 * - Estibadores (cambian constantemente)
 */

import { supabase } from '../../supabase'

// ============================================
// ALGORITMO DE SIMILITUD (Levenshtein Distance)
// ============================================

/**
 * Calcula la distancia de Levenshtein entre dos strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[len1][len2]
}

/**
 * Calcula el porcentaje de similitud entre dos strings (0-100)
 */
export function calcularSimilitud(str1: string, str2: string): number {
  const s1 = str1.toUpperCase().trim()
  const s2 = str2.toUpperCase().trim()
  
  if (s1 === s2) return 100
  if (s1.length === 0 || s2.length === 0) return 0
  
  const distancia = levenshteinDistance(s1, s2)
  const maxLen = Math.max(s1.length, s2.length)
  return ((maxLen - distancia) / maxLen) * 100
}

// ============================================
// INTERFACES
// ============================================

export interface ResultadoBusqueda {
  nombre: string
  confianza: number
  encontrado: boolean
}

// ============================================
// BÚSQUEDA DE MOTONAVES
// ============================================

export async function buscarMotonaveEnBD(textoOCR: string): Promise<ResultadoBusqueda> {
  try {
    const { data: naves, error } = await supabase
      .from('naves')
      .select('nombre')
    
    if (error || !naves || naves.length === 0) {
      console.error('❌ Error al buscar motonaves:', error)
      return { nombre: '', confianza: 0, encontrado: false }
    }

    const textoLimpio = textoOCR.toUpperCase().trim()
    
    // Búsqueda exacta
    for (const nave of naves) {
      if (nave.nombre.toUpperCase() === textoLimpio) {
        return { nombre: nave.nombre, confianza: 100, encontrado: true }
      }
    }

    // Búsqueda difusa (fuzzy matching)
    let mejorMatch: ResultadoBusqueda = { nombre: '', confianza: 0, encontrado: false }
    
    for (const nave of naves) {
      const similitud = calcularSimilitud(textoLimpio, nave.nombre)
      if (similitud > mejorMatch.confianza && similitud >= 60) {
        mejorMatch = { nombre: nave.nombre, confianza: similitud, encontrado: true }
      }
    }

    return mejorMatch
  } catch (error) {
    console.error('❌ Error en buscarMotonaveEnBD:', error)
    return { nombre: '', confianza: 0, encontrado: false }
  }
}

// ============================================
// BÚSQUEDA DE EQUIPOS
// ============================================

export async function buscarEquipoEnBD(textoOCR: string): Promise<ResultadoBusqueda> {
  try {
    const { data: equipos, error } = await supabase
      .from('equipos')
      .select('nombre')
    
    if (error || !equipos || equipos.length === 0) {
      console.error('❌ Error al buscar equipos:', error)
      return { nombre: '', confianza: 0, encontrado: false }
    }

    const textoLimpio = textoOCR.toUpperCase().trim()
    
    // Búsqueda exacta
    for (const equipo of equipos) {
      if (equipo.nombre.toUpperCase() === textoLimpio) {
        return { nombre: equipo.nombre, confianza: 100, encontrado: true }
      }
    }

    // Búsqueda difusa
    let mejorMatch: ResultadoBusqueda = { nombre: '', confianza: 0, encontrado: false }
    
    for (const equipo of equipos) {
      const similitud = calcularSimilitud(textoLimpio, equipo.nombre)
      if (similitud > mejorMatch.confianza && similitud >= 60) {
        mejorMatch = { nombre: equipo.nombre, confianza: similitud, encontrado: true }
      }
    }

    return mejorMatch
  } catch (error) {
    console.error('❌ Error en buscarEquipoEnBD:', error)
    return { nombre: '', confianza: 0, encontrado: false }
  }
}

// ============================================
// BÚSQUEDA DE PROVEEDORES
// ============================================

export async function buscarProveedorEnBD(textoOCR: string): Promise<ResultadoBusqueda> {
  try {
    const { data: proveedores, error } = await supabase
      .from('proveedores')
      .select('nombre')
    
    if (error || !proveedores || proveedores.length === 0) {
      console.error('❌ Error al buscar proveedores:', error)
      return { nombre: '', confianza: 0, encontrado: false }
    }

    const textoLimpio = textoOCR.toUpperCase().trim()
    
    // Búsqueda exacta
    for (const prov of proveedores) {
      if (prov.nombre.toUpperCase() === textoLimpio) {
        return { nombre: prov.nombre, confianza: 100, encontrado: true }
      }
    }

    // Búsqueda difusa
    let mejorMatch: ResultadoBusqueda = { nombre: '', confianza: 0, encontrado: false }
    
    for (const prov of proveedores) {
      const similitud = calcularSimilitud(textoLimpio, prov.nombre)
      if (similitud > mejorMatch.confianza && similitud >= 60) {
        mejorMatch = { nombre: prov.nombre, confianza: similitud, encontrado: true }
      }
    }

    return mejorMatch
  } catch (error) {
    console.error('❌ Error en buscarProveedorEnBD:', error)
    return { nombre: '', confianza: 0, encontrado: false }
  }
}

// ============================================
// BÚSQUEDA DE OPERADORES
// ============================================

export async function buscarOperadorEnBD(textoOCR: string): Promise<ResultadoBusqueda> {
  try {
    const { data: operadores, error } = await supabase
      .from('operadores')
      .select('nombre')
    
    if (error || !operadores || operadores.length === 0) {
      console.error('❌ Error al buscar operadores:', error)
      return { nombre: '', confianza: 0, encontrado: false }
    }

    const textoLimpio = textoOCR.toUpperCase().trim()
    
    // Búsqueda exacta
    for (const op of operadores) {
      if (op.nombre.toUpperCase() === textoLimpio) {
        return { nombre: op.nombre, confianza: 100, encontrado: true }
      }
    }

    // Búsqueda difusa
    let mejorMatch: ResultadoBusqueda = { nombre: '', confianza: 0, encontrado: false }
    
    for (const op of operadores) {
      const similitud = calcularSimilitud(textoLimpio, op.nombre)
      if (similitud > mejorMatch.confianza && similitud >= 60) {
        mejorMatch = { nombre: op.nombre, confianza: similitud, encontrado: true }
      }
    }

    return mejorMatch
  } catch (error) {
    console.error('❌ Error en buscarOperadorEnBD:', error)
    return { nombre: '', confianza: 0, encontrado: false }
  }
}

// ============================================
// BÚSQUEDA DE ESTIBADORES
// ============================================

export async function buscarEstibadorEnBD(textoOCR: string): Promise<ResultadoBusqueda> {
  try {
    const { data: estibadores, error } = await supabase
      .from('estibadores')
      .select('nombre')
    
    if (error || !estibadores || estibadores.length === 0) {
      console.error('❌ Error al buscar estibadores:', error)
      return { nombre: '', confianza: 0, encontrado: false }
    }

    const textoLimpio = textoOCR.toUpperCase().trim()
    
    // Búsqueda exacta
    for (const est of estibadores) {
      if (est.nombre.toUpperCase() === textoLimpio) {
        return { nombre: est.nombre, confianza: 100, encontrado: true }
      }
    }

    // Búsqueda difusa
    let mejorMatch: ResultadoBusqueda = { nombre: '', confianza: 0, encontrado: false }
    
    for (const est of estibadores) {
      const similitud = calcularSimilitud(textoLimpio, est.nombre)
      if (similitud > mejorMatch.confianza && similitud >= 60) {
        mejorMatch = { nombre: est.nombre, confianza: similitud, encontrado: true }
      }
    }

    return mejorMatch
  } catch (error) {
    console.error('❌ Error en buscarEstibadorEnBD:', error)
    return { nombre: '', confianza: 0, encontrado: false }
  }
}