import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const DEADLINE = new Date('2026-06-11T19:00:00Z')

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total_points: 0, position: 1, done: 0, submitted: false, date: '' })
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(true)

  const phaseOpen = now < DEADLINE
  const progress = Math.round((stats.done / 72) * 100)
  const diff = DEADLINE.getTime() - now.getTime()

  useEffect(() => {
    if (!user) return
    async function fetchStats() {
      try {
        // 1. Obtener todos los perfiles de la quiniela
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, points')

        // 2. Obtener TODAS las sumisiones para poder calcular las posiciones cruzando el desempate por envío
        const { data: allSubmissions } = await supabase
          .from('submissions')
          .select('user_id, predictions_count, submitted_at')
          .eq('phase', 'groups')

        const currentProfile = allProfiles?.find(p => p.id === user.id)
        const currentSub = allSubmissions?.find(s => s.user_id === user.id)
        const totalPoints = currentProfile?.points ?? 0

        let computedPosition = 1
        if (allProfiles) {
          // Mapeamos los perfiles integrando la fecha de envío de sus pronósticos
          const profilesWithSubmissionTime = allProfiles.map(p => {
            const sub = allSubmissions?.find(s => s.user_id === p.id)
            return {
              id: p.id,
              points: p.points ?? 0,
              // Si no ha enviado, se asigna una fecha en el futuro lejano para que quede al final del empate
              submitted_at: sub?.submitted_at ? new Date(sub.submitted_at).getTime() : Infinity
            }
          })

          // Ordenamos bajo la regla estricta: 1. Puntos (desc), 2. Fecha de Envío Pronósticos (asc)
          profilesWithSubmissionTime.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points
            return a.submitted_at - b.submitted_at
          })

          const index = profilesWithSubmissionTime.findIndex(p => p.id === user.id)
          if (index !== -1) {
            computedPosition = index + 1
          }
        }

        setStats({
          total_points: totalPoints,
          position: computedPosition,
          done: currentSub?.predictions_count || 0,
          submitted: !!currentSub,
          date: currentSub?.submitted_at || '',
        })
      } catch (e) {
        console.error(e)
      } finally {
        loading && setLoading(false)
      }
    }
    fetchStats()
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [user])

  const name = user?.full_name || user?.email?.split('@')[0] || 'Bienvenido'

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-500 text-sm">Cargando...</div>

  return (
    <div className="px-4 pt-6 pb-24 min-h-screen bg-[#0a0a0a] text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500 mb-1">Bienvenido de vuelta</p>
          <h1 className="text-xl font-bold">{name} 👋</h1>
        </div>
        <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-[#1a1a1a]" style={{ border: '2px solid #2a2a2a' }}>
          {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <span className="font-bold">{name.charAt(0).toUpperCase()}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f]">
          <p className="text-xs text-gray-500 mb-1">Puntos</p>
          <p className="text-3xl font-bold text-[#244ffe]">{stats.total_points}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f]">
          <p className="text-xs text-gray-500 mb-1">Posición</p>
          <p className="text-3xl font-bold">#{stats.position}</p>
        </div>
      </div>

      {phaseOpen && !stats.submitted && (
        <div className="p-4 rounded-2xl mb-5 text-center bg-[#141414] border border-[#1f1f1f]">
          <p className="text-xs text-gray-500 mb-2">Tiempo restante de la fase</p>
          <p className="text-2xl font-bold text-gray-300">
            {diff > 0 ? `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m ${Math.floor((diff % 60000) / 1000)}s` : 'Cerrado'}
          </p>
        </div>
      )}

      <div className="p-5 rounded-2xl mb-5 bg-[#141414] border border-[#1f1f1f]">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold">Fase de grupos</p>
          <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: phaseOpen ? 'rgba(0,202,66,0.15)' : 'rgba(234,0,1,0.15)', color: phaseOpen ? '#00CA42' : '#EA0001' }}>
            {phaseOpen ? 'Abierta' : 'Cerrada'}
          </div>
        </div>
        <div className="flex justify-between text-xs mb-1 text-gray-500">
          <span>{stats.done} de 72 partidos</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
          <div className="h-full rounded-full bg-gray-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Botón neutral de gris para consulta únicamente */}
      <button 
        className="w-full py-4 rounded-xl font-bold text-sm mb-4 text-gray-300 transition-colors" 
        style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }} 
        onClick={() => navigate('/pronosticos')}
      >
        Consultar mis pronósticos ⚽️
      </button>
    </div>
  )
}
