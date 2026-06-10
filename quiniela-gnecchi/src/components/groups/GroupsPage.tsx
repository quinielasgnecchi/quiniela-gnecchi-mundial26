import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { GROUP_MATCHES } from '../../data/matches'

// Mapeo exacto basado en tus strings de GROUP_MATCHES
const FLAG_MAP: Record<string, string> = {
  'México': 'mx',
  'Sudáfrica': 'za',
  'Corea del Sur': 'kr',
  'Chequia': 'cz',
  'Canadá': 'ca',
  'Bosnia y Herzegovina': 'ba',
  'Catar': 'qa',
  'Suiza': 'ch',
  'Brasil': 'br',
  'Marruecos': 'ma',
  'Haití': 'ht',
  'Escocia': 'gb-sct',
  'Estados Unidos': 'us',
  'Paraguay': 'py',
  'Australia': 'au',
  'Turquía': 'tr',
  'Alemania': 'de',
  'Curazao': 'cw',
  'Costa de Marfil': 'ci',
  'Ecuador': 'ec',
  'Países Bajos': 'nl',
  'Japón': 'jp',
  'Suecia': 'se',
  'Túnez': 'tn',
  'Bélgica': 'be',
  'Egipto': 'eg',
  'Irán': 'ir',
  'Nueva Zelanda': 'nz',
  'España': 'es',
  'Cabo Verde': 'cv',
  'Arabia Saudita': 'sa',
  'Uruguay': 'uy',
  'Francia': 'fr',
  'Senegal': 'sn',
  'Irak': 'iq',
  'Noruega': 'no',
  'Argentina': 'ar',
  'Argelia': 'dz',
  'Austria': 'at',
  'Jordania': 'jo',
  'Portugal': 'pt',
  'RD Congo': 'cd',
  'Inglaterra': 'gb-eng',
  'Croacia': 'hr',
  'Ghana': 'gh',
  'Panamá': 'pa',
  'Uzbekistán': 'uz',
  'Colombia': 'co'
}

export default function GroupsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [predictions, setPredictions] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  
  // Estado para el grupo seleccionado en las pestañas arriba
  const [activeGroup, setActiveGroup] = useState<string>('A')

  // Total de partidos en esta fase
  const totalMatches = GROUP_MATCHES.length
  // Cuántos partidos ya tienen selección
  const completedMatches = Object.keys(predictions).length
  // Porcentaje completado para la barra de progreso
  const progressPercentage = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0

  // Agrupación de partidos por su respectiva letra de grupo
  const matchesByGroup = useMemo(() => {
    const groups: Record<string, typeof GROUP_MATCHES> = {}
    GROUP_MATCHES.forEach(match => {
      if (!groups[match.group_name]) {
        groups[match.group_name] = []
      }
      groups[match.group_name].push(match)
    })
    return groups
  }, [])

  // Lista ordenada de los nombres de los grupos (A, B, C...)
  const sortedGroupNames = useMemo(() => Object.keys(matchesByGroup).sort(), [matchesByGroup])

  useEffect(() => {
    if (!user) return
    
    async function checkSubmissionAndFetchPredictions() {
      try {
        const { data: submission } = await supabase
          .from('submissions')
          .select('id')
          .eq('user_id', user.id)
          .eq('phase', 'groups')
          .single()

        if (submission) {
          setHasSubmitted(true)
        }

        const { data, error } = await supabase
          .from('predictions')
          .select('match_id, prediction')
          .eq('user_id', user.id)

        if (error) throw error

        if (data) {
          const initialPreds: Record<number, string> = {}
          data.forEach(item => {
            initialPreds[item.match_id] = item.prediction
          })
          setPredictions(initialPreds)
        }
      } catch (err) {
        console.error("Error al cargar datos iniciales:", err)
      } finally {
        setLoading(false)
      }
    }
    
    checkSubmissionAndFetchPredictions()
  }, [user])

  const handleSelectPrediction = (matchId: number, value: string) => {
    if (hasSubmitted) return
    setPredictions(prev => ({ ...prev, [matchId]: value }))
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
      const payload = Object.entries(predictions).map(([matchId, value]) => ({
        user_id: user.id,
        match_id: parseInt(matchId),
        prediction: value,
        phase: 'groups'
      }))

      const { error: upsertError } = await supabase
        .from('predictions')
        .upsert(payload, { onConflict: 'user_id,match_id' })

      if (upsertError) throw upsertError

      await supabase.from('submissions').upsert({
        user_id: user.id,
        phase: 'groups',
        predictions_count: payload.length,
        submitted_at: new Date().toISOString()
      }, { onConflict: 'user_id,phase' })

      alert("🚀 ¡Tus pronósticos se han enviado con éxito! Ahora tu quiniela está guardada oficialmente.")
      setHasSubmitted(true)
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-400 font-medium">
        Cargando partidos y configuración...
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-[100px] min-h-screen bg-[#0a0a0a] text-white">
      {/* Cabecera principal */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fase de Grupos</h1>
          <p className="text-xs text-gray-500 mt-1">Selecciona el ganador de cada partido</p>
        </div>
        
        <button 
          onClick={handleSave} 
          disabled={saving || hasSubmitted}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-lg ${
            hasSubmitted 
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
              : 'bg-[#009AFE] hover:bg-[#0086dd] text-white'
          }`}
        >
          {saving ? 'Enviando...' : hasSubmitted ? '🔒 Respuestas Bloqueadas' : '🚀 Enviar Respuestas'}
        </button>
      </div>

      {/* Alerta visual si ya está bloqueado */}
      {hasSubmitted && (
        <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs text-center font-medium">
          🔒 Ya has enviado tus respuestas para esta fase. Puedes ver tu historial de selecciones pero no modificarlo.
        </div>
      )}

      {/* Barra de Progreso Dinámica (#01CB3B) */}
      <div className="mb-6 p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-gray-400">Progreso Fase de Grupos</span>
          <span className="text-xs font-bold text-gray-200 font-mono">
            {completedMatches} de {totalMatches} partidos ({progressPercentage}%)
          </span>
        </div>
        <div className="w-full bg-[#1a1a1a] h-2.5 rounded-full overflow-hidden border border-[#222]">
          <div 
            className="bg-[#01CB3B] h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(1,203,59,0.4)]"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {totalMatches - completedMatches > 0 ? (
          <p className="text-[10px] text-gray-500 mt-2 text-right">
            Te faltan {totalMatches - completedMatches} partidos por rellenar.
          </p>
        ) : (
          <p className="text-[10px] text-[#01CB3B] font-bold mt-2 text-right flex items-center justify-end gap-1">
            🎉 ¡Listo! Has completado todos los partidos.
          </p>
        )}
      </div>

      {/* NUEVO FORMATO: Encabezado estático "Grupos" y menú de iniciales */}
      <div className="mb-6 pb-2 border-b border-[#1f1f1f]">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Grupos</span>
        <div className="overflow-x-auto scrollbar-none flex gap-2">
          {sortedGroupNames.map((groupName) => (
            <button
              key={groupName}
              onClick={() => setActiveGroup(groupName)}
              className={`flex-none w-9 h-9 rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${
                activeGroup === groupName
                  ? 'bg-[#009AFE] border-[#33adff] text-white'
                  : 'bg-[#141414] border-[#1f1f1f] text-gray-400 hover:bg-[#1a1a1a]'
              }`}
            >
              {groupName}
            </button>
          ))}
        </div>
      </div>

      {/* Renderizado único del Grupo Activo */}
      {activeGroup && matchesByGroup[activeGroup] && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-[#009AFE] rounded-md flex items-center justify-center font-bold text-xs text-white">
              {activeGroup}
            </div>
            <h2 className="text-base font-bold text-gray-200">Partidos Grupo {activeGroup}</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            {matchesByGroup[activeGroup].map((match) => (
              <div key={match.id} className="p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f] shadow-sm">
                <p className="text-[10px] text-gray-500 text-center mb-3 font-mono">
                  Partido #{match.id} · {match.match_date} a las {match.match_time}
                </p>
                
                {/* Contenedor Grid con altura simétrica */}
                <div className="grid grid-cols-3 gap-2 items-stretch auto-rows-fr">
                  
                  {/* Botón Equipo Local */}
                  <button 
                    onClick={() => handleSelectPrediction(match.id, 'home')}
                    disabled={hasSubmitted}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl gap-2 transition-all border h-full ${
                      predictions[match.id] === 'home' 
                        ? 'bg-[#009AFE] border-[#33adff] text-white font-bold' 
                        : 'bg-[#1a1a1a] border-transparent text-gray-400'
                    } ${!hasSubmitted && 'hover:bg-[#222]'}`}
                  >
                    <img 
                      src={`https://flagcdn.com/w80/${FLAG_MAP[match.home_team] || 'un'}.png`} 
                      alt={match.home_team}
                      className="w-8 h-5 object-cover rounded shadow-sm"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://flagcdn.com/w80/un.png' }}
                    />
                    <span className="text-[11px] font-semibold truncate w-full text-center">{match.home_team}</span>
                  </button>

                  {/* Botón Empate */}
                  <button 
                    onClick={() => handleSelectPrediction(match.id, 'draw')}
                    disabled={hasSubmitted}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl gap-1 transition-all border h-full ${
                      predictions[match.id] === 'draw' 
                        ? 'bg-[#009AFE] border-[#33adff] text-white font-bold' 
                        : 'bg-[#1a1a1a] border-transparent text-gray-400'
                    } ${!hasSubmitted && 'hover:bg-[#222]'}`}
                  >
                    <span className="text-base leading-none">🫱🏻‍Glop</span>
                    <span className="text-[11px] font-semibold">Empate</span>
                  </button>

                  {/* Botón Equipo Visitante */}
                  <button 
                    onClick={() => handleSelectPrediction(match.id, 'away')}
                    disabled={hasSubmitted}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl gap-2 transition-all border h-full ${
                      predictions[match.id] === 'away' 
                        ? 'bg-[#009AFE] border-[#33adff] text-white font-bold' 
                        : 'bg-[#1a1a1a] border-transparent text-gray-400'
                    } ${!hasSubmitted && 'hover:bg-[#222]'}`}
                  >
                    <img 
                      src={`https://flagcdn.com/w80/${FLAG_MAP[match.away_team] || 'un'}.png`} 
                      alt={match.away_team}
                      className="w-8 h-5 object-cover rounded shadow-sm"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://flagcdn.com/w80/un.png' }}
                    />
                    <span className="text-[11px] font-semibold truncate w-full text-center">{match.away_team}</span>
                  </button>

                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
