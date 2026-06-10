import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { GROUP_MATCHES } from '../../data/matches'
import { getTeamFlag } from '../../types'

interface Result {
  match_id: number
  result: 'home' | 'draw' | 'away'
  home_score?: number
  away_score?: number
}

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export default function ResultsPage() {
  const navigate = useNavigate()
  const [results, setResults] = useState<Record<number, Result>>({})
  const [activeGroup, setActiveGroup] = useState('A')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResults()
  }, [])

  async function fetchResults() {
    const { data } = await supabase.from('match_results').select('*')
    if (data) {
      const map: Record<number, Result> = {}
      data.forEach(r => { map[r.match_id] = r })
      setResults(map)
    }
    setLoading(false)
  }

  const matchesByGroup: Record<string, typeof GROUP_MATCHES> = {}
  GROUP_MATCHES.forEach(m => {
    if (!matchesByGroup[m.group_name]) matchesByGroup[m.group_name] = []
    matchesByGroup[m.group_name].push(m)
  })

  const totalResults = Object.keys(results).length

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="sticky top-0 z-10 px-4 pt-5 pb-4" style={{background:'#0a0a0a',borderBottom:'1px solid #1a1a1a'}}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/login')} className="text-xl" style={{color:'#666'}}>←</button>
            <div className="flex-1">
              <h1 className="font-bold text-lg text-white">Resultados</h1>
              <p className="text-xs" style={{color:'#555'}}>{totalResults} de 72 partidos jugados</p>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {GROUPS.map(g => (
              <button key={g} onClick={() => setActiveGroup(g)}
                className="flex-shrink-0 w-10 h-10 rounded-xl text-sm font-bold transition-all"
                style={activeGroup === g
                  ? {background:'#244ffe',color:'white'}
                  : {background:'#1a1a1a',color:'#666'}}>
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-10 max-w-md mx-auto flex flex-col gap-3">
        <p className="text-xs font-medium" style={{color:'#555'}}>Grupo {activeGroup}</p>
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{background:'#141414'}} />)
        ) : (
          (matchesByGroup[activeGroup] ?? []).map(match => {
            const result = results[match.id]
            const hf = getTeamFlag(match.home_team)
            const af = getTeamFlag(match.away_team)
            const dateStr = new Date(`${match.match_date}T12:00:00`).toLocaleDateString('es-MX', {
              weekday: 'short', day: 'numeric', month: 'short'
            })

            return (
              <div key={match.id} className="p-4 rounded-2xl" style={{background:'#141414',border:`1px solid ${result ? 'rgba(0,202,66,0.2)' : '#1f1f1f'}`}}>
                <p className="text-xs mb-3" style={{color:'#555'}}>{dateStr} · {match.match_time}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center gap-1 w-24">
                    <span className="text-3xl">{hf}</span>
                    <span className="text-xs font-medium text-center text-white leading-tight">{match.home_team}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    {result ? (
                      <>
                        <div className="text-lg font-bold" style={{color:'#00CA42'}}>
                          {result.home_score !== undefined && result.away_score !== undefined
                            ? `${result.home_score} - ${result.away_score}`
                            : result.result === 'home' ? 'G · E'
                            : result.result === 'draw' ? 'Empate'
                            : 'E · G'}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'rgba(0,202,66,0.1)',color:'#00CA42'}}>
                          Finalizado
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-bold" style={{color:'#333'}}>VS</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-1 w-24">
                    <span className="text-3xl">{af}</span>
                    <span className="text-xs font-medium text-center text-white leading-tight">{match.away_team}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
