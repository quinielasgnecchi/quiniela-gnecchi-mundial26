import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { GROUP_MATCHES } from '../../data/matches'
import { getTeamFlag } from '../../types'
import { fetchLiveMatches } from '../../lib/footballApi'

interface Participant {
  id: string
  full_name: string
  email: string
  avatar_url?: string
  favorite_team?: string
  submitted: boolean
}

interface MatchScores {
  home_score: number | null
  away_score: number | null
  result: 'home' | 'draw' | 'away' | null
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [phaseOpen, setPhaseOpen] = useState(false)
  const [phaseId, setPhaseId] = useState('')
  
  // Guardamos goles y resultado por partido de forma integrada
  const [scores, setScores] = useState<Record<number, MatchScores>>({})
  const [savingResults, setSavingResults] = useState(false)
  const [activeTab, setActiveTab] = useState<'participants' | 'results' | 'settings'>('participants')
  
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    if (!user) return
    const isAuthorized = user.role === 'admin' || user.email?.toLowerCase() === 'jpgnecchi@hotmail.com'
    if (!isAuthorized) {
      navigate('/')
      return
    }
    fetchParticipants()
    fetchPhase()
    fetchSavedResults()
  }, [user])

  async function fetchPhase() {
    const { data } = await supabase.from('phases').select('*').eq('phase_key', 'groups').single()
    if (data) { setPhaseOpen(data.is_open); setPhaseId(data.id) }
  }

  async function fetchParticipants() {
    const { data: profiles } = await supabase.from('profiles').select('*').order('full_name')
    const { data: subs } = await supabase.from('submissions').select('user_id').eq('phase', 'groups')
    const submittedIds = new Set(subs?.map(s => s.user_id) ?? [])
    setParticipants((profiles ?? []).map(p => ({ ...p, submitted: submittedIds.has(p.id) })))
  }

  async function fetchSavedResults() {
    const { data } = await supabase.from('match_results').select('match_id, home_score, away_score, result')
    if (data) {
      const initialScores: Record<number, MatchScores> = {}
      data.forEach(row => {
        initialScores[row.match_id] = {
          home_score: row.home_score !== null ? Number(row.home_score) : null,
          away_score: row.away_score !== null ? Number(row.away_score) : null,
          result: row.result as 'home' | 'draw' | 'away' | null
        }
      })
      setScores(initialScores)
    }
  }

  async function togglePhase() {
    const newVal = !phaseOpen
    if (phaseId) {
      await supabase.from('phases').update({ is_open: newVal }).eq('id', phaseId)
    } else {
      await supabase.from('phases').insert({ phase_key: 'groups', name: 'Fase de grupos', is_open: newVal })
    }
    setPhaseOpen(newVal)
  }

  const handleScoreChange = (matchId: number, field: 'home_score' | 'away_score', value: string) => {
    const parsed = value === '' ? null : Math.max(0, parseInt(value) || 0)
    
    setScores(prev => {
      const current = prev[matchId] || { home_score: null, away_score: null, result: null }
      const updated = { ...current, [field]: parsed }
      
      let computedResult: 'home' | 'draw' | 'away' | null = null
      if (updated.home_score !== null && updated.away_score !== null) {
        if (updated.home_score > updated.away_score) computedResult = 'home'
        else if (updated.away_score > updated.home_score) computedResult = 'away'
        else computedResult = 'draw'
      }
      
      return { ...prev, [matchId]: { ...updated, result: computedResult } }
    })
  }

  const adjustScore = (matchId: number, field: 'home_score' | 'away_score', delta: number) => {
    setScores(prev => {
      const current = prev[matchId] || { home_score: null, away_score: null, result: null }
      const currentVal = current[field] ?? 0
      const newVal = Math.max(0, currentVal + delta)
      
      const updated = { ...current, [field]: newVal }
      let computedResult: 'home' | 'draw' | 'away' | null = null
      if (updated.home_score !== null && updated.away_score !== null) {
        if (updated.home_score > updated.away_score) computedResult = 'home'
        else if (updated.away_score > updated.home_score) computedResult = 'away'
        else computedResult = 'draw'
      }
      
      return { ...prev, [matchId]: { ...updated, result: computedResult } }
    })
  }

  async function syncApiResults() {
    setSyncing(true)
    setSyncMessage('Conectando con football-data.org...')
    try {
      const apiMatches = await fetchLiveMatches()
      const { data: tusPartidos, error: errorPartidos } = await supabase.from('matches').select('id, home_team, away_team')

      if (errorPartidos || !tusPartidos) {
        throw new Error('No se pudieron leer los partidos de Supabase')
      }

      let contadorActualizados = 0
      const nuevasScoresLocal = { ...scores }

      for (const apiMatch of apiMatches) {
        if (apiMatch.status === 'FINISHED') {
          const casaAPI = apiMatch.homeTeam.name
          const visitaAPI = apiMatch.awayTeam.name

          const miPartido = tusPartidos.find(p => 
            p.home_team.toLowerCase() === casaAPI.toLowerCase() ||
            p.away_team.toLowerCase() === visitaAPI.toLowerCase()
          )

          if (miPartido) {
            const golesCasa = apiMatch.score.fullTime.home
            const golesVisita = apiMatch.score.fullTime.away
            
            let ganador: 'home' | 'draw' | 'away' = 'draw'
            if (golesCasa > golesVisita) ganador = 'home'
            if (golesVisita > golesCasa) ganador = 'away'

            await supabase
              .from('match_results')
              .upsert({
                match_id: miPartido.id,
                home_score: golesCasa,
                away_score: golesVisita,
                result: ganador,
                recorded_at: new Date().toISOString()
              }, { onConflict: 'match_id' })

            nuevasScoresLocal[miPartido.id] = {
              home_score: golesCasa,
              away_score: golesVisita,
              result: ganador
            }
            contadorActualizados++
          }
        }
      }

      setScores(nuevasScoresLocal)
      await supabase.rpc('recalculate_points')
      setSyncMessage(`🎉 Éxito: ${contadorActualizados} partidos actualizados y puntos recalculados.`)
    } catch (error: any) {
      console.error(error)
      setSyncMessage(`❌ Error: ${error.message || 'Error de conexión'}`)
    } finally {
      setSyncing(false)
    }
  }

  async function saveResults() {
    setSavingResults(true)
    try {
      const rows = Object.entries(scores)
        .filter(([_, data]) => data.home_score !== null && data.away_score !== null && data.result !== null)
        .map(([matchId, data]) => ({
          match_id: parseInt(matchId),
          home_score: data.home_score,
          away_score: data.away_score,
          result: data.result,
          recorded_at: new Date().toISOString()
        }))

      for (const row of rows) {
        await supabase.from('match_results').upsert(row, { onConflict: 'match_id' })
      }

      await supabase.rpc('recalculate_points')
      alert('Marcadores guardados y puntos recalculados correctamente ✅')
    } catch (err) {
      console.error(err)
      alert('Ocurrió un error al guardar los marcadores.')
    } finally {
      setSavingResults(false)
    }
  }

  async function exportCSV() {
    const rows = participants.map(p =>
      `${p.full_name},${p.email},${p.favorite_team ?? ''},${p.submitted ? 'Sí' : 'No'}`
    )
    const csv = ['Nombre,Correo,Selección,Quiniela enviada', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'participantes.csv'; a.click()
  }

  const submitted = participants.filter(p => p.submitted).length

  return (
    <div className="px-4 pt-6 pb-nav text-white bg-[#0a0a0a] min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-gray-400 text-xl">←</button>
        <div>
          <h1 className="text-xl font-bold">Panel admin</h1>
          <p className="text-xs text-gray-500">Quiniela Gnecchi Mundial 2026</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold">{participants.length}</p>
          <p className="text-xs text-gray-500">Registrados</p>
        </div>
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{submitted}</p>
          <p className="text-xs text-gray-500">Enviaron</p>
        </div>
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">{participants.length - submitted}</p>
          <p className="text-xs text-gray-500">Pendientes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#111] rounded-xl p-1 mb-5">
        {(['participants', 'results', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab ? 'bg-[#0299fc] text-white' : 'text-gray-500'
            }`}
          >
            {tab === 'participants' ? '👥 Gente' : tab === 'results' ? '⚽ Marcadores' : '⚙️ Config'}
          </button>
        ))}
      </div>

      {activeTab === 'participants' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-gray-400">{participants.length} participantes</p>
            <button
              onClick={exportCSV}
              className="text-xs text-[#0299fc] border border-[#0299fc]/30 px-3 py-1.5 rounded-lg"
            >
              Exportar CSV
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {participants.map(p => (
              <div key={p.id} className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1a1a1a] overflow-hidden flex items-center justify-center flex-shrink-0">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span>{getTeamFlag(p.favorite_team ?? '')}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{p.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                  p.submitted ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'
                }`}>
                  {p.submitted ? '✅' : '⏳'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div>
          {/* Módulo API */}
          <div className="mb-5 p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Conexión API en Vivo</h3>
            <button
              onClick={syncApiResults}
              disabled={syncing}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                syncing ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {syncing ? 'Sincronizando Marcadores...' : '🔄 Sincronizar desde football-data.org'}
            </button>
            {syncMessage && (
              <p className="mt-2.5 text-center text-xs font-medium text-gray-300 bg-[#1c1c1c] p-2 rounded-lg border border-[#262626]">
                {syncMessage}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-400 mb-4 px-1">Modifica los goles con los botones + / - o escribiendo directamente. El ganador se calcula automáticamente.</p>
          
          <div className="flex flex-col gap-3">
            {GROUP_MATCHES.map(match => {
              const matchScores = scores[match.id] || { home_score: null, away_score: null, result: null }
              const hf = getTeamFlag(match.home_team)
              const af = getTeamFlag(match.away_team)
              
              return (
                <div key={match.id} className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-3.5">
                  <div className="flex justify-between items-center text-[11px] text-gray-500 mb-3">
                    <span>{match.match_date}</span>
                    <span className="bg-[#1f1f1f] px-2 py-0.5 rounded-md font-medium text-gray-400">Grupo {match.group_name}</span>
                  </div>
                  
                  {/* Selector e Input Móvil */}
                  <div className="grid grid-cols-7 items-center gap-1 bg-[#0d0d0d] p-2.5 rounded-xl border border-[#1a1a1a]">
                    
                    {/* Local */}
                    <div className="col-span-3 flex flex-col items-center gap-1.5 min-w-0">
                      <div className="flex items-center gap-1 w-full justify-center px-1">
                        <span className="text-base flex-shrink-0">{hf}</span>
                        <span className="text-xs font-semibold truncate text-gray-200">{match.home_team}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => adjustScore(match.id, 'home_score', -1)}
                          className="w-7 h-7 bg-[#1c1c1c] rounded-lg text-sm active:bg-[#2a2a2a] flex items-center justify-center font-bold text-gray-400 border border-[#262626]"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          value={matchScores.home_score ?? ''}
                          onChange={(e) => handleScoreChange(match.id, 'home_score', e.target.value)}
                          className="w-10 h-7 bg-[#141414] border border-[#2a2a2a] rounded-lg text-center font-mono text-sm font-bold text-white focus:outline-none focus:border-[#0299fc]"
                        />
                        <button 
                          onClick={() => adjustScore(match.id, 'home_score', 1)}
                          className="w-7 h-7 bg-[#1c1c1c] rounded-lg text-sm active:bg-[#2a2a2a] flex items-center justify-center font-bold text-gray-400 border border-[#262626]"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* VS / Resultado Visual */}
                    <div className="col-span-1 flex flex-col items-center justify-center">
                      <span className="text-[10px] text-gray-600 font-bold tracking-wider uppercase">VS</span>
                      {matchScores.result && (
                        <span className="text-[10px] font-bold mt-1 text-[#0299fc] bg-[#0299fc]/10 px-1.5 py-0.5 rounded-md">
                          {matchScores.result === 'home' ? 'L' : matchScores.result === 'away' ? 'V' : 'E'}
                        </span>
                      )}
                    </div>

                    {/* Visitante */}
                    <div className="col-span-3 flex flex-col items-center gap-1.5 min-w-0">
                      <div className="flex items-center gap-1 w-full justify-center px-1">
                        <span className="text-xs font-semibold truncate text-gray-200">{match.away_team}</span>
                        <span className="text-base flex-shrink-0">{af}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => adjustScore(match.id, 'away_score', -1)}
                          className="w-7 h-7 bg-[#1c1c1c] rounded-lg text-sm active:bg-[#2a2a2a] flex items-center justify-center font-bold text-gray-400 border border-[#262626]"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          value={matchScores.away_score ?? ''}
                          onChange={(e) => handleScoreChange(match.id, 'away_score', e.target.value)}
                          className="w-10 h-7 bg-[#141414] border border-[#2a2a2a] rounded-lg text-center font-mono text-sm font-bold text-white focus:outline-none focus:border-[#0299fc]"
                        />
                        <button 
                          onClick={() => adjustScore(match.id, 'away_score', 1)}
                          className="w-7 h-7 bg-[#1c1c1c] rounded-lg text-sm active:bg-[#2a2a2a] flex items-center justify-center font-bold text-gray-400 border border-[#262626]"
                        >
                          +
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
          
          <button
            className="w-full bg-[#0299fc] hover:bg-[#0286dd] active:bg-[#0275c2] text-white py-3.5 rounded-xl font-bold text-xs transition-colors mt-5 shadow-lg sticky bottom-4 z-10"
            onClick={saveResults}
            disabled={savingResults || Object.keys(scores).length === 0}
          >
            {savingResults ? 'Guardando y Recalculando...' : '💾 Guardar Marcadores y Calcular Puntos'}
          </button>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex flex-col gap-4">
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium">Fase de grupos</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {phaseOpen ? 'Los usuarios pueden registrar pronósticos' : 'Pronósticos bloqueados'}
                </p>
              </div>
              <button
                onClick={togglePhase}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  phaseOpen ? 'bg-[#0299fc]' : 'bg-[#333]'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    phaseOpen ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-4 text-center text-gray-500 text-sm">
            Más configuraciones disponibles próximamente
          </div>
        </div>
      )}
    </div>
  )
}
