import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Save, Upload, Building2, Mail, Phone, MapPin, Palette, Image as ImageIcon } from 'lucide-react'

interface ConfigItem {
  clave: string
  valor: string
  descripcion?: string  // ← Agrega el '?' para hacerlo opcional
}

export default function Configuracion() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' })
  const [logoPreview, setLogoPreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    cargarConfiguracion()
  }, [])

  const cargarConfiguracion = async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('clave, valor')

      if (error) throw error

      const configObj: Record<string, string> = {}
      data?.forEach((item: ConfigItem) => {
        configObj[item.clave] = item.valor
      })

      setConfig(configObj)
      if (configObj.logo_url) {
        setLogoPreview(configObj.logo_url)
      }
    } catch (error: any) {
      console.error('Error al cargar configuración:', error)
      setMensaje({ texto: 'Error al cargar configuración: ' + error.message, tipo: 'error' })
    }
    setCargando(false)
  }

  const mostrarMensaje = (texto: string, tipo: string) => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000)
  }

  const handleInputChange = (clave: string, valor: string) => {
    setConfig(prev => ({ ...prev, [clave]: valor }))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      mostrarMensaje('Solo se permiten archivos de imagen', 'error')
      return
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      mostrarMensaje('La imagen no debe superar 2MB', 'error')
      return
    }

    // Convertir a base64 para previsualización
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setLogoPreview(base64)
      setConfig(prev => ({ ...prev, logo_url: base64 }))
    }
    reader.readAsDataURL(file)
  }

  const guardarConfiguracion = async () => {
    setGuardando(true)
    try {
      // Guardar cada configuración
      const promesas = Object.entries(config).map(([clave, valor]) =>
        supabase
          .from('configuracion')
          .upsert(
            { clave, valor, actualizado_en: new Date().toISOString() },
            { onConflict: 'clave' }
          )
      )

      await Promise.all(promesas)
      mostrarMensaje('✅ Configuración guardada exitosamente', 'exito')
      
      // Recargar para actualizar la vista previa
      await cargarConfiguracion()
    } catch (error: any) {
      console.error('Error al guardar:', error)
      mostrarMensaje('❌ Error al guardar: ' + error.message, 'error')
    }
    setGuardando(false)
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300 p-6">
      {/* Encabezado */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración</h2>
            <p className="text-slate-600 dark:text-slate-400">Personaliza la apariencia y datos de tu aplicación</p>
          </div>
          <button
            onClick={guardarConfiguracion}
            disabled={guardando}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Mensaje de notificación */}
      {mensaje.texto && (
        <div className={`p-4 rounded-lg border transition-colors ${
          mensaje.tipo === 'exito' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700' :
          'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo y Nombre */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Identidad de la Empresa</h3>
          </div>

          {/* Logo */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Logo de la Empresa</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  Subir Logo
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">PNG, JPG o SVG. Máximo 2MB.</p>
                {logoPreview && (
                  <button
                    onClick={() => { setLogoPreview(''); handleInputChange('logo_url', '') }}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 mt-1"
                  >
                    Quitar logo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de la Aplicación</label>
            <input
              type="text"
              value={config.nombre_empresa || ''}
              onChange={(e) => handleInputChange('nombre_empresa', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
              placeholder="Ej: PSP - Control de Recibos"
            />
          </div>

          {/* Subtítulo */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subtítulo</label>
            <input
              type="text"
              value={config.subtitulo_empresa || ''}
              onChange={(e) => handleInputChange('subtitulo_empresa', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
              placeholder="Ej: Operaciones Portuarias"
            />
          </div>

          {/* NIT */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">NIT de la Empresa</label>
            <input
              type="text"
              value={config.nit_empresa || ''}
              onChange={(e) => handleInputChange('nit_empresa', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
              placeholder="Ej: 900.123.456-7"
            />
          </div>
        </div>

        {/* Información de Contacto */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Información de Contacto</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Email de Contacto
              </label>
              <input
                type="email"
                value={config.email_contacto || ''}
                onChange={(e) => handleInputChange('email_contacto', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                placeholder="contacto@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Teléfono
              </label>
              <input
                type="text"
                value={config.telefono_contacto || ''}
                onChange={(e) => handleInputChange('telefono_contacto', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                placeholder="+57 300 000 0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Dirección
              </label>
              <input
                type="text"
                value={config.direccion_empresa || ''}
                onChange={(e) => handleInputChange('direccion_empresa', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                placeholder="Ciudad, País"
              />
            </div>
          </div>
        </div>

        {/* Personalización de Color */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Personalización de Color</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Color Primario</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.color_primario || '#1e40af'}
                onChange={(e) => handleInputChange('color_primario', e.target.value)}
                className="w-16 h-10 rounded cursor-pointer border border-slate-300 dark:border-slate-600"
              />
              <input
                type="text"
                value={config.color_primario || '#1e40af'}
                onChange={(e) => handleInputChange('color_primario', e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                placeholder="#1e40af"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Este color se usará en botones, enlaces y elementos principales.</p>
          </div>

          {/* Vista previa de colores */}
          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg transition-colors">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Vista previa:</p>
            <div className="flex gap-2">
              <div
                className="px-4 py-2 rounded text-white text-sm font-medium"
                style={{ backgroundColor: config.color_primario || '#1e40af' }}
              >
                Botón Primario
              </div>
              <div className="px-4 py-2 rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium">
                Botón Secundario
              </div>
            </div>
          </div>
        </div>

        {/* Vista Previa en Vivo */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Vista Previa</h3>
          </div>

          <div className="bg-slate-900 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: config.color_primario || '#1e40af' }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-white text-xl font-bold">
                    {(config.nombre_empresa || 'PSP').charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">
                  {config.nombre_empresa || 'PSP - Control de Recibos'}
                </h4>
                <p className="text-slate-400 text-sm">
                  {config.subtitulo_empresa || 'Operaciones Portuarias'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg transition-colors">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Información de contacto:</p>
            <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
              {config.email_contacto && <p>📧 {config.email_contacto}</p>}
              {config.telefono_contacto && <p>📞 {config.telefono_contacto}</p>}
              {config.direccion_empresa && <p>📍 {config.direccion_empresa}</p>}
              {config.nit_empresa && <p>🏢 NIT: {config.nit_empresa}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Botón guardar inferior */}
      <div className="flex justify-end">
        <button
          onClick={guardarConfiguracion}
          disabled={guardando}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {guardando ? 'Guardando...' : 'Guardar Todos los Cambios'}
        </button>
      </div>
    </div>
  )
}