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
        // 1. Obtener todos los perfiles con su fecha de registro para computar la posición real exacta
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, points, created_at')

        // 2. Obtener la sumisión de grupos
        const { data: sub } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_id', user.id)
          .eq('phase', 'groups')
          .maybeSingle()

        const currentProfile = allProfiles?.find(p => p.id === user.id)
        const totalPoints = Number(currentProfile?.points ?? 0)

        let computedPosition = 1
        if (allProfiles && currentProfile) {
          // Ordenamos bajo la misma lógica oficial: 1. Puntos (desc), 2. Registro/Creado (asc)
          const sorted = [...allProfiles].sort((a, b) => {
            const pointsA = Number(a.points ?? 0)
            const pointsB = Number(b.points ?? 0)
            if (pointsB !== pointsA) return pointsB - pointsA
            
            const dateA = new Date(a.created_at || 0).getTime()
            const dateB = new Date(b.created_at || 0).getTime()
            return dateA - dateB
          })

          // Determinamos el orden único de puntajes descendentes para calcular la posición real consecutiva
          const distinctScores = Array.from(new Set(sorted.map(p => Number(p.points ?? 0)))).sort((a, b) => b - a)
          const scoreToPositionMap: Record<number, number> = {}
          distinctScores.forEach((score, index) => {
            scoreToPositionMap[score] = index + 1
          })

          computedPosition = scoreToPositionMap[totalPoints] || 1
        }

        setStats({
          total_points: totalPoints,
          position: computedPosition,
          done: sub?.predictions_count || 0,
          submitted: !!sub,
          date: sub?.submitted_at || '',
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
