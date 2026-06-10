import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { GROUP_MATCHES } from '../../data/matches'
import { getTeamFlag } from '../../types'

type PredType = 'home' | 'draw' | 'away'
type PredMap = Record<number, PredType>

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export default function GroupsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [predictions, setPredictions] = useState<PredMap>({})
  const [submitted, setSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeGroup, setActiveGroup] = useState('A')
  const [phaseOpen, setPhaseOpen] = useState(true)

  useEffect(() => {
    if (!user) return
    loadExisting()
    checkPhase()
  }, [user])

  async function checkPhase() {
    const { data } = await supabase.from('phases').select('is_open').eq('phase_key', 'groups').single()
    setPhaseOpen(data?.is_open ?? true)
  }

  async function loadExisting() {
    if (!user) return
    const { data: preds } = await supabase
      .from('predictions')
      .select('match_id, prediction')
      .eq('user_id', user.id)
      .eq('phase', 'groups')

    if (preds?.length) {
      const map: PredMap = {}
      preds.forEach(p => { map[p.match_id] = p.prediction })
      setPredictions(map)
    }

    const { data: sub } = await supabase
      .from('submissions')
      .select('submitted_at')
      .eq('user_id', user.id)
      .eq('phase', 'groups')
      .single()

    if (sub) {
      setSubmitted(true)
      setSubmittedAt(sub.submitted_at)
    }
  }

  function setPred(matchId: number, pred: PredType) {
    if (submitted) return
    setPredictions(prev => ({ ...prev, [matchId]: pred }))
  }

  const total = GROUP_MATCHES.length
  const done = Object.keys(predictions).length
  const progress = Math.round((done / total) * 100)
  const allDone = done === total

  const matchesByGroup = useMemo(() => {
    const map: Record<string, typeof GROUP_MATCHES> = {}
    GROUP_MATCHES.forEach(m => {
      if (!map[m.group_name]) map[m.group_name] = []
      map[m.group_name].push(m)
    })
    return map
  }, [])

  async function handleSubmit() {
    if (!user || !allDone || submitted) return
    setSaving(true)

    const rows = Object.entries(predictions).map(([matchId, pred]) => ({
      user_id: user.id,
      match_id: parseInt(matchId),
      prediction: pred,
      phase: 'groups',
    }))

    await supabase.from('predictions').upsert(rows, { onConflict: 'user_id,match_id' })

    const now = new Date().toISOString()
    await supabase.from('submissions').upsert({
      user_id: user.id,
      phase: 'groups',
      submitted_at: now,
      predictions_count: total,
    }, { onConflict: 'user_id,phase' })

    setSubmitted(true)
    setSubmittedAt(now)
    setSaving(false)
  }

  return (
    <div className="pb-nav">
      {/* Header */}
      <div className="sticky top-0 bg-[#0a0a0a] z-10 px-4 pt-4 pb-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/')} className="text-gray-400 text-xl">←</button>
          <div>
            <h1 className="font-bold text-lg leading-none">Fase de grupos</h1>
            <p className="text-xs text-gray-500 mt-0.5">{done}/{total} partidos</p>
          </div>
          {submitted && (
            <span className="ml-auto text-xs bg-green-500/15 text-green-400 px-2 py-1 rounded-full">
              ✅ Enviada
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#0299fc,#244ffe)' }}
          />
        </div>

        {/* Group tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {GROUPS.map(g => {
            const groupMatches = matchesByGroup[g] ?? []
            const groupDone = groupMatches.filter(m => predictions[m.id]).length
            const allGroupDone = groupDone === groupMatches.length
            return (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`flex-shrink-0 w-10 h-10 rounded-xl text-sm font-bold transition-all relative ${
                  activeGroup === g
                    ? 'bg-[#0299fc] text-white'
                    : 'bg-[#1a1a1a] text-gray-400'
                }`}
              >
                {g}
                {allGroupDone && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full text-[8px] flex items-center justify-center">✓</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Matches */}
      <div className="px-4 pt-4 flex flex-col gap-3">
        <p className="text-xs text-gray-500 font-medium">Grupo {activeGroup}</p>

        {(matchesByGroup[activeGroup] ?? []).map(match => {
          const pred = predictions[match.id]
          const homeFlag = getTeamFlag(match.home_team)
          const awayFlag = getTeamFlag(match.away_team)
          const dateStr = new Date(`${match.match_date}T${match.match_time}`).toLocaleDateString('es-MX', {
            weekday: 'short', day: 'numeric', month: 'short'
          })

          return (
            <div key={match.id} className={`card-dark p-4 ${pred ? 'border-[#0299fc]/20' : ''}`}>
              <p className="text-xs text-gray-500 mb-3">
                {dateStr} · {match.match_time}
              </p>

              {/* Teams */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col items-center gap-1 w-24">
                  <span className="text-3xl">{homeFlag}</span>
                  <span className="text-xs font-medium text-center leading-tight">{match.home_team}</span>
                </div>
                <div className="text-gray-600 font-bold text-sm">VS</div>
                <div className="flex flex-col items-center gap-1 w-24">
                  <span className="text-3xl">{awayFlag}</span>
                  <span className="text-xs font-medium text-center leading-tight">{match.away_team}</span>
                </div>
              </div>

              {/* Prediction buttons */}
              <div className="flex gap-2">
                <button
                  className={`pred-btn ${pred === 'home' ? 'selected-home' : ''}`}
                  onClick={() => setPred(match.id, 'home')}
                  disabled={submitted || !phaseOpen}
                >
                  {homeFlag} Gana
                </button>
                <button
                  className={`pred-btn ${pred === 'draw' ? 'selected-draw' : ''}`}
                  onClick={() => setPred(match.id, 'draw')}
                  disabled={submitted || !phaseOpen}
                >
                  🤝 Empate
                </button>
                <button
                  className={`pred-btn ${pred === 'away' ? 'selected-away' : ''}`}
                  onClick={() => setPred(match.id, 'away')}
                  disabled={submitted || !phaseOpen}
                >
                  {awayFlag} Gana
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit bar */}
      {!submitted && phaseOpen && (
        <div className="fixed bottom-[72px] left-0 right-0 px-4 py-3 bg-[#0a0a0a] border-t border-[#1a1a1a]">
          {!allDone && (
            <p className="text-xs text-center text-gray-500 mb-2">
              Faltan {total - done} partidos por seleccionar
            </p>
          )}
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!allDone || saving}
          >
            {saving ? 'Enviando...' : allDone ? '✅ Enviar quiniela' : `Completa los ${total - done} restantes`}
          </button>
        </div>
      )}

      {submitted && (
        <div className="px-4 py-4 mx-4 mt-4 mb-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
          <p className="text-green-400 font-semibold mb-1">✅ Quiniela enviada</p>
          <p className="text-xs text-gray-400">
            {new Date(submittedAt).toLocaleDateString('es-MX', {
              day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
      )}
    </div>
  )
}
