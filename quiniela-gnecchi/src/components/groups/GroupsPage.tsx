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

  useEffect(() => {
    if (!user) return
    async function fetchUserPredictions() {
      try {
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
        console.error("Error al obtener predicciones existentes:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchUserPredictions()
  }, [user])

  const handleSelectPrediction = (matchId: number, value: string) => {
    setPredictions(prev => ({ ...prev, [matchId]: value }))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)

    try {
      const payload = Object.entries(predictions).map(([matchId, value]) => ({
        user_id: user.id,
        match_id: parseInt(matchId),
        prediction: value,
        phase: 'groups'
      }))

      if (payload.length === 0) {
        alert("Selecciona al menos un pronóstico antes de guardar.")
        setSaving(false)
        return
      }

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

      alert("¡Tus pronósticos de Fase de Grupos se guardaron con éxito!")
      navigate('/dashboard')
    } catch (error: any) {
      console.error(error)
      alert(`Error al guardar: ${error.message || 'Intenta de nuevo'}`)
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

  const sortedGroupNames = Object.keys(matchesByGroup).sort()

  return (
    <div className="px-4 pt-6 pb-[100px] min-h-screen bg-[#0a0a0a] text-white">
      {/* Cabecera principal */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fase de Grupos</h1>
          <p className="text-xs text-gray-500 mt-1">Organizado por Grupos Oficiales (A - L)</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-[#244ffe] hover:bg-[#1e44d6] disabled:opacity-50 px-5 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-lg"
        >
          {saving ? 'Guardando...' : '💾 Guardar Todo'}
        </button>
      </div>

      {/* Renderizado de Grupos */}
      {sortedGroupNames.map((groupName) => (
        <div key={groupName} className="mb-10">
          <div className="flex items-center gap-2 mb-4 border-b border-[#1f1f1f] pb-2">
            <div className="w-6 h-6 bg-[#244ffe] rounded-md flex items-center justify-center font-bold text-xs">
              {groupName}
            </div>
            <h2 className="text-base font-bold text-gray-200">Grupo {groupName}</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            {matchesByGroup[groupName].map((match) => (
              <div key={match.id} className="p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f] shadow-sm">
                <p className="text-[10px] text-gray-500 text-center mb-3 font-mono">
                  Partido #{match.id} · {match.match_date} a las {match.match_time}
                </p>
                
                <div className="grid grid-cols-3 gap-2 items-center">
                  {/* Botón Equipo Local */}
                  <button 
                    onClick={() => handleSelectPrediction(match.id, 'home')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl gap-2 transition-all border ${
                      predictions[match.id] === 'home' 
                        ? 'bg-[#244ffe] border-[#3b62ff] text-white' 
                        : 'bg-[#1a1a1a] border-transparent text-gray-400 hover:bg-[#222]'
                    }`}
                  >
                    <img 
                      src={`https://flagcdn.com/w80/${FLAG_MAP[match.home_team] || 'un'}.png`} 
                      alt={match.home_team}
                      className="w-8 h-5 object-cover rounded shadow-sm"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://flagcdn.com/w80/un.png' }}
                    />
                    <span className="text-[11px] font-semibold truncate w-full text-center">{match.home_team}</span>
                  </button>

                  {/* Botón Empate con Emoji */}
                  <button 
                    onClick={() => handleSelectPrediction(match.id, 'draw')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl gap-1 transition-all border ${
                      predictions[match.id] === 'draw' 
                        ? 'bg-[#2a2a2a] border-[#444] text-white' 
                        : 'bg-[#1a1a1a] border-transparent text-gray-400 hover:bg-[#222]'
                    }`}
                  >
                    <span className="text-base">🫱🏻‍🫲🏼</span>
                    <span className="text-[11px] font-medium">Empate</span>
                  </button>

                  {/* Botón Equipo Visitante */}
                  <button 
                    onClick={() => handleSelectPrediction(match.id, 'away')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl gap-2 transition-all border ${
                      predictions[match.id] === 'away' 
                        ? 'bg-[#244ffe] border-[#3b62ff] text-white' 
                        : 'bg-[#1a1a1a] border-transparent text-gray-400 hover:bg-[#222]'
                    }`}
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
      ))}
    </div>
  )
}
