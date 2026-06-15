import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface RankingUser {
  id: string
  full_name: string
  avatar_url: string | null
  points: number
  submitted_at: number // Guardamos el timestamp numérico para ordenar eficientemente
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRanking() {
      try {
        setLoading(true)
        
        // 1. Consultar todos los perfiles de usuarios
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, points')

        if (profilesError) throw profilesError

        // 2. Consultar todos los envíos de la fase de grupos para obtener la fecha exacta de envío
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('submissions')
          .select('user_id, submitted_at')
          .eq('phase', 'groups')

        if (submissionsError) throw submissionsError

        if (profilesData) {
          const formattedData = (profilesData as any[]).map(user => {
            let displayName = user.full_name?.trim()
            if (!displayName && user.email) {
              displayName = user.email.split('@')[0]
            }
            if (!displayName) {
              displayName = 'Competidor'
            }

            // Buscar si este usuario ya envió sus pronósticos
            const userSub = submissionsData?.find(s => s.user_id === user.id)

            return {
              id: user.id,
              full_name: displayName,
              avatar_url: user.avatar_url,
              points: user.points ?? 0,
              // Si no tiene envío, colocamos Infinity para que se desempate al final
              submitted_at: userSub?.submitted_at ? new Date(userSub.submitted_at).getTime() : Infinity
            }
          })
          
          // Ordenar principalmente por puntos (descendente) y secundariamente por fecha de envío (ascendente)
          formattedData.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points
            return a.submitted_at - b.submitted_at
          })

          setRanking(formattedData)
        }
      } catch (err) {
        console.error("Error al cargar el ranking de competidores:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchRanking()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-400 font-medium">
        Cargando tabla de posiciones...
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-[100px] min-h-screen bg-[#0a0a0a] text-white">
      {/* Cabecera */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tabla de Posiciones</h1>
        <p className="text-xs text-gray-500 mt-1">
          Lista global de competidores registrados en la quiniela.
        </p>
      </div>

      {ranking.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#141414] border border-[#1f1f1f] text-center text-gray-500 text-sm">
          No hay ningún usuario registrado todavía o verifica las políticas RLS.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ranking.map((player, index) => {
            const position = index + 1
            
            // Estilos estéticos para el podio
            let badgeStyle = "bg-[#1a1a1a] text-gray-400"
            if (position === 1) badgeStyle = "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
            if (position === 2) badgeStyle = "bg-gray-400/10 text-gray-300 border border-gray-400/20"
            if (position === 3) badgeStyle = "bg-amber-700/10 text-amber-500 border border-amber-700/20"

            return (
              <div 
                key={player.id} 
                className="flex items-center justify-between p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f] shadow-sm transition-all"
              >
                {/* Lado izquierdo: Posición, Avatar y Nombre */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${badgeStyle}`}>
                    {position}
                  </div>

                  {/* Avatar / Foto */}
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#1a1a1a] flex-shrink-0 border border-[#222]">
                    {player.avatar_url ? (
                      <img 
                        src={player.avatar_url} 
                        alt={player.full_name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${player.full_name}&backgroundType=gradientLinear`
                        }}
                      />
                    ) : (
                      <img 
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.full_name}&backgroundType=gradientLinear`} 
                        alt="Default Avatar"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Nombre */}
                  <div className="truncate">
                    <span className="text-sm font-semibold text-gray-200 block truncate">
                      {player.full_name}
                    </span>
                    {position <= 3 && (
                      <span className="text-[10px] text-[#009AFE] font-medium tracking-wide uppercase">
                        {position === 1 ? '👑 Líder' : '🔥 Podio'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Lado derecho: Puntos */}
                <div className="flex flex-col items-end justify-center pl-2 flex-shrink-0">
                  <span className="text-base font-bold font-mono text-white leading-none">
                    {player.points}
                  </span>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-1">
                    Pts
                  </span>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
