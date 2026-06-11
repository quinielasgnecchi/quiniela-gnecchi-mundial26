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

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [phaseOpen, setPhaseOpen] = useState(false)
  const [phaseId, setPhaseId] = useState('')
  const [results, setResults] = useState<Record<number, 'home' | 'draw' | 'away'>>({})
  const [savingResults, setSavingResults] = useState(false)
  const [activeTab, setActiveTab] = useState<'participants' | 'results' | 'settings'>('participants')
  
  // Estados para el control de la API en vivo
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/')
    if (user?.role === 'admin') { fetchParticipants(); fetchPhase(); fetchSavedResults() }
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
    const { data } = await supabase.from('match_results').select('match_id, result')
    if (data) {
      const initialResults: Record<number, 'home' | 'draw' | 'away'> = {}
      data.forEach(row => {
        initialResults[row.match_id] = row.result as 'home' | 'draw' | 'away'
      })
      setResults(initialResults)
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

  // Sincronización y cruce directo con la API externa
  async function syncApiResults() {
    setSyncing(true)
    setSyncMessage('Conectando con football-data.org...')
    try {
      const apiMatches = await fetchLiveMatches()
      
      const { data: tusPartidos, error: errorPartidos } = await supabase
        .from('matches')
        .select('id, home_team, away_team')

      if (errorPartidos || !tusPartidos) {
        throw new Error('No se pudieron leer los partidos de Supabase')
      }

      let contadorActualizados = 0
      const nuevasPrediccionesLocal: Record<number, 'home' | 'draw' | 'away'> = { ...results }

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

            nuevasPrediccionesLocal[miPartido.id] = ganador
            contadorActualizados++
          }
        }
      }

      setResults(nuevasPrediccionesLocal)
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
    const rows = Object.entries(results).map(([matchId, result]) => ({
      match_id: parseInt(matchId),
      result,
    }))

    for (const row of rows) {
      await supabase.from('match_results').upsert(row, { onConflict: 'match_id' })
    }

    await supabase.rpc('recalculate_points')
    setSavingResults(false)
    alert('Resultados guardados y puntos actualizados ✅')
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
            {tab === 'participants' ? '👥 Gente' : tab === 'results' ? '⚽ Resultados' : '⚙️ Config'}
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
          {/* Módulo Cruce de Datos API-Football-Data */}
          <div className="mb-6 p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f]">
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

          <p className="text-sm text-gray-400 mb-4">Ingresa manualmente el resultado de cada partido o usa la sincronización externa.</p>
          <div className="flex flex-col gap-3">
            {GROUP_MATCHES.map(match => {
              const res = results[match.id]
              const hf = getTeamFlag(match.home_team)
              const af = getTeamFlag(match.away_team)
              return (
                <div key={match.id} className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-3">
                  <p className="text-xs text-gray-500 mb-2">{match.match_date} · Grupo {match.group_name}</p>
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <span>{hf}</span>
                    <span className="truncate flex-1">{match.home_team}</span>
                    <span className="text-gray-600">vs</span>
                    <span className="truncate flex-1 text-right">{match.away_team}</span>
                    <span>{af}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {(['home','draw','away'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => setResults(prev => ({ ...prev, [match.id]: r }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs border transition-all ${
                          res === r
                            ? 'bg-[#0299fc] border-[#0299fc] text-white'
                            : 'border-[#2a2a2a] text-gray-500'
                        }`}
                      >
                        {r === 'home' ? `${hf} Gana` : r === 'draw' ? '🤝' : `${af} Gana`}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <button
            className="w-full bg-[#0299fc] hover:bg-[#0286dd] text-white py-2.5 rounded-xl font-bold text-xs transition-colors mt-4"
            onClick={saveResults}
            disabled={savingResults || Object.keys(results).length === 0}
          >
            {savingResults ? 'Calculando...' : '💾 Guardar resultados manuales y calcular puntos'}
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
