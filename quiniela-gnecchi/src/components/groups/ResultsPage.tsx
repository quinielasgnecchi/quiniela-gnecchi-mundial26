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

export default function ResultsPage() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<MatchData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMatchesFromDb()
  }, [])

  async function fetchMatchesFromDb() {
    // Leemos directo de la tabla 'matches' ordenados numéricamente por su ID
    const { data } = await supabase
      .from('matches')
      .select('id, group_name, match_date, match_time, home_team, away_team, home_score, away_score, result')
      .order('id', { ascending: true })

    if (data) {
      setMatches(data)
    }
    setLoading(false)
  }

  // Cuenta cuántos partidos ya tienen un resultado oficial guardado por ti
  const totalResults = matches.filter(m => m.result !== null).length

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
      <div className="px-4 pt-4 pb-10 max-w-md mx-auto flex flex-col gap-3">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{background:'#141414'}} />)
        ) : (
          matches.map(match => {
            const hf = getTeamFlag(match.home_team)
            const af = getTeamFlag(match.away_team)
            const dateStr = new Date(`${match.match_date}T12:00:00`).toLocaleDateString('es-MX', {
              weekday:'short', day:'numeric', month:'short'
            })

            const isFinished = match.result !== null

            return (
              <div key={match.id} className="p-4 rounded-2xl" style={{
                background:'#141414',
                border:`1px solid ${isFinished ? 'rgba(0,202,66,0.2)' : '#1f1f1f'}`
              }}>
                {/* ID del Partido y Fecha */}
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold" style={{color:'#244ffe'}}>
                    PARTIDO #{match.id} <span className="text-gray-600 font-normal">· {match.group_name}</span>
                  </p>
                  <p className="text-xs" style={{color:'#555'}}>{dateStr} · {match.match_time}</p>
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

                {/* Badge Inferior Informativo */}
                {isFinished && (
                  <div className="text-center mt-2.5 pt-2 text-[10px] tracking-wide uppercase border-t border-[#1f1f1f]" style={{color:'#00CA42'}}>
                    Ganador en sistema: <span className="font-bold">{match.result}</span>
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
