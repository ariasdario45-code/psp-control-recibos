import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
// ✅ CAMBIO 1 (1 línea): Import para aislamiento de datos
import { usePermissions } from '../context/usePermissions'
import { supabase } from '../lib/supabase'
import { 
  FileText, Users, Ship, Clock, TrendingUp, Calendar,
  Activity, Award, BarChart3, PieChart as PieChartIcon
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const COLORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

// Estilo personalizado para el Tooltip de los gráficos en modo oscuro
const tooltipStyle = {
  backgroundColor: 'rgba(30, 41, 59, 0.95)',
  border: '1px solid rgba(71, 85, 105, 0.5)',
  borderRadius: '0.5rem',
  color: '#f8fafc'
}

// ✅ FUNCIÓN PARA CALCULAR HORAS POR RELOJ (maneja cruce de medianoche)
const calcularHorasReloj = (horaInicio: string, horaFin: string): number => {
  if (!horaInicio || !horaFin) return 0
  const [h1, m1] = horaInicio.split(':').map(Number)
  const [h2, m2] = horaFin.split(':').map(Number)
  let minutos = (h2 * 60 + m2) - (h1 * 60 + m1)
  if (minutos < 0) minutos += 24 * 60
  return minutos / 60
}

export default function Dashboard() {
  const { usuario } = useAuth()
  // ✅ CAMBIO 2 (1 línea): Hook para verificar rol de admin
  const { esAdmin } = usePermissions()
  const [stats, setStats] = useState({
    totalPlanillas: 0,
    auxiliaresActivos: 0,
    buquesAtendidos: 0,
    horasTrabajadas: 0,
  })
  const [datosEquipos, setDatosEquipos] = useState<any[]>([])
  const [datosTiposCarga, setDatosTiposCarga] = useState<any[]>([])
  const [datosTurnos, setDatosTurnos] = useState<any[]>([])
  const [planillasRecientes, setPlanillasRecientes] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setCargando(true)

    try {
      // ✅ CAMBIO 3 (3 líneas): Filtrar conteo por rol
      let countQuery = supabase.from('planillas').select('*', { count: 'exact', head: true })
      if (!esAdmin && usuario?.codigo) {
        countQuery = countQuery.eq('creado_por', usuario.codigo)
      }
      const { count: countPlanillas } = await countQuery

      const { count: countAuxiliares } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'HABILITADO')
        .eq('rol', 'AUXILIAR')

      // ✅ CAMBIO 4 (3 líneas): Filtrar planillas por rol
      let planillasQuery = supabase.from('planillas').select('motonave, tipo_carga, turno, creado_en, auxiliar, id')
      if (!esAdmin && usuario?.codigo) {
        planillasQuery = planillasQuery.eq('creado_por', usuario.codigo)
      }
      const { data: planillas } = await planillasQuery

      // ✅ CAMBIO 5 (4 líneas): Filtrar detalles según planillas permitidas
      let detallesQuery = supabase.from('planilla_detalles').select('equipo, h_inicial, h_final, hora_inicio, hora_fin, planilla_id')
      if (!esAdmin && planillas && planillas.length > 0) {
        const planillaIds = planillas.map(p => p.id)
        detallesQuery = detallesQuery.in('planilla_id', planillaIds)
      } else if (!esAdmin) {
        detallesQuery = detallesQuery.eq('id', -1) // Sin resultados si no hay planillas
      }
      const { data: detalles } = await detallesQuery

      // ✅ BUG CORREGIDO: Horas por RELOJ (no por horómetro)
      // Solo se cuentan registros CERRADOS (con hora_fin)
      let totalHoras = 0
      if (detalles) {
        detalles.forEach(d => {
          if (d.hora_inicio && d.hora_fin) {
            const horas = calcularHorasReloj(d.hora_inicio, d.hora_fin)
            if (horas > 0 && horas <= 24) totalHoras += horas
          }
        })
      }

      const buquesUnicos = new Set(planillas?.map(p => p.motonave) || [])

      setStats({
        totalPlanillas: countPlanillas || 0,
        auxiliaresActivos: countAuxiliares || 0,
        buquesAtendidos: buquesUnicos.size,
        horasTrabajadas: Math.round(totalHoras * 10) / 10,
      })

      // ✅ Gráfico de equipos: también por RELOJ
      const equiposMap: Record<string, number> = {}
      detalles?.forEach(d => {
        if (d.equipo && d.hora_inicio && d.hora_fin) {
          const horas = calcularHorasReloj(d.hora_inicio, d.hora_fin)
          if (horas > 0 && horas <= 24) {
            equiposMap[d.equipo] = (equiposMap[d.equipo] || 0) + horas
          }
        }
      })
      const datosEquipos = Object.entries(equiposMap)
        .map(([name, value]) => ({ name: name.substring(0, 20), value: Math.round(value * 10) / 10 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
      setDatosEquipos(datosEquipos)

      const tiposMap: Record<string, number> = {}
      planillas?.forEach(p => {
        if (p.tipo_carga) {
          tiposMap[p.tipo_carga] = (tiposMap[p.tipo_carga] || 0) + 1
        }
      })
      const datosTipos = Object.entries(tiposMap).map(([name, value]) => ({ name, value }))
      setDatosTiposCarga(datosTipos)

      const turnosMap: Record<string, number> = { DIA: 0, NOCHE: 0 }
      planillas?.forEach(p => {
        if (p.turno) {
          turnosMap[p.turno] = (turnosMap[p.turno] || 0) + 1
        }
      })
      setDatosTurnos([
        { name: 'Día', value: turnosMap.DIA },
        { name: 'Noche', value: turnosMap.NOCHE },
      ])

      // ✅ CAMBIO 6 (3 líneas): Filtrar recientes por rol
      let recientesQuery = supabase.from('planillas').select('*').order('creado_en', { ascending: false }).limit(5)
      if (!esAdmin && usuario?.codigo) {
        recientesQuery = recientesQuery.eq('creado_por', usuario.codigo)
      }
      const { data: recientes } = await recientesQuery
      setPlanillasRecientes(recientes || [])

    } catch (error) {
      console.error('Error al cargar datos:', error)
    }

    setCargando(false)
  }

  const tarjetaStats = [
    { 
      titulo: 'Planillas Registradas', 
      valor: stats.totalPlanillas, 
      icono: FileText, 
      color: 'bg-blue-500',
      descripcion: 'Total en el sistema'
    },
    { 
      titulo: 'Auxiliares Activos', 
      valor: stats.auxiliaresActivos, 
      icono: Users, 
      color: 'bg-green-500',
      descripcion: 'Habilitados actualmente'
    },
    { 
      titulo: 'Buques Atendidos', 
      valor: stats.buquesAtendidos, 
      icono: Ship, 
      color: 'bg-purple-500',
      descripcion: 'Naves únicas registradas'
    },
    { 
      titulo: 'Horas Trabajadas', 
      valor: stats.horasTrabajadas, 
      icono: Clock, 
      color: 'bg-orange-500',
      descripcion: 'Total acumulado'
    },
  ]

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Cargando estadísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 space-y-6 transition-colors duration-300">
      {/* Encabezado */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Panel de Control</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Bienvenido, <span className="font-semibold dark:text-slate-200">{usuario?.nombre}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('es-CO', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tarjetaStats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 hover:shadow-lg transition-all border border-slate-100 dark:border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{stat.titulo}</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{stat.valor}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">{stat.descripcion}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icono className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras - Horas por equipo */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-100 dark:border-slate-700 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Horas por Equipo</h3>
          </div>
          {datosEquipos.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
              Sin datos de equipos registrados
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosEquipos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" width={100} stroke="#94a3b8" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfico de torta - Tipos de carga (estático pero funcional) */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-100 dark:border-slate-700 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Distribución por Tipo de Carga</h3>
          </div>
          {datosTiposCarga.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
              Sin datos de tipos de carga
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={datosTiposCarga}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="none"
                >
                  {datosTiposCarga.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfico de turnos */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-100 dark:border-slate-700 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Distribución por Turno</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={datosTurnos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Planillas recientes */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-100 dark:border-slate-700 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Planillas Recientes</h3>
          </div>
          {planillasRecientes.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
              No hay planillas registradas aún
            </div>
          ) : (
            <div className="space-y-3">
              {planillasRecientes.map((planilla, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Ship className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{planilla.motonave || 'Sin nave'}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {planilla.tipo_carga} • {planilla.turno}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {new Date(planilla.creado_en).toLocaleDateString('es-CO')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {planilla.auxiliar}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-8 h-8" />
          <h3 className="text-xl font-bold">Resumen del Sistema</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
            <p className="text-sm opacity-90">Estado del Sistema</p>
            <p className="text-2xl font-bold mt-1">Operativo ✓</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
            <p className="text-sm opacity-90">Última Actualización</p>
            <p className="text-2xl font-bold mt-1">
              {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
            <p className="text-sm opacity-90">Usuario Activo</p>
            <p className="text-2xl font-bold mt-1">{usuario?.rol}</p>
          </div>
        </div>
      </div>
    </div>
  )
}