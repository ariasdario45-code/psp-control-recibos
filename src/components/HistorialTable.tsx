import { useState, useEffect } from 'react'
import { Download, Filter, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import * as ExcelJS from 'exceljs'

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

export default function HistorialTable() {
  const [registros, setRegistros] = useState<Detalle[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarFiltros, setMostrarFiltros] = useState(true)
  const [filtros, setFiltros] = useState({
    fecha: '',
    tipoCarga: '',
    turno: '',
    motonave: '',
    auxiliar: '',
  })

  useEffect(() => {
    cargarRegistros()
  }, [])

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
        return
      }

      const registrosAplanados: Detalle[] = []
      planillas?.forEach(planilla => {
        planilla.planilla_detalles?.forEach((detalle: any) => {
          registrosAplanados.push({
            ...detalle,
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

  // Eliminar registro
  const eliminarRegistro = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.')) return

    try {
      const { error } = await supabase
        .from('planilla_detalles')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Verificar si quedan detalles de esa planilla
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

  // Editar registro (redirige a NuevoRegistro con los datos)
  const editarRegistro = (reg: Detalle) => {
    // Guardar en localStorage para que NuevoRegistro lo cargue
    const datosEditar = {
      fecha: reg.fecha,
      tipoCarga: reg.tipo_carga,
      turno: reg.turno,
      motonave: reg.motonave,
      auxiliar: reg.auxiliar,
      registros: [{
        id: 1,
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
    window.location.href = '/nuevo'
  }

  // Exportar Excel con formato compacto mejorado
  const exportarExcel = async () => {
    if (registrosFiltrados.length === 0) {
      alert('No hay registros para exportar')
      return
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Planilla')

    const primeraPlanilla = registrosFiltrados[0]

    // === FILA 1: Turno | Motonave | Auxiliar ===
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

    // === FILA 2: Fecha | Tipo de Carga (centrado) ===
    worksheet.getCell('A2').value = 'Fecha:'
    worksheet.getCell('A2').font = { name: 'Arial', size: 11, bold: true }
    worksheet.getCell('B2').value = primeraPlanilla?.fecha || ''
    worksheet.getCell('B2').font = { name: 'Arial', size: 11 }

    worksheet.mergeCells('C2:H2')
    const celdaTipo = worksheet.getCell('C2')
    celdaTipo.value = primeraPlanilla?.tipo_carga || ''
    celdaTipo.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F4E79' } }
    celdaTipo.alignment = { horizontal: 'center', vertical: 'middle' }

    // === FILA 3: Encabezados de tabla ===
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

    // === DATOS (desde fila 4) ===
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

        // Centrar columnas numéricas
        if (colIdx === 0 || colIdx === 7 || colIdx === 8 || colIdx === 9 || colIdx === 10 || colIdx === 11) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        }
      })
    })

    // === ANCHOS DE COLUMNA ===
    const anchos = [
      { width: 6 },   // N°
      { width: 22 },  // Equipo
      { width: 35 },  // Proveedor
      { width: 28 },  // Operador
      { width: 22 },  // Estibador
      { width: 14 },  // Cédula
      { width: 12 },  // Fase
      { width: 12 },  // H.Inicial
      { width: 12 },  // H.Final
      { width: 14 },  // Hora Inicial
      { width: 14 },  // Hora Final
      { width: 12 },  // N° Recibo
      { width: 30 },  // Observaciones
    ]
    anchos.forEach((ancho, idx) => {
      worksheet.getColumn(idx + 1).width = ancho.width
    })

    // === GENERAR ARCHIVO ===
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