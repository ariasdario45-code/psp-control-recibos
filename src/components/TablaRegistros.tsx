import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Plus, Trash2, ArrowLeft, Lock, Clock, FileText, Loader2, XCircle, Image as ImageIcon, Save, Wand2
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

const generarHoras = () => {
  const horas = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      horas.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }
  }
  return horas
}
const opcionesHora = generarHoras()

export default function TablaRegistros() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [planilla, setPlanilla] = useState<Planilla | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [evidencias, setEvidencias] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [archivosNuevos, setArchivosNuevos] = useState<File[]>([])
  const [autoHorasAsignadas, setAutoHorasAsignadas] = useState(false)

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
    const { data, error } = await supabase.from('planillas').select('*').eq('id', id).single()
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

  const actualizarCelda = (index: number, campo: keyof Registro, valor: any) => {
    const nuevosRegistros = [...registros]
    nuevosRegistros[index] = { ...nuevosRegistros[index], [campo]: valor }
    setRegistros(nuevosRegistros)

    setTimeout(() => {
      guardarRegistro(nuevosRegistros[index])
    }, 1000)
  }

  const ejecutarAsignacionHoras = useCallback((horaSugerida: string) => {
    let cambiosRealizados = 0
    
    const nuevosRegistros = registros.map(reg => {
      if (!reg.hora_fin && (reg.hora_inicio || reg.equipo)) {
        cambiosRealizados++
        return { ...reg, hora_fin: horaSugerida }
      }
      return reg
    })

    if (cambiosRealizados === 0) return false

    setRegistros(nuevosRegistros)
    setMensaje({ tipo: 'exito', texto: `⏰ Se asignó automáticamente ${horaSugerida} a ${cambiosRealizados} registro(s).` })
    
    nuevosRegistros.forEach(reg => {
      supabase
        .from('planilla_detalles')
        .update({ hora_fin: reg.hora_fin })
        .eq('id', reg.id)
    })
    
    return true
  }, [registros])

  useEffect(() => {
    if (!planilla || autoHorasAsignadas || planilla.estado !== 'EN_CURSO' || registros.length === 0) return

    const verificarYAsignarHoras = () => {
      const ahora = new Date()
      const horaActualMinutos = ahora.getHours() * 60 + ahora.getMinutes()

      let horaSugerida = ''
      let minutosLimite = 0

      if (planilla.turno === 'DIA') {
        minutosLimite = 19 * 60 + 15
        horaSugerida = '19:30'
      } else if (planilla.turno === 'NOCHE') {
        minutosLimite = 7 * 60 + 15
        horaSugerida = '07:30'
      } else {
        return
      }

      if (horaActualMinutos >= minutosLimite) {
        const exito = ejecutarAsignacionHoras(horaSugerida)
        if (exito) {
          setAutoHorasAsignadas(true)
        }
      }
    }

    verificarYAsignarHoras()
    const intervalo = setInterval(verificarYAsignarHoras, 60000)

    return () => clearInterval(intervalo)
  }, [planilla, autoHorasAsignadas, registros, ejecutarAsignacionHoras])

  const autoCompletarHorasSalida = () => {
    if (!planilla) return
    const horaSugerida = planilla.turno === 'DIA' ? '19:30' : '07:30'
    const exito = ejecutarAsignacionHoras(horaSugerida)
    if (exito) setAutoHorasAsignadas(true)
  }

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

  const eliminarFila = async (index: number) => {
    const registro = registros[index]
    if (!confirm('¿Estás seguro de eliminar este registro?')) return

    const { error } = await supabase.from('planilla_detalles').delete().eq('id', registro.id)
    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar' })
      return
    }

    const nuevosRegistros = registros.filter((_, i) => i !== index)
    setRegistros(nuevosRegistros)
    setMensaje({ tipo: 'exito', texto: 'Registro eliminado' })
  }

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
    setTimeout(() => { cargarPlanilla() }, 1500)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#0077B6] dark:text-blue-400 mx-auto" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Cargando turno...</p>
        </div>
      </div>
    )
  }

  if (!planilla) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">No se encontró el turno</p>
          <button onClick={() => navigate('/panel')} className="mt-4 text-[#0077B6] dark:text-blue-400 hover:underline">
            Volver al panel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Header del Turno */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 transition-colors">
        <div className="max-w-full mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/historial')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Turno: {planilla.motonave}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{planilla.tipo_carga} • {planilla.turno} • {planilla.auxiliar}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                planilla.estado === 'EN_CURSO'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
              }`}>
                {planilla.estado === 'EN_CURSO' ? '🟢 En curso' : '🔒 Cerrado (Editable)'}
              </span>

              {planilla.estado === 'EN_CURSO' && (
                <button onClick={cerrarTurno} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  <Lock className="w-4 h-4" />
                  Cerrar Turno
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div><p className="text-xs text-slate-500 dark:text-slate-400">Fecha</p><p className="text-sm font-medium text-slate-900 dark:text-white">{planilla.fecha}</p></div>
            <div><p className="text-xs text-slate-500 dark:text-slate-400">Hora Inicio</p><p className="text-sm font-medium text-slate-900 dark:text-white">{planilla.hora_inicio}</p></div>
            <div><p className="text-xs text-slate-500 dark:text-slate-400">Registros</p><p className="text-sm font-medium text-slate-900 dark:text-white">{registros.length}</p></div>
            <div><p className="text-xs text-slate-500 dark:text-slate-400">Auxiliar</p><p className="text-sm font-medium text-slate-900 dark:text-white">{planilla.auxiliar}</p></div>
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
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between bg-slate-50 dark:bg-slate-700/50 gap-3 transition-colors">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0077B6] dark:text-blue-400" />
              <h2 className="font-medium text-slate-900 dark:text-white">Registros del Turno</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">({registros.length} registros)</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={autoCompletarHorasSalida}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                title="Asigna 19:30 o 07:30 manualmente a los registros pendientes"
              >
                <Wand2 className="w-4 h-4" />
                Auto Horas Salida
              </button>

              <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors">
                <ImageIcon className="w-4 h-4" />
                Tomar Foto
                <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => setArchivosNuevos(Array.from(e.target.files || []))} />
              </label>

              <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors">
                <ImageIcon className="w-4 h-4" />
                Galería
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setArchivosNuevos(Array.from(e.target.files || []))} />
              </label>

              {archivosNuevos.length > 0 && (
                <button onClick={subirFotosAdicionales} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  <Save className="w-4 h-4" />
                  Subir ({archivosNuevos.length})
                </button>
              )}

              <button onClick={agregarFila} className="px-4 py-2 bg-[#0077B6] hover:bg-[#005f8f] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" />
                Agregar Registro
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 transition-colors">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">N°</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Equipo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Proveedor</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Operador</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Cédula</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Fase</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">H.Ini</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">H.Fin</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Hora Ini</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Hora Fin</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">N° Recibo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Observaciones</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 transition-colors">
                {registros.map((registro, index) => (
                  <tr key={registro.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-3 py-2 text-sm font-medium text-slate-900 dark:text-white">{index + 1}</td>

                    <td className="px-3 py-2">
                      <input type="text" value={registro.equipo} onChange={(e) => actualizarCelda(index, 'equipo', e.target.value)} className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors" placeholder="Ej: ELEVADOR 01611" list={`lista-equipos-${index}`} />
                      <datalist id={`lista-equipos-${index}`}>{equipos.map((eq) => (<option key={eq.id} value={eq.nombre} />))}</datalist>
                    </td>

                    <td className="px-3 py-2">
                      <input type="text" value={registro.proveedor} onChange={(e) => actualizarCelda(index, 'proveedor', e.target.value)} className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors" placeholder="Ej: PALERMO" list={`lista-proveedores-${index}`} />
                      <datalist id={`lista-proveedores-${index}`}>{proveedores.map((prov, i) => (<option key={i} value={prov} />))}</datalist>
                    </td>

                    <td className="px-3 py-2">
                      <input type="text" value={registro.operador} onChange={(e) => actualizarCelda(index, 'operador', e.target.value)} className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors" placeholder="Nombre del operador" list={`lista-operadores-${index}`} />
                      <datalist id={`lista-operadores-${index}`}>{operadores.map((op) => (<option key={op.id} value={op.nombre} />))}</datalist>
                    </td>

                    <td className="px-3 py-2">
                      <input type="text" value={registro.cedula} onChange={(e) => actualizarCelda(index, 'cedula', e.target.value)} className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors" placeholder="N/A" />
                    </td>

                    <td className="px-3 py-2">
                      <input type="text" value={registro.fase} onChange={(e) => actualizarCelda(index, 'fase', e.target.value)} className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors" placeholder="1RA FASE" list={`lista-fases-${index}`} />
                      <datalist id={`lista-fases-${index}`}>{fases.map((f) => (<option key={f.id} value={f.nombre} />))}</datalist>
                    </td>

                    <td className="px-3 py-2">
                      <input type="number" step="0.1" value={registro.h_inicial ?? ''} onChange={(e) => actualizarCelda(index, 'h_inicial', e.target.value === '' ? null : parseFloat(e.target.value))} className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors" />
                    </td>

                    <td className="px-3 py-2">
                      <input type="number" step="0.1" value={registro.h_final ?? ''} onChange={(e) => actualizarCelda(index, 'h_final', e.target.value === '' ? null : parseFloat(e.target.value))} className={`w-20 px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors ${!registro.h_final && registro.h_inicial ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600'}`} />
                    </td>

                    <td className="px-3 py-2">
                      <select
                        value={registro.hora_inicio}
                        onChange={(e) => actualizarCelda(index, 'hora_inicio', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                      >
                        <option value="">--:--</option>
                        {opcionesHora.map(h => (<option key={h} value={h}>{h}</option>))}
                      </select>
                    </td>

                    <td className="px-3 py-2">
                      <select
                        value={registro.hora_fin}
                        onChange={(e) => actualizarCelda(index, 'hora_fin', e.target.value)}
                        className={`w-24 px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors ${!registro.hora_fin && registro.hora_inicio ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600'}`}
                      >
                        <option value="">--:--</option>
                        {opcionesHora.map(h => (<option key={h} value={h}>{h}</option>))}
                      </select>
                    </td>

                    <td className="px-3 py-2">
                      <input type="text" value={registro.n_recibo} onChange={(e) => actualizarCelda(index, 'n_recibo', e.target.value)} className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors" />
                    </td>

                    <td className="px-3 py-2">
                      <input type="text" value={registro.observaciones} onChange={(e) => actualizarCelda(index, 'observaciones', e.target.value)} className="w-32 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm focus:ring-1 focus:ring-[#0077B6] outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors" placeholder="1H ALIMENTO" />
                    </td>

                    <td className="px-3 py-2">
                      <button onClick={() => eliminarFila(index)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Eliminar registro">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {registros.length === 0 && (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No hay registros aún</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Haz clic en "Agregar Registro" para comenzar</p>
            </div>
          )}
        </div>

        {/* Sección de Evidencias */}
        {evidencias.length > 0 && (
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-colors">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Evidencias Fotográficas del Turno ({evidencias.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {evidencias.map((ev) => (
                <a key={ev.id} href={ev.imagen_url} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 hover:border-[#0077B6] dark:hover:border-blue-400 transition-colors">
                  <img src={ev.imagen_url} alt="Recibo" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Leyenda */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors">
          <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Instrucciones
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Los cambios se guardan automáticamente al modificar una celda</li>
            <li>• Puedes escribir libremente en Equipo, Proveedor, Operador y Fase</li>
            <li>• <strong>Automático:</strong> A las 19:15 (turno día) o 07:15 (turno noche), el sistema asignará 19:30 o 07:30 automáticamente</li>
            <li>• Las horas se pueden seleccionar fácilmente del menú o editar manualmente si hubo inconvenientes</li>
            <li>• Puedes seguir editando aunque el turno esté cerrado</li>
          </ul>
        </div>
      </div>
    </div>
  )
}