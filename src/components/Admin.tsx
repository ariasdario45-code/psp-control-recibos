import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Edit2, Trash2, Save, X, Users, Truck, Box, Layers, UserShield, Clock, Ship, Package } from 'lucide-react'

type TablaActiva = 'operadores' | 'proveedores' | 'equipos' | 'fases' | 'auxiliares' | 'turnos' | 'naves' | 'tipos_carga'

interface Registro {
  id: number
  [key: string]: any
}

const configTablas: Record<TablaActiva, {
  nombre: string
  icono: any
  columnas: { key: string; label: string; tipo: 'text' | 'select' | 'number'; opciones?: string[] }[]
}> = {
  operadores: {
    nombre: 'Operadores',
    icono: Users,
    columnas: [
      { key: 'nombre', label: 'Nombre', tipo: 'text' },
      { key: 'cedula', label: 'Cédula', tipo: 'text' },
      { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['PROPIO', 'SUBCONTRATADO OPL', 'SUBCONTRATADO'] },
    ],
  },
  proveedores: {
    nombre: 'Proveedores',
    icono: Truck,
    columnas: [
      { key: 'nombre', label: 'Nombre', tipo: 'text' },
      { key: 'tipo', label: 'Tipo', tipo: 'text' },
    ],
  },
  equipos: {
    nombre: 'Equipos',
    icono: Box,
    columnas: [
      { key: 'nombre', label: 'Nombre', tipo: 'text' },
      { key: 'proveedor', label: 'Proveedor', tipo: 'text' },
      { key: 'tipo', label: 'Tipo', tipo: 'text' },
    ],
  },
  fases: {
    nombre: 'Fases',
    icono: Layers,
    columnas: [
      { key: 'nombre', label: 'Nombre', tipo: 'text' },
    ],
  },
  auxiliares: {
    nombre: 'Auxiliares',
    icono: UserShield,
    columnas: [
      { key: 'nombre', label: 'Nombre', tipo: 'text' },
      { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['AUX MARITIMO', 'AUX ALMACEN', 'PRO OPE'] },
    ],
  },
  turnos: {
    nombre: 'Turnos',
    icono: Clock,
    columnas: [
      { key: 'nombre', label: 'Nombre', tipo: 'select', opciones: ['DIA', 'NOCHE'] },
    ],
  },
  naves: {
    nombre: 'Naves',
    icono: Ship,
    columnas: [
      { key: 'nombre', label: 'Nombre', tipo: 'text' },
      { key: 'recala', label: 'Recala', tipo: 'text' },
    ],
  },
  tipos_carga: {
    nombre: 'Tipos de Carga',
    icono: Package,
    columnas: [
      { key: 'nombre', label: 'Nombre', tipo: 'text' },
    ],
  },
}

export default function Admin() {
  const [tablaActiva, setTablaActiva] = useState<TablaActiva>('operadores')
  const [registros, setRegistros] = useState<Registro[]>([])
  const [cargando, setCargando] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false)
  const [formulario, setFormulario] = useState<Record<string, any>>({})
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' })

  const config = configTablas[tablaActiva]

  // Cargar registros de la tabla activa
  const cargarRegistros = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from(tablaActiva)
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Error al cargar:', error)
      setMensaje({ texto: 'Error al cargar datos', tipo: 'error' })
    } else {
      setRegistros(data || [])
    }
    setCargando(false)
  }

  useEffect(() => {
    cargarRegistros()
  }, [tablaActiva])

  // Mostrar mensaje temporal
  const mostrarMensaje = (texto: string, tipo: string) => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000)
  }

  // Abrir formulario para agregar
  const abrirFormularioAgregar = () => {
    const nuevoForm: Record<string, any> = {}
    config.columnas.forEach(col => {
      nuevoForm[col.key] = ''
    })
    setFormulario(nuevoForm)
    setEditandoId(null)
    setMostrandoFormulario(true)
  }

  // Abrir formulario para editar
  const abrirFormularioEditar = (registro: Registro) => {
    setFormulario({ ...registro })
    setEditandoId(registro.id)
    setMostrandoFormulario(true)
  }

  // Guardar (agregar o actualizar)
  const guardarRegistro = async () => {
    if (!formulario.nombre || formulario.nombre.trim() === '') {
      mostrarMensaje('El nombre es obligatorio', 'error')
      return
    }

    setCargando(true)

    if (editandoId !== null) {
      // Actualizar
      const { error } = await supabase
        .from(tablaActiva)
        .update(formulario)
        .eq('id', editandoId)

      if (error) {
        mostrarMensaje('Error al actualizar: ' + error.message, 'error')
      } else {
        mostrarMensaje('Registro actualizado correctamente', 'exito')
        setMostrandoFormulario(false)
        await cargarRegistros()
      }
    } else {
      // Insertar
      const { error } = await supabase
        .from(tablaActiva)
        .insert([formulario])

      if (error) {
        mostrarMensaje('Error al agregar: ' + error.message, 'error')
      } else {
        mostrarMensaje('Registro agregado correctamente', 'exito')
        setMostrandoFormulario(false)
        await cargarRegistros()
      }
    }

    setCargando(false)
  }

  // Eliminar registro
  const eliminarRegistro = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return

    setCargando(true)
    const { error } = await supabase
      .from(tablaActiva)
      .delete()
      .eq('id', id)

    if (error) {
      mostrarMensaje('Error al eliminar: ' + error.message, 'error')
    } else {
      mostrarMensaje('Registro eliminado correctamente', 'exito')
      await cargarRegistros()
    }
    setCargando(false)
  }

  // Cancelar formulario
  const cancelarFormulario = () => {
    setMostrandoFormulario(false)
    setEditandoId(null)
    setFormulario({})
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Panel de Administración</h2>
        <p className="text-slate-600">Gestiona los datos maestros del sistema</p>
      </div>

      {/* Mensaje de notificación */}
      {mensaje.texto && (
        <div className={`p-4 rounded-lg ${
          mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800 border border-green-300' :
          mensaje.tipo === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
          'bg-blue-100 text-blue-800 border border-blue-300'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menú lateral de tablas */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Tablas</h3>
          <div className="space-y-1">
            {(Object.keys(configTablas) as TablaActiva[]).map((key) => {
              const cfg = configTablas[key]
              const Icono = cfg.icono
              return (
                <button
                  key={key}
                  onClick={() => { setTablaActiva(key); setMostrandoFormulario(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    tablaActiva === key
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icono className="w-4 h-4" />
                  <span>{cfg.nombre}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    tablaActiva === key ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {key === tablaActiva ? registros.length : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Contenido principal */}
        <div className="lg:col-span-3 space-y-4">
          {/* Barra de acciones */}
          <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{config.nombre}</h3>
              <p className="text-sm text-slate-600">{registros.length} registros</p>
            </div>
            <button
              onClick={abrirFormularioAgregar}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>

          {/* Formulario (modal inline) */}
          {mostrandoFormulario && (
            <div className="bg-white rounded-lg shadow p-6 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-900">
                  {editandoId !== null ? 'Editar registro' : 'Agregar nuevo registro'}
                </h4>
                <button onClick={cancelarFormulario} className="text-slate-500 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {config.columnas.map((col) => (
                  <div key={col.key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {col.label} {col.key === 'nombre' && '*'}
                    </label>
                    {col.tipo === 'select' ? (
                      <select
                        value={formulario[col.key] || ''}
                        onChange={(e) => setFormulario(prev => ({ ...prev, [col.key]: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar</option>
                        {col.opciones?.map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                    ) : col.tipo === 'number' ? (
                      <input
                        type="number"
                        value={formulario[col.key] || ''}
                        onChange={(e) => setFormulario(prev => ({ ...prev, [col.key]: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formulario[col.key] || ''}
                        onChange={(e) => setFormulario(prev => ({ ...prev, [col.key]: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder={`Ingrese ${col.label.toLowerCase()}`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={guardarRegistro}
                  disabled={cargando}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {cargando ? 'Guardando...' : (editandoId !== null ? 'Actualizar' : 'Agregar')}
                </button>
                <button
                  onClick={cancelarFormulario}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Tabla de registros */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">ID</th>
                    {config.columnas.map(col => (
                      <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold uppercase">
                        {col.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cargando ? (
                    <tr>
                      <td colSpan={config.columnas.length + 2} className="px-4 py-8 text-center text-slate-500">
                        Cargando...
                      </td>
                    </tr>
                  ) : registros.length === 0 ? (
                    <tr>
                      <td colSpan={config.columnas.length + 2} className="px-4 py-8 text-center text-slate-500">
                        No hay registros. Haz clic en "Agregar" para crear uno.
                      </td>
                    </tr>
                  ) : (
                    registros.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{reg.id}</td>
                        {config.columnas.map(col => (
                          <td key={col.key} className="px-4 py-3 text-sm text-slate-900">
                            {reg[col.key] || <span className="text-slate-400">-</span>}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => abrirFormularioEditar(reg)}
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
      </div>
    </div>
  )
}