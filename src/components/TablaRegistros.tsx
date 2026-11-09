import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Plus, Trash2, ArrowLeft, Lock, Clock, FileText, Loader2, XCircle, Image as ImageIcon, Save
} from 'lucide-react'

interface Registro {
  id: number
  planilla_id: number
  numero: number
  equipo: string
  proveedor: string
  operador: string
  cedula: string
  fase: string
  h_inicial: number | null
  h_final: number | null
  hora_inicio: string
  hora_fin: string
  n_recibo: string
  observaciones: string
  horometro_inicial: number | null
  horometro_final: number | null
  evidencia_url: string
  notas_edicion: string
}

interface Planilla {
  id: number
  motonave: string
  tipo_carga: string
  turno: string
  auxiliar: string
  fecha: string
  hora_inicio: string
  hora_final: string
  estado: string
  observaciones_cierre: string
}

export default function TablaRegistros() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [planilla, setPlanilla] = useState<Planilla | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [evidencias, setEvidencias] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [archivosNuevos, setArchivosNuevos] = useState<File[]>([])

  // Datos para autocompletado (se mantienen como referencia pero no limitan la escritura)
  const [equipos, setEquipos] = useState<any[]>([])
  const [operadores, setOperadores] = useState<any[]>([])
  const [fases, setFases] = useState<any[]>([])
  const [proveedores] = useState([
    'PALERMO SOCIEDAD PORTUARIA S.A',
    'GLOBAL PORT EQUIPMENT AMERICAS S.A',
    'CARGO PORT',
    'OPL',
    'INGENIERÍAS Y GESTIONES DE COLOMBIA',
    'FMC',
    'SOCIEDAD EPAR'
  ])

  useEffect(() => {
    if (id) {
      cargarPlanilla()
      cargarRegistros()
      cargarDatosMaestros()
      cargarEvidencias()
    }
  }, [id])

  const cargarPlanilla = async () => {
    const { data, error } = await supabase
      .from('planillas')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al cargar la planilla' })
      return
    }
    setPlanilla(data)
  }

  const cargarRegistros = async () => {
    const { data, error } = await supabase
      .from('planilla_detalles')
      .select('*')
      .eq('planilla_id', id)
      .order('id', { ascending: true })

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al cargar registros' })
      setCargando(false)
      return
    }

    const registrosFormateados: Registro[] = (data || []).map((r: any, index: number) => ({
      id: r.id,
      planilla_id: r.planilla_id,
      numero: index + 1,
      equipo: r.equipo || '',
      proveedor: r.proveedor || '',
      operador: r.operador || '',
      cedula: r.cedula || '',
      fase: r.fase || '',
      h_inicial: r.h_inicial || null,
      h_final: r.h_final || null,
      hora_inicio: r.hora_inicio || '',
      hora_fin: r.hora_fin || '',
      n_recibo: r.n_recibo?.toString() || '',
      observaciones: r.observaciones || '',
      horometro_inicial: r.horometro_inicial || null,
      horometro_final: r.horometro_final || null,
      evidencia_url: r.evidencia_url || '',
      notas_edicion: r.notas_edicion || ''
    }))

    setRegistros(registrosFormateados)
    setCargando(false)
  }

  const cargarDatosMaestros = async () => {
    const [eqRes, opRes, faRes] = await Promise.all([
      supabase.from('equipos').select('*').order('nombre', { ascending: true }),
      supabase.from('operadores').select('*').order('nombre', { ascending: true }),
      supabase.from('fases').select('*').order('nombre', { ascending: true })
    ])

    if (eqRes.data) setEquipos(eqRes.data)
    if (opRes.data) setOperadores(opRes.data)
    if (faRes.data) setFases(faRes.data)
  }

  const cargarEvidencias = async () => {
    const { data } = await supabase.from('evidencias').select('*').eq('planilla_id', id)
    if (data) setEvidencias(data)
  }

  // Guardar registro en Supabase
  const guardarRegistro = useCallback(async (registro: Registro) => {
    const { error } = await supabase
      .from('planilla_detalles')
      .update({
        equipo: registro.equipo,
        proveedor: registro.proveedor,
        operador: registro.operador,
        cedula: registro.cedula,
        fase: registro.fase,
        h_inicial: registro.h_inicial,
        h_final: registro.h_final,
        hora_inicio: registro.hora_inicio,
        hora_fin: registro.hora_fin,
        n_recibo: registro.n_recibo ? parseInt(registro.n_recibo) : null,
        observaciones: registro.observaciones,
        horometro_inicial: registro.horometro_inicial,
        horometro_final: registro.horometro_final,
        evidencia_url: registro.evidencia_url,
        notas_edicion: registro.notas_edicion
      })
      .eq('id', registro.id)

    if (error) {
      setMensaje({ tipo: 'error', texto: `Error al guardar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: '✅ Cambios guardados' })
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 2000)
    }
  }, [])

  // Actualizar celda y guardar automáticamente
  const actualizarCelda = (index: number, campo: keyof Registro, valor: any) => {
    const nuevosRegistros = [...registros]
    nuevosRegistros[index] = { ...nuevosRegistros[index], [campo]: valor }
    setRegistros(nuevosRegistros)

    // Autoguardado después de 1 segundo
    setTimeout(() => {
      guardarRegistro(nuevosRegistros[index])
    }, 1000)
  }

  // Agregar nueva fila
  const agregarFila = async () => {
    const { data, error } = await supabase
      .from('planilla_detalles')
      .insert({
        planilla_id: parseInt(id || '0'),
        equipo: '',
        proveedor: '',
        operador: '',
        cedula: '',
        fase: '',
        h_inicial: 0,
        h_final: 0,
        hora_inicio: planilla?.hora_inicio || '',
        hora_fin: '',
        n_recibo: 0,
        observaciones: '',
        horometro_inicial: 0,
        horometro_final: 0
      })
      .select()
      .single()

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al agregar fila' })
      return
    }

    const nuevoRegistro: Registro = {
      id: data.id,
      planilla_id: data.planilla_id,
      numero: registros.length + 1,
      equipo: '',
      proveedor: '',
      operador: '',
      cedula: '',
      fase: '',
      h_inicial: 0,
      h_final: 0,
      hora_inicio: planilla?.hora_inicio || '',
      hora_fin: '',
      n_recibo: '',
      observaciones: '',
      horometro_inicial: 0,
      horometro_final: 0,
      evidencia_url: '',
      notas_edicion: ''
    }

    setRegistros([...registros, nuevoRegistro])
  }

  // Eliminar fila
  const eliminarFila = async (index: number) => {
    const registro = registros[index]

    if (!confirm('¿Estás seguro de eliminar este registro?')) return

    const { error } = await supabase
      .from('planilla_detalles')
      .delete()
      .eq('id', registro.id)

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar' })
      return
    }

    const nuevosRegistros = registros.filter((_, i) => i !== index)
    setRegistros(nuevosRegistros)
    setMensaje({ tipo: 'exito', texto: 'Registro eliminado' })
  }

  // Subir fotos adicionales
  const subirFotosAdicionales = async () => {
    if (archivosNuevos.length === 0) return
    setMensaje({ tipo: 'exito', texto: 'Subiendo fotos...' })

    for (const file of archivosNuevos) {
      const fileName = `${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('recibos').upload(fileName, file)
      if (!error) {
        const { data: urlData } = supabase.storage.from('recibos').getPublicUrl(fileName)
        await supabase.from('evidencias').insert({ planilla_id: parseInt(id || '0'), imagen_url: urlData.publicUrl })
      }
    }
    setArchivosNuevos([])
    cargarEvidencias()
    setMensaje({ tipo: 'exito', texto: '✅ Fotos subidas correctamente' })
  }

  // Cerrar turno
  const cerrarTurno = async () => {
    if (!confirm('¿Cerrar el turno? Podrás seguir editando si es necesario.')) return

    const { error } = await supabase
      .from('planillas')
      .update({
        estado: 'CERRADO',
        hora_final: new Date().toTimeString().slice(0, 5)
      })
      .eq('id', id)

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al cerrar turno' })
      return
    }

    setMensaje({ tipo: 'exito', texto: '✅ Turno cerrado exitosamente. Puedes seguir editando si lo necesitas.' })
    setTimeout(() => {
      cargarPlanilla()
    }, 1500)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#0077B6] mx-auto" />
          <p className="mt-4 text-slate-600">Cargando turno...</p>
        </div>
      </div>
    )
  }

  if (!planilla) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="mt-4 text-slate-600">No se encontró el turno</p>
          <button
            onClick={() => navigate('/panel')}
            className="mt-4 text-[#0077B6] hover:underline"
          >
            Volver al panel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header del Turno */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-full mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/historial')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Turno: {planilla.motonave}
                </h1>
                <p className="text-sm text-slate-500">
                  {planilla.tipo_carga} • {planilla.turno} • {planilla.auxiliar}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                planilla.estado === 'EN_CURSO'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {planilla.estado === 'EN_CURSO' ? '🟢 En curso' : '🔒 Cerrado (Editable)'}
              </span>

              {planilla.estado === 'EN_CURSO' && (
                <button
                  onClick={cerrarTurno}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Cerrar Turno
                </button>
              )}
            </div>
          </div>

          {/* Info del turno */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-200">
            <div>
              <p className="text-xs text-slate-500">Fecha</p>
              <p className="text-sm font-medium">{planilla.fecha}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Hora Inicio</p>
              <p className="text-sm font-medium">{planilla.hora_inicio}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Registros</p>
              <p className="text-sm font-medium">{registros.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Auxiliar</p>
              <p className="text-sm font-medium">{planilla.auxiliar}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {mensaje.texto && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          mensaje.tipo === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Tabla de Registros */}
      <div className="max-w-full mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0077B6]" />
              <h2 className="font-medium text-slate-900">Registros del Turno</h2>
              <span className="text-xs text-slate-500">({registros.length} registros)</span>
            </div>

            <div className="flex gap-2">
              {/* Botón Agregar Fotos */}
              <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors">
                <ImageIcon className="w-4 h-4" />
                Agregar Fotos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setArchivosNuevos(Array.from(e.target.files || []))}
                />
              </label>
              {archivosNuevos.length > 0 && (
                <button
                  onClick={subirFotosAdicionales}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Subir ({archivosNuevos.length})
                </button>
              )}

              <button
                onClick={agregarFila}
                className="px-4 py-2 bg-[#0077B6] hover:bg-[#005f8f] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar Registro
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase">N°</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Equipo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Proveedor</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Operador</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Cédula</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Fase</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase">H.Inicial</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase">H.Final</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Hora Ini</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Hora Fin</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase">N° Recibo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Observaciones</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {registros.map((registro, index) => (
                  <tr key={registro.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-sm font-medium text-slate-900">
                      {index + 1}
                    </td>

                    {/* Equipo - INPUT DE TEXTO LIBRE con autocompletado */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={registro.equipo}
                        onChange={(e) => actualizarCelda(index, 'equipo', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none"
                        placeholder="Ej: ELEVADOR 01611"
                        list={`lista-equipos-${index}`}
                      />
                      <datalist id={`lista-equipos-${index}`}>
                        {equipos.map((eq) => (
                          <option key={eq.id} value={eq.nombre} />
                        ))}
                      </datalist>
                    </td>

                    {/* Proveedor - INPUT DE TEXTO LIBRE con autocompletado */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={registro.proveedor}
                        onChange={(e) => actualizarCelda(index, 'proveedor', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none"
                        placeholder="Ej: PALERMO"
                        list={`lista-proveedores-${index}`}
                      />
                      <datalist id={`lista-proveedores-${index}`}>
                        {proveedores.map((prov, i) => (
                          <option key={i} value={prov} />
                        ))}
                      </datalist>
                    </td>

                    {/* Operador - INPUT DE TEXTO LIBRE con autocompletado */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={registro.operador}
                        onChange={(e) => actualizarCelda(index, 'operador', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none"
                        placeholder="Nombre del operador"
                        list={`lista-operadores-${index}`}
                      />
                      <datalist id={`lista-operadores-${index}`}>
                        {operadores.map((op) => (
                          <option key={op.id} value={op.nombre} />
                        ))}
                      </datalist>
                    </td>

                    {/* Cédula */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={registro.cedula}
                        onChange={(e) => actualizarCelda(index, 'cedula', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none"
                        placeholder="N/A"
                      />
                    </td>

                    {/* Fase - INPUT DE TEXTO LIBRE con autocompletado */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={registro.fase}
                        onChange={(e) => actualizarCelda(index, 'fase', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none"
                        placeholder="1RA FASE"
                        list={`lista-fases-${index}`}
                      />
                      <datalist id={`lista-fases-${index}`}>
                        {fases.map((f) => (
                          <option key={f.id} value={f.nombre} />
                        ))}
                      </datalist>
                    </td>

                    {/* H.Inicial (Horómetro) */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.1"
                        value={registro.h_inicial ?? ''}
                        onChange={(e) => actualizarCelda(index, 'h_inicial', e.target.value === '' ? null : parseFloat(e.target.value))}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none"
                      />
                    </td>

                    {/* H.Final (Horómetro) */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.1"
                        value={registro.h_final ?? ''}
                        onChange={(e) => actualizarCelda(index, 'h_final', e.target.value === '' ? null : parseFloat(e.target.value))}
                        className={`w-24 px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none ${
                          !registro.h_final && registro.h_inicial ? 'border-red-400 bg-red-50' : 'border-slate-300'
                        }`}
                      />
                    </td>

                    {/* Hora Inicio */}
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={registro.hora_inicio}
                        onChange={(e) => actualizarCelda(index, 'hora_inicio', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none"
                      />
                    </td>

                    {/* Hora Final */}
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={registro.hora_fin}
                        onChange={(e) => actualizarCelda(index, 'hora_fin', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none"
                      />
                    </td>

                    {/* N° Recibo */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={registro.n_recibo}
                        onChange={(e) => actualizarCelda(index, 'n_recibo', e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none"
                      />
                    </td>

                    {/* Observaciones */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={registro.observaciones}
                        onChange={(e) => actualizarCelda(index, 'observaciones', e.target.value)}
                        className="w-32 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none"
                        placeholder="1H ALIMENTO"
                      />
                    </td>

                    {/* Acciones */}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => eliminarFila(index)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer de la tabla */}
          {registros.length === 0 && (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay registros aún</p>
              <p className="text-sm text-slate-400 mt-1">
                Haz clic en "Agregar Registro" para comenzar
              </p>
            </div>
          )}
        </div>

        {/* Sección de Evidencias */}
        {evidencias.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-purple-600" />
              Evidencias Fotográficas del Turno ({evidencias.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {evidencias.map((ev) => (
                <a
                  key={ev.id}
                  href={ev.imagen_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 hover:border-[#0077B6] transition-colors"
                >
                  <img src={ev.imagen_url} alt="Recibo" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Leyenda */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Instrucciones
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Los cambios se guardan automáticamente al modificar una celda</li>
            <li>• Puedes escribir libremente en Equipo, Proveedor, Operador y Fase</li>
            <li>• Al escribir, se sugieren valores de la base de datos (autocompletado)</li>
            <li>• Los campos en rojo indican datos faltantes</li>
            <li>• Cierra el turno cuando finalice la operación (19:30 o 07:30)</li>
            <li>• Puedes seguir editando aunque el turno esté cerrado</li>
          </ul>
        </div>
      </div>
    </div>
  )
}