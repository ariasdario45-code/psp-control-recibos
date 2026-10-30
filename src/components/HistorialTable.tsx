import { useState, useEffect, useMemo } from 'react'
import { Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

interface Registro {
  id: number
  equipo: string
  proveedor: string
  operador: string
  cedula: string
  fase: string
  hInicial: number
  hFinal: number
  horaInicio: string
  horaFin: string
  nRecibo: number
  observaciones: string
  fecha?: string
  tipoCarga?: string
  turno?: string
  motonave?: string
  auxiliar?: string
}

export default function HistorialTable() {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [infoPlanilla, setInfoPlanilla] = useState({
    fecha: '',
    tipoCarga: '',
    turno: '',
    motonave: '',
    auxiliar: '',
  })
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroTipoCarga, setFiltroTipoCarga] = useState('')
  const [filtroTurno, setFiltroTurno] = useState('')
  const [filtroMotonave, setFiltroMotonave] = useState('')
  const [filtroAuxiliar, setFiltroAuxiliar] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)
  const registrosPorPagina = 10

  // Cargar datos del localStorage al montar el componente
  useEffect(() => {
    const datosGuardados = localStorage.getItem('planilla_actual')
    if (datosGuardados) {
      const datos = JSON.parse(datosGuardados)
      setRegistros(datos.registros || [])
      setInfoPlanilla({
        fecha: datos.fecha || '',
        tipoCarga: datos.tipoCarga || '',
        turno: datos.turno || '',
        motonave: datos.motonave || '',
        auxiliar: datos.auxiliar || '',
      })
    }
  }, [])

  // Filtrar datos según los filtros seleccionados
  const datosFiltrados = useMemo(() => {
    return registros.filter((row) => {
      const coincideFecha = !filtroFecha || row.fecha === filtroFecha
      const coincideTipoCarga = !filtroTipoCarga || !row.tipoCarga || row.tipoCarga === filtroTipoCarga
      const coincideTurno = !filtroTurno || !row.turno || row.turno === filtroTurno
      const coincideMotonave = !filtroMotonave || !row.motonave || row.motonave === filtroMotonave
      const coincideAuxiliar = !filtroAuxiliar || !row.auxiliar || row.auxiliar === filtroAuxiliar
      return coincideFecha && coincideTipoCarga && coincideTurno && coincideMotonave && coincideAuxiliar
    })
  }, [registros, filtroFecha, filtroTipoCarga, filtroTurno, filtroMotonave, filtroAuxiliar])

  const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina)
  const datosPaginados = datosFiltrados.slice(
    (paginaActual - 1) * registrosPorPagina,
    paginaActual * registrosPorPagina
  )

  const handleFiltroChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setter(e.target.value)
    setPaginaActual(1)
  }

  const limpiarFiltros = () => {
    setFiltroFecha('')
    setFiltroTipoCarga('')
    setFiltroTurno('')
    setFiltroMotonave('')
    setFiltroAuxiliar('')
    setPaginaActual(1)
  }

  // Función para exportar Excel con formato idéntico al original
  const exportarExcel = async () => {
    if (datosFiltrados.length === 0) {
      alert('No hay registros para exportar')
      return
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Planilla')

    const azulOscuro = '1F4E79'
    const azulClaro = 'B4C7E7'
    const verdeFila = '00B050'
    const blanco = 'FFFFFF'
    //const negro = '000000'

    worksheet.columns = [
      { width: 5 }, { width: 22 }, { width: 35 }, { width: 30 },
      { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
      { width: 12 }, { width: 12 }, { width: 12 }, { width: 20 },
    ]

    // Fila 1: Turno, Motonave, Auxiliar
    const fila1 = worksheet.getRow(1)
    fila1.height = 25
    fila1.getCell(1).value = 'Turno:'
    fila1.getCell(1).font = { bold: true, size: 12 }
    fila1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + azulClaro } }
    fila1.getCell(2).value = infoPlanilla.turno || 'DIA'
    fila1.getCell(2).font = { bold: true, size: 12 }
    fila1.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + azulClaro } }
    fila1.getCell(5).value = 'Motonave:'
    fila1.getCell(5).font = { bold: true, size: 12 }
    fila1.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + azulClaro } }
    fila1.getCell(6).value = infoPlanilla.motonave || ''
    fila1.getCell(6).font = { bold: true, size: 12 }
    fila1.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + azulClaro } }
    fila1.getCell(9).value = 'Auxiliar:'
    fila1.getCell(9).font = { bold: true, size: 12 }
    fila1.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + azulClaro } }
    fila1.getCell(10).value = infoPlanilla.auxiliar || ''
    fila1.getCell(10).font = { bold: true, size: 12 }
    fila1.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + azulClaro } }

    // Fila 2: Fecha, Tipo de Carga, Horometros
    const fila2 = worksheet.getRow(2)
    fila2.height = 25
    fila2.getCell(1).value = 'Fecha:'
    fila2.getCell(1).font = { bold: true, size: 12 }
    fila2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + azulClaro } }
    fila2.getCell(2).value = infoPlanilla.fecha || ''
    fila2.getCell(2).font = { bold: true, size: 12 }
    fila2.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + azulClaro } }
    fila2.getCell(5).value = infoPlanilla.tipoCarga || 'ACERO'
    fila2.getCell(5).font = { bold: true, size: 14 }
    fila2.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + azulClaro } }
    fila2.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.mergeCells('E2:H2')
    fila2.getCell(9).value = 'Horometros'
    fila2.getCell(9).font = { bold: true, size: 12 }
    fila2.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + azulClaro } }
    fila2.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.mergeCells('I2:L2')

    // Fila 3: Encabezados
    const fila3 = worksheet.getRow(3)
    fila3.height = 30
    const headers = ['N°', 'Equipo', 'Proveedor', 'Operador', 'Cédula', 'Fase', 'H.Inicial', 'H.Final', 'Hora Inicial', 'Hora Final', 'N° Recibo', 'Observaciones']
    headers.forEach((header, index) => {
      const cell = fila3.getCell(index + 1)
      cell.value = header
      cell.font = { bold: true, size: 11, color: { argb: 'FF' + blanco } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + azulOscuro } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // Filas de datos
    datosFiltrados.forEach((row, index) => {
      const fila = worksheet.getRow(4 + index)
      fila.height = 20
      const valores = [row.id, row.equipo, row.proveedor, row.operador, row.cedula, row.fase, row.hInicial, row.hFinal, row.horaInicio, row.horaFin, row.nRecibo, row.observaciones]
      const esPrimeraFase = row.fase === '1RA FASE'
      const colorFondo = esPrimeraFase ? '4472C4' : verdeFila
      valores.forEach((valor, colIndex) => {
        const cell = fila.getCell(colIndex + 1)
        cell.value = valor
        cell.font = { size: 10 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorFondo } }
        if ([0, 4, 5, 6, 7, 8, 9, 10].includes(colIndex)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        }
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const fechaActual = new Date().toISOString().split('T')[0]
    saveAs(blob, `planilla_${fechaActual}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Información de la planilla */}
      {(infoPlanilla.fecha || infoPlanilla.motonave) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Información de la Planilla</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div><span className="font-medium">Fecha:</span> {infoPlanilla.fecha || 'No definida'}</div>
            <div><span className="font-medium">Tipo:</span> {infoPlanilla.tipoCarga || 'No definido'}</div>
            <div><span className="font-medium">Turno:</span> {infoPlanilla.turno || 'No definido'}</div>
            <div><span className="font-medium">Motonave:</span> {infoPlanilla.motonave || 'No definida'}</div>
            <div><span className="font-medium">Auxiliar:</span> {infoPlanilla.auxiliar || 'No definido'}</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Filtros</h2>
          </div>
          <button onClick={limpiarFiltros} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Limpiar filtros
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
            <input type="date" value={filtroFecha} onChange={handleFiltroChange(setFiltroFecha)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Carga</label>
            <select value={filtroTipoCarga} onChange={handleFiltroChange(setFiltroTipoCarga)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Todos</option>
              <option value="ACERO">ACERO</option>
              <option value="COQUE">COQUE</option>
              <option value="TUBERIA">TUBERIA</option>
              <option value="ALAMBRON">ALAMBRON</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Turno</label>
            <select value={filtroTurno} onChange={handleFiltroChange(setFiltroTurno)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Todos</option>
              <option value="DIA">DIA</option>
              <option value="NOCHE">NOCHE</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motonave</label>
            <select value={filtroMotonave} onChange={handleFiltroChange(setFiltroMotonave)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Todas</option>
              <option value="BAO RIN LING">BAO RIN LING</option>
              <option value="HONG RUN 16">HONG RUN 16</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Auxiliar</label>
            <select value={filtroAuxiliar} onChange={handleFiltroChange(setFiltroAuxiliar)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Todos</option>
              <option value="MIGUEL RACEDO">MIGUEL RACEDO</option>
              <option value="CRISTIAN POLO">CRISTIAN POLO</option>
            </select>
          </div>
        </div>
      </div>

      {/* Botón Exportar y contador */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Mostrando <span className="font-semibold">{datosFiltrados.length}</span> de{' '}
          <span className="font-semibold">{registros.length}</span> registros
        </p>
        <button onClick={exportarExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
          <Download className="w-4 h-4" />
          Exportar Excel
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">N°</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Equipo</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Proveedor</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Operador</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Cédula</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Fase</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">H.Inicial</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">H.Final</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Hora Inicial</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Hora Final</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">N° Recibo</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {datosPaginados.length > 0 ? (
                datosPaginados.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-sm font-medium">{row.id}</td>
                    <td className="px-3 py-3 text-sm font-medium">{row.equipo}</td>
                    <td className="px-3 py-3 text-sm">{row.proveedor}</td>
                    <td className="px-3 py-3 text-sm">{row.operador}</td>
                    <td className="px-3 py-3 text-sm">{row.cedula}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        row.fase === '1RA FASE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>{row.fase}</span>
                    </td>
                    <td className="px-3 py-3 text-sm font-mono">{row.hInicial}</td>
                    <td className="px-3 py-3 text-sm font-mono">{row.hFinal}</td>
                    <td className="px-3 py-3 text-sm">{row.horaInicio}</td>
                    <td className="px-3 py-3 text-sm">{row.horaFin}</td>
                    <td className="px-3 py-3 text-sm font-mono">{row.nRecibo}</td>
                    <td className="px-3 py-3 text-sm">{row.observaciones}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                    {registros.length === 0 
                      ? 'No hay registros. Ve a "Nuevo registro" para agregar datos.' 
                      : 'No hay registros que coincidan con los filtros seleccionados'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">Página {paginaActual} de {totalPaginas}</p>
            <div className="flex gap-2">
              <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}
                className="flex items-center gap-1 px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}
                className="flex items-center gap-1 px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}