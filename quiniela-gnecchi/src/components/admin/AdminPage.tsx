import { useEffect, useState } from 'react'
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

export default function AdminPage() {
  const [matches, setMatches] = useState<MatchData[]>([])
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<Record<number, { home_score: string; away_score: string }>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  useEffect(() => {
    fetchMatches()
  }, [])

  async function fetchMatches() {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id, group_name, match_date, match_time, home_team, away_team, home_score, away_score, result')
        .order('id', { ascending: true })

      if (error) throw error

      if (data) {
        setMatches(data)
        const initialScores: Record<number, { home_score: string; away_score: string }> = {}
        data.forEach(m => {
          initialScores[m.id] = {
            home_score: m.home_score !== null ? String(m.home_score) : '',
            away_score: m.away_score !== null ? String(m.away_score) : ''
          }
        })
        setScores(initialScores)
      }
    } catch (err) {
      console.error('Error al cargar partidos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleScoreChange = (matchId: number, side: 'home' | 'away', value: string) => {
    setScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [`${side}_score`]: value
      }
    }))
  }

  async function handleSaveResult(matchId: number) {
    const matchScores = scores[matchId]
    if (!matchScores || matchScores.home_score === '' || matchScores.away_score === '') {
      alert('Por favor ingresa ambos marcadores.')
      return
    }

    const hScore = Number(matchScores.home_score)
    const aScore = Number(matchScores.away_score)

    if (isNaN(hScore) || isNaN(aScore)) {
      alert('Los marcadores deben ser números válidos.')
      return
    }

    let finalResult: 'home' | 'draw' | 'away' = 'draw'
    if (hScore > aScore) finalResult = 'home'
    else if (aScore > hScore) finalResult = 'away'

    setSavingId(matchId)

    try {
      // 1. Guardar el resultado directamente en la tabla de matches
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          home_score: hScore,
          away_score: aScore,
          result: finalResult
        })
        .eq('id', matchId)

      if (matchError) throw matchError

      // 2. Ejecutar la función RPC para recalcular puntos globales instantáneamente
      const { error: rpcError } = await supabase.rpc('recalculate_points')
      if (rpcError) throw rpcError

      alert(`Partido #${matchId} actualizado con éxito. Puntos recalculados.`)
      fetchMatches()
    } catch (err) {
      console.error('Error al guardar el resultado:', err)
      alert('Ocurrió un error al guardar el resultado en la base de datos.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 pb-24">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-1">Panel de Administrador</h1>
        <p className="text-xs text-gray-500 mb-6">Ingresa los resultados oficiales aquí.</p>

        {loading ? (
          <p className="text-center text-sm text-gray-400">Cargando partidos...</p>
        ) : (
          <div className="flex flex-col gap-4">
            {matches.map(match => {
              const isSaving = savingId === match.id
              return (
                <div key={match.id} className="p-4 bg-[#141414] border border-[#1f1f1f] rounded-2xl">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-[#244ffe]">PARTIDO #{match.id}</span>
                    <span className="text-[11px] text-gray-500">{match.group_name} · {match.match_date}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Local */}
                    <div className="flex flex-col items-center gap-1 w-24 text-center">
                      <span className="text-2xl">{getTeamFlag(match.home_team)}</span>
                      <span className="text-xs font-medium truncate w-full">{match.home_team}</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={scores[match.id]?.home_score || ''}
                        onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                        className="w-12 text-center bg-[#1f1f1f] border border-[#2d2d2d] rounded-lg p-1 text-sm mt-1 focus:outline-none focus:border-[#244ffe]"
                      />
                    </div>

                    <span className="text-gray-600 font-bold text-sm">VS</span>

                    {/* Visitante */}
                    <div className="flex flex-col items-center gap-1 w-24 text-center">
                      <span className="text-2xl">{getTeamFlag(match.away_team)}</span>
                      <span className="text-xs font-medium truncate w-full">{match.away_team}</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={scores[match.id]?.away_score || ''}
                        onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                        className="w-12 text-center bg-[#1f1f1f] border border-[#2d2d2d] rounded-lg p-1 text-sm mt-1 focus:outline-none focus:border-[#244ffe]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveResult(match.id)}
                    disabled={isSaving}
                    className="w-full mt-4 bg-[#244ffe] hover:bg-[#1e40cc] disabled:bg-gray-700 text-white font-bold py-2 rounded-xl text-xs transition-colors"
                  >
                    {isSaving ? 'Guardando...' : match.result ? 'Actualizar Resultado' : 'Guardar Resultado'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
