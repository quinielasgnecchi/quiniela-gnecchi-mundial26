import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getTeamFlag } from '../../types'

interface MatchData {
  id: number
  group_name: string
  match_date: string
  match_time: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  result: string | null
}

interface PredictionData {
  match_id: number
  prediction: 'home' | 'draw' | 'away'
  profiles: {
    full_name: string
  } | null
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<MatchData[]>([])
  const [predictions, setPredictions] = useState<PredictionData[]>([])
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    // 1. Obtener Partidos
    const { data: matchesData } = await supabase
      .from('matches')
      .select('id, group_name, match_date, match_time, home_team, away_team, home_score, away_score, result')
      .order('id', { ascending: true })

    // 2. Obtener Pronósticos con los nombres reales de los perfiles
    const { data: predsData } = await supabase
      .from('predictions')
      .select('match_id, prediction, profiles ( full_name )')

    if (matchesData) setMatches(matchesData)
    if (predsData) setPredictions(predsData as unknown as PredictionData[])
    setLoading(false)
  }

  const totalResults = matches.filter(m => m.result !== null).length

  const toggleExpand = (matchId: number) => {
    setExpandedMatchId(expandedMatchId === matchId ? null : matchId)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Cabecera pegajosa */}
      <div className="sticky top-0 z-10 px-4 pt-5 pb-4" style={{background:'#0a0a0a',borderBottom:'1px solid #1a1a1a'}}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-xl" style={{color:'#666'}}>←</button>
            <div className="flex-1">
              <h1 className="font-bold text-lg text-white">Resultados Oficiales</h1>
              <p className="text-xs" style={{color:'#555'}}>{totalResults} de 72 partidos jugados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Listado secuencial de partidos */}
      <div className="px-4 pt-4 pb-32 max-w-md mx-auto flex flex-col gap-3">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{background:'#141414'}} />)
        ) : (
          matches.map(match => {
            const hf = getTeamFlag(match.home_team)
            const af = getTeamFlag(match.away_team)
            const dateStr = new Date(`${match.match_date}T12:00:00`).toLocaleDateString('es-MX', {
              weekday:'short', day:'numeric', month:'short'
            })

            const formattedTime = match.match_time ? match.match_time.slice(0, 5) : ''
            const isFinished = match.result !== null
            const isExpanded = expandedMatchId === match.id

            // Filtrar pronósticos específicos de este partido
            const matchPreds = predictions.filter(p => p.match_id === match.id)
            
            const homePredictors = matchPreds.filter(p => p.prediction === 'home').map(p => p.profiles?.full_name || 'Anónimo')
            const drawPredictors = matchPreds.filter(p => p.prediction === 'draw').map(p => p.profiles?.full_name || 'Anónimo')
            const awayPredictors = matchPreds.filter(p => p.prediction === 'away').map(p => p.profiles?.full_name || 'Anónimo')

            return (
              <div 
                key={match.id} 
                onClick={() => toggleExpand(match.id)}
                className="p-4 rounded-2xl cursor-pointer transition-all active:scale-[0.99]" 
                style={{
                  background: '#141414',
                  border: `1px solid ${isFinished ? 'rgba(0,202,66,0.2)' : '#1f1f1f'}`
                }}
              >
                {/* ID del Partido y Fecha */}
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold" style={{color:'#244ffe'}}>
                    PARTIDO #{match.id} <span className="text-gray-600 font-normal">· {match.group_name}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs" style={{color:'#555'}}>{dateStr} · {formattedTime}</p>
                    <span className="text-gray-600 text-xs transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                  </div>
                </div>

                {/* Marcadores e Información de los equipos */}
                <div className="flex items-center justify-between mt-3">
                  {/* Local */}
                  <div className="flex flex-col items-center gap-1 w-24">
                    <span className="text-3xl">{hf}</span>
                    <span className="text-xs font-medium text-center text-white leading-tight">{match.home_team}</span>
                  </div>

                  {/* Bloque Central del Marcador */}
                  <div className="flex flex-col items-center gap-1">
                    {isFinished && match.home_score !== null && match.away_score !== null ? (
                      <div className="text-2xl font-bold text-white px-3 py-1 rounded-xl bg-[#1f1f1f]">
                        {match.home_score} — {match.away_score}
                      </div>
                    ) : (
                      <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#1a1a1a]" style={{color:'#444'}}>
                        PENDIENTE
                      </div>
                    )}
                  </div>

                  {/* Visitante */}
                  <div className="flex flex-col items-center gap-1 w-24">
                    <span className="text-3xl">{af}</span>
                    <span className="text-xs font-medium text-center text-white leading-tight">{match.away_team}</span>
                  </div>
                </div>

                {/* Menú Desplegable de Pronósticos de Participantes */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#1f1f1f] flex flex-col gap-3 text-left" onClick={(e) => e.stopPropagation()}>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Distribución de Pronósticos</p>
                    
                    {/* Bloque Local */}
                    <div className="p-2.5 rounded-xl bg-[#0d0d0d] border" style={{ borderColor: isFinished && match.result === 'home' ? '#00ca42' : '#1a1a1a' }}>
                      <p className="text-xs font-bold mb-1 text-white flex items-center justify-between">
                        <span>Gana {match.home_team} ({homePredictors.length})</span>
                        {isFinished && match.result === 'home' && <span className="text-[10px] text-[#00ca42] font-black">✔ ACERTARON</span>}
                      </p>
                      {homePredictors.length > 0 ? (
                        <p className="text-xs text-gray-400 leading-relaxed">{homePredictors.join(', ')}</p>
                      ) : (
                        <p className="text-xs text-gray-600 italic">Nadie eligió esta opción</p>
                      )}
                    </div>

                    {/* Bloque Empate */}
                    <div className="p-2.5 rounded-xl bg-[#0d0d0d] border" style={{ borderColor: isFinished && match.result === 'draw' ? '#00ca42' : '#1a1a1a' }}>
                      <p className="text-xs font-bold mb-1 text-white flex items-center justify-between">
                        <span>Empate ({drawPredictors.length})</span>
                        {isFinished && match.result === 'draw' && <span className="text-[10px] text-[#00ca42] font-black">✔ ACERTARON</span>}
                      </p>
                      {drawPredictors.length > 0 ? (
                        <p className="text-xs text-gray-400 leading-relaxed">{drawPredictors.join(', ')}</p>
                      ) : (
                        <p className="text-xs text-gray-600 italic">Nadie eligió esta opción</p>
                      )}
                    </div>

                    {/* Bloque Visitante */}
                    <div className="p-2.5 rounded-xl bg-[#0d0d0d] border" style={{ borderColor: isFinished && match.result === 'away' ? '#00ca42' : '#1a1a1a' }}>
                      <p className="text-xs font-bold mb-1 text-white flex items-center justify-between">
                        <span>Gana {match.away_team} ({awayPredictors.length})</span>
                        {isFinished && match.result === 'away' && <span className="text-[10px] text-[#00ca42] font-black">✔ ACERTARON</span>}
                      </p>
                      {awayPredictors.length > 0 ? (
                        <p className="text-xs text-gray-400 leading-relaxed">{awayPredictors.join(', ')}</p>
                      ) : (
                        <p className="text-xs text-gray-600 italic">Nadie eligió esta opción</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
