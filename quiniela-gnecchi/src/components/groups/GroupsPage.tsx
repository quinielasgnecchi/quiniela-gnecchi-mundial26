import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface Match {
  id: string
  home_team: string
  away_team: string
  home_flag: string
  away_flag: string
  date: string
  group_name: string
  phase: string
}

export default function GroupsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [dbMatches, setDbMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const totalMatches = dbMatches.length
  const completedMatches = Object.values(predictions).filter(val => val !== '').length

  useEffect(() => {
    async function loadInitialData() {
      if (!user) return
      try {
        setLoading(true)

        // 1. Obtener TODOS los partidos de la base de datos primero para evitar pantallas negras
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .order('date', { ascending: true })

        if (matchesError) throw matchesError

        // Filtrar por fase de grupos (sea minúscula o mayúscula)
        const groupsMatches = (matchesData || []).filter(
          m => m.phase?.toLowerCase() === 'groups' || m.phase?.toLowerCase() === 'grupo' || m.phase?.toLowerCase() === 'fase de grupos'
        )
        setDbMatches(groupsMatches)

        // 2. Verificar de forma segura el estado de congelación (submissions)
        const { data: submission } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_id', user.id)
          .eq('phase', 'groups')
          .maybeSingle()

        if (submission || localStorage.getItem('quiniela_groups_submitted') === 'true') {
          setHasSubmitted(true)
        }

        // 3. Cargar las predicciones que guardó el usuario
        const { data: predsData, error: predsError } = await supabase
          .from('predictions')
          .select('match_id, prediction')
          .eq('user_id', user.id)

        if (!predsError && predsData) {
          const predsMap: Record<string, string> = {}
          predsData.forEach((p) => {
            predsMap[p.match_id] = p.prediction
          })
          setPredictions(predsMap)
        }

      } catch (err) {
        console.error('Error crítico al cargar datos de la quiniela:', err)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [user])

  const handlePredictionChange = (matchId: string, value: string) => {
    if (hasSubmitted) return
    setPredictions((prev) => ({
      ...prev,
      [matchId]: value,
    }))
  }

  const handleSave = async () => {
    if (!user || hasSubmitted) return

    if (completedMatches < totalMatches) {
      alert(`⚠️ Debes completar todos los partidos antes de enviar. Te faltan ${totalMatches - completedMatches} pronósticos.`)
      return
    }

    const confirmSubmit = window.confirm("🚨 ¿Estás seguro de enviar tus respuestas? Una vez enviadas, NO podrás modificarlas bajo ninguna circunstancia.")
    if (!confirmSubmit) return

    setSaving(true)

    try {
      const payload = dbMatches.map((match) => ({
        user_id: user.id,
        match_id: match.id, 
        prediction: predictions[match.id] || '',
        phase: 'groups'
      }))

      // 1. Guardar predicciones en Supabase
      const { error: upsertError } = await supabase
        .from('predictions')
        .upsert(payload, { onConflict: 'user_id,match_id' })

      if (upsertError) throw upsertError

      // 2. Registrar el envío oficial de la fase para bloquearla
      await supabase.from('submissions').upsert({
        user_id: user.id,
        phase: 'groups',
        predictions_count: payload.length,
        submitted_at: new Date().toISOString()
      }, { onConflict: 'user_id,phase' })

      // Bloqueo local en el navegador
      localStorage.setItem('quiniela_groups_submitted', 'true')
      setHasSubmitted(true)
      
      alert("🚀 ¡Tus pronósticos se han enviado con éxito y tu quiniela ha sido congelada!")
      navigate('/dashboard')
    } catch (error: any) {
      console.error(error)
      alert(`Error al enviar: ${error.message || 'Intenta de nuevo'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="text-center flex flex-col gap-2">
          <p className="text-sm animate-pulse text-gray-400">Cargando tus pronósticos guardados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24 px-4 pt-6 max-w-md mx-auto">
      
      {/* Cabecera superior estática */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#01CB3B] to-[#009AFE]">
          FASE DE GRUPOS
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          {hasSubmitted 
            ? '🔒 Quiniela enviada y protegida. No se admiten cambios.' 
            : `Completa tus predicciones (${completedMatches}/${totalMatches})`}
        </p>
      </div>

      {/* Alerta si el filtro de partidos de grupos no encuentra filas en Supabase */}
      {dbMatches.length === 0 && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center text-xs text-yellow-400">
          ⚠️ No se encontraron partidos asignados a la fase de grupos en la base de datos. Verifica la tabla 'matches'.
        </div>
      )}

      {/* Lista de Partidos Oficiales */}
      <div className="flex flex-col gap-4">
        {dbMatches.map((match) => {
          const currentPred = predictions[match.id] || '';
          
          return (
            <div key={match.id} className="p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f] shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400 uppercase tracking-wider">
                  Grupo {match.group_name || 'General'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 items-center text-center mt-1">
                {/* Equipo Local */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{match.home_flag || '🏳️'}</span>
                  <span className="text-xs font-semibold truncate w-24 text-gray-200">{match.home_team}</span>
                </div>

                {/* Zona Central Interactiva o de Bloqueo */}
                <div className="flex flex-col gap-2">
                  {hasSubmitted ? (
                    // VISTA FIJA BLOQUEADA: Muestra la respuesta exacta recuperada de la Base de Datos
                    <div className="text-[11px] font-black uppercase text-[#01CB3B] bg-[#01CB3B]/10 border border-[#01CB3B]/30 py-2.5 px-1 rounded-xl shadow-inner tracking-tight">
                      {currentPred === 'L' && `⚽ Gana Local`}
                      {currentPred === 'V' && `⚽ Gana Visita`}
                      {currentPred === 'E' && '🤝 Empate'}
                      {!currentPred && '❌ Sin Predicción'}
                    </div>
                  ) : (
                    // VISTA EDITABLE: Solo si NO ha enviado la quiniela
                    <select
                      value={currentPred}
                      onChange={(e) => handlePredictionChange(match.id, e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#262626] rounded-xl py-2 text-center text-xs font-bold text-white focus:outline-none focus:border-[#009AFE] transition-colors"
                    >
                      <option value="">Elegir</option>
                      <option value="L">Gana {match.home_team}</option>
                      <option value="E">Empate</option>
                      <option value="V">Gana {match.away_team}</option>
                    </select>
                  )}
                </div>

                {/* Equipo Visitante */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{match.away_flag || '🏳️'}</span>
                  <span className="text-xs font-semibold truncate w-24 text-gray-200">{match.away_team}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Botón de Enviar Definitivo (Desaparece por completo al estar congelado) */}
      {!hasSubmitted && dbMatches.length > 0 && (
        <div className="mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#01CB3B] to-[#009AFE] text-white font-bold text-sm tracking-wide shadow-lg disabled:opacity-50 transition-all hover:scale-[1.01]"
          >
            {saving ? 'Guardando quiniela...' : '📤 Enviar Respuestas Definitivas'}
          </button>
        </div>
      )}
    </div>
  )
}
