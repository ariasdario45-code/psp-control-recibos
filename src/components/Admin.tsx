import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Edit2, Trash2, Save, X, Users, Truck, Box, Layers, UserShield, Clock, Ship, Package, HardHat } from 'lucide-react'

type TablaActiva = 'operadores' | 'proveedores' | 'equipos' | 'fases' | 'auxiliares' | 'turnos' | 'naves' | 'tipos_carga' | 'estibadores'

interface Registro {
  id: number
  [key: string]: any
}

interface DatosSelect {
  proveedores: string[]
  operadores: string[]
  equipos: string[]
  fases: string[]
  auxiliares: string[]
  turnos: string[]
  naves: string[]
  tiposCarga: string[]
  estibadores: string[]
}

const configTablas: Record<TablaActiva, {
  nombre: string
  icono: any
  columnas: { key: string; label: string; tipo: 'text' | 'select' | 'number'; opciones?: string[]; opcionesDinamicas?: keyof DatosSelect }[]
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
      { key: 'proveedor', label: 'Proveedor', tipo: 'select', opcionesDinamicas: 'proveedores' },
      { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['GRUA', 'ELEVADOR', 'ASCENSOR', 'FMC', 'TRACTOCAMION', 'MONTACARGAS', 'OTRO'] },
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
  estibadores: {
    nombre: 'Estibadores',
    icono: HardHat,
    columnas: [
      { key: 'nombre', label: 'Nombre', tipo: 'text' },
      { key: 'empresa', label: 'Empresa', tipo: 'text' },
      { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['ESTIBADOR', 'CAPATAZ', 'CUADRILLA'] },
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
  const [datosSelect, setDatosSelect] = useState<DatosSelect>({
    proveedores: [], operadores: [], equipos: [], fases: [],
    auxiliares: [], turnos: [], naves: [], tiposCarga: [], estibadores: []
  })

  const config = configTablas[tablaActiva]

  const cargarDatosSelect = async () => {
    const tablas: { key: keyof DatosSelect; tabla: string }[] = [
      { key: 'proveedores', tabla: 'proveedores' },
      { key: 'operadores', tabla: 'operadores' },
      { key: 'equipos', tabla: 'equipos' },
      { key: 'fases', tabla: 'fases' },
      { key: 'auxiliares', tabla: 'auxiliares' },
      { key: 'turnos', tabla: 'turnos' },
      { key: 'naves', tabla: 'naves' },
      { key: 'tiposCarga', tabla: 'tipos_carga' },
      { key: 'estibadores', tabla: 'estibadores' },
    ]

    const resultados: any = {}
    for (const item of tablas) {
      const { data } = await supabase.from(item.tabla).select('nombre').order('nombre')
      resultados[item.key] = (data || []).map((r: any) => r.nombre)
    }
    setDatosSelect(resultados)
  }

  const cargarRegistros = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from(tablaActiva)
      .select('*')
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error al cargar:', error)
      setMensaje({ texto: 'Error al cargar datos', tipo: 'error' })
    } else {
      setRegistros(data || [])
    }
    setCargando(false)
  }

  useEffect(() => {
    cargarDatosSelect()
    cargarRegistros()
  }, [tablaActiva])

  const mostrarMensaje = (texto: string, tipo: string) => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000)
  }

  const abrirFormularioAgregar = () => {
    const nuevoForm: Record<string, any> = {}
    config.columnas.forEach(col => {
      nuevoForm[col.key] = ''
    })
    setFormulario(nuevoForm)
    setEditandoId(null)
    setMostrandoFormulario(true)
  }

  const abrirFormularioEditar = (registro: Registro) => {
    setFormulario({ ...registro })
    setEditandoId(registro.id)
    setMostrandoFormulario(true)
  }

  const guardarRegistro = async () => {
    if (!formulario.nombre || formulario.nombre.trim() === '') {
      mostrarMensaje('El nombre es obligatorio', 'error')
      return
    }

    setCargando(true)

    if (editandoId !== null) {
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
        await cargarDatosSelect()
      }
    } else {
      const { error } = await supabase
        .from(tablaActiva)
        .insert([formulario])

      if (error) {
        if (error.message.includes('unique')) {
          mostrarMensaje('Ese nombre ya existe. Usa otro diferente.', 'error')
        } else {
          mostrarMensaje('Error al agregar: ' + error.message, 'error')
        }
      } else {
        mostrarMensaje('Registro agregado correctamente', 'exito')
        setMostrandoFormulario(false)
        await cargarRegistros()
        await cargarDatosSelect()
      }
    }

    setCargando(false)
  }

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
      await cargarDatosSelect()
    }
    setCargando(false)
  }

  const cancelarFormulario = () => {
    setMostrandoFormulario(false)
    setEditandoId(null)
    setFormulario({})
  }

  const getOpcionesCampo = (col: typeof config.columnas[0]): string[] => {
    if (col.opcionesDinamicas) {
      return datosSelect[col.opcionesDinamicas] || []
    }
    return col.opciones || []
  }

  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300 p-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700 transition-colors">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Panel de Administración</h2>
        <p className="text-slate-600 dark:text-slate-400">Gestiona los datos maestros del sistema</p>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded-lg border transition-colors ${
          mensaje.tipo === 'exito' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700' :
          mensaje.tipo === 'error' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700' :
          'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 border border-slate-200 dark:border-slate-700 transition-colors">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Tablas</h3>
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
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icono className="w-4 h-4" />
                  <span>{cfg.nombre}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    tablaActiva === key ? 'bg-white text-blue-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {key === tablaActiva ? registros.length : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex items-center justify-between border border-slate-200 dark:border-slate-700 transition-colors">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{config.nombre}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{registros.length} registros</p>
            </div>
            <button
              onClick={abrirFormularioAgregar}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>

          {mostrandoFormulario && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-2 border-blue-200 dark:border-blue-800 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  {editandoId !== null ? 'Editar registro' : 'Agregar nuevo registro'}
                </h4>
                <button onClick={cancelarFormulario} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {config.columnas.map((col) => {
                  const opciones = getOpcionesCampo(col)
                  return (
                    <div key={col.key}>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {col.label} {col.key === 'nombre' && '*'}
                      </label>
                      {col.tipo === 'select' ? (
                        <select
                          value={formulario[col.key] || ''}
                          onChange={(e) => setFormulario(prev => ({ ...prev, [col.key]: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                        >
                          <option value="">Seleccionar</option>
                          {opciones.map(op => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      ) : col.tipo === 'number' ? (
                        <input
                          type="number"
                          value={formulario[col.key] || ''}
                          onChange={(e) => setFormulario(prev => ({ ...prev, [col.key]: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                        />
                      ) : (
                        <input
                          type="text"
                          value={formulario[col.key] || ''}
                          onChange={(e) => setFormulario(prev => ({ ...prev, [col.key]: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                          placeholder={`Ingrese ${col.label.toLowerCase()}`}
                        />
                      )}
                    </div>
                  )
                })}
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

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden border border-slate-200 dark:border-slate-700 transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 dark:bg-slate-900 text-white">
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
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 transition-colors">
                  {cargando ? (
                    <tr>
                      <td colSpan={config.columnas.length + 2} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Cargando...
                      </td>
                    </tr>
                  ) : registros.length === 0 ? (
                    <tr>
                      <td colSpan={config.columnas.length + 2} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No hay registros. Haz clic en "Agregar" para crear uno.
                      </td>
                    </tr>
                  ) : (
                    registros.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">{reg.id}</td>
                        {config.columnas.map(col => (
                          <td key={col.key} className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                            {reg[col.key] || <span className="text-slate-400 dark:text-slate-500">-</span>}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => abrirFormularioEditar(reg)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => eliminarRegistro(reg.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 transition-colors"
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