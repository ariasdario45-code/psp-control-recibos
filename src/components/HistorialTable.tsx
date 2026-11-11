import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Filter, Edit2, Trash2, FileText, X, Image as ImageIcon, Ship } from 'lucide-react'
import { supabase } from '../lib/supabase'
import * as ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Detalle {
  id: number
  planilla_id: number
  equipo: string
  proveedor: string
  operador: string
  cedula: string
  fase: string
  h_inicial: number
  h_final: number
  hora_inicio: string
  hora_fin: string
  n_recibo: number
  observaciones: string
  estibador: string
  estib_hora_llegada: string
  estib_hora_salida: string
  estib_observaciones: string
  fecha: string
  tipo_carga: string
  turno: string
  motonave: string
  auxiliar: string
  creado_en: string
  estado: string
}

interface Evidencia {
  id: number
  planilla_id: number
  detalle_id: number
  imagen_url: string
  creado_en: string
}

interface Configuracion {
  nombre_empresa: string
  subtitulo_empresa: string
  email_contacto: string
  telefono_contacto: string
  direccion_empresa: string
  nit_empresa: string
  logo_url: string
  color_primario: string
}

// ✅ FUNCIÓN PARA CALCULAR HORAS TRABAJADAS DEL ESTIBADOR
const calcularHorasTrabajadas = (horaInicio: string, horaFin: string): number => {
  if (!horaInicio || !horaFin) return 0
  const [h1, m1] = horaInicio.split(':').map(Number)
  const [h2, m2] = horaFin.split(':').map(Number)
  let minutos = (h2 * 60 + m2) - (h1 * 60 + m1)
  if (minutos < 0) minutos += 24 * 60
  return minutos / 60
}

// ✅ FUNCIÓN MEJORADA PARA CONVERTIR IMAGEN A BASE64 CON MANEJO DE CORS
const convertirImagenABase64 = async (url: string): Promise<{ base64: string; format: string }> => {
  try {
    console.log('📥 Cargando imagen:', url)
    const urlFinal = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`
    const response = await fetch(urlFinal, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Accept': 'image/png,image/jpeg,image/jpg,image/*,*/*' }
    })
    console.log('📊 Respuesta:', response.status, response.ok, response.type)
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    const blob = await response.blob()
    console.log('📦 Blob:', blob.type, blob.size, 'bytes')
    if (blob.size === 0) throw new Error('Blob vacío')
    const format = blob.type.includes('png') ? 'PNG' : 'JPEG'
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        console.log('✅ Base64 generado, longitud:', result.length)
        resolve({ base64: result, format })
      }
      reader.onerror = () => reject(new Error('Error FileReader'))
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('❌ Error en convertirImagenABase64:', error)
    throw error
  }
}

export default function HistorialTable() {
  const navigate = useNavigate()
  const [planillas, setPlanillas] = useState<any[]>([])
  const [evidencias, setEvidencias] = useState<Map<number, Evidencia[]>>(new Map())
  const [cargando, setCargando] = useState(true)
  const [mostrarFiltros, setMostrarFiltros] = useState(true)
  const [config, setConfig] = useState<Configuracion>({
    nombre_empresa: 'PSP - Control de Recibos',
    subtitulo_empresa: 'Operaciones Portuarias',
    email_contacto: '',
    telefono_contacto: '',
    direccion_empresa: '',
    nit_empresa: '',
    logo_url: '',
    color_primario: '#1e40af',
  })
  const [filtros, setFiltros] = useState({
    fecha: '',
    tipoCarga: '',
    turno: '',
    motonave: '',
    auxiliar: '',
  })
  const [mostrandoPreview, setMostrandoPreview] = useState<Detalle | null>(null)
  const [imagenesPreview] = useState<string[]>([])

  useEffect(() => {
    cargarConfiguracion()
  }, [])

  useEffect(() => {
    cargarPlanillas()
  }, [filtros])

  const cargarConfiguracion = async () => {
    try {
      const { data } = await supabase.from('configuracion').select('clave, valor')
      if (data) {
        const configObj: any = {}
        data.forEach((item: any) => { configObj[item.clave] = item.valor })
        setConfig(prev => ({ ...prev, ...configObj }))
      }
    } catch (error) {
      console.error('Error al cargar config:', error)
    }
  }

  const cargarPlanillas = async () => {
    setCargando(true)
    try {
      let query = supabase
        .from('planillas')
        .select(`*, planilla_detalles(*)`)
        .order('creado_en', { ascending: false })

      if (filtros.fecha) query = query.eq('fecha', filtros.fecha)
      if (filtros.tipoCarga) query = query.eq('tipo_carga', filtros.tipoCarga)
      if (filtros.turno) query = query.eq('turno', filtros.turno)
      if (filtros.motonave) query = query.eq('motonave', filtros.motonave)
      if (filtros.auxiliar) query = query.eq('auxiliar', filtros.auxiliar)

      const { data, error } = await query
      if (error) { console.error('Error al cargar:', error); setCargando(false); return }

      setPlanillas(data || [])

      // Cargar evidencias de las planillas filtradas
      if (data && data.length > 0) {
        const planillaIds = data.map((p: any) => p.id)
        const { data: evData } = await supabase
          .from('evidencias')
          .select('*')
          .in('planilla_id', planillaIds)
          .order('creado_en', { ascending: true })

        const mapaEvidencias = new Map<number, Evidencia[]>()
        evData?.forEach(evidencia => {
          let urlCorrecta = evidencia.imagen_url
          if (!urlCorrecta.startsWith('http')) {
            const supabaseUrl = (supabase as any).supabaseUrl || 'https://fdgslpppevqdufaohyoi.supabase.co'
            urlCorrecta = `${supabaseUrl}${urlCorrecta.startsWith('/') ? '' : '/'}${urlCorrecta}`
          }
          console.log('🔗 URL de evidencia:', urlCorrecta)
          const evidenciaCorregida = { ...evidencia, imagen_url: urlCorrecta }
          if (!mapaEvidencias.has(evidencia.planilla_id)) {
            mapaEvidencias.set(evidencia.planilla_id, [])
          }
          mapaEvidencias.get(evidencia.planilla_id)!.push(evidenciaCorregida)
        })
        setEvidencias(mapaEvidencias)
      }
    } catch (error) {
      console.error('Error:', error)
    }
    setCargando(false)
  }

  // Derivamos los registros aplanados para que la lógica de PDF/Excel siga funcionando igual
  const registrosFiltrados = useMemo(() => {
    const regs: Detalle[] = []
    planillas.forEach((p: any) => {
      p.planilla_detalles?.forEach((d: any) => {
        regs.push({
          ...d,
          planilla_id: p.id,
          fecha: p.fecha,
          tipo_carga: p.tipo_carga,
          turno: p.turno,
          motonave: p.motonave,
          auxiliar: p.auxiliar,
          creado_en: p.creado_en,
          estado: p.estado
        })
      })
    })
    return regs
  }, [planillas])

  const limpiarFiltros = () => setFiltros({ fecha: '', tipoCarga: '', turno: '', motonave: '', auxiliar: '' })

  const eliminarPlanilla = async (id: number, motonave: string) => {
    if (!confirm(`¿Estás seguro de eliminar el turno de ${motonave} y todos sus registros?`)) return
    try {
      await supabase.from('planilla_detalles').delete().eq('planilla_id', id)
      await supabase.from('planillas').delete().eq('id', id)
      cargarPlanillas()
      alert('✅ Turno eliminado correctamente')
    } catch (error: any) {
      alert('❌ Error al eliminar: ' + error.message)
    }
  }

  // ✅ FUNCIÓN EXPORTAR PDF COMPLETA Y CORREGIDA
  const exportarPDF = async () => {
    if (registrosFiltrados.length === 0) { alert('No hay registros para exportar'); return }
    try {
      const primeraPlanilla = registrosFiltrados[0]
      const evidenciasPlanilla = evidencias.get(primeraPlanilla.planilla_id) || []
      
      // ✅ PÁGINA 1: LANDSCAPE para la tabla
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter', compress: true })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 12
      let currentY = margin

      if (config.logo_url && config.logo_url.startsWith('data:image')) {
        try { doc.addImage(config.logo_url, 'PNG', margin, currentY, 25, 25) } catch (e) { console.error('Error logo:', e) }
      }

      const textX = config.logo_url ? margin + 30 : margin
      doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175)
      doc.text(config.nombre_empresa || 'PSP - Control de Recibos', textX, currentY + 10)
      doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
      doc.text(config.subtitulo_empresa || 'Operaciones Portuarias', textX, currentY + 17)

      doc.setFontSize(9); doc.setTextColor(80, 80, 80)
      const rightX = pageWidth - margin
      doc.text(`NIT: ${config.nit_empresa || 'N/A'}`, rightX, currentY + 5, { align: 'right' })
      doc.text(`Tel: ${config.telefono_contacto || 'N/A'}`, rightX, currentY + 10, { align: 'right' })
      doc.text(config.direccion_empresa || '', rightX, currentY + 15, { align: 'right' })

      currentY += 32
      doc.setDrawColor(30, 64, 175); doc.setLineWidth(1); doc.line(margin, currentY, pageWidth - margin, currentY)
      currentY += 8

      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
      doc.text('PLANILLA DE CONTROL DE RECIBOS', pageWidth / 2, currentY, { align: 'center' })
      currentY += 10

      doc.setFontSize(10)
      const infoY = currentY; const col1X = margin; const col2X = (pageWidth / 2) + 5; const col3X = pageWidth - margin - 50
      doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60); doc.text('Fecha:', col1X, infoY)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.text(primeraPlanilla?.fecha || 'N/A', col1X + 20, infoY)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60); doc.text('Motonave:', col2X, infoY)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.text(primeraPlanilla?.motonave || 'N/A', col2X + 20, infoY)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60); doc.text('Auxiliar:', col3X, infoY)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.text(primeraPlanilla?.auxiliar || 'N/A', col3X + 20, infoY)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60); doc.text('Tipo de Carga:', col1X, infoY + 6)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.text(primeraPlanilla?.tipo_carga || 'N/A', col1X + 20, infoY + 6)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60); doc.text('Turno:', col2X, infoY + 6)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.text(primeraPlanilla?.turno || 'N/A', col2X + 20, infoY + 6)
      currentY = infoY + 16

      // ✅ TABLA CON PROVEEDOR SIEMPRE VISIBLE Y EQUIPO SOLO PARA OPERADOR
      const tableData: any[] = []
      registrosFiltrados.forEach((reg, idx) => {
        if (reg.operador) {
          tableData.push([
            (idx + 1).toString(),
            reg.equipo || '-',
            reg.proveedor || '-',
            'OPERADOR',
            reg.operador,
            reg.cedula || '-',
            reg.fase || '-',
            (reg.h_inicial || 0).toString(),
            (reg.h_final || 0).toString(),
            reg.hora_inicio || '-',
            reg.hora_fin || '-',
            (reg.n_recibo || 0).toString(),
            reg.observaciones || '-',
          ])
        }
        if (reg.estibador) {
          tableData.push([
            reg.operador ? '' : (idx + 1).toString(),
            '-',
            reg.proveedor || '-',
            'ESTIBADOR',
            reg.estibador,
            '-',
            '-',
            '-',
            '-',
            reg.estib_hora_llegada || '-',
            reg.estib_hora_salida || '-',
            '-',
            reg.estib_observaciones || '-',
          ])
        }
      })

      autoTable(doc, {
        startY: currentY,
        head: [['N°', 'Equipo', 'Proveedor', 'Tipo', 'Nombre', 'Cédula', 'Fase', 'H.Inicial', 'H.Final', 'Hora Inicial', 'Hora Final', 'N° Recibo', 'Observaciones']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center', valign: 'middle' },
        bodyStyles: { fontSize: 7, textColor: [50, 50, 50], valign: 'middle' },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 28 },
          2: { cellWidth: 32 },
          3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 28 },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 13, halign: 'center' },
          8: { cellWidth: 13, halign: 'center' },
          9: { cellWidth: 17, halign: 'center' },
          10: { cellWidth: 17, halign: 'center' },
          11: { cellWidth: 14, halign: 'center' },
          12: { cellWidth: 30 },
        },
        margin: { left: margin, right: margin },
        didParseCell: (data: any) => {
          if (data.section === 'body') {
            const tipo = data.row.raw[3]
            if (tipo === 'OPERADOR') { data.cell.styles.textColor = [30, 64, 175]; data.cell.styles.fontStyle = 'bold' }
            else if (tipo === 'ESTIBADOR') { data.cell.styles.textColor = [22, 163, 74]; data.cell.styles.fontStyle = 'bold' }
          }
        },
      })

      const finalY = (doc as any).lastAutoTable.finalY + 10
      let totalHoras = 0
      registrosFiltrados.forEach(reg => {
        if (reg.operador && reg.h_inicial && reg.h_final) totalHoras += (reg.h_final - reg.h_inicial)
        if (reg.estibador && reg.estib_hora_llegada && reg.estib_hora_salida) {
          totalHoras += calcularHorasTrabajadas(reg.estib_hora_llegada, reg.estib_hora_salida)
        }
      })

      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175)
      doc.text(`Total de Registros: ${registrosFiltrados.length}`, margin, finalY)
      doc.text(`Total Horas Trabajadas: ${totalHoras.toFixed(1)} horas`, margin, finalY + 7)
      if (evidenciasPlanilla.length > 0) doc.text(`Evidencias Fotográficas: ${evidenciasPlanilla.length}`, margin, finalY + 14)

      const firmaY = finalY + 25; const firmaWidth = 70
      doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.3)
      doc.line(margin, firmaY, margin + firmaWidth, firmaY)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
      doc.text('Firma Auxiliar', margin, firmaY + 5); doc.text(primeraPlanilla?.auxiliar || '', margin, firmaY + 10)
      doc.line(pageWidth - margin - firmaWidth, firmaY, pageWidth - margin, firmaY)
      doc.text('Firma Administrador', pageWidth - margin - firmaWidth, firmaY + 5); doc.text(config.nombre_empresa, pageWidth - margin - firmaWidth, firmaY + 10)

      const footerY = pageHeight - 10
      doc.setFontSize(7); doc.setTextColor(150, 150, 150)
      doc.text(`Documento generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')} - ${config.nombre_empresa}`, pageWidth / 2, footerY, { align: 'center' })

      // ✅ PÁGINA 2: PORTRAIT (VERTICAL) PARA EVIDENCIAS FOTOGRÁFICAS
      if (evidenciasPlanilla.length > 0) {
        // Agregar página en formato PORTRAIT (vertical)
        doc.addPage('letter', 'portrait')
        
        // Obtener dimensiones de la nueva página portrait
        const portraitWidth = doc.internal.pageSize.getWidth()
        const portraitHeight = doc.internal.pageSize.getHeight()
        const portraitMargin = 15
        let imgY = portraitMargin

        // Título de la sección
        doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175)
        doc.text('EVIDENCIAS FOTOGRÁFICAS', portraitWidth / 2, imgY, { align: 'center' })
        imgY += 8

        // Subtítulo con información
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
        doc.text(`Planilla del ${primeraPlanilla?.fecha || 'N/A'} - ${primeraPlanilla?.motonave || ''}`, portraitWidth / 2, imgY, { align: 'center' })
        imgY += 6
        doc.text(`Total de imágenes: ${evidenciasPlanilla.length}`, portraitWidth / 2, imgY, { align: 'center' })
        imgY += 10

        // Línea separadora
        doc.setDrawColor(30, 64, 175); doc.setLineWidth(0.5)
        doc.line(portraitMargin, imgY, portraitWidth - portraitMargin, imgY)
        imgY += 10

        let imagenesCargadas = 0
        let imagenesFallidas = 0

        for (let i = 0; i < evidenciasPlanilla.length; i++) {
          const evidencia = evidenciasPlanilla[i]
          console.log(`🖼️ Procesando imagen ${i + 1}/${evidenciasPlanilla.length}:`, evidencia.imagen_url)
          
          // Si no hay espacio suficiente, agregar nueva página portrait
          if (imgY > portraitHeight - 100) { 
            doc.addPage('letter', 'portrait')
            imgY = portraitMargin 
          }
          
          try {
            const { base64: base64Img, format } = await convertirImagenABase64(evidencia.imagen_url)
            
            // ✅ DIMENSIONES OPTIMIZADAS PARA PORTRAIT (aprovecha el alto de la página)
            const maxWidth = portraitWidth - (portraitMargin * 2)
            const maxHeight = portraitHeight - imgY - 40
            
            // Crear imagen temporal para obtener dimensiones reales
            const img = new Image()
            img.src = base64Img
            
            await new Promise((resolve) => {
              img.onload = () => resolve(null)
              img.onerror = () => resolve(null)
            })
            
            // Calcular proporciones manteniendo aspect ratio
            let imgWidth = img.width
            let imgHeight = img.height
            const ratio = imgWidth / imgHeight
            
            // Ajustar al espacio disponible manteniendo proporciones
            if (imgWidth > maxWidth) {
              imgWidth = maxWidth
              imgHeight = imgWidth / ratio
            }
            if (imgHeight > maxHeight) {
              imgHeight = maxHeight
              imgWidth = imgHeight * ratio
            }
            
            console.log(`📐 Dimensiones finales: ${imgWidth.toFixed(1)}x${imgHeight.toFixed(1)} mm`)
            
            // Centrar imagen horizontalmente
            const xPos = (portraitWidth - imgWidth) / 2
            
            doc.addImage(base64Img, format, xPos, imgY, imgWidth, imgHeight)
            
            imgY += imgHeight + 5
            doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 100)
            doc.text(`Imagen ${i + 1} de ${evidenciasPlanilla.length}`, portraitWidth / 2, imgY, { align: 'center' })
            imgY += 8
            
            // Línea separadora entre imágenes
            doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2)
            doc.line(portraitMargin, imgY, portraitWidth - portraitMargin, imgY)
            imgY += 10
            
            imagenesCargadas++
            console.log(`✅ Imagen ${i + 1} agregada correctamente`)
          } catch (error) {
            console.error(`❌ Error con imagen ${i + 1}:`, error)
            imagenesFallidas++
            doc.setFontSize(9); doc.setTextColor(200, 0, 0)
            doc.text(`⚠️ Imagen ${i + 1} no disponible`, portraitWidth / 2, imgY, { align: 'center' })
            imgY += 15
          }
        }
        
        console.log(`📊 Resumen evidencias: ${imagenesCargadas} cargadas, ${imagenesFallidas} fallidas`)
        
        // Pie de página en la última página portrait
        const lastPageFooterY = portraitHeight - 10
        doc.setFontSize(7); doc.setTextColor(150, 150, 150)
        doc.text(`Documento generado el ${new Date().toLocaleDateString('es-CO')} - ${config.nombre_empresa}`, portraitWidth / 2, lastPageFooterY, { align: 'center' })
      }

      doc.save(`Planilla_${primeraPlanilla?.fecha || new Date().toISOString().split('T')[0]}.pdf`)
      console.log('✅ PDF generado exitosamente')
    } catch (error: any) {
      console.error('❌ Error al generar PDF:', error)
      alert('❌ Error al generar PDF: ' + error.message)
    }
  }

  // ✅ FUNCIÓN EXPORTAR EXCEL COMPLETA
  const exportarExcel = async () => {
    if (registrosFiltrados.length === 0) { alert('No hay registros para exportar'); return }
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Planilla')
    const primeraPlanilla = registrosFiltrados[0]

    worksheet.getCell('A1').value = 'Turno:'; worksheet.getCell('A1').font = { name: 'Arial', size: 11, bold: true }
    worksheet.getCell('B1').value = primeraPlanilla?.turno || ''; worksheet.getCell('B1').font = { name: 'Arial', size: 11, bold: true }
    worksheet.getCell('E1').value = 'Motonave:'; worksheet.getCell('E1').font = { name: 'Arial', size: 11, bold: true }
    worksheet.getCell('F1').value = primeraPlanilla?.motonave || ''; worksheet.getCell('F1').font = { name: 'Arial', size: 11, bold: true }
    worksheet.getCell('I1').value = 'Auxiliar:'; worksheet.getCell('I1').font = { name: 'Arial', size: 11, bold: true }
    worksheet.getCell('J1').value = primeraPlanilla?.auxiliar || ''; worksheet.getCell('J1').font = { name: 'Arial', size: 11, bold: true }
    worksheet.getCell('A2').value = 'Fecha:'; worksheet.getCell('A2').font = { name: 'Arial', size: 11, bold: true }
    worksheet.getCell('B2').value = primeraPlanilla?.fecha || ''; worksheet.getCell('B2').font = { name: 'Arial', size: 11 }
    worksheet.mergeCells('C2:H2')
    const celdaTipo = worksheet.getCell('C2')
    celdaTipo.value = primeraPlanilla?.tipo_carga || ''
    celdaTipo.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F4E79' } }
    celdaTipo.alignment = { horizontal: 'center', vertical: 'middle' }

    const filaEncabezados = 3
    const encabezados = ['N°', 'Equipo', 'Proveedor', 'Tipo', 'Nombre', 'Cédula', 'Fase', 'H.Inicial', 'H.Final', 'Hora Inicial', 'Hora Final', 'N° Recibo', 'Observaciones']
    const fila = worksheet.getRow(filaEncabezados); fila.height = 22
    encabezados.forEach((titulo, idx) => {
      const col = idx + 1; const cell = worksheet.getCell(filaEncabezados, col)
      cell.value = titulo; cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = { top: { style: 'thin', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } } }
    })

    let rowNum = filaEncabezados + 1
    let numeroFila = 1
    registrosFiltrados.forEach((reg) => {
      if (reg.operador) {
        const filaOperador = worksheet.getRow(rowNum); filaOperador.height = 18
        const valoresOperador = [numeroFila, reg.equipo, reg.proveedor, 'OPERADOR', reg.operador, reg.cedula || '-', reg.fase, reg.h_inicial, reg.h_final, reg.hora_inicio, reg.hora_fin, reg.n_recibo, reg.observaciones]
        valoresOperador.forEach((valor, colIdx) => {
          const cell = worksheet.getCell(rowNum, colIdx + 1)
          cell.value = valor; cell.font = { name: 'Arial', size: 10, bold: colIdx === 3 }; cell.alignment = { vertical: 'middle' }
          cell.border = { top: { style: 'thin', color: { argb: 'FFB4B4B4' } }, left: { style: 'thin', color: { argb: 'FFB4B4B4' } }, bottom: { style: 'thin', color: { argb: 'FFB4B4B4' } }, right: { style: 'thin', color: { argb: 'FFB4B4B4' } } }
          if ([0, 5, 6, 7, 8, 9, 10, 11].includes(colIdx)) cell.alignment = { horizontal: 'center', vertical: 'middle' }
        })
        rowNum++
      }
      if (reg.estibador) {
        const filaEstibador = worksheet.getRow(rowNum); filaEstibador.height = 18
        filaEstibador.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
        const valoresEstibador = [reg.operador ? '' : numeroFila, reg.equipo || '', reg.proveedor || '', 'ESTIBADOR', reg.estibador, '-', '-', '-', '-', reg.estib_hora_llegada || '-', reg.estib_hora_salida || '-', '-', reg.estib_observaciones || '-']
        valoresEstibador.forEach((valor, colIdx) => {
          const cell = worksheet.getCell(rowNum, colIdx + 1)
          cell.value = valor; cell.font = { name: 'Arial', size: 10, bold: colIdx === 3 }; cell.alignment = { vertical: 'middle' }
          cell.border = { top: { style: 'thin', color: { argb: 'FFB4B4B4' } }, left: { style: 'thin', color: { argb: 'FFB4B4B4' } }, bottom: { style: 'thin', color: { argb: 'FFB4B4B4' } }, right: { style: 'thin', color: { argb: 'FFB4B4B4' } } }
          if ([0, 5, 6, 7, 8, 9, 10, 11].includes(colIdx)) cell.alignment = { horizontal: 'center', vertical: 'middle' }
        })
        rowNum++
      }
      numeroFila++
    })

    const anchos = [{ width: 6 }, { width: 22 }, { width: 30 }, { width: 12 }, { width: 28 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 30 }]
    anchos.forEach((ancho, idx) => { worksheet.getColumn(idx + 1).width = ancho.width })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `Planilla_${primeraPlanilla?.fecha || new Date().toISOString().split('T')[0]}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300 p-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Historial de Turnos</h2>
            <p className="text-slate-600 dark:text-slate-400">{cargando ? 'Cargando...' : `Mostrando ${planillas.length} turnos`}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMostrarFiltros(!mostrarFiltros)} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium">
              <Filter className="w-4 h-4" /> {mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}
            </button>
            <button onClick={exportarPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
              <FileText className="w-4 h-4" /> Exportar PDF
            </button>
            <button onClick={exportarExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" /> Exportar Excel
            </button>
          </div>
        </div>

        {mostrarFiltros && (
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 dark:text-white">Filtros</h3>
              <button onClick={limpiarFiltros} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">Limpiar filtros</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha</label>
                <input type="date" value={filtros.fecha} onChange={(e) => setFiltros(prev => ({ ...prev, fecha: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Carga</label>
                <select value={filtros.tipoCarga} onChange={(e) => setFiltros(prev => ({ ...prev, tipoCarga: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors">
                  <option value="">Todos</option>
                  <option value="ACERO">ACERO</option><option value="COQUE">COQUE</option><option value="TUBERIA">TUBERIA</option>
                  <option value="ALAMBRON">ALAMBRON</option><option value="GRANELES">GRANELES</option><option value="CONTENEDORES">CONTENEDORES</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Turno</label>
                <select value={filtros.turno} onChange={(e) => setFiltros(prev => ({ ...prev, turno: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors">
                  <option value="">Todos</option><option value="DIA">DIA</option><option value="NOCHE">NOCHE</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Motonave</label>
                <select value={filtros.motonave} onChange={(e) => setFiltros(prev => ({ ...prev, motonave: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors">
                  <option value="">Todas</option>
                  {[...new Set(planillas.map((r: any) => r.motonave))].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Auxiliar</label>
                <select value={filtros.auxiliar} onChange={(e) => setFiltros(prev => ({ ...prev, auxiliar: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors">
                  <option value="">Todos</option>
                  {[...new Set(planillas.map((r: any) => r.auxiliar))].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TABLA DE TURNOS AGRUPADOS */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 dark:bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Fecha</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Motonave</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Tipo Carga</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Turno</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Auxiliar</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Registros</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 transition-colors">
              {cargando ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Cargando turnos...</td></tr>
              ) : planillas.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay turnos registrados. Ve a "Nuevo registro" para crear uno.</td></tr>
              ) : (
                // ✅ CORRECCIÓN 1: Agregado tipado explícito (planilla: any)
                planillas.map((planilla: any) => (
                  <tr key={planilla.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-3 py-3 text-sm text-slate-900 dark:text-white">{planilla.fecha}</td>
                    <td className="px-3 py-3 text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white"><Ship className="w-4 h-4 text-[#0077B6] dark:text-blue-400" /> {planilla.motonave}</td>
                    <td className="px-3 py-3 text-sm"><span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">{planilla.tipo_carga}</span></td>
                    <td className="px-3 py-3 text-sm"><span className={`px-2 py-1 rounded text-xs font-medium ${planilla.turno === 'DIA' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'}`}>{planilla.turno === 'DIA' ? '☀️' : '🌙'} {planilla.turno}</span></td>
                    <td className="px-3 py-3 text-sm text-slate-700 dark:text-slate-300">{planilla.auxiliar}</td>
                    <td className="px-3 py-3 text-sm text-center font-bold text-slate-900 dark:text-white">{planilla.planilla_detalles?.length || 0}</td>
                    <td className="px-3 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${planilla.estado === 'EN_CURSO' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'}`}>
                        {planilla.estado === 'EN_CURSO' ? '🟢 En curso' : '🔒 Cerrado'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => navigate(`/turno/${planilla.id}`)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1 transition-colors" title="Ver/Editar Turno Completo">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => eliminarPlanilla(planilla.id, planilla.motonave)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 transition-colors" title="Eliminar Turno">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mostrandoPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 transition-colors">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center transition-colors">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Vista Previa del Registro</h3>
              <button onClick={() => setMostrandoPreview(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 text-sm uppercase">Datos Generales</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-slate-600 dark:text-slate-400">Fecha:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.fecha}</strong></div>
                  <div><span className="text-slate-600 dark:text-slate-400">Motonave:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.motonave}</strong></div>
                  <div><span className="text-slate-600 dark:text-slate-400">Auxiliar:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.auxiliar}</strong></div>
                  <div><span className="text-slate-600 dark:text-slate-400">Equipo:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.equipo || 'N/A'}</strong></div>
                  <div><span className="text-slate-600 dark:text-slate-400">Tipo de Carga:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.tipo_carga}</strong></div>
                  <div><span className="text-slate-600 dark:text-slate-400">Turno:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.turno}</strong></div>
                </div>
              </div>
              {mostrandoPreview.operador && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 text-sm uppercase">Datos del Operador</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div><span className="text-slate-600 dark:text-slate-400">Nombre:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.operador}</strong></div>
                    <div><span className="text-slate-600 dark:text-slate-400">Cédula:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.cedula || 'N/A'}</strong></div>
                    <div><span className="text-slate-600 dark:text-slate-400">Fase:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.fase || 'N/A'}</strong></div>
                    <div><span className="text-slate-600 dark:text-slate-400">H.Inicial (Horómetro):</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.h_inicial || 'N/A'}</strong></div>
                    <div><span className="text-slate-600 dark:text-slate-400">H.Final (Horómetro):</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.h_final || 'N/A'}</strong></div>
                    <div><span className="text-slate-600 dark:text-slate-400">Hora Inicio (Reloj):</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.hora_inicio || 'N/A'}</strong></div>
                    <div><span className="text-slate-600 dark:text-slate-400">Hora Final (Reloj):</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.hora_fin || 'N/A'}</strong></div>
                    <div><span className="text-slate-600 dark:text-slate-400">N° Recibo:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.n_recibo || 'N/A'}</strong></div>
                    <div className="md:col-span-3"><span className="text-slate-600 dark:text-slate-400">Observaciones:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.observaciones || 'Ninguna'}</strong></div>
                  </div>
                </div>
              )}
              {mostrandoPreview.estibador && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 transition-colors">
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-3 text-sm uppercase">Datos del Estibador</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div><span className="text-slate-600 dark:text-slate-400">Nombre:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.estibador}</strong></div>
                    <div><span className="text-slate-600 dark:text-slate-400">Hora Llegada:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.estib_hora_llegada || '-'}</strong></div>
                    <div><span className="text-slate-600 dark:text-slate-400">Hora Salida:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.estib_hora_salida || '-'}</strong></div>
                    <div className="md:col-span-3"><span className="text-slate-600 dark:text-slate-400">Observaciones:</span> <strong className="text-slate-900 dark:text-white">{mostrandoPreview.estib_observaciones || 'Ninguna'}</strong></div>
                  </div>
                </div>
              )}
              {imagenesPreview.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-3 text-sm uppercase flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> 
                    Evidencias Fotográficas ({imagenesPreview.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* ✅ CORRECCIÓN 2: _idx en lugar de idx (variable no usada) */}
                    {imagenesPreview.map((img, _idx) => (
                      <div key={_idx} className="relative group bg-white dark:bg-slate-700 rounded-lg overflow-hidden border border-purple-200 dark:border-purple-700 transition-colors">
                        <img 
                          src={img} 
                          alt={`Evidencia ${_idx + 1}`} 
                          className="w-full h-40 object-contain bg-white dark:bg-slate-600"
                          onError={(e) => {
                            console.error('❌ Error cargando imagen en modal:', img)
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            if (target.parentElement) {
                              target.parentElement.innerHTML = `
                                <div class="flex items-center justify-center h-40 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-2 text-center">
                                  ⚠️ No se pudo cargar la imagen<br/>
                                  <a href="${img}" target="_blank" class="text-blue-600 dark:text-blue-400 underline mt-1 block">
                                    Abrir en nueva pestaña
                                  </a>
                                </div>
                              `
                            }
                          }}
                          onLoad={() => console.log('✅ Imagen cargada en modal:', img)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}