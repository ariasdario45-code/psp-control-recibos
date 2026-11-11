import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { UserCheck, UserX, Plus, Save, X, Shield, Clock, Ban, CheckCircle, Edit2, Trash2 } from 'lucide-react'

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
  contrasena?: string
}

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(false)
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [formulario, setFormulario] = useState({
    codigo: '',
    nombre: '',
    email: '',
    rol: 'AUXILIAR' as 'ADMIN' | 'AUXILIAR',
    estado: 'PENDIENTE' as 'HABILITADO' | 'PENDIENTE' | 'BLOQUEADO',
    contrasena: '',
  })
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' })

  const cargarUsuarios = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('codigo', { ascending: true })

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

  const handleEditar = (usuario: Usuario) => {
    setUsuarioEditando(usuario)
    setFormulario({
      codigo: usuario.codigo,
      nombre: usuario.nombre,
      email: usuario.email || '',
      rol: usuario.rol,
      estado: usuario.estado,
      contrasena: '',
    })
    setMostrandoFormulario(true)
  }

  const handleEliminar = async (id: number, codigo: string) => {
    // PROTECCIÓN: No permitir eliminar ADMIN001
    if (codigo === 'ADMIN001') {
      mostrarMensaje('❌ No se puede eliminar el usuario ADMIN001 (Super Administrador)', 'error')
      return
    }

    if (!confirm(`¿Estás seguro de eliminar permanentemente al usuario ${codigo}?\n\nEsta acción no se puede deshacer.`)) {
      return
    }

    setCargando(true)
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id)

    if (error) {
      mostrarMensaje('Error al eliminar: ' + error.message, 'error')
    } else {
      mostrarMensaje(`✅ Usuario ${codigo} eliminado correctamente`, 'exito')
      await cargarUsuarios()
    }
    setCargando(false)
  }

  const guardarNuevoUsuario = async () => {
    if (!formulario.codigo.trim() || !formulario.nombre.trim()) {
      mostrarMensaje('Código y nombre son obligatorios', 'error')
      return
    }

    setCargando(true)
    
    const userData = {
      codigo: formulario.codigo.toUpperCase().trim(),
      nombre: formulario.nombre,
      email: formulario.email,
      rol: formulario.rol,
      estado: formulario.estado,
      fecha_registro: new Date().toISOString(),
    }

    // Si es usuario nuevo, agregar contraseña
    if (!usuarioEditando) {
      if (!formulario.contrasena.trim()) {
        mostrarMensaje('La contraseña es obligatoria para nuevos usuarios', 'error')
        setCargando(false)
        return
      }
      Object.assign(userData, { contrasena: formulario.contrasena })
    }

    let error
    if (usuarioEditando) {
      // Actualizar usuario existente
      const { error: updateError } = await supabase
        .from('usuarios')
        .update(userData)
        .eq('id', usuarioEditando.id)
      error = updateError
    } else {
      // Crear nuevo usuario
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert([userData])
      error = insertError
    }

    if (error) {
      if (error.message.includes('unique')) {
        mostrarMensaje('Ese código ya existe. Usa otro diferente.', 'error')
      } else {
        mostrarMensaje('Error: ' + error.message, 'error')
      }
    } else {
      mostrarMensaje(
        usuarioEditando ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente',
        'exito'
      )
      setMostrandoFormulario(false)
      setUsuarioEditando(null)
      setFormulario({ codigo: '', nombre: '', email: '', rol: 'AUXILIAR', estado: 'PENDIENTE', contrasena: '' })
      await cargarUsuarios()
    }
    setCargando(false)
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'HABILITADO': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'
      case 'PENDIENTE': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
      case 'BLOQUEADO': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
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
    <div className="space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300 p-6">
      {/* Encabezado */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Usuarios</h2>
            <p className="text-slate-600 dark:text-slate-400">Administra los códigos de acceso de auxiliares y administradores</p>
          </div>
          <button
            onClick={() => {
              setMostrandoFormulario(true)
              setUsuarioEditando(null)
              setFormulario({ codigo: '', nombre: '', email: '', rol: 'AUXILIAR', estado: 'PENDIENTE', contrasena: '' })
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 border-l-4 border-green-500 transition-colors">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{habilitados}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Habilitados</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 border-l-4 border-yellow-500 transition-colors">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{pendientes}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Pendientes</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 border-l-4 border-red-500 transition-colors">
          <div className="flex items-center gap-3">
            <Ban className="w-8 h-8 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{bloqueados}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Bloqueados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje.texto && (
        <div className={`p-4 rounded-lg border transition-colors ${
          mensaje.tipo === 'exito' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700' :
          'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Formulario nuevo usuario / Editar */}
      {mostrandoFormulario && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-2 border-blue-200 dark:border-blue-800 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {usuarioEditando ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </h3>
            <button onClick={() => { setMostrandoFormulario(false); setUsuarioEditando(null) }} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código *</label>
              <input
                type="text"
                value={formulario.codigo}
                onChange={(e) => setFormulario(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                disabled={!!usuarioEditando}
                placeholder="Ej: AUX005"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre completo *</label>
              <input
                type="text"
                value={formulario.nombre}
                onChange={(e) => setFormulario(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre del usuario"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={formulario.email}
                onChange={(e) => setFormulario(prev => ({ ...prev, email: e.target.value }))}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rol</label>
              <select
                value={formulario.rol}
                onChange={(e) => setFormulario(prev => ({ ...prev, rol: e.target.value as 'ADMIN' | 'AUXILIAR' }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
              >
                <option value="AUXILIAR">AUXILIAR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            {!usuarioEditando && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña *</label>
                <input
                  type="password"
                  value={formulario.contrasena}
                  onChange={(e) => setFormulario(prev => ({ ...prev, contrasena: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado inicial</label>
              <select
                value={formulario.estado}
                onChange={(e) => setFormulario(prev => ({ ...prev, estado: e.target.value as 'HABILITADO' | 'PENDIENTE' | 'BLOQUEADO' }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
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
              {cargando ? 'Guardando...' : (usuarioEditando ? 'Actualizar Usuario' : 'Crear Usuario')}
            </button>
            <button
              onClick={() => { setMostrandoFormulario(false); setUsuarioEditando(null) }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 dark:bg-slate-900 text-white">
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
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 transition-colors">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Cargando...</td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay usuarios registrados</td>
                </tr>
              ) : (
                usuarios.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900 dark:text-white">{user.codigo}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{user.nombre}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{user.email || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.rol === 'ADMIN' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
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
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      {new Date(user.fecha_registro).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {/* Botón Editar */}
                        <button
                          onClick={() => handleEditar(user)}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                          title="Editar usuario"
                        >
                          <Edit2 className="w-3 h-3" />
                          Editar
                        </button>

                        {/* Botones de estado (solo si no es ADMIN001) */}
                        {user.codigo !== 'ADMIN001' && (
                          <>
                            {user.estado !== 'HABILITADO' && (
                              <button
                                onClick={() => cambiarEstado(user.id, 'HABILITADO')}
                                className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                                title="Habilitar"
                              >
                                <UserCheck className="w-3 h-3" />
                                Habilitar
                              </button>
                            )}
                            {user.estado !== 'BLOQUEADO' && (
                              <button
                                onClick={() => cambiarEstado(user.id, 'BLOQUEADO')}
                                className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                                title="Bloquear"
                              >
                                <UserX className="w-3 h-3" />
                                Bloquear
                              </button>
                            )}
                          </>
                        )}

                        {/* Botón Eliminar (solo si no es ADMIN001) */}
                        {user.codigo !== 'ADMIN001' && (
                          <button
                            onClick={() => handleEliminar(user.id, user.codigo)}
                            className="flex items-center gap-1 px-2 py-1 bg-red-700 text-white rounded text-xs hover:bg-red-800 transition-colors"
                            title="Eliminar permanentemente"
                          >
                            <Trash2 className="w-3 h-3" />
                            Eliminar
                          </button>
                        )}

                        {/* Indicador de protegido */}
                        {user.codigo === 'ADMIN001' && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs" title="Usuario protegido">
                            <Shield className="w-3 h-3" />
                            Protegido
                          </span>
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