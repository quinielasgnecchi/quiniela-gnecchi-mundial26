import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { GROUP_MATCHES } from '../../data/matches'
import { getTeamFlag } from '../../types'

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

  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/')
    if (user?.role === 'admin') { fetchParticipants(); fetchPhase() }
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

  async function togglePhase() {
    const newVal = !phaseOpen
    if (phaseId) {
      await supabase.from('phases').update({ is_open: newVal }).eq('id', phaseId)
    } else {
      await supabase.from('phases').insert({ phase_key: 'groups', name: 'Fase de grupos', is_open: newVal })
    }
    setPhaseOpen(newVal)
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

    // Recalculate points
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
    <div className="px-4 pt-6 pb-nav">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-gray-400 text-xl">←</button>
        <div>
          <h1 className="text-xl font-bold">Panel admin</h1>
          <p className="text-xs text-gray-500">Quiniela Gnecchi Mundial 2026</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="card-dark p-3 text-center">
          <p className="text-2xl font-bold">{participants.length}</p>
          <p className="text-xs text-gray-500">Registrados</p>
        </div>
        <div className="card-dark p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{submitted}</p>
          <p className="text-xs text-gray-500">Enviaron</p>
        </div>
        <div className="card-dark p-3 text-center">
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
              <div key={p.id} className="card-dark p-3 flex items-center gap-3">
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
          <p className="text-sm text-gray-400 mb-4">Ingresa el resultado de cada partido para calcular puntos.</p>
          <div className="flex flex-col gap-3">
            {GROUP_MATCHES.slice(0, 10).map(match => {
              const res = results[match.id]
              const hf = getTeamFlag(match.home_team)
              const af = getTeamFlag(match.away_team)
              return (
                <div key={match.id} className="card-dark p-3">
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
            className="btn-primary mt-4"
            onClick={saveResults}
            disabled={savingResults || Object.keys(results).length === 0}
          >
            {savingResults ? 'Calculando...' : '💾 Guardar resultados y calcular puntos'}
          </button>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex flex-col gap-4">
          <div className="card-dark p-5">
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
          <div className="card-dark p-4 text-center text-gray-500 text-sm">
            Más configuraciones disponibles próximamente
          </div>
        </div>
      )}
    </div>
  )
}
