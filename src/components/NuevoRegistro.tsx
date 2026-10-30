import { useState, useEffect } from 'react'
import { Save, X, Trash2, Edit2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Datos de ejemplo para los selects
const equipos = [
  'GRUA DE TIERRA 10001',
  'ASCENSOR 02501',
  'ASCENSOR 02502',
  'ASCENSOR 01607',
  'ASCENSOR 01606',
  'ASCENSOR 01608',
  'FMC 04',
  'SXU637',
  'UYW443',
  'UYU728',
  'TUC 279',
  'BEP380',
]

const proveedores = [
  'PALERMO SOCIEDAD PORTUARIA SA',
  'EQUIPOS PORTUARIOS GLOBAL AMERICAS SA',
  'FMC',
  'OPL',
]

const operadores = [
  'JORGE SALAS',
  'JAVIER FERREIRA',
  'EVELIO CAMARGO',
  'OSORIO CAHUANA OSCAR ENRIQUE',
  'NELSON DE MOYA',
  'JOEL CERVANTE',
  'FELIPE VASQUEZ',
  'JAWER ROJANO',
  'ALEJANDRO MENDOZA',
  'RAFAEL MACHADO',
  'FERNY CARILLO',
  'RODOLFO PACHECO',
]

const fases = ['1RA FASE', '2DA FASE']

const turnos = ['DIA', 'NOCHE']

const motonaves = [
  'BAO RIN LING',
  'HONG RUN 16',
  'K BEREKET',
  'SHENG PING HAI',
]

const auxiliares = [
  'MIGUEL RACEDO',
  'CRISTIAN POLO',
  'ALFREDO SOLAND',
]

const tiposCarga = [
  'ACERO',
  'COQUE',
  'TUBERIA',
  'ALAMBRON',
  'GRANELES',
  'CONTENEDORES',
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
}

export default function NuevoRegistro() {
  const navigate = useNavigate()
  
  // Estado del encabezado
  const [fecha, setFecha] = useState('')
  const [tipoCarga, setTipoCarga] = useState('')
  const [turno, setTurno] = useState('')
  const [motonave, setMotonave] = useState('')
  const [auxiliar, setAuxiliar] = useState('')

  // Estado de los registros
  const [registros, setRegistros] = useState<Registro[]>([])
  
  // Estado del formulario
  const [registroActual, setRegistroActual] = useState<Registro>({
    id: 0,
    equipo: '',
    proveedor: '',
    operador: '',
    cedula: '',
    fase: '',
    hInicial: 0,
    hFinal: 0,
    horaInicio: '7:30',
    horaFin: '19:30',
    nRecibo: 0,
    observaciones: '',
  })

  const [editandoId, setEditandoId] = useState<number | null>(null)

  // Cargar datos del localStorage al montar
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

  // Guardar en localStorage cuando cambien los datos
  useEffect(() => {
    const datos = {
      fecha,
      tipoCarga,
      turno,
      motonave,
      auxiliar,
      registros,
      fechaActualizacion: new Date().toISOString(),
    }
    localStorage.setItem('planilla_actual', JSON.stringify(datos))
  }, [fecha, tipoCarga, turno, motonave, auxiliar, registros])

  // Manejar cambios del formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setRegistroActual(prev => ({
      ...prev,
      [name]: name === 'id' || name === 'hInicial' || name === 'hFinal' || name === 'nRecibo' 
        ? parseFloat(value) || 0 
        : value,
    }))
  }

  // Agregar o actualizar registro
  const guardarRegistro = () => {
    if (!registroActual.equipo || !registroActual.operador) {
      alert('Por favor completa al menos Equipo y Operador')
      return
    }

    if (editandoId !== null) {
      // Actualizar registro existente
      setRegistros(prev =>
        prev.map(r => (r.id === editandoId ? { ...registroActual, id: editandoId } : r))
      )
      setEditandoId(null)
    } else {
      // Agregar nuevo registro
      const nuevoId = registros.length > 0 ? Math.max(...registros.map(r => r.id)) + 1 : 1
      setRegistros(prev => [...prev, { ...registroActual, id: nuevoId }])
    }

    // Limpiar formulario
    setRegistroActual({
      id: 0,
      equipo: '',
      proveedor: '',
      operador: '',
      cedula: '',
      fase: '',
      hInicial: 0,
      hFinal: 0,
      horaInicio: '7:30',
      horaFin: '19:30',
      nRecibo: 0,
      observaciones: '',
    })
  }

  // Editar registro
  const editarRegistro = (registro: Registro) => {
    setRegistroActual(registro)
    setEditandoId(registro.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Eliminar registro
  const eliminarRegistro = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      setRegistros(prev => prev.filter(r => r.id !== id))
      if (editandoId === id) {
        setEditandoId(null)
        setRegistroActual({
          id: 0,
          equipo: '',
          proveedor: '',
          operador: '',
          cedula: '',
          fase: '',
          hInicial: 0,
          hFinal: 0,
          horaInicio: '7:30',
          horaFin: '19:30',
          nRecibo: 0,
          observaciones: '',
        })
      }
    }
  }

  // Limpiar todo
  const limpiarTodo = () => {
    if (confirm('¿Estás seguro de limpiar todos los datos? Esta acción no se puede deshacer.')) {
      localStorage.removeItem('planilla_actual')
      setFecha('')
      setTipoCarga('')
      setTurno('')
      setMotonave('')
      setAuxiliar('')
      setRegistros([])
      setRegistroActual({
        id: 0,
        equipo: '',
        proveedor: '',
        operador: '',
        cedula: '',
        fase: '',
        hInicial: 0,
        hFinal: 0,
        horaInicio: '7:30',
        horaFin: '19:30',
        nRecibo: 0,
        observaciones: '',
      })
      setEditandoId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Carga *</label>
            <select
              value={tipoCarga}
              onChange={(e) => setTipoCarga(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar</option>
              {tiposCarga.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Turno *</label>
            <select
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar</option>
              {turnos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motonave *</label>
            <select
              value={motonave}
              onChange={(e) => setMotonave(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar</option>
              {motonaves.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Auxiliar *</label>
            <select
              value={auxiliar}
              onChange={(e) => setAuxiliar(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar</option>
              {auxiliares.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Formulario de registro */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {editandoId !== null ? 'Editar Registro' : 'Agregar Nuevo Registro'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Equipo *</label>
            <select
              name="equipo"
              value={registroActual.equipo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar</option>
              {equipos.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label>
            <select
              name="proveedor"
              value={registroActual.proveedor}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar</option>
              {proveedores.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Operador *</label>
            <select
              name="operador"
              value={registroActual.operador}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar</option>
              {operadores.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cédula</label>
            <input
              type="text"
              name="cedula"
              value={registroActual.cedula}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="N/A o número"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fase</label>
            <select
              name="fase"
              value={registroActual.fase}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar</option>
              {fases.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">H.Inicial</label>
            <input
              type="number"
              name="hInicial"
              value={registroActual.hInicial || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">H.Final</label>
            <input
              type="number"
              name="hFinal"
              value={registroActual.hFinal || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora Inicial</label>
            <input
              type="time"
              name="horaInicio"
              value={registroActual.horaInicio}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora Final</label>
            <input
              type="time"
              name="horaFin"
              value={registroActual.horaFin}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">N° Recibo</label>
            <input
              type="number"
              name="nRecibo"
              value={registroActual.nRecibo || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
            <input
              type="text"
              name="observaciones"
              value={registroActual.observaciones}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1H ALIMENTACION, SIN DETENCION, etc."
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={guardarRegistro}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            {editandoId !== null ? 'Actualizar' : 'Agregar'}
          </button>
          {editandoId !== null && (
            <button
              onClick={() => {
                setEditandoId(null)
                setRegistroActual({
                  id: 0,
                  equipo: '',
                  proveedor: '',
                  operador: '',
                  cedula: '',
                  fase: '',
                  hInicial: 0,
                  hFinal: 0,
                  horaInicio: '7:30',
                  horaFin: '19:30',
                  nRecibo: 0,
                  observaciones: '',
                })
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Lista de registros agregados */}
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
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        reg.fase === '1RA FASE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {reg.fase}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.hInicial}</td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.hFinal}</td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.nRecibo}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => editarRegistro(reg)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => eliminarRegistro(reg.id)}
                          className="text-red-600 hover:text-red-800"
                        >
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

      {/* Botón para ir al historial */}
      <div className="flex justify-end">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Save className="w-5 h-5" />
          Guardar y Ver en Historial
        </button>
      </div>
    </div>
  )
}