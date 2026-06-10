import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type LeaderboardUser = {
  full_name: string
  avatar_url: string | null
  points: number
}

export default function RankingPage() {
  const navigate = useNavigate()
  const [ranking, setRanking] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRanking() {
      try {
        // Consultamos directo desde 'profiles' para incluir a todos los registrados sin excepción
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, points')
          .order('points', { ascending: false, nullsFirst: false })

        if (error) throw error

        const formattedData = (data || []).map(profile => ({
          full_name: profile.full_name || 'Usuario',
          avatar_url: profile.avatar_url || null,
          points: profile.points ?? 0, // Fallback a 0 puntos si es null
        }))

        setRanking(formattedData)
      } catch (err) {
        console.error('Error cargando el ranking:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRanking()
  }, [])

  return (
    <div className="pb-nav bg-[#0a0a0a] min-h-screen px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 max-w-md mx-auto">
        <button onClick={() => navigate('/')} className="text-xl" style={{ color: '#666' }}>←</button>
        <h1 className="text-xl font-bold text-white">Ranking General</h1>
      </div>

      {loading ? (
        <p className="text-sm text-center mt-10" style={{ color: '#555' }}>Cargando tabla de posiciones...</p>
      ) : (
        <div className="flex flex-col gap-3 max-w-md mx-auto">
          {ranking.map((user, index) => {
            const initials = user.full_name.charAt(0).toUpperCase()
            const isTop3 = index < 3
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null

            return (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-2xl"
                style={{
                  background: '#141414',
                  border: isTop3 ? '1px solid rgba(36,79,254,0.3)' : '1px solid #1f1f1f'
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Posición o Medalla */}
                  <div className="w-6 font-bold text-sm text-center" style={{ color: isTop3 ? '#244ffe' : '#555' }}>
                    {medal || index + 1}
                  </div>

                  {/* Foto de Perfil */}
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-[#1a1a1a]" style={{ border: '1px solid #2a2a2a' }}>
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-white">{initials}</span>
                    )}
                  </div>

                  {/* Nombre del Correo / Full Name */}
                  <span className="font-medium text-white text-sm">{user.full_name}</span>
                </div>

                {/* Puntaje */}
                <div className="text-right">
                  <span className="font-bold text-sm text-white">{user.points}</span>
                  <span className="text-[10px] block" style={{ color: '#555' }}>pts</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
