import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fetchLiveMatches, type LiveMatch } from '../../lib/footballApi'
import { GROUP_MATCHES } from '../../data/matches'
import { getTeamFlag } from '../../types'

interface ManualResult {
  match_id: number
  result: 'home' | 'draw' | 'away'
  home_score?: number
  away_score?: number
}

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export default function ResultsPage() {
  const navigate = useNavigate()
  const [manualResults, setManualResults] = useState<Record<number, ManualResult>>({})
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [activeGroup, setActiveGroup] = useState('A')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchManualResults()
    fetchLive()
    // Refresh live data every 60 seconds
    const interval = setInterval(fetchLive, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchManualResults() {
    const { data } = await supabase.from('match_results').select('*')
    if (data) {
      const map: Record<number, ManualResult> = {}
      data.forEach(r => { map[r.match_id] = r })
      setManualResults(map)
    }
    setLoading(false)
  }

  async function fetchLive() {
    const live = await fetchLiveMatches()
    setLiveMatches(live)
  }

  const matchesByGroup: Record<string, typeof GROUP_MATCHES> = {}
  GROUP_MATCHES.forEach(m => {
    if (!matchesByGroup[m.group_name]) matchesByGroup[m.group_name] = []
    matchesByGroup[m.group_name].push(m)
  })

  function getLiveData(match: typeof GROUP_MATCHES[0]): LiveMatch | undefined {
    return liveMatches.find(l =>
      l.homeTeam.toLowerCase().includes(match.home_team.toLowerCase().slice(0,5)) ||
      l.awayTeam.toLowerCase().includes(match.away_team.toLowerCase().slice(0,5))
    )
  }

  const totalResults = Object.keys(manualResults).length

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="sticky top-0 z-10 px-4 pt-5 pb-4" style={{background:'#0a0a0a',borderBottom:'1px solid #1a1a1a'}}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="text-xl" style={{color:'#666'}}>←</button>
            <div className="flex-1">
              <h1 className="font-bold text-lg text-white">Resultados</h1>
              <p className="text-xs" style={{color:'#555'}}>{totalResults} de 72 partidos jugados</p>
            </div>
            {liveMatches.some(m => m.status === 'IN_PLAY') && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{background:'rgba(234,0,1,0.15)'}}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#EA0001'}} />
                <span className="text-xs font-medium" style={{color:'#EA0001'}}>En vivo</span>
              </div>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {GROUPS.map(g => (
              <button key={g} onClick={() => setActiveGroup(g)}
                className="flex-shrink-0 w-10 h-10 rounded-xl text-sm font-bold"
                style={activeGroup === g ? {background:'#244ffe',color:'white'} : {background:'#1a1a1a',color:'#666'}}>
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-10 max-w-md mx-auto flex flex-col gap-3">
        <p className="text-xs font-medium" style={{color:'#555'}}>Grupo {activeGroup}</p>
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{background:'#141414'}} />)
        ) : (
          (matchesByGroup[activeGroup] ?? []).map(match => {
            const manual = manualResults[match.id]
            const live = getLiveData(match)
            const hf = getTeamFlag(match.home_team)
            const af = getTeamFlag(match.away_team)
            const dateStr = new Date(`${match.match_date}T12:00:00`).toLocaleDateString('es-MX', {
              weekday:'short', day:'numeric', month:'short'
            })

            const isLive = live?.status === 'IN_PLAY' || live?.status === 'PAUSED'
            const isFinished = manual || live?.status === 'FINISHED'
            const homeScore = live?.homeScore ?? manual?.home_score
            const awayScore = live?.awayScore ?? manual?.away_score

            return (
              <div key={match.id} className="p-4 rounded-2xl" style={{
                background:'#141414',
                border:`1px solid ${isLive ? 'rgba(234,0,1,0.3)' : isFinished ? 'rgba(0,202,66,0.2)' : '#1f1f1f'}`
              }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs" style={{color:'#555'}}>{dateStr} · {match.match_time}</p>
                  {isLive && (
                    <span className="text-xs font-medium flex items-center gap-1" style={{color:'#EA0001'}}>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                      En vivo {live?.minute ? `${live.minute}'` : ''}
                    </span>
                  )}
                  {isFinished && !isLive && (
                    <span className="text-xs" style={{color:'#00CA42'}}>Finalizado</span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex flex-col items-center gap-1 w-24">
                    <span className="text-3xl">{hf}</span>
                    <span className="text-xs font-medium text-center text-white leading-tight">{match.home_team}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    {homeScore !== undefined && homeScore !== null ? (
                      <div className="text-2xl font-bold text-white">{homeScore} — {awayScore}</div>
                    ) : (
                      <div className="text-sm font-bold" style={{color:'#333'}}>VS</div>
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
