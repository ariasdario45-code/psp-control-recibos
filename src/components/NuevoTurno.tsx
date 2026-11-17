import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { 
  Ship, Package, Clock, User, Calendar, Timer, 
  AlertCircle, CheckCircle2, Loader2, Image as ImageIcon,
  Lock, ChevronDown
} from 'lucide-react'

// ✅ Componente reutilizable: Input con dropdown inteligente
function AutoCompleteInput({ 
  label, 
  icon: Icon, 
  value, 
  onChange, 
  options, 
  placeholder 
}: { 
  label: string
  icon: any
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredOptions, setFilteredOptions] = useState<string[]>(options)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setFilteredOptions(options.filter(opt => 
      opt.toLowerCase().includes(value.toLowerCase())
    ))
  }, [value, options])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        <Icon className="w-4 h-4" />
        {label} *
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white pr-10"
          placeholder={placeholder}
        />
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onChange(option)
                setIsOpen(false)
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              {option}
            </button>
          ))}
        </div>
      )}
      
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        💡 Escribe o selecciona. Si no existe, se registrará automáticamente.
      </p>
    </div>
  )
}

export default function NuevoTurno() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  
  const [motonave, setMotonave] = useState('')
  const [tipoCarga, setTipoCarga] = useState('')
  const [turno, setTurno] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [horaInicio, setHoraInicio] = useState('')
  
  const [archivos, setArchivos] = useState<File[]>([])
  
  const [naves, setNaves] = useState<string[]>([])
  const [tiposCarga, setTiposCarga] = useState<string[]>([])

  // ✅ El auxiliar es SIEMPRE el nombre del usuario logueado (bloqueado)
  const auxiliar = usuario?.nombre || ''

  useEffect(() => {
    cargarDatos()
    autoDetectarTurno()
  }, [])

  // ✅ Auto-detectar turno según hora actual
  const autoDetectarTurno = () => {
    const ahora = new Date()
    const hora = ahora.getHours()
    const minutos = ahora.getMinutes()
    const totalMinutos = hora * 60 + minutos
    
    const esDia = totalMinutos >= 7 * 60 + 30 && totalMinutos < 19 * 60 + 30
    
    const turnoDetectado = esDia ? 'DIA' : 'NOCHE'
    setTurno(turnoDetectado)
    setHoraInicio(turnoDetectado === 'DIA' ? '07:30' : '19:30')
  }

  const cargarDatos = async () => {
    try {
      const { data: navesData } = await supabase
        .from('naves')
        .select('nombre')
        .order('nombre', { ascending: true })
      
      if (navesData) setNaves(navesData.map(n => n.nombre))

      const { data: tiposData } = await supabase
        .from('tipos_carga')
        .select('nombre')
        .order('nombre', { ascending: true })
      
      if (tiposData) {
        setTiposCarga(tiposData.map(t => t.nombre))
      } else {
        setTiposCarga(['ACERO', 'CARGA GENERAL', 'CONTENEDORES', 'COQUE'])
      }
    } catch (err) {
      console.error('Error cargando datos:', err)
    }
  }

  const handleCrearTurno = async () => {
    if (!motonave.trim()) {
      setError('Debes ingresar o seleccionar una motonave')
      return
    }
    if (!tipoCarga.trim()) {
      setError('Debes ingresar o seleccionar un tipo de carga')
      return
    }
    if (!auxiliar) {
      setError('No se pudo identificar tu usuario. Cierra sesión y vuelve a entrar.')
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
      const motonaveLimpia = motonave.trim()
      const tipoCargaLimpio = tipoCarga.trim().toUpperCase()

      // ✅ CAMPO INTELIGENTE: Crear motonave si no existe
      const { data: naveExistente } = await supabase
        .from('naves')
        .select('id')
        .eq('nombre', motonaveLimpia)
        .single()

      if (!naveExistente) {
        await supabase.from('naves').insert({ nombre: motonaveLimpia })
      }

      // ✅ CAMPO INTELIGENTE: Crear tipo de carga si no existe
      const { data: tipoExistente } = await supabase
        .from('tipos_carga')
        .select('id')
        .eq('nombre', tipoCargaLimpio)
        .single()

      if (!tipoExistente) {
        await supabase.from('tipos_carga').insert({ nombre: tipoCargaLimpio })
      }

      // ✅ Guardar planilla con el nombre del usuario logueado (bloqueado)
      const { data: planillaData, error: planillaError } = await supabase
        .from('planillas')
        .insert({
          motonave: motonaveLimpia,
          tipo_carga: tipoCargaLimpio,
          turno: turno,
          auxiliar: auxiliar,
          fecha: fecha,
          hora_inicio: horaInicio,
          creado_por: usuario?.codigo,
          estado: 'EN_CURSO'
        })
        .select()
        .single()

      if (planillaError) throw planillaError

      // Subir evidencias fotográficas
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
      
      setTimeout(() => {
        navigate(`/turno/${planillaData.id}`)
      }, 1500)

    } catch (err: any) {
      setError(`Error al crear el turno: ${err.message}`)
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 transition-colors">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Crear Nuevo Turno</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Completa los datos para iniciar un nuevo turno de operación
          </p>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Alertas */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3 transition-colors">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-900 dark:text-red-300">{error}</p>
          </div>
        )}

        {exito && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3 transition-colors">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-green-900 dark:text-green-300">{exito}</p>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Motonave - CAMPO INTELIGENTE */}
            <div className="md:col-span-2">
              <AutoCompleteInput
                label="Motonave"
                icon={Ship}
                value={motonave}
                onChange={setMotonave}
                options={naves}
                placeholder="Escribe o selecciona una motonave..."
              />
            </div>

            {/* Tipo de Carga - CAMPO INTELIGENTE */}
            <div>
              <AutoCompleteInput
                label="Tipo de Carga"
                icon={Package}
                value={tipoCarga}
                onChange={setTipoCarga}
                options={tiposCarga}
                placeholder="Escribe o selecciona un tipo de carga..."
              />
            </div>

            {/* Turno - AUTO-DETECTADO */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Clock className="w-4 h-4" />
                Turno * <span className="text-xs text-slate-500">(detectado automáticamente)</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setTurno('DIA'); setHoraInicio('07:30') }}
                  className={`flex-1 px-4 py-2.5 rounded-lg border-2 font-medium transition-all ${
                    turno === 'DIA'
                      ? 'border-[#0077B6] bg-[#0077B6] text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  ☀️ DIA (07:30 - 19:30)
                </button>
                <button
                  type="button"
                  onClick={() => { setTurno('NOCHE'); setHoraInicio('19:30') }}
                  className={`flex-1 px-4 py-2.5 rounded-lg border-2 font-medium transition-all ${
                    turno === 'NOCHE'
                      ? 'border-[#023E8A] bg-[#023E8A] text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  🌙 NOCHE (19:30 - 07:30)
                </button>
              </div>
            </div>

            {/* ✅ Auxiliar - BLOQUEADO (nombre del usuario logueado) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <User className="w-4 h-4" />
                Auxiliar * <span className="text-xs text-slate-500">(tu usuario - automático)</span>
              </label>
              <div className="w-full px-4 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-medium flex items-center gap-2 cursor-not-allowed">
                <Lock className="w-4 h-4 text-slate-500" />
                {auxiliar || 'Sin usuario'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                🔒 Este campo se registra automáticamente con tu usuario. No se puede cambiar.
              </p>
            </div>

            {/* Fecha */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Calendar className="w-4 h-4" />
                Fecha *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            {/* Hora Inicio */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Timer className="w-4 h-4" />
                Hora de Inicio *
              </label>
              <select
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Seleccionar hora...</option>
                <option value="07:30">07:30 (Turno Día)</option>
                <option value="19:30">19:30 (Turno Noche)</option>
              </select>
            </div>

            {/* Fotos de Recibos */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <ImageIcon className="w-4 h-4" />
                Fotos de los Recibos (Opcional pero recomendado)
              </label>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={(e) => setArchivos(Array.from(e.target.files || []))} 
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-[#0077B6] dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors" 
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Puedes seleccionar múltiples imágenes. Se asociarán a este turno.
              </p>
              {archivos.length > 0 && (
                <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                  ✅ {archivos.length} archivo(s) seleccionado(s)
                </p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="mt-8 flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700 transition-colors">
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
              className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors">
          <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">💡 ¿Cómo funciona?</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• El turno se detecta automáticamente según la hora actual</li>
            <li>• El auxiliar se registra automáticamente con tu usuario (bloqueado)</li>
            <li>• Motonave y Tipo de Carga son campos inteligentes (se crean si no existen)</li>
            <li>• Al crear el turno, serás redirigido a la tabla de registros</li>
            <li>• Podrás agregar equipos, operadores y datos durante el turno</li>
          </ul>
        </div>
      </div>
    </div>
  )
}