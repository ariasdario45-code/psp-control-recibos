import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  PlusCircle, 
  Clock, 
  Ship, 
  Users, 
  Settings, 
  Shield,
  LogOut,
  Database
} from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Panel', path: '/' },
  { icon: PlusCircle, label: 'Nuevo registro', path: '/nuevo' },
  { icon: Clock, label: 'Historial', path: '/' },
  { icon: Ship, label: 'Información del Buque', path: '/' },
  { icon: Users, label: 'Usuarios', path: '/' },
  { icon: Settings, label: 'Configuración', path: '/' },
  { icon: Database, label: 'Administración', path: '/admin' },
  { icon: Shield, label: 'Seguridad', path: '/' },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      {/* Logo */}
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

      {/* Menú */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item, index) => (
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

      {/* Usuario */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Sesión</p>
            <p className="text-xs text-slate-400">Darío Arias</p>
            <p className="text-xs text-slate-500">Administrador</p>
          </div>
          <button className="text-slate-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  )
}