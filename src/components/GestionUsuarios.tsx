import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { UserCheck, UserX, Plus, Save, X, Shield, Clock, Ban, CheckCircle } from 'lucide-react'

interface Usuario {
  id: number
  codigo: string
  nombre: string
  email: string
  rol: 'ADMIN' | 'AUXILIAR'
  estado: 'HABILITADO' | 'PENDIENTE' | 'BLOQUEADO'
  fecha_registro: string
  fecha_habilitacion: string | null
  habilitado_por: string | null
}

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(false)
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false)
  const [formulario, setFormulario] = useState({
    codigo: '',
    nombre: '',
    email: '',
    rol: 'AUXILIAR' as 'ADMIN' | 'AUXILIAR',
    estado: 'PENDIENTE' as 'HABILITADO' | 'PENDIENTE' | 'BLOQUEADO',
  })
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' })

  const cargarUsuarios = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      setMensaje({ texto: 'Error al cargar usuarios', tipo: 'error' })
    } else {
      setUsuarios(data || [])
    }
    setCargando(false)
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const mostrarMensaje = (texto: string, tipo: string) => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000)
  }

  const cambiarEstado = async (id: number, nuevoEstado: 'HABILITADO' | 'BLOQUEADO') => {
    const { error } = await supabase
      .from('usuarios')
      .update({
        estado: nuevoEstado,
        fecha_habilitacion: nuevoEstado === 'HABILITADO' ? new Date().toISOString() : null,
        habilitado_por: 'ADMIN001',
      })
      .eq('id', id)

    if (error) {
      mostrarMensaje('Error al actualizar', 'error')
    } else {
      mostrarMensaje(
        `Usuario ${nuevoEstado === 'HABILITADO' ? 'habilitado' : 'bloqueado'} correctamente`,
        'exito'
      )
      await cargarUsuarios()
    }
  }

  const guardarNuevoUsuario = async () => {
    if (!formulario.codigo.trim() || !formulario.nombre.trim()) {
      mostrarMensaje('Código y nombre son obligatorios', 'error')
      return
    }

    setCargando(true)
    const { error } = await supabase
      .from('usuarios')
      .insert([{
        ...formulario,
        codigo: formulario.codigo.toUpperCase().trim(),
      }])

    if (error) {
      if (error.message.includes('unique')) {
        mostrarMensaje('Ese código ya existe. Usa otro diferente.', 'error')
      } else {
        mostrarMensaje('Error al crear usuario: ' + error.message, 'error')
      }
    } else {
      mostrarMensaje('Usuario creado correctamente', 'exito')
      setMostrandoFormulario(false)
      setFormulario({ codigo: '', nombre: '', email: '', rol: 'AUXILIAR', estado: 'PENDIENTE' })
      await cargarUsuarios()
    }
    setCargando(false)
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'HABILITADO': return 'bg-green-100 text-green-800 border-green-300'
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'BLOQUEADO': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const getEstadoIcono = (estado: string) => {
    switch (estado) {
      case 'HABILITADO': return <CheckCircle className="w-4 h-4" />
      case 'PENDIENTE': return <Clock className="w-4 h-4" />
      case 'BLOQUEADO': return <Ban className="w-4 h-4" />
      default: return null
    }
  }

  const pendientes = usuarios.filter(u => u.estado === 'PENDIENTE').length
  const habilitados = usuarios.filter(u => u.estado === 'HABILITADO').length
  const bloqueados = usuarios.filter(u => u.estado === 'BLOQUEADO').length

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h2>
            <p className="text-slate-600">Administra los códigos de acceso de auxiliares y administradores</p>
          </div>
          <button
            onClick={() => setMostrandoFormulario(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{habilitados}</p>
              <p className="text-sm text-slate-600">Habilitados</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{pendientes}</p>
              <p className="text-sm text-slate-600">Pendientes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-3">
            <Ban className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{bloqueados}</p>
              <p className="text-sm text-slate-600">Bloqueados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje.texto && (
        <div className={`p-4 rounded-lg ${
          mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800 border border-green-300' :
          'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Formulario nuevo usuario */}
      {mostrandoFormulario && (
        <div className="bg-white rounded-lg shadow p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Crear Nuevo Usuario</h3>
            <button onClick={() => setMostrandoFormulario(false)} className="text-slate-500 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código *</label>
              <input
                type="text"
                value={formulario.codigo}
                onChange={(e) => setFormulario(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                placeholder="Ej: AUX005"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo *</label>
              <input
                type="text"
                value={formulario.nombre}
                onChange={(e) => setFormulario(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre del auxiliar"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formulario.email}
                onChange={(e) => setFormulario(prev => ({ ...prev, email: e.target.value }))}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
              <select
                value={formulario.rol}
                onChange={(e) => setFormulario(prev => ({ ...prev, rol: e.target.value as 'ADMIN' | 'AUXILIAR' }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="AUXILIAR">AUXILIAR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado inicial</label>
              <select
                value={formulario.estado}
                onChange={(e) => setFormulario(prev => ({ ...prev, estado: e.target.value as 'HABILITADO' | 'PENDIENTE' | 'BLOQUEADO' }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="PENDIENTE">PENDIENTE (requiere aprobación)</option>
                <option value="HABILITADO">HABILITADO (acceso inmediato)</option>
                <option value="BLOQUEADO">BLOQUEADO (sin acceso)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={guardarNuevoUsuario}
              disabled={cargando}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {cargando ? 'Guardando...' : 'Crear Usuario'}
            </button>
            <button
              onClick={() => setMostrandoFormulario(false)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Registro</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Cargando...</td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No hay usuarios registrados</td>
                </tr>
              ) : (
                usuarios.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">{user.codigo}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{user.nombre}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{user.email || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.rol === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {user.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getEstadoColor(user.estado)}`}>
                        {getEstadoIcono(user.estado)}
                        {user.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(user.fecha_registro).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {user.estado !== 'HABILITADO' && user.codigo !== 'ADMIN001' && (
                          <button
                            onClick={() => cambiarEstado(user.id, 'HABILITADO')}
                            className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            title="Habilitar"
                          >
                            <UserCheck className="w-3 h-3" />
                            Habilitar
                          </button>
                        )}
                        {user.estado !== 'BLOQUEADO' && user.codigo !== 'ADMIN001' && (
                          <button
                            onClick={() => cambiarEstado(user.id, 'BLOQUEADO')}
                            className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            title="Bloquear"
                          >
                            <UserX className="w-3 h-3" />
                            Bloquear
                          </button>
                        )}
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
  )
}