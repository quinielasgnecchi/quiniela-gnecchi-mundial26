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

// Lista oficial completa de los 48 partidos de la Fase de Grupos
const HARDCODED_MATCHES: Match[] = [
  // GRUPO A
  { id: 'm1', home_team: 'México', away_team: 'Estados Unidos', home_flag: '🇲🇽', away_flag: '🇺🇸', date: '2026-06-11', group_name: 'A', phase: 'groups' },
  { id: 'm2', home_team: 'Canadá', away_team: 'Argentina', home_flag: '🇨🇦', away_flag: '🇦🇷', date: '2026-06-11', group_name: 'A', phase: 'groups' },
  { id: 'm3', home_team: 'México', away_team: 'Canadá', home_flag: '🇲🇽', away_flag: '🇨🇦', date: '2026-06-15', group_name: 'A', phase: 'groups' },
  { id: 'm4', home_team: 'Argentina', away_team: 'Estados Unidos', home_flag: '🇦🇷', away_flag: '🇺🇸', date: '2026-06-15', group_name: 'A', phase: 'groups' },
  { id: 'm5', home_team: 'Estados Unidos', away_team: 'Canadá', home_flag: '🇺🇸', away_flag: '🇨🇦', date: '2026-06-24', group_name: 'A', phase: 'groups' },
  { id: 'm6', home_team: 'Argentina', away_team: 'México', home_flag: '🇦🇷', away_flag: '🇲🇽', date: '2026-06-24', group_name: 'A', phase: 'groups' },

  // GRUPO B
  { id: 'm7', home_team: 'España', away_team: 'Alemania', home_flag: '🇪🇸', away_flag: '🇩🇪', date: '2026-06-12', group_name: 'B', phase: 'groups' },
  { id: 'm8', home_team: 'Japón', away_team: 'Marruecos', home_flag: '🇯🇵', away_flag: '🇲🇦', date: '2026-06-12', group_name: 'B', phase: 'groups' },
  { id: 'm9', home_team: 'España', away_team: 'Japón', home_flag: '🇪🇸', away_flag: '🇯🇵', date: '2026-06-17', group_name: 'B', phase: 'groups' },
  { id: 'm10', home_team: 'Marruecos', away_team: 'Alemania', home_flag: '🇲🇦', away_flag: '🇩🇪', date: '2026-06-17', group_name: 'B', phase: 'groups' },
  { id: 'm11', home_team: 'Alemania', away_team: 'Japón', home_flag: '🇩🇪', away_flag: '🇯🇵', date: '2026-06-25', group_name: 'B', phase: 'groups' },
  { id: 'm12', home_team: 'Marruecos', away_team: 'España', home_flag: '🇲🇦', away_flag: '🇪🇸', date: '2026-06-25', group_name: 'B', phase: 'groups' },

  // GRUPO C
  { id: 'm13', home_team: 'Francia', away_team: 'Australia', home_flag: '🇫🇷', away_flag: '🇦🇺', date: '2026-06-13', group_name: 'C', phase: 'groups' },
  { id: 'm14', home_team: 'Corea del Sur', away_team: 'Ecuador', home_flag: '🇰🇷', away_flag: '🇪🇨', date: '2026-06-13', group_name: 'C', phase: 'groups' },
  { id: 'm15', home_team: 'Francia', away_team: 'Corea del Sur', home_flag: '🇫🇷', away_flag: '🇰🇷', date: '2026-06-18', group_name: 'C', phase: 'groups' },
  { id: 'm16', home_team: 'Ecuador', away_team: 'Australia', home_flag: '🇪🇨', away_flag: '🇦🇺', date: '2026-06-18', group_name: 'C', phase: 'groups' },
  { id: 'm17', home_team: 'Australia', away_team: 'Corea del Sur', home_flag: '🇦🇺', away_flag: '🇰🇷', date: '2026-06-26', group_name: 'C', phase: 'groups' },
  { id: 'm18', home_team: 'Ecuador', away_team: 'Francia', home_flag: '🇪🇨', away_flag: '🇫🇷', date: '2026-06-26', group_name: 'C', phase: 'groups' },

  // GRUPO D
  { id: 'm19', home_team: 'Inglaterra', away_team: 'Túnez', home_flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', away_flag: '🇹🇳', date: '2026-06-14', group_name: 'D', phase: 'groups' },
  { id: 'm20', home_team: 'Uruguay', away_team: 'Dinamarca', home_flag: '🇺🇾', away_flag: '🇩🇰', date: '2026-06-14', group_name: 'D', phase: 'groups' },
  { id: 'm21', home_team: 'Inglaterra', away_team: 'Uruguay', home_flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', away_flag: '🇺🇾', date: '2026-06-19', group_name: 'D', phase: 'groups' },
  { id: 'm22', home_team: 'Dinamarca', away_team: 'Túnez', home_flag: '🇩🇰', away_flag: '🇹🇳', date: '2026-06-19', group_name: 'D', phase: 'groups' },
  { id: 'm23', home_team: 'Túnez', away_team: 'Uruguay', home_flag: '🇹🇳', away_flag: '🇺🇾', date: '2026-06-27', group_name: 'D', phase: 'groups' },
  { id: 'm24', home_team: 'Dinamarca', away_team: 'Inglaterra', home_flag: '🇩🇰', away_flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', date: '2026-06-27', group_name: 'D', phase: 'groups' },

  // GRUPO E
  { id: 'm25', home_team: 'Brasil', away_team: 'Suiza', home_flag: '🇧🇷', away_flag: '🇨🇭', date: '2026-06-15', group_name: 'E', phase: 'groups' },
  { id: 'm26', home_team: 'Ghana', away_team: 'Catar', home_flag: '🇬🇭', away_flag: '🇶🇦', date: '2026-06-15', group_name: 'E', phase: 'groups' },
  { id: 'm27', home_team: 'Brasil', away_team: 'Ghana', home_flag: '🇧🇷', away_flag: '🇬🇭', date: '2026-06-20', group_name: 'E', phase: 'groups' },
  { id: 'm28', home_team: 'Catar', away_team: 'Suiza', home_flag: '🇶🇦', away_flag: '🇨🇭', date: '2026-06-20', group_name: 'E', phase: 'groups' },
  { id: 'm29', home_team: 'Suiza', away_team: 'Ghana', home_flag: '🇨🇭', away_flag: '🇬🇭', date: '2026-06-28', group_name: 'E', phase: 'groups' },
  { id: 'm30', home_team: 'Catar', away_team: 'Brasil', home_flag: '🇶🇦', away_flag: '🇧🇷', date: '2026-06-28', group_name: 'E', phase: 'groups' },

  // GRUPO F
  { id: 'm31', home_team: 'Bélgica', away_team: 'Croacia', home_flag: '🇧🇪', away_flag: '🇭🇷', date: '2026-06-16', group_name: 'F', phase: 'groups' },
  { id: 'm32', home_team: 'Canadá', away_team: 'Marruecos', home_flag: '🇨🇦', away_flag: '🇲🇦', date: '2026-06-16', group_name: 'F', phase: 'groups' },
  { id: 'm33', home_team: 'Bélgica', away_team: 'Canadá', home_flag: '🇧🇪', away_flag: '🇨🇦', date: '2026-06-21', group_name: 'F', phase: 'groups' },
  { id: 'm34', home_team: 'Marruecos', away_team: 'Croacia', home_flag: '🇲🇦', away_flag: '🇭🇷', date: '2026-06-21', group_name: 'F', phase: 'groups' },
  { id: 'm35', home_team: 'Croacia', away_team: 'Canadá', home_flag: '🇭🇷', away_flag: '🇨🇦', date: '2026-06-29', group_name: 'F', phase: 'groups' },
  { id: 'm36', home_team: 'Marruecos', away_team: 'Bélgica', home_flag: '🇲🇦', away_flag: '🇧🇪', date: '2026-06-29', group_name: 'F', phase: 'groups' },

  // GRUPO G
  { id: 'm37', home_team: 'Portugal', away_team: 'Uruguay', home_flag: '🇵🇹', away_flag: '🇺🇾', date: '2026-06-17', group_name: 'G', phase: 'groups' },
  { id: 'm38', home_team: 'Corea del Sur', away_team: 'Ghana', home_flag: '🇰🇷', away_flag: '🇬🇭', date: '2026-06-17', group_name: 'G', phase: 'groups' },
  { id: 'm39', home_team: 'Portugal', away_team: 'Corea del Sur', home_flag: '🇵🇹', away_flag: '🇰🇷', date: '2026-06-22', group_name: 'G', phase: 'groups' },
  { id: 'm40', home_team: 'Ghana', away_team: 'Uruguay', home_flag: '🇬🇭', away_flag: '🇺🇾', date: '2026-06-22', group_name: 'G', phase: 'groups' },
  { id: 'm41', home_team: 'Uruguay', away_team: 'Corea del Sur', home_flag: '🇺🇾', away_flag: '🇰🇷', date: '2026-06-30', group_name: 'G', phase: 'groups' },
  { id: 'm42', home_team: 'Ghana', away_team: 'Portugal', home_flag: '🇬🇭', away_flag: '🇵🇹', date: '2026-06-30', group_name: 'G', phase: 'groups' },

  // GRUPO H
  { id: 'm43', home_team: 'Países Bajos', away_team: 'Ecuador', home_flag: '🇳🇱', away_flag: '🇪🇨', date: '2026-06-18', group_name: 'H', phase: 'groups' },
  { id: 'm44', home_team: 'Senegal', away_team: 'Catar', home_flag: '🇸🇳', away_flag: '🇶🇦', date: '2026-06-18', group_name: 'H', phase: 'groups' },
  { id: 'm45', home_team: 'Países Bajos', away_team: 'Senegal', home_flag: '🇳🇱', away_flag: '🇸🇳', date: '2026-06-23', group_name: 'H', phase: 'groups' },
  { id: 'm46', home_team: 'Catar', away_team: 'Ecuador', home_flag: '🇶🇦', away_flag: '🇪🇨', date: '2026-06-23', group_name: 'H', phase: 'groups' },
  { id: 'm47', home_team: 'Ecuador', away_team: 'Senegal', home_flag: '🇪🇨', away_flag: '🇸🇳', date: '2026-07-01', group_name: 'H', phase: 'groups' },
  { id: 'm48', home_team: 'Catar', away_team: 'Países Bajos', home_flag: '🇶🇦', away_flag: '🇳🇱', date: '2026-07-01', group_name: 'H', phase: 'groups' }
]

export default function GroupsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [dbMatches] = useState<Match[]>(HARDCODED_MATCHES)
  const [predictions, setPredictions] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const totalMatches = dbMatches.length
  const completedMatches = Object.values(predictions).filter(val => val !== '').length

  useEffect(() => {
    async function loadUserSubmissionsAndPredictions() {
      if (!user) return
      try {
        setLoading(true)

        // 1. Validar si ya enviaron la quiniela en Supabase o LocalStorage
        const { data: submission } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_id', user.id)
          .eq('phase', 'groups')
          .maybeSingle()

        if (submission || localStorage.getItem('quiniela_groups_submitted') === 'true') {
          setHasSubmitted(true)
        }

        // 2. Cargar las predicciones previas guardadas en Supabase para este usuario
        const { data: predsData, error: predsError } = await supabase
          .from('predictions')
          .select('match_id, prediction')
          .eq('user_id', user.id)
          .eq('phase', 'groups')

        if (!predsError && predsData) {
          const predsMap: Record<string, string> = {}
          predsData.forEach((p) => {
            predsMap[p.match_id] = p.prediction
          })
          setPredictions(predsMap)
        }
      } catch (err) {
        console.error('Error cargando estado del usuario:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUserSubmissionsAndPredictions()
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
      alert(`⚠️ Te faltan por contestar ${totalMatches - completedMatches} partidos de la fase de grupos.`)
      return
    }

    const confirmSubmit = window.confirm("🚨 ¿Estás seguro de congelar tu quiniela? Una vez enviada NO podrás hacer ningún cambio.")
    if (!confirmSubmit) return

    setSaving(true)

    try {
      const payload = dbMatches.map((match) => ({
        user_id: user.id,
        match_id: match.id, 
        prediction: predictions[match.id] || '',
        phase: 'groups'
      }))

      // Guardar predicciones en Supabase
      const { error: upsertError } = await supabase
        .from('predictions')
        .upsert(payload, { onConflict: 'user_id,match_id' })

      if (upsertError) throw upsertError

      // Guardar bloqueo de fase en Supabase
      await supabase.from('submissions').upsert({
        user_id: user.id,
        phase: 'groups',
        predictions_count: payload.length,
        submitted_at: new Date().toISOString()
      }, { onConflict: 'user_id,phase' })

      localStorage.setItem('quiniela_groups_submitted', 'true')
      setHasSubmitted(true)
      
      alert("🚀 ¡Tu quiniela de Fase de Grupos se ha guardado y congelado con éxito!")
      navigate('/')
    } catch (error: any) {
      console.error(error)
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <p className="text-sm animate-pulse text-gray-400">Cargando tus pronósticos...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Encabezado */}
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

      {/* Lista de Partidos */}
      <div className="flex flex-col gap-4">
        {dbMatches.map((match) => {
          const userPred = predictions[match.id] || ''
          
          return (
            <div key={match.id} className="p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f]">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400 uppercase tracking-wider">
                Grupo {match.group_name}
              </span>
              
              <div className="grid grid-cols-3 items-center mt-3 text-center">
                {/* Local */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{match.home_flag}</span>
                  <span className="text-xs font-semibold truncate w-24 text-gray-200">{match.home_team}</span>
                </div>

                {/* Resultado / Selector */}
                <div className="flex flex-col gap-2">
                  {hasSubmitted ? (
                    <div className="text-[11px] font-black uppercase text-[#01CB3B] bg-[#01CB3B]/10 border border-[#01CB3B]/30 py-2.5 rounded-xl">
                      {userPred === 'L' && `Gana ${match.home_team}`}
                      {userPred === 'V' && `Gana ${match.away_team}`}
                      {userPred === 'E' && 'Empate'}
                      {!userPred && 'Sin pronóstico'}
                    </div>
                  ) : (
                    <select
                      value={userPred}
                      onChange={(e) => handlePredictionChange(match.id, e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#262626] rounded-xl py-2 text-center text-xs font-bold text-white focus:outline-none focus:border-[#009AFE]"
                    >
                      <option value="">Elegir</option>
                      <option value="L">Gana {match.home_team}</option>
                      <option value="E">Empate</option>
                      <option value="V">Gana {match.away_team}</option>
                    </select>
                  )}
                </div>

                {/* Visitante */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{match.away_flag}</span>
                  <span className="text-xs font-semibold truncate w-24 text-gray-200">{match.away_team}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Botón de Envío */}
      {!hasSubmitted && (
        <div className="mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#01CB3B] to-[#009AFE] text-white font-bold text-sm tracking-wide shadow-lg disabled:opacity-50"
          >
            {saving ? 'Guardando...' : '📤 Enviar Respuestas Definitivas'}
          </button>
        </div>
      )}
    </div>
  )
}
