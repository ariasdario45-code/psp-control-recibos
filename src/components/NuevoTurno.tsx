import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { 
  Ship, Package, Clock, User, Calendar, Timer, 
  AlertCircle, CheckCircle2, Loader2, Image as ImageIcon 
} from 'lucide-react'

export default function NuevoTurno() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  
  // Datos del formulario
  const [motonave, setMotonave] = useState('')
  const [tipoCarga, setTipoCarga] = useState('')
  const [turno, setTurno] = useState('DIA')
  const [auxiliar, setAuxiliar] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [horaInicio, setHoraInicio] = useState('')
  
  // Archivos de evidencia (NUEVO)
  const [archivos, setArchivos] = useState<File[]>([])
  
  // Datos para autocompletado
  const [naves, setNaves] = useState<any[]>([])
  const [auxiliares, setAuxiliares] = useState<any[]>([])
  const [tiposCarga] = useState(['ACERO', 'CARGA GENERAL', 'CONTENEDORES', 'COQUE'])

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos()
  }, [])

  // Auto-seleccionar hora según el turno
  useEffect(() => {
    if (turno === 'DIA' && !horaInicio) setHoraInicio('07:30')
    else if (turno === 'NOCHE' && !horaInicio) setHoraInicio('19:30')
  }, [turno])

  const cargarDatos = async () => {
    try {
      // Cargar naves
      const { data: navesData } = await supabase
        .from('naves')
        .select('*')
        .order('nombre', { ascending: true })
      
      if (navesData) setNaves(navesData)
      
      // Cargar auxiliares
      const { data: auxData } = await supabase
        .from('auxiliares')
        .select('*')
        .order('nombre', { ascending: true })
      
      if (auxData) {
        setAuxiliares(auxData)
        
        // Si hay un usuario auxiliar logueado, preseleccionarlo
        if (usuario?.nombre) {
          const auxEncontrado = auxData.find((a: any) => 
            a.nombre.toLowerCase() === usuario.nombre.toLowerCase()
          )
          if (auxEncontrado) setAuxiliar(auxEncontrado.nombre)
        }
      }
    } catch (err) {
      console.error('Error cargando datos:', err)
    }
  }

  const handleCrearTurno = async () => {
    // Validaciones
    if (!motonave) {
      setError('Debes seleccionar una motonave')
      return
    }
    if (!tipoCarga) {
      setError('Debes seleccionar un tipo de carga')
      return
    }
    if (!auxiliar) {
      setError('Debes seleccionar un auxiliar')
      return
    }
    if (!fecha) {
      setError('Debes seleccionar una fecha')
      return
    }
    if (!horaInicio) {
      setError('Debes seleccionar una hora de inicio')
      return
    }

    setError('')
    setCargando(true)

    try {
      // 1. Insertar la planilla (turno)
      const { data: planillaData, error: planillaError } = await supabase
        .from('planillas')
        .insert({
          motonave: motonave,
          tipo_carga: tipoCarga,
          turno: turno,
          auxiliar: auxiliar,
          fecha: fecha,
          hora_inicio: horaInicio,
          estado: 'EN_CURSO'
        })
        .select()
        .single()

      if (planillaError) throw planillaError

      // 2. Subir evidencias fotográficas si hay archivos
      if (archivos.length > 0) {
        for (const file of archivos) {
          const fileName = `${Date.now()}_${file.name}`
          const { error: uploadError } = await supabase.storage
            .from('recibos')
            .upload(fileName, file)

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('recibos').getPublicUrl(fileName)
            await supabase.from('evidencias').insert({
              planilla_id: planillaData.id,
              imagen_url: urlData.publicUrl,
              creado_en: new Date().toISOString()
            })
          }
        }
      }

      setExito('✅ Turno creado exitosamente. Redirigiendo a la tabla de registros...')
      
      // Redirigir a la tabla de registros después de 1.5 segundos
      setTimeout(() => {
        navigate(`/turno/${planillaData.id}`)
      }, 1500)

    } catch (err: any) {
      setError(`Error al crear el turno: ${err.message}`)
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900">Crear Nuevo Turno</h1>
          <p className="text-sm text-slate-500 mt-1">
            Completa los datos para iniciar un nuevo turno de operación
          </p>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Alertas */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">{error}</p>
            </div>
          </div>
        )}

        {exito && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-green-900">{exito}</p>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Motonave */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Ship className="w-4 h-4" />
                Motonave *
              </label>
              <select
                value={motonave}
                onChange={(e) => setMotonave(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent outline-none transition-all"
              >
                <option value="">Seleccionar motonave...</option>
                {naves.map((nave) => (
                  <option key={nave.id} value={nave.nombre}>
                    {nave.nombre}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                ¿No aparece? Agrégala en Administración → Naves
              </p>
            </div>

            {/* Tipo de Carga */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Package className="w-4 h-4" />
                Tipo de Carga *
              </label>
              <select
                value={tipoCarga}
                onChange={(e) => setTipoCarga(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent outline-none transition-all"
              >
                <option value="">Seleccionar tipo...</option>
                {tiposCarga.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            {/* Turno */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Clock className="w-4 h-4" />
                Turno *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTurno('DIA')}
                  className={`flex-1 px-4 py-2.5 rounded-lg border-2 font-medium transition-all ${
                    turno === 'DIA'
                      ? 'border-[#0077B6] bg-[#0077B6] text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  ☀️ DIA (07:30 - 19:30)
                </button>
                <button
                  type="button"
                  onClick={() => setTurno('NOCHE')}
                  className={`flex-1 px-4 py-2.5 rounded-lg border-2 font-medium transition-all ${
                    turno === 'NOCHE'
                      ? 'border-[#023E8A] bg-[#023E8A] text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  🌙 NOCHE (19:30 - 07:30)
                </button>
              </div>
            </div>

            {/* Auxiliar */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <User className="w-4 h-4" />
                Auxiliar *
              </label>
              <select
                value={auxiliar}
                onChange={(e) => setAuxiliar(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent outline-none transition-all"
              >
                <option value="">Seleccionar auxiliar...</option>
                {auxiliares.map((aux) => (
                  <option key={aux.id} value={aux.nombre}>
                    {aux.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4" />
                Fecha *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Hora Inicio */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Timer className="w-4 h-4" />
                Hora de Inicio *
              </label>
              <select
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent outline-none transition-all"
              >
                <option value="">Seleccionar hora...</option>
                <option value="07:30">07:30 (Turno Día)</option>
                <option value="19:30">19:30 (Turno Noche)</option>
              </select>
            </div>

            {/* Fotos de Recibos (NUEVO) */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <ImageIcon className="w-4 h-4" />
                Fotos de los Recibos (Opcional pero recomendado)
              </label>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={(e) => setArchivos(Array.from(e.target.files || []))} 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#0077B6] hover:file:bg-blue-100" 
              />
              <p className="text-xs text-slate-500 mt-1">
                Puedes seleccionar múltiples imágenes. Se asociarán a este turno.
              </p>
              {archivos.length > 0 && (
                <p className="text-sm text-green-700 mt-2">
                  ✅ {archivos.length} archivo(s) seleccionado(s)
                </p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="mt-8 flex gap-3 pt-6 border-t border-slate-200">
            <button
              onClick={handleCrearTurno}
              disabled={cargando}
              className="flex-1 bg-[#0077B6] hover:bg-[#005f8f] text-white font-medium py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creando turno...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Crear Turno y Continuar
                </>
              )}
            </button>
            
            <button
              onClick={() => navigate('/panel')}
              className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">💡 ¿Cómo funciona?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Al crear el turno, serás redirigido a la tabla de registros</li>
            <li>• Podrás agregar equipos, operadores y datos durante el turno</li>
            <li>• Los cambios se guardan automáticamente</li>
            <li>• Al finalizar (19:30 o 07:30), podrás cerrar el turno</li>
          </ul>
        </div>
      </div>
    </div>
  )
}