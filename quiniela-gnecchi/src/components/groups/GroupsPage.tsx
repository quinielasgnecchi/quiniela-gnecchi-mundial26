import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { GROUP_MATCHES } from '../../data/matches'

export default function GroupsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [predictions, setPredictions] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    async function fetchUserPredictions() {
      try {
        // Cargamos las predicciones que el usuario ya tenga guardadas en la base de datos
        const { data: predsData } = await supabase
          .from('predictions')
          .select('match_id, prediction')
          .eq('user_id', user.id)

        if (predsData) {
          const initialPreds: Record<number, string> = {}
          predsData.forEach(p => {
            initialPreds[p.match_id] = p.prediction
          })
          setPredictions(initialPreds)
        }
      } catch (err) {
        console.error("Error al cargar predicciones:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchUserPredictions()
  }, [user])

  const handleSelectPrediction = (matchId: number, value: string) => {
    setPredictions(prev => ({ ...prev, [matchId]: value }))
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)

    try {
      const payload = Object.entries(predictions).map(([mId, val]) => ({
        user_id: user.id,
        match_id: parseInt(mId),
        prediction: val,
        phase: 'groups'
      }))

      if (payload.length === 0) {
        alert("Selecciona al menos un resultado antes de guardar.")
        setSaving(false)
        return
      }

      // Guardado en la tabla 'predictions'
      const { error: upsertError } = await supabase
        .from('predictions')
        .upsert(payload, { onConflict: 'user_id,match_id' })

      if (upsertError) throw upsertError

      // Actualizado en la tabla 'submissions' para reflejar el progreso en el inicio
      await supabase.from('submissions').upsert({
        user_id: user.id,
        phase: 'groups',
        predictions_count: payload.length,
        submitted_at: new Date().toISOString()
      }, { onConflict: 'user_id,phase' })

      alert("¡Pronósticos guardados con éxito!")
      navigate('/dashboard')
    } catch (error: any) {
      console.error(error)
      alert(`Error al guardar: ${error.message || 'Intenta de nuevo'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-500">Cargando tus partidos...</div>

  return (
    <div className="px-4 pt-6 pb-[100px] min-h-screen bg-[#0a0a0a] text-white">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">Fase de Grupos</h1>
          <p className="text-xs text-gray-500">Selecciona tus pronósticos</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="px-4 py-2 bg-[#244ffe] rounded-lg font-bold text-xs disabled:opacity-50"
        >
          {saving ? 'Guardando...' : '💾 Guardar Todo'}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {GROUP_MATCHES.map((match) => (
          <div key={match.id} className="p-4 rounded-xl bg-[#141414] border border-[#1f1f1f]">
            <div className="flex justify-between items-center text-[10px] text-gray-500 mb-2">
              <span>Grupo {match.group_name}</span>
              <span>Partido #{match.id}</span>
              <span>{match.match_date} a las {match.match_time}</span>
            </div>
            <div className="grid grid-cols-3 items-center gap-2 text-center text-xs">
              
              {/* Local */}
              <button 
                onClick={() => handleSelectPrediction(match.id, 'home')}
                className={`p-3 rounded-lg font-semibold transition-all ${predictions[match.id] === 'home' ? 'bg-[#244ffe] text-white' : 'bg-[#1a1a1a] text-gray-400'}`}
              >
                {match.home_team}
              </button>

              {/* Empate */}
              <button 
                onClick={() => handleSelectPrediction(match.id, 'draw')}
                className={`p-3 rounded-lg font-semibold transition-all ${predictions[match.id] === 'draw' ? 'bg-[#2a2a2a] text-white' : 'bg-[#1a1a1a] text-gray-400'}`}
              >
                Empate
              </button>

              {/* Visitante */}
              <button 
                onClick={() => handleSelectPrediction(match.id, 'away')}
                className={`p-3 rounded-lg font-semibold transition-all ${predictions[match.id] === 'away' ? 'bg-[#244ffe] text-white' : 'bg-[#1a1a1a] text-gray-400'}`}
              >
                {match.away_team}
              </button>

            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
