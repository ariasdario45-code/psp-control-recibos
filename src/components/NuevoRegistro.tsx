import { useState, useEffect, useRef } from 'react'
import { Save, X, Trash2, Edit2, Camera, Eye, FileText, CheckCircle } from 'lucide-react'
import OCRScanner from './OCRScanner'
import { ExtractedData } from '../lib/ocr/receiptParser'
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
  id_detalle?: number
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
  estib_hora_llegada: string
  estib_hora_salida: string
  estib_observaciones: string
}

export default function NuevoRegistro() {
  const navigate = useNavigate()
  const datosEditCargados = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
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
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idDetalleEditar, setIdDetalleEditar] = useState<number | null>(null)
  const [idPlanillaEditar, setIdPlanillaEditar] = useState<number | null>(null)
  
  const [registroActual, setRegistroActual] = useState<Registro>({
    id: 0, equipo: '', proveedor: '', operador: '', cedula: '',
    fase: '', hInicial: 0, hFinal: 0, horaInicio: '07:30', horaFin: '19:30',
    nRecibo: 0, observaciones: '', 
    estibador: '', estib_hora_llegada: '', estib_hora_salida: '', estib_observaciones: '',
  })

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string>('')
  const [imagenFile, setImagenFile] = useState<File | null>(null)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [mostrandoPreview, setMostrandoPreview] = useState<Registro | null>(null)
  
  // ✅ ESTADOS PARA OCR
  const [mostrarOCR, setMostrarOCR] = useState(false)
  const [ocrData, setOcrData] = useState<ExtractedData | null>(null)

  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0]
    setFecha(hoy)
    const horaActual = new Date().getHours()
    const turnoDetectado = (horaActual >= 6 && horaActual < 18) ? 'DIA' : 'NOCHE'
    setTurno(turnoDetectado)
  }, [])

  useEffect(() => {
    const cargarDatosMaestros = async () => {
      try {
        const [
          { data: dataEquipos }, { data: dataProveedores }, { data: dataOperadores },
          { data: dataFases }, { data: dataTurnos }, { data: dataMotonaves },
          { data: dataAuxiliares }, { data: dataTiposCarga }, { data: dataEstibadores },
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

  useEffect(() => {
    if (tiposCarga.length === 0) return
    const datosEditar = localStorage.getItem('planilla_editar')
    if (datosEditar && !datosEditCargados.current) {
      const datos = JSON.parse(datosEditar)
      setModoEdicion(true)
      setIdPlanillaEditar(datos.planilla_id || null)
      setIdDetalleEditar(datos.registros?.[0]?.id_detalle || null)
      setFecha(datos.fecha || '')
      setTipoCarga(datos.tipoCarga || '')
      setTurno(datos.turno || '')
      setMotonave(datos.motonave || '')
      setAuxiliar(datos.auxiliar || '')
      setRegistros(datos.registros || [])
      if (datos.registros && datos.registros.length > 0) setRegistroActual(datos.registros[0])
      datosEditCargados.current = true
      localStorage.removeItem('planilla_editar')
      return
    }
    if (!modoEdicion && !datosEditCargados.current) {
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
    }
  }, [tiposCarga, turnos, motonaves, auxiliares, fases])

  useEffect(() => {
    if (!modoEdicion) {
      localStorage.setItem('planilla_actual', JSON.stringify({
        fecha, tipoCarga, turno, motonave, auxiliar, registros,
        fechaActualizacion: new Date().toISOString(),
      }))
    }
  }, [fecha, tipoCarga, turno, motonave, auxiliar, registros, modoEdicion])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setRegistroActual(prev => ({
      ...prev,
      [name]: name === 'id' || name === 'hInicial' || name === 'hFinal' || name === 'nRecibo' ? parseFloat(value) || 0 : value,
    }))
  }

  const guardarRegistro = () => {
    if (!registroActual.operador && !registroActual.estibador) {
      alert('Debes registrar al menos un Operador o un Estibador')
      return
    }
    if (!registroActual.equipo && registroActual.operador) {
      alert('Por favor selecciona el Equipo para el Operador')
      return
    }

    if (editandoId !== null) {
      setRegistros(prev => prev.map(r => (r.id === editandoId ? { ...registroActual, id: editandoId } : r)))
      setEditandoId(null)
    } else {
      const nuevoId = registros.length > 0 ? Math.max(...registros.map(r => r.id)) + 1 : 1
      setRegistros(prev => [...prev, { ...registroActual, id: nuevoId }])
    }

    // Solo limpiar los datos del formulario, NO la imagen
    setRegistroActual({ 
      id: 0, equipo: '', proveedor: '', operador: '', cedula: '', fase: '', 
      hInicial: 0, hFinal: 0, horaInicio: '07:30', horaFin: '19:30', nRecibo: 0, 
      observaciones: '', estibador: '', estib_hora_llegada: '', estib_hora_salida: '', estib_observaciones: '' 
    })
  }

  const editarRegistroLocal = (registro: Registro) => {
    setRegistroActual(registro)
    setEditandoId(registro.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const eliminarRegistroLocal = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      setRegistros(prev => prev.filter(r => r.id !== id))
      if (editandoId === id) {
        setEditandoId(null)
        setRegistroActual({ 
          id: 0, equipo: '', proveedor: '', operador: '', cedula: '', fase: '', 
          hInicial: 0, hFinal: 0, horaInicio: '07:30', horaFin: '19:30', nRecibo: 0, 
          observaciones: '', estibador: '', estib_hora_llegada: '', estib_hora_salida: '', estib_observaciones: '' 
        })
      }
    }
  }

  const limpiarTodo = () => {
    if (confirm('¿Estás seguro de limpiar todos los datos?')) {
      localStorage.removeItem('planilla_actual')
      localStorage.removeItem('planilla_editar')
      setModoEdicion(false)
      setIdPlanillaEditar(null)
      setIdDetalleEditar(null)
      datosEditCargados.current = false
      setFecha(''); setTipoCarga(''); setTurno(''); setMotonave(''); setAuxiliar('')
      setRegistros([])
      setRegistroActual({ 
        id: 0, equipo: '', proveedor: '', operador: '', cedula: '', fase: '', 
        hInicial: 0, hFinal: 0, horaInicio: '07:30', horaFin: '19:30', nRecibo: 0, 
        observaciones: '', estibador: '', estib_hora_llegada: '', estib_hora_salida: '', estib_observaciones: '' 
      })
      setEditandoId(null)
      setImagenPreview('')
      setImagenFile(null)
      navigate('/historial')
    }
  }

  const subirImagen = async (file: File): Promise<string | null> => {
    try {
      setSubiendoImagen(true)
      const fileName = `recibo_${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      console.log('📤 Subiendo imagen:', { fileName, bucket: 'evidencias', fileSize: file.size })
      
      const { data, error } = await supabase.storage.from('evidencias').upload(fileName, file, { 
        cacheControl: '3600', upsert: false 
      })
      
      if (error) { 
        console.error('❌ Error al subir a Storage:', error); 
        throw error 
      }
      
      console.log('✅ Archivo subido:', data)
      const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(fileName)
      console.log('🔗 URL pública:', urlData.publicUrl)
      
      setSubiendoImagen(false)
      return urlData.publicUrl
    } catch (error: any) {
      console.error('❌ Error completo al subir imagen:', error)
      alert('Error al subir imagen: ' + error.message)
      setSubiendoImagen(false)
      return null
    }
  }

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Solo se permiten archivos de imagen'); return }
    if (file.size > 5 * 1024 * 1024) { alert('La imagen no debe superar 5MB'); return }
    
    const reader = new FileReader()
    reader.onloadend = () => setImagenPreview(reader.result as string)
    reader.readAsDataURL(file)
    setImagenFile(file)
  }

  // ✅ HANDLER PARA DATOS EXTRAÍDOS POR OCR
  const handleOCRExtracted = (data: ExtractedData) => {
    setOcrData(data)
    setMostrarOCR(false)
    
    // Auto-llenar formulario con datos de alta confianza
    if (data.numeroRecibo) {
      setRegistroActual(prev => ({ ...prev, nRecibo: parseInt(data.numeroRecibo!) || 0 }))
    }
    if (data.fecha) {
      setFecha(data.fecha)
    }
    if (data.motonave) {
      setMotonave(data.motonave)
    }
    if (data.equipo) {
      setRegistroActual(prev => ({ ...prev, equipo: data.equipo! }))
    }
    if (data.horaInicio && data.horaFinal) {
      setRegistroActual(prev => ({ 
        ...prev, 
        horaInicio: data.horaInicio!,
        horaFin: data.horaFinal!
      }))
    }
    if (data.tipoCarga) {
      setTipoCarga(data.tipoCarga)
    }
    if (data.observaciones) {
      setRegistroActual(prev => ({ ...prev, observaciones: data.observaciones! }))
    }
    
    alert('✅ Datos extraídos del recibo. Revisa el formulario.')
  }

  const guardarEnSupabase = async () => {
    if (!fecha || !tipoCarga || !turno || !motonave || !auxiliar) {
      alert('Por favor completa todos los campos del encabezado')
      return
    }
    const datosAGuardar = modoEdicion ? [registroActual] : registros
    if (datosAGuardar.length === 0) { alert('Agrega al menos un registro antes de guardar'); return }
    if (modoEdicion && (!idPlanillaEditar || !idDetalleEditar)) {
      alert('Error: No se pudieron cargar los IDs del registro.'); return
    }

    setGuardando(true)
    try {
      let planillaId = idPlanillaEditar
      let detalleId = idDetalleEditar

      if (!modoEdicion) {
        console.log('💾 Creando planilla...', { fecha, tipoCarga, turno, motonave, auxiliar })
        const { data: planillaData, error: planillaError } = await supabase
          .from('planillas')
          .insert([{ fecha, tipo_carga: tipoCarga, turno, motonave, auxiliar }])
          .select()
          
        if (planillaError) { console.error('❌ Error al crear planilla:', planillaError); throw planillaError }
        planillaId = planillaData[0].id
        console.log('✅ Planilla creada con ID:', planillaId)

        const detalles = datosAGuardar.map(r => ({
          planilla_id: planillaId,
          equipo: r.equipo,
          proveedor: r.proveedor,
          operador: r.operador || null,
          cedula: r.cedula || null,
          fase: r.fase || null,
          h_inicial: r.hInicial || 0,
          h_final: r.hFinal || 0,
          hora_inicio: r.horaInicio || null,
          hora_fin: r.horaFin || null,
          n_recibo: r.nRecibo || null,
          observaciones: r.observaciones || null,
          estibador: r.estibador || null,
          estib_hora_llegada: r.estib_hora_llegada || null,
          estib_hora_salida: r.estib_hora_salida || null,
          estib_observaciones: r.estib_observaciones || null,
        }))
        
        console.log('💾 Insertando detalles:', detalles)
        const { data: detallesData, error: detallesError } = await supabase
          .from('planilla_detalles')
          .insert(detalles)
          .select()
          
        if (detallesError) { console.error('❌ Error al insertar detalles:', detallesError); throw detallesError }
        detalleId = detallesData[0].id
        console.log('✅ Detalle creado con ID:', detalleId)
      } else {
        const detalle = datosAGuardar[0]
        const { error: updateError } = await supabase.from('planilla_detalles').update({
          equipo: detalle.equipo, proveedor: detalle.proveedor, operador: detalle.operador || null, cedula: detalle.cedula || null,
          fase: detalle.fase || null, h_inicial: detalle.hInicial || 0, h_final: detalle.hFinal || 0, hora_inicio: detalle.horaInicio || null,
          hora_fin: detalle.horaFin || null, n_recibo: detalle.nRecibo || null, observaciones: detalle.observaciones || null,
          estibador: detalle.estibador || null, estib_hora_llegada: detalle.estib_hora_llegada || null,
          estib_hora_salida: detalle.estib_hora_salida || null, estib_observaciones: detalle.estib_observaciones || null,
        }).eq('id', detalleId)
        
        if (updateError) throw updateError
        
        await supabase.from('planillas').update({ fecha, tipo_carga: tipoCarga, turno, motonave, auxiliar }).eq('id', planillaId)
      }

      // ✅ GUARDAR IMAGEN
      if (imagenFile && planillaId && detalleId) {
        console.log('📸 Subiendo imagen a Supabase Storage...')
        const imageUrl = await subirImagen(imagenFile)
        
        if (imageUrl) {
          console.log('💾 Guardando en tabla evidencias:', { planilla_id: planillaId, detalle_id: detalleId, imagen_url: imageUrl })
          const { data, error: evidenciaError } = await supabase
            .from('evidencias')
            .insert([{ planilla_id: planillaId, detalle_id: detalleId, imagen_url: imageUrl }])
            .select()
            
          if (evidenciaError) {
            console.error('❌ Error al guardar evidencia:', evidenciaError)
            alert('⚠️ Error al guardar imagen: ' + evidenciaError.message)
          } else {
            console.log('✅ Evidencia guardada correctamente:', data)
          }
        } else {
          console.error('❌ No se obtuvo URL de imagen')
          alert('⚠️ La imagen no se pudo subir a Supabase')
        }
      }

      alert('Planilla guardada exitosamente' + (imagenFile ? ' con evidencia fotográfica' : ''))
      localStorage.removeItem('planilla_actual')
      localStorage.removeItem('planilla_editar')
      datosEditCargados.current = false
      navigate('/historial')
    } catch (error: any) {
      console.error('❌ Error al guardar:', error)
      alert('Error al guardar: ' + error.message)
    }
    setGuardando(false)
  }

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900">
            {modoEdicion ? 'Editar Registro de Planilla' : 'Nuevo Registro de Planilla'}
          </h2>
          <button onClick={limpiarTodo} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
            <Trash2 className="w-4 h-4" /> Limpiar Todo
          </button>
        </div>
        {modoEdicion && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800 text-sm">
            ⚠️ Estás en modo edición. Modifica solo lo necesario.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Carga *</label>
            <select value={tipoCarga} onChange={(e) => setTipoCarga(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {tiposCarga.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Turno *</label>
            <select value={turno} onChange={(e) => setTurno(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50">
              <option value="DIA">DIA (06:00 - 17:59)</option>
              <option value="NOCHE">NOCHE (18:00 - 05:59)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motonave *</label>
            <select value={motonave} onChange={(e) => setMotonave(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {motonaves.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Auxiliar *</label>
            <select value={auxiliar} onChange={(e) => setAuxiliar(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {auxiliares.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* FORMULARIO DE REGISTRO */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {modoEdicion ? 'Datos del Registro' : 'Agregar Nuevo Registro'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Equipo *</label>
            <select name="equipo" value={registroActual.equipo} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {equipos.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label>
            <select name="proveedor" value={registroActual.proveedor} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {proveedores.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Operador</label>
            <select name="operador" value={registroActual.operador} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar (Opcional)</option>
              {operadores.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cédula</label>
            <input type="text" name="cedula" value={registroActual.cedula} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="N/A o número" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fase</label>
            <select name="fase" value={registroActual.fase} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {fases.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">H.Inicial (Horómetro)</label>
            <input type="number" name="hInicial" value={registroActual.hInicial || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="0" step="0.1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">H.Final (Horómetro)</label>
            <input type="number" name="hFinal" value={registroActual.hFinal || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="0" step="0.1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora Inicial (Reloj)</label>
            <select name="horaInicio" value={registroActual.horaInicio} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {opcionesHora.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora Final (Reloj)</label>
            <select name="horaFin" value={registroActual.horaFin} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              {opcionesHora.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">N° Recibo</label>
            <input type="number" name="nRecibo" value={registroActual.nRecibo || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="0" />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones Operador</label>
            <input type="text" name="observaciones" value={registroActual.observaciones} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Detalles del operador..." />
          </div>
        </div>

        {/* SECCIÓN ESTIBADOR */}
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-green-600 rounded-full"></span> Registro del Estibador (Independiente)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nombre del Estibador</label>
              <input type="text" list="lista-estibadores" name="estibador" value={registroActual.estibador} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Seleccionar o escribir..." />
              <datalist id="lista-estibadores">{estibadores.map(e => <option key={e} value={e} />)}</datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Hora Llegada</label>
              <select name="estib_hora_llegada" value={registroActual.estib_hora_llegada || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">Seleccionar</option>
                {opcionesHora.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Hora Salida</label>
              <select name="estib_hora_salida" value={registroActual.estib_hora_salida || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">Seleccionar</option>
                {opcionesHora.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Observaciones Estibador</label>
              <input type="text" name="estib_observaciones" value={registroActual.estib_observaciones || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="1H ALIMENTACION, DETENCION, etc." />
            </div>
          </div>
        </div>

        {/* ✅ SECCIÓN DE ESCANEO OCR */}
        <div className="mt-6 p-4 bg-purple-50 rounded-lg border-2 border-dashed border-purple-300">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Escaneo Inteligente con OCR
              </h4>
              <p className="text-sm text-purple-700 mt-1">
                Toma una foto del recibo y extrae automáticamente los datos
              </p>
            </div>
            <button
              onClick={() => setMostrarOCR(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <Camera className="w-4 h-4" />
              Escanear Recibo
            </button>
          </div>
        </div>

        {/* ✅ MODAL DE ESCANEO OCR */}
        {mostrarOCR && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <OCRScanner 
                  onExtracted={handleOCRExtracted}
                  onCancel={() => setMostrarOCR(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ✅ PANEL DE DATOS EXTRAÍDOS */}
        {ocrData && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Datos Extraídos del Recibo
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-slate-600">N° Recibo:</span><strong className="block">{ocrData.numeroRecibo || '-'}</strong></div>
              <div><span className="text-slate-600">Fecha:</span><strong className="block">{ocrData.fecha || '-'}</strong></div>
              <div><span className="text-slate-600">Motonave:</span><strong className="block">{ocrData.motonave || '-'}</strong></div>
              <div><span className="text-slate-600">Equipo:</span><strong className="block">{ocrData.equipo || '-'}</strong></div>
              <div><span className="text-slate-600">Hora Inicio:</span><strong className="block">{ocrData.horaInicio || '-'}</strong></div>
              <div><span className="text-slate-600">Hora Final:</span><strong className="block">{ocrData.horaFinal || '-'}</strong></div>
              <div><span className="text-slate-600">Tipo Carga:</span><strong className="block">{ocrData.tipoCarga || '-'}</strong></div>
              <div><span className="text-slate-600">Observaciones:</span><strong className="block">{ocrData.observaciones || '-'}</strong></div>
            </div>
            <div className="mt-3">
              <button onClick={() => setOcrData(null)} className="px-3 py-1 bg-slate-600 text-white rounded text-sm hover:bg-slate-700">
                Cerrar Panel
              </button>
            </div>
          </div>
        )}   

        {/* ✅ SECCIÓN DE CARGA DE IMAGEN MANUAL */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-slate-900">Evidencia Fotográfica del Recibo</h4>
            </div>
            {imagenPreview && (
              <button onClick={() => { setImagenPreview(''); setImagenFile(null) }} className="text-red-600 hover:text-red-800 text-sm">
                Quitar imagen
              </button>
            )}
          </div>
          {imagenPreview ? (
            <div className="relative">
              <img src={imagenPreview} alt="Vista previa" className="max-w-md rounded-lg shadow-md" />
              <div className="mt-2 text-sm text-green-600">✅ Imagen lista para subir</div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 mb-3">Sube una foto del recibo como evidencia</p>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImagenChange} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                <Camera className="w-4 h-4" /> Tomar Foto / Subir Imagen
              </button>
              <p className="text-xs text-slate-500 mt-2">JPG, PNG. Máximo 5MB.</p>
            </div>
          )}
          {subiendoImagen && <div className="mt-3 text-sm text-blue-600">📤 Subiendo imagen...</div>}
        </div>

        {!modoEdicion && (
          <div className="flex gap-2 mt-4">
            <button onClick={guardarRegistro} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              <Save className="w-4 h-4" /> {editandoId !== null ? 'Actualizar' : 'Agregar'}
            </button>
            {editandoId !== null && (
              <button onClick={() => { 
                setEditandoId(null); 
                setRegistroActual({ id: 0, equipo: '', proveedor: '', operador: '', cedula: '', fase: '', hInicial: 0, hFinal: 0, horaInicio: '07:30', horaFin: '19:30', nRecibo: 0, observaciones: '', estibador: '', estib_hora_llegada: '', estib_hora_salida: '', estib_observaciones: '' }) 
              }} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium">
                <X className="w-4 h-4" /> Cancelar
              </button>
            )}
          </div>
        )}
      </div>

      {/* TABLA DE REGISTROS AGREGADOS */}
      {registros.length > 0 && !modoEdicion && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Registros Agregados ({registros.length})</h3>
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
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {registros.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-sm font-medium">{reg.id}</td>
                    <td className="px-3 py-3 text-sm">{reg.equipo}</td>
                    <td className="px-3 py-3 text-sm">{reg.operador || '-'}</td>
                    <td className="px-3 py-3 text-sm">{reg.estibador || '-'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reg.fase === '1RA FASE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {reg.fase || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.hInicial || '-'}</td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.hFinal || '-'}</td>
                    <td className="px-3 py-3 text-sm font-mono">{reg.nRecibo || '-'}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setMostrandoPreview(reg)} className="text-blue-600 hover:text-blue-800" title="Ver detalles"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => editarRegistroLocal(reg)} className="text-slate-600 hover:text-slate-800" title="Editar"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => eliminarRegistroLocal(reg.id)} className="text-red-600 hover:text-red-800" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BOTÓN FINAL DE GUARDADO */}
      <div className="flex justify-end">
        <button 
          onClick={guardarEnSupabase} 
          disabled={guardando || subiendoImagen} 
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
        >
          <FileText className="w-5 h-5" /> {guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar Registro' : 'Guardar y Ver en Historial')}
        </button>
      </div>

      {/* MODAL DE VISTA PREVIA */}
      {mostrandoPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Vista Previa del Registro</h3>
              <button onClick={() => setMostrandoPreview(null)} className="text-slate-500 hover:text-slate-700"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
                <div><span className="text-slate-600">Equipo:</span> <strong>{mostrandoPreview.equipo}</strong></div>
                <div><span className="text-slate-600">Operador:</span> <strong>{mostrandoPreview.operador || 'N/A'}</strong></div>
                <div><span className="text-slate-600">Cédula:</span> <strong>{mostrandoPreview.cedula || 'N/A'}</strong></div>
                <div><span className="text-slate-600">H.Inicial:</span> <strong>{mostrandoPreview.hInicial || 'N/A'}</strong></div>
                <div><span className="text-slate-600">H.Final:</span> <strong>{mostrandoPreview.hFinal || 'N/A'}</strong></div>
                <div><span className="text-slate-600">N° Recibo:</span> <strong>{mostrandoPreview.nRecibo || 'N/A'}</strong></div>
              </div>
              {mostrandoPreview.estibador && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2 text-sm">Datos del Estibador</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div><span className="text-slate-600">Nombre:</span> <strong>{mostrandoPreview.estibador}</strong></div>
                    <div><span className="text-slate-600">Llegada:</span> <strong>{mostrandoPreview.estib_hora_llegada || '-'}</strong></div>
                    <div><span className="text-slate-600">Salida:</span> <strong>{mostrandoPreview.estib_hora_salida || '-'}</strong></div>
                    <div className="md:col-span-3"><span className="text-slate-600">Observaciones:</span> <strong>{mostrandoPreview.estib_observaciones || '-'}</strong></div>
                  </div>
                </div>
              )}
              {mostrandoPreview.observaciones && (
                <div className="text-sm">
                  <span className="text-slate-600">Observaciones Operador:</span> <strong>{mostrandoPreview.observaciones}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}