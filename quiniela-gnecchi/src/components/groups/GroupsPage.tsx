import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { GROUP_MATCHES } from '../../data/matches'
import { getTeamFlag } from '../../types'

type PredType = 'home' | 'draw' | 'away'
type PredMap = Record<number, PredType>

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']
const DEADLINE = new Date('2026-06-11T19:00:00Z')

export default function GroupsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [predictions, setPredictions] = useState<PredMap>({})
  const [saved, setSaved] = useState<PredMap>({})
  const [submitted, setSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeGroup, setActiveGroup] = useState('A')
  const phaseOpen = new Date() < DEADLINE

  useEffect(() => {
    if (!user) return
    loadExisting()
  }, [user])

  async function loadExisting() {
    if (!user) return
    const { data: preds } = await supabase.from('predictions').select('match_id, prediction').eq('user_id', user.id).eq('phase', 'groups')
    if (preds?.length) {
      const map: PredMap = {}
      preds.forEach(p => { map[p.match_id] = p.prediction })
      setPredictions(map)
      setSaved(map)
    }
    const { data: sub } = await supabase.from('submissions').select('submitted_at').eq('user_id', user.id).eq('phase', 'groups').single()
    if (sub) { setSubmitted(true); setSubmittedAt(sub.submitted_at) }
  }

  function setPred(matchId: number, pred: PredType) {
    if (submitted || !phaseOpen) return
    setPredictions(prev => ({ ...prev, [matchId]: pred }))
  }

  const total = GROUP_MATCHES.length
  const done = Object.keys(predictions).length
  const progress = Math.round((done / total) * 100)
  const allDone = done === total
  const hasUnsaved = JSON.stringify(predictions) !== JSON.stringify(saved)

  const matchesByGroup = useMemo(() => {
    const map: Record<string, typeof GROUP_MATCHES> = {}
    GROUP_MATCHES.forEach(m => {
      if (!map[m.group_name]) map[m.group_name] = []
      map[m.group_name].push(m)
    })
    return map
  }, [])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    const rows = Object.entries(predictions).map(([matchId, pred]) => ({
      user_id: user.id, match_id: parseInt(matchId), prediction: pred, phase: 'groups',
    }))
    await supabase.from('predictions').upsert(rows, { onConflict: 'user_id,match_id' })
    setSaved({...predictions})
    setSaving(false)
  }

  async function handleSubmit() {
  if (!user || !allDone || submitted || !phaseOpen) return
  setSaving(true)

  const rows = Object.entries(predictions).map(([matchId, pred]) => ({
    user_id: user.id,
    match_id: Number(matchId),
    prediction: pred,
    phase: 'groups',
  }))

  const { error } = await supabase
    .from('predictions')
    .upsert(rows, { onConflict: 'user_id,match_id' })

  if (error) {
    console.error(error)
    setSaving(false)
    return
  }

  const now = new Date().toISOString()

  await supabase
    .from('submissions')
    .upsert({
      user_id: user.id,
      phase: 'groups',
      submitted_at: now,
      predictions_count: rows.length,
    }, { onConflict: 'user_id,phase' })

  setSubmitted(true)
  setSubmittedAt(now)
  setSaving(false)
}

  return (
    <div className="pb-nav bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{background:'#0a0a0a',borderBottom:'1px solid #1a1a1a'}}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/')} className="text-xl" style={{color:'#666'}}>←</button>
          <div className="flex-1">
            <h1 className="font-bold text-lg text-white">Fase de grupos</h1>
            <p className="text-xs" style={{color:'#555'}}>{done}/{total} partidos</p>
          </div>
          {submitted && <span className="text-xs px-2 py-1 rounded-full" style={{background:'rgba(0,202,66,0.15)',color:'#00CA42'}}>✅ Enviada</span>}
        </div>

        <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{background:'#1a1a1a'}}>
          <div className="h-full rounded-full transition-all" style={{width:`${progress}%`,background:'#244ffe'}} />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {GROUPS.map(g => {
            const gm = matchesByGroup[g] ?? []
            const gDone = gm.filter(m => predictions[m.id]).length === gm.length
            return (
              <button key={g} onClick={() => setActiveGroup(g)}
                className="flex-shrink-0 w-10 h-10 rounded-xl text-sm font-bold relative"
                style={activeGroup === g ? {background:'#244ffe',color:'white'} : {background:'#1a1a1a',color:'#666'}}>
                {g}
                {gDone && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full text-[8px] flex items-center justify-center" style={{background:'#00CA42'}}>✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3">
        <p className="text-xs font-medium" style={{color:'#555'}}>Grupo {activeGroup}</p>

        {(matchesByGroup[activeGroup] ?? []).map(match => {
          const pred = predictions[match.id]
          const hf = getTeamFlag(match.home_team)
          const af = getTeamFlag(match.away_team)
          const dateStr = new Date(`${match.match_date}T12:00:00`).toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short' })

          return (
            <div key={match.id} className="p-4 rounded-2xl" style={{background:'#141414',border:`1px solid ${pred ? 'rgba(36,79,254,0.3)' : '#1f1f1f'}`}}>
              <p className="text-xs mb-3" style={{color:'#555'}}>{dateStr} · {match.match_time}</p>
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col items-center gap-1 w-24">
                  <span className="text-3xl">{hf}</span>
                  <span className="text-xs font-medium text-center text-white leading-tight">{match.home_team}</span>
                </div>
                <div className="font-bold text-sm" style={{color:'#333'}}>VS</div>
                <div className="flex flex-col items-center gap-1 w-24">
                  <span className="text-3xl">{af}</span>
                  <span className="text-xs font-medium text-center text-white leading-tight">{match.away_team}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className={`pred-btn ${pred === 'home' ? 'selected-home' : ''}`} onClick={() => setPred(match.id, 'home')} disabled={submitted || !phaseOpen}>
                  {hf} Gana
                </button>
                <button className={`pred-btn ${pred === 'draw' ? 'selected-draw' : ''}`} onClick={() => setPred(match.id, 'draw')} disabled={submitted || !phaseOpen}>
                  🤝 Empate
                </button>
                <button className={`pred-btn ${pred === 'away' ? 'selected-away' : ''}`} onClick={() => setPred(match.id, 'away')} disabled={submitted || !phaseOpen}>
                  {af} Gana
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom action bar */}
      {!submitted && phaseOpen && (
        <div className="fixed bottom-[72px] left-0 right-0 px-4 py-3" style={{background:'#0a0a0a',borderTop:'1px solid #1a1a1a'}}>
          <div className="flex gap-3 max-w-md mx-auto">
            {hasUnsaved && (
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3.5 rounded-xl font-semibold text-white"
                style={{background:'#1a1a1a',border:'1px solid #244ffe',color:'#244ffe'}}>
                {saving ? 'Guardando...' : '💾 Guardar'}
              </button>
            )}
            <button onClick={handleSubmit} disabled={!allDone || submitting}
              className="flex-1 py-3.5 rounded-xl font-semibold text-white transition-opacity"
              style={{background: allDone ? '#244ffe' : '#1a1a1a', opacity: allDone ? 1 : 0.5}}>
              {submitting ? 'Enviando...' : allDone ? '✅ Enviar quiniela' : `Faltan ${total - done}`}
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <div className="mx-4 my-4 p-4 rounded-2xl text-center" style={{background:'rgba(0,202,66,0.08)',border:'1px solid rgba(0,202,66,0.2)'}}>
          <p className="font-semibold" style={{color:'#00CA42'}}>✅ Quiniela enviada</p>
          <p className="text-xs mt-1" style={{color:'#555'}}>
            {new Date(submittedAt).toLocaleDateString('es-MX', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })}
          </p>
        </div>
      )}
    </div>
  )
}
