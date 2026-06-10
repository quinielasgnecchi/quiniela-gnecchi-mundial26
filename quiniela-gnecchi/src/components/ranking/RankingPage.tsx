import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getTeamFlag } from '../../types'

interface RankEntry {
  position: number
  user_id: string
  full_name: string
  avatar_url?: string
  favorite_team?: string
  total_points: number
}

export default function RankingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ranking, setRanking] = useState<RankEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRanking()
    const channel = supabase.channel('ranking-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'points' }, fetchRanking)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchRanking() {
    const { data } = await supabase.from('ranking_view').select('*').order('total_points', { ascending: false }).limit(100)
    if (data) setRanking(data.map((r, i) => ({ ...r, position: i + 1 })))
    setLoading(false)
  }

  const myEntry = ranking.find(r => r.user_id === user?.id)

  function medal(pos: number) {
    if (pos === 1) return '🥇'
    if (pos === 2) return '🥈'
    if (pos === 3) return '🥉'
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-5 pb-4" style={{background:'#0a0a0a',borderBottom:'1px solid #1a1a1a'}}>
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button onClick={() => user ? navigate('/') : navigate('/login')} className="text-xl" style={{color:'#666'}}>←</button>
          <div className="flex-1">
            <h1 className="font-bold text-lg text-white">Ranking</h1>
            <p className="text-xs" style={{color:'#555'}}>Actualización en tiempo real</p>
          </div>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#00CA42'}} />
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 max-w-md mx-auto">
        {/* My position */}
        {myEntry && (
          <div className="p-4 rounded-2xl mb-5" style={{background:'rgba(36,79,254,0.1)',border:'1px solid rgba(36,79,254,0.3)'}}>
            <div className="flex items-center gap-3">
              <div className="font-bold text-lg w-8 text-center" style={{color:'#244ffe'}}>#{myEntry.position}</div>
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{background:'#1a1a1a'}}>
                {myEntry.avatar_url ? <img src={myEntry.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">{getTeamFlag(myEntry.favorite_team ?? '')}</span>}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-white">Tú · {myEntry.full_name.split(' ')[0]}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold" style={{color:'#244ffe'}}>{myEntry.total_points}</p>
                <p className="text-xs" style={{color:'#555'}}>pts</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2">
            {[...Array(8)].map((_, i) => <div key={i} className="h-14 rounded-2xl animate-pulse" style={{background:'#141414'}} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {ranking.map(entry => {
              const isMe = entry.user_id === user?.id
              const m = medal(entry.position)
              const flag = getTeamFlag(entry.favorite_team ?? '')
              return (
                <div key={entry.user_id} className="flex items-center gap-3 p-3 rounded-2xl"
                  style={isMe
                    ? {background:'rgba(36,79,254,0.08)',border:'1px solid rgba(36,79,254,0.2)'}
                    : {background:'#141414',border:'1px solid #1f1f1f'}}>
                  <div className="w-8 text-center">
                    {m ? <span className="text-xl">{m}</span>
                      : <span className="text-sm font-bold" style={{color: isMe ? '#244ffe' : '#555'}}>{entry.position}</span>}
                  </div>
                  <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{background:'#1a1a1a'}}>
                    {entry.avatar_url ? <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-base">{flag}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white truncate">{entry.full_name}</p>
                    {entry.favorite_team && <p className="text-xs" style={{color:'#555'}}>{flag} {entry.favorite_team}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-base" style={{color: isMe ? '#244ffe' : 'white'}}>{entry.total_points}</p>
                    <p className="text-xs" style={{color:'#444'}}>pts</p>
                  </div>
                </div>
              )
            })}
            {ranking.length === 0 && (
              <div className="text-center py-12" style={{color:'#555'}}>Aún no hay puntos registrados</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
