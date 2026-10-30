import { useState, useEffect } from 'react'
import { Save, X, Trash2, Edit2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const opcionesHora = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30',
  '03:00', '03:30', '04:00', '04:30', '05:00', '05:30',
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
]

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
  estibador: string
}

export default function NuevoRegistro() {
  const navigate = useNavigate()
  
  // Datos maestros desde Supabase
  const [equipos, setEquipos] = useState<string[]>([])
  const [proveedores, setProveedores] = useState<string[]>([])
  const [operadores, setOperadores] = useState<string[]>([])
  const [fases, setFases] = useState<string[]>([])
  const [turnos, setTurnos] = useState<string[]>([])
  const [motonaves, setMotonaves] = useState<string[]>([])
  const [auxiliares, setAuxiliares] = useState<string[]>([])
  const [tiposCarga, setTiposCarga] = useState<string[]>([])
  const [estibadores, setEstibadores] = useState<string[]>([])

  const [fecha, setFecha] = useState('')
  const [tipoCarga, setTipoCarga] = useState('')
  const [turno, setTurno] = useState('')
  const [motonave, setMotonave] = useState('')
  const [auxiliar, setAuxiliar] = useState('')
  const [registros, setRegistros] = useState<Registro[]>([])
  const [guardando, setGuardando] = useState(false)
  
  const [registroActual, setRegistroActual] = useState<Registro>({
    id: 0, equipo: '', proveedor: '', operador: '', cedula: '',
    fase: '', hInicial: 0, hFinal: 0, horaInicio: '07:30', horaFin: '19:30',
    nRecibo: 0, observaciones: '', estibador: '',
  })

  const [editandoId, setEditandoId] = useState<number | null>(null)

  // Cargar datos maestros desde Supabase
  useEffect(() => {
    const cargarDatosMaestros = async () => {
      try {
        const [
          { data: dataEquipos },
          { data: dataProveedores },
          { data: dataOperadores },
          { data: dataFases },
          { data: dataTurnos },
          { data: dataMotonaves },
          { data: dataAuxiliares },
          { data: dataTiposCarga },
          { data: dataEstibadores },
        ] = await Promise.all([
          supabase.from('equipos').select('nombre'),
          supabase.from('proveedores').select('nombre'),
          supabase.from('operadores').select('nombre'),
          supabase.from('fases').select('nombre'),
          supabase.from('turnos').select('nombre'),
          supabase.from('naves').select('nombre'),
          supabase.from('auxiliares').select('nombre'),
          supabase.from('tipos_carga').select('nombre'),
          supabase.from('estibadores').select('nombre'),
        ])

        setEquipos(dataEquipos?.map(e => e.nombre) || [])
        setProveedores(dataProveedores?.map(p => p.nombre) || [])
        setOperadores(dataOperadores?.map(o => o.nombre) || [])
        setFases(dataFases?.map(f => f.nombre) || [])
        setTurnos(dataTurnos?.map(t => t.nombre) || [])
        setMotonaves(dataMotonaves?.map(m => m.nombre) || [])
        setAuxiliares(dataAuxiliares?.map(a => a.nombre) || [])
        setTiposCarga(dataTiposCarga?.map(t => t.nombre) || [])
        setEstibadores(dataEstibadores?.map(e => e.nombre) || [])
      } catch (error) {
        console.error('Error al cargar datos maestros:', error)
      }
    }

    cargarDatosMaestros()
  }, [])

  // Cargar datos del localStorage (planilla en progreso)
  useEffect(() => {
    const datosGuardados = localStorage.getItem('planilla_actual')
    if (datosGuardados) {
      const datos = JSON.parse(datosGuardados)
      setFecha(datos.fecha || '')
      setTipoCarga(datos.tipoCarga || '')
      setTurno(datos.turno || '')
      setMotonave(datos.motonave || '')
      setAuxiliar(datos.auxiliar || '')
      setRegistros(datos.registros || [])
    }
  }, [])

  useEffect(() => {
    const datos = {
      fecha, tipoCarga, turno, motonave, auxiliar, registros,
      fechaActualizacion: new Date().toISOString(),
    }
    localStorage.setItem('planilla_actual', JSON.stringify(datos))
  }, [fecha, tipoCarga, turno, motonave, auxiliar, registros])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setRegistroActual(prev => ({
      ...prev,
      [name]: name === 'id' || name === 'hInicial' || name === 'hFinal' || name === 'nRecibo' 
        ? parseFloat(value) || 0 : value,
    }))
  }

  const guardarRegistro = () => {
    if (!registroActual.equipo || !registroActual.operador) {
      alert('Por favor completa al menos Equipo y Operador')
      return
    }

    if (editandoId !== null) {
      setRegistros(prev =>
        prev.map(r => (r.id === editandoId ? { ...registroActual, id: editandoId } : r))
      )
      setEditandoId(null)
    } else {
      const nuevoId = registros.length > 0 ? Math.max(...registros.map(r => r.id)) + 1 : 1
      setRegistros(prev => [...prev, { ...registroActual, id: nuevoId }])
    }

    setRegistroActual({
      id: 0, equipo: '', proveedor: '', operador: '', cedula: '',
      fase: '', hInicial: 0, hFinal: 0, horaInicio: '07:30', horaFin: '19:30',
      nRecibo: 0, observaciones: '', estibador: '',
    })
  }

  const editarRegistro = (registro: Registro) => {
    setRegistroActual(registro)
    setEditandoId(registro.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const eliminarRegistro = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      setRegistros(prev => prev.filter(r => r.id !== id))
      if (editandoId === id) {
        setEditandoId(null)
        setRegistroActual({
          id: 0, equipo: '', proveedor: '', operador: '', cedula: '',
          fase: '', hInicial: 0, hFinal: 0, horaInicio: '07:30', horaFin: '19:30',
          nRecibo: 0, observaciones: '', estibador: '',
        })
      }
    }
  }

  const limpiarTodo = () => {
    if (confirm('¿Estás seguro de limpiar todos los datos?')) {
      localStorage.removeItem('planilla_actual')
      setFecha(''); setTipoCarga(''); setTurno(''); setMotonave(''); setAuxiliar('')
      setRegistros([])
      setRegistroActual({
        id: 0, equipo: '', proveedor: '', operador: '', cedula: '',
        fase: '', hInicial: 0, hFinal: 0, horaInicio: '07:30', horaFin: '19:30',
        nRecibo: 0, observaciones: '', estibador: '',
      })
      setEditandoId(null)
    }
  }

  const guardarEnSupabase = async () => {
    if (!fecha || !tipoCarga || !turno || !motonave || !auxiliar) {
      alert('Por favor completa todos los campos del encabezado')
      return
    }

    if (registros.length === 0) {
      alert('Agrega al menos un registro antes de guardar')
      return
    }

    setGuardando(true)

    try {
      const { data: planillaData, error: planillaError } = await supabase
        .from('planillas')
        .insert([{
          fecha: fecha,
          tipo_carga: tipoCarga,
          turno: turno,
          motonave: motonave,
          auxiliar: auxiliar,
        }])
        .select()

      if (planillaError) throw planillaError

      const planillaId = planillaData[0].id

      const detalles = registros.map(r => ({
        planilla_id: planillaId,
        equipo: r.equipo,
        proveedor: r.proveedor,
        operador: r.operador,
        cedula: r.cedula,
        fase: r.fase,
        h_inicial: r.hInicial,
        h_final: r.hFinal,
        hora_inicio: r.horaInicio,
        hora_fin: r.horaFin,
        n_recibo: r.nRecibo,
        observaciones: r.observaciones,
        estibador: r.estibador,
      }))

      const { error: detallesError } = await supabase
        .from('planilla_detalles')
        .insert(detalles)

      if (detallesError) throw detallesError

      localStorage.removeItem('planilla_actual')
      alert('✅ Planilla guardada exitosamente')
      navigate('/')
    } catch (error: any) {
      console.error('Error al guardar:', error)
      alert('Error al guardar: ' + error.message)
    }

    setGuardando(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Nuevo Registro de Planilla</h2>
          <button
            onClick={limpiarTodo}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Limpiar Todo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Carga *</label>
            <select
              value={tipoCarga}
              onChange={(e) => setTipoCarga(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar</option>
              {tiposCarga.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Turno *</label>
            <select
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar</option>
              {turnos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motonave *</label>
            <select
              value={motonave}
              onChange={(e) => setMotonave(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar</option>
              {motonaves.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Auxiliar *</label>
            <select
              value={auxiliar}
              onChange={(e) => setAuxiliar(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar</option>
              {auxiliares.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {editandoId !== null ? 'Editar Registro' : 'Agregar Nuevo Registro'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Equipo *</label>
            <select name="equipo" value={registroActual.equipo} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {equipos.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label>
            <select name="proveedor" value={registroActual.proveedor} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {proveedores.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Operador *</label>
            <select name="operador" value={registroActual.operador} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {operadores.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estibador</label>
            <select name="estibador" value={registroActual.estibador} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {estibadores.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cédula</label>
            <input type="text" name="cedula" value={registroActual.cedula} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="N/A o número" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fase</label>
            <select name="fase" value={registroActual.fase} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {fases.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">H.Inicial</label>
            <input type="number" name="hInicial" value={registroActual.hInicial || ''} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="0" step="0.1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">H.Final</label>
            <input type="number" name="hFinal" value={registroActual.hFinal || ''} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="0" step="0.1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora Inicial</label>
            <select name="horaInicio" value={registroActual.horaInicio} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {opcionesHora.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora Final</label>
            <select name="horaFin" value={registroActual.horaFin} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {opcionesHora.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">N° Recibo</label>
            <input type="number" name="nRecibo" value={registroActual.nRecibo || ''} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="0" />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
            <input type="text" name="observaciones" value={registroActual.observaciones} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="1H ALIMENTACION, SIN DETENCION, etc." />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={guardarRegistro}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            <Save className="w-4 h-4" />
            {editandoId !== null ? 'Actualizar' : 'Agregar'}
          </button>
          {editandoId !== null && (
            <button onClick={() => {
              setEditandoId(null)
              setRegistroActual({
                id: 0, equipo: '', proveedor: '', operador: '', cedula: '',
                fase: '', hInicial: 0, hFinal: 0, horaInicio: '07:30', horaFin: '19:30',
                nRecibo: 0, observaciones: '', estibador: '',
              })
            }} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium">
              <X className="w-4 h-4" /> Cancelar
            </button>
          )}
        </div>
      </div>

      {registros.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Registros Agregados ({registros.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">N°</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Equipo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Operador</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Estibador</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Fase</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">H.Inicial</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">H.Final</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">N° Recibo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {registros.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-sm font-medium">{reg.id}</td>
                    <td className="px-3 py-3 text-sm">{reg.equipo}</td>
                    <td className="px-3 py-3 text-sm">{reg.operador}</td>
                    <td className="px-3 py-3 text-sm">{reg.estibador || '-'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        reg.fase === '1RA FASE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>{reg.fase}</span>
                    </td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.hInicial}</td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.hFinal}</td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.nRecibo}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => editarRegistro(reg)} className="text-blue-600 hover:text-blue-800">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => eliminarRegistro(reg.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={guardarEnSupabase}
          disabled={guardando}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {guardando ? 'Guardando en la nube...' : 'Guardar y Ver en Historial'}
        </button>
      </div>
    </div>
  )
}