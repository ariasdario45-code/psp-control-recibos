import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  LayoutDashboard, 
  PlusCircle, 
  Clock, 
  Ship, 
  Users, 
  Settings, 
  LogOut,
  Database,
  User
} from 'lucide-react'

export default function Sidebar() {
  const location = useLocation()
  const { usuario, logout, esAdmin } = useAuth()

  const menuItems = [
    { icon: LayoutDashboard, label: 'Panel', path: '/' },
    { icon: PlusCircle, label: 'Nuevo registro', path: '/nuevo' },
    { icon: Clock, label: 'Historial', path: '/historial' },
    { icon: Ship, label: 'Información del Buque', path: '/' },
    { icon: Users, label: 'Usuarios', path: '/usuarios', soloAdmin: true },
    { icon: Settings, label: 'Configuración', path: '/', soloAdmin: true },
    { icon: Database, label: 'Administración', path: '/admin', soloAdmin: true },
  ]

  const menuFiltrado = menuItems.filter(item => !item.soloAdmin || esAdmin)

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Ship className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">PSP - Control de...</h1>
            <p className="text-xs text-slate-400">Operaciones Portuarias</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuFiltrado.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === item.path
                ? 'bg-slate-800 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{usuario?.nombre}</p>
            <p className="text-xs text-slate-400 truncate">{usuario?.codigo}</p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
              esAdmin ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
            }`}>
              {usuario?.rol}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}