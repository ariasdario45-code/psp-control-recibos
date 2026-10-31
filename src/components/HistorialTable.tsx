import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Filter, Edit2, Trash2, FileText } from 'lucide-react'
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
  fecha: string
  tipo_carga: string
  turno: string
  motonave: string
  auxiliar: string
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

export default function HistorialTable() {
  const navigate = useNavigate()
  const [registros, setRegistros] = useState<Detalle[]>([])
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

  useEffect(() => {
    cargarRegistros()
    cargarConfiguracion()
  }, [])

  const cargarConfiguracion = async () => {
    try {
      const { data } = await supabase
        .from('configuracion')
        .select('clave, valor')

      if (data) {
        const configObj: any = {}
        data.forEach((item: any) => {
          configObj[item.clave] = item.valor
        })
        setConfig(prev => ({ ...prev, ...configObj }))
      }
    } catch (error) {
      console.error('Error al cargar config:', error)
    }
  }

  const cargarRegistros = async () => {
    setCargando(true)
    try {
      const { data: planillas, error } = await supabase
        .from('planillas')
        .select(`
          id, fecha, tipo_carga, turno, motonave, auxiliar, creado_en,
          planilla_detalles (
            id, equipo, proveedor, operador, cedula, fase,
            h_inicial, h_final, hora_inicio, hora_fin,
            n_recibo, observaciones, estibador
          )
        `)
        .order('creado_en', { ascending: false })

      if (error) {
        console.error('Error al cargar:', error)
        setCargando(false)
        return
      }

      const registrosAplanados: Detalle[] = []
      planillas?.forEach(planilla => {
        planilla.planilla_detalles?.forEach((detalle: any) => {
          registrosAplanados.push({
            ...detalle,
            planilla_id: planilla.id,
            fecha: planilla.fecha,
            tipo_carga: planilla.tipo_carga,
            turno: planilla.turno,
            motonave: planilla.motonave,
            auxiliar: planilla.auxiliar,
            creado_en: planilla.creado_en,
          })
        })
      })

      setRegistros(registrosAplanados)
    } catch (error) {
      console.error('Error:', error)
    }
    setCargando(false)
  }

  const registrosFiltrados = registros.filter(reg => {
    if (filtros.fecha && reg.fecha !== filtros.fecha) return false
    if (filtros.tipoCarga && reg.tipo_carga !== filtros.tipoCarga) return false
    if (filtros.turno && reg.turno !== filtros.turno) return false
    if (filtros.motonave && reg.motonave !== filtros.motonave) return false
    if (filtros.auxiliar && reg.auxiliar !== filtros.auxiliar) return false
    return true
  })

  const limpiarFiltros = () => {
    setFiltros({ fecha: '', tipoCarga: '', turno: '', motonave: '', auxiliar: '' })
  }

  const eliminarRegistro = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return

    try {
      const { error } = await supabase
        .from('planilla_detalles')
        .delete()
        .eq('id', id)

      if (error) throw error

      const registro = registros.find(r => r.id === id)
      if (registro) {
        const { data: detallesRestantes } = await supabase
          .from('planilla_detalles')
          .select('id')
          .eq('planilla_id', registro.planilla_id)

        if (detallesRestantes && detallesRestantes.length === 0) {
          await supabase
            .from('planillas')
            .delete()
            .eq('id', registro.planilla_id)
        }
      }

      await cargarRegistros()
      alert('✅ Registro eliminado correctamente')
    } catch (error: any) {
      alert('❌ Error al eliminar: ' + error.message)
    }
  }

  const editarRegistro = (reg: Detalle) => {
    const datosEditar = {
      planilla_id: reg.planilla_id,
      fecha: reg.fecha,
      tipoCarga: reg.tipo_carga,
      turno: reg.turno,
      motonave: reg.motonave,
      auxiliar: reg.auxiliar,
      registros: [{
        id: 1,
        id_detalle: reg.id,
        equipo: reg.equipo,
        proveedor: reg.proveedor,
        operador: reg.operador,
        cedula: reg.cedula,
        fase: reg.fase,
        hInicial: reg.h_inicial,
        hFinal: reg.h_final,
        horaInicio: reg.hora_inicio,
        horaFin: reg.hora_fin,
        nRecibo: reg.n_recibo,
        observaciones: reg.observaciones,
        estibador: reg.estibador,
      }],
    }
    localStorage.setItem('planilla_editar', JSON.stringify(datosEditar))
    navigate('/nuevo')
  }

  const exportarPDF = () => {
    if (registrosFiltrados.length === 0) {
      alert('No hay registros para exportar')
      return
    }

    try {
      const primeraPlanilla = registrosFiltrados[0]
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
      })
      
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let currentY = margin

      // Logo (si existe)
      if (config.logo_url && config.logo_url.startsWith('data:image')) {
        try {
          doc.addImage(config.logo_url, 'PNG', margin, currentY, 20, 20)
        } catch (e) {
          console.error('Error logo:', e)
        }
      }

      // Encabezado empresa
      const textX = config.logo_url ? margin + 25 : margin
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 64, 175)
      doc.text(config.nombre_empresa || 'PSP - Control de Recibos', textX, currentY + 8)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(config.subtitulo_empresa || 'Operaciones Portuarias', textX, currentY + 15)

      // Datos empresa a la derecha
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      const rightX = pageWidth - margin
      doc.text(`NIT: ${config.nit_empresa || 'N/A'}`, rightX, currentY + 5, { align: 'right' })
      doc.text(`Tel: ${config.telefono_contacto || 'N/A'}`, rightX, currentY + 10, { align: 'right' })
      doc.text(config.email_contacto || '', rightX, currentY + 15, { align: 'right' })
      doc.text(config.direccion_empresa || '', rightX, currentY + 20, { align: 'right' })

      currentY += 28

      // Línea separadora
      doc.setDrawColor(30, 64, 175)
      doc.setLineWidth(0.8)
      doc.line(margin, currentY, pageWidth - margin, currentY)
      currentY += 10

      // Título
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('PLANILLA DE CONTROL DE RECIBOS', pageWidth / 2, currentY, { align: 'center' })
      currentY += 12

      // Información de la planilla (2 columnas)
      doc.setFontSize(11)
      const infoY = currentY
      const col1X = margin
      const col2X = pageWidth / 2 + 10

      // Columna 1
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      doc.text('Fecha:', col1X, infoY)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(primeraPlanilla?.fecha || 'N/A', col1X + 25, infoY)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      doc.text('Tipo de Carga:', col1X, infoY + 7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(primeraPlanilla?.tipo_carga || 'N/A', col1X + 25, infoY + 7)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      doc.text('Turno:', col1X, infoY + 14)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(primeraPlanilla?.turno || 'N/A', col1X + 25, infoY + 14)

      // Columna 2
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      doc.text('Motonave:', col2X, infoY)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(primeraPlanilla?.motonave || 'N/A', col2X + 25, infoY)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      doc.text('Auxiliar:', col2X, infoY + 7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(primeraPlanilla?.auxiliar || 'N/A', col2X + 25, infoY + 7)

      currentY = infoY + 22

      // Tabla de registros
      const tableData = registrosFiltrados.map((reg, idx) => [
        (idx + 1).toString(),
        reg.equipo,
        reg.proveedor,
        reg.operador,
        reg.estibador || '-',
        reg.cedula || '-',
        reg.fase,
        reg.h_inicial.toString(),
        reg.h_final.toString(),
        reg.hora_inicio,
        reg.hora_fin,
        reg.n_recibo.toString(),
        reg.observaciones,
      ])

      autoTable(doc, {
        startY: currentY,
        head: [['N°', 'Equipo', 'Proveedor', 'Operador', 'Estibador', 'Cédula', 'Fase', 'H.Inicial', 'H.Final', 'Hora Inicial', 'Hora Final', 'N° Recibo', 'Observaciones']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [50, 50, 50],
          valign: 'middle',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 32 },
          2: { cellWidth: 42 },
          3: { cellWidth: 32 },
          4: { cellWidth: 22 },
          5: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 18, halign: 'center' },
          7: { cellWidth: 16, halign: 'center' },
          8: { cellWidth: 16, halign: 'center' },
          9: { cellWidth: 20, halign: 'center' },
          10: { cellWidth: 20, halign: 'center' },
          11: { cellWidth: 16, halign: 'center' },
          12: { cellWidth: 38 },
        },
        margin: { left: margin, right: margin },
      })

      // Totales
      const finalY = (doc as any).lastAutoTable.finalY + 12

      const totalHoras = registrosFiltrados.reduce((sum, reg) => {
        return sum + (reg.h_final - reg.h_inicial)
      }, 0)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 64, 175)
      doc.text(`Total de Registros: ${registrosFiltrados.length}`, margin, finalY)
      doc.text(`Total Horas Trabajadas: ${totalHoras.toFixed(1)} horas`, margin, finalY + 7)

      // Firmas
      const firmaY = finalY + 30
      const firmaWidth = 70

      doc.setDrawColor(100, 100, 100)
      doc.setLineWidth(0.3)

      doc.line(margin, firmaY, margin + firmaWidth, firmaY)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      doc.text('Firma Auxiliar', margin, firmaY + 5)
      doc.text(primeraPlanilla?.auxiliar || '', margin, firmaY + 10)

      doc.line(pageWidth - margin - firmaWidth, firmaY, pageWidth - margin, firmaY)
      doc.text('Firma Administrador', pageWidth - margin - firmaWidth, firmaY + 5)
      doc.text(config.nombre_empresa, pageWidth - margin - firmaWidth, firmaY + 10)

      // Pie de página
      const footerY = pageHeight - 8
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Documento generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')} - ${config.nombre_empresa}`,
        pageWidth / 2,
        footerY,
        { align: 'center' }
      )

      // Guardar
      const nombreArchivo = `Planilla_${primeraPlanilla?.fecha || new Date().toISOString().split('T')[0]}.pdf`
      doc.save(nombreArchivo)
      
      console.log('✅ PDF generado exitosamente')
    } catch (error: any) {
      console.error('❌ Error al generar PDF:', error)
      alert('❌ Error al generar PDF: ' + error.message)
    }
  }

  const exportarExcel = async () => {
    if (registrosFiltrados.length === 0) {
      alert('No hay registros para exportar')
      return
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Planilla')

    const primeraPlanilla = registrosFiltrados[0]

    worksheet.getCell('A1').value = 'Turno:'
    worksheet.getCell('A1').font = { name: 'Arial', size: 11, bold: true }
    worksheet.getCell('B1').value = primeraPlanilla?.turno || ''
    worksheet.getCell('B1').font = { name: 'Arial', size: 11, bold: true }

    worksheet.getCell('E1').value = 'Motonave:'
    worksheet.getCell('E1').font = { name: 'Arial', size: 11, bold: true }
    worksheet.getCell('F1').value = primeraPlanilla?.motonave || ''
    worksheet.getCell('F1').font = { name: 'Arial', size: 11, bold: true }

    worksheet.getCell('I1').value = 'Auxiliar:'
    worksheet.getCell('I1').font = { name: 'Arial', size: 11, bold: true }
    worksheet.getCell('J1').value = primeraPlanilla?.auxiliar || ''
    worksheet.getCell('J1').font = { name: 'Arial', size: 11, bold: true }

    worksheet.getCell('A2').value = 'Fecha:'
    worksheet.getCell('A2').font = { name: 'Arial', size: 11, bold: true }
    worksheet.getCell('B2').value = primeraPlanilla?.fecha || ''
    worksheet.getCell('B2').font = { name: 'Arial', size: 11 }

    worksheet.mergeCells('C2:H2')
    const celdaTipo = worksheet.getCell('C2')
    celdaTipo.value = primeraPlanilla?.tipo_carga || ''
    celdaTipo.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F4E79' } }
    celdaTipo.alignment = { horizontal: 'center', vertical: 'middle' }

    const filaEncabezados = 3
    const encabezados = [
      'N°', 'Equipo', 'Proveedor', 'Operador', 'Estibador', 'Cédula',
      'Fase', 'H.Inicial', 'H.Final', 'Hora Inicial', 'Hora Final',
      'N° Recibo', 'Observaciones'
    ]

    const fila = worksheet.getRow(filaEncabezados)
    fila.height = 22

    encabezados.forEach((titulo, idx) => {
      const col = idx + 1
      const cell = worksheet.getCell(filaEncabezados, col)
      cell.value = titulo
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      }
    })

    registrosFiltrados.forEach((reg, idx) => {
      const rowNum = filaEncabezados + 1 + idx
      const filaDatos = worksheet.getRow(rowNum)
      filaDatos.height = 18

      const valores = [
        idx + 1,
        reg.equipo,
        reg.proveedor,
        reg.operador,
        reg.estibador || '-',
        reg.cedula || '-',
        reg.fase,
        reg.h_inicial,
        reg.h_final,
        reg.hora_inicio,
        reg.hora_fin,
        reg.n_recibo,
        reg.observaciones,
      ]

      valores.forEach((valor, colIdx) => {
        const cell = worksheet.getCell(rowNum, colIdx + 1)
        cell.value = valor
        cell.font = { name: 'Arial', size: 10 }
        cell.alignment = { vertical: 'middle' }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFB4B4B4' } },
          left: { style: 'thin', color: { argb: 'FFB4B4B4' } },
          bottom: { style: 'thin', color: { argb: 'FFB4B4B4' } },
          right: { style: 'thin', color: { argb: 'FFB4B4B4' } },
        }

        if (colIdx === 0 || colIdx === 7 || colIdx === 8 || colIdx === 9 || colIdx === 10 || colIdx === 11) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        }
      })
    })

    const anchos = [
      { width: 6 }, { width: 22 }, { width: 35 }, { width: 28 },
      { width: 22 }, { width: 14 }, { width: 12 }, { width: 12 },
      { width: 12 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 30 },
    ]
    anchos.forEach((ancho, idx) => {
      worksheet.getColumn(idx + 1).width = ancho.width
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Planilla_${primeraPlanilla?.fecha || new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Historial de Planillas</h2>
            <p className="text-slate-600">
              {cargando ? 'Cargando...' : `Mostrando ${registrosFiltrados.length} de ${registros.length} registros`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              {mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}
            </button>
            <button
              onClick={exportarPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              Exportar PDF
            </button>
            <button
              onClick={exportarExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>
        </div>

        {mostrarFiltros && (
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Filtros</h3>
              <button onClick={limpiarFiltros} className="text-sm text-blue-600 hover:text-blue-800">
                Limpiar filtros
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={filtros.fecha}
                  onChange={(e) => setFiltros(prev => ({ ...prev, fecha: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de Carga</label>
                <select
                  value={filtros.tipoCarga}
                  onChange={(e) => setFiltros(prev => ({ ...prev, tipoCarga: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="ACERO">ACERO</option>
                  <option value="COQUE">COQUE</option>
                  <option value="TUBERIA">TUBERIA</option>
                  <option value="ALAMBRON">ALAMBRON</option>
                  <option value="GRANELES">GRANELES</option>
                  <option value="CONTENEDORES">CONTENEDORES</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Turno</label>
                <select
                  value={filtros.turno}
                  onChange={(e) => setFiltros(prev => ({ ...prev, turno: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="DIA">DIA</option>
                  <option value="NOCHE">NOCHE</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Motonave</label>
                <select
                  value={filtros.motonave}
                  onChange={(e) => setFiltros(prev => ({ ...prev, motonave: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas</option>
                  {registros
                    .map(r => r.motonave)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Auxiliar</label>
                <select
                  value={filtros.auxiliar}
                  onChange={(e) => setFiltros(prev => ({ ...prev, auxiliar: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  {registros
                    .map(r => r.auxiliar)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">N°</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Equipo</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Proveedor</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Operador</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Estibador</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Cédula</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Fase</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">H.Inicial</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">H.Final</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Hora Inicial</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Hora Final</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">N° Recibo</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Observaciones</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {cargando ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-slate-500">
                    Cargando registros...
                  </td>
                </tr>
              ) : registrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-slate-500">
                    No hay registros. Ve a "Nuevo registro" para agregar datos.
                  </td>
                </tr>
              ) : (
                registrosFiltrados.map((reg, idx) => (
                  <tr key={reg.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-sm font-medium">{idx + 1}</td>
                    <td className="px-3 py-3 text-sm">{reg.equipo}</td>
                    <td className="px-3 py-3 text-sm">{reg.proveedor}</td>
                    <td className="px-3 py-3 text-sm">{reg.operador}</td>
                    <td className="px-3 py-3 text-sm">{reg.estibador || '-'}</td>
                    <td className="px-3 py-3 text-sm">{reg.cedula || '-'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        reg.fase === '1RA FASE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {reg.fase}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.h_inicial}</td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.h_final}</td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.hora_inicio}</td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.hora_fin}</td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.n_recibo}</td>
                    <td className="px-3 py-3 text-sm">{reg.observaciones}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => editarRegistro(reg)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => eliminarRegistro(reg.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Eliminar"
                        >
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
    </div>
  )
}