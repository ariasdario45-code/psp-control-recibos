import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Ship, LogIn, AlertCircle, CheckCircle } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const [codigo, setCodigo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigo.trim()) {
      setMensaje({ texto: 'Ingresa tu código', tipo: 'error' })
      return
    }

    setCargando(true)
    setMensaje({ texto: '', tipo: '' })

    const resultado = await login(codigo)

    if (!resultado.exito) {
      setMensaje({ texto: resultado.mensaje, tipo: 'error' })
    }

    setCargando(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Ship className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">PSP - Control de Recibos</h1>
          <p className="text-blue-200">Operaciones Portuarias</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Iniciar Sesión</h2>
          <p className="text-slate-600 text-center mb-6 text-sm">
            Ingresa tu código de auxiliar o administrador
          </p>

          {/* Mensaje de error/éxito */}
          {mensaje.texto && (
            <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
              mensaje.tipo === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {mensaje.tipo === 'error' ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm">{mensaje.texto}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Código de acceso
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej: ADMIN001, AUX001"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-lg font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              {cargando ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>

          {/* Ayuda */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center mb-2">Códigos de prueba:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-100 rounded px-2 py-1 text-center font-mono">ADMIN001</div>
              <div className="bg-slate-100 rounded px-2 py-1 text-center font-mono">AUX001</div>
              <div className="bg-slate-100 rounded px-2 py-1 text-center font-mono">AUX002</div>
              <div className="bg-slate-100 rounded px-2 py-1 text-center font-mono">AUX004 (pendiente)</div>
            </div>
          </div>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          © 2026 PSP - Sistema de Control de Recibos
        </p>
      </div>
    </div>
  )
}