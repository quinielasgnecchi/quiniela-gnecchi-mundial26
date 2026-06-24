import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface Match {
  id: number
  group_name: string
  home_team: string
  away_team: string
  match_date: string
  match_time: string
}

const FLAG_MAP: Record<string, string> = {
  'México': 'mx', 'Sudáfrica': 'za', 'Corea del Sur': 'kr', 'Chequia': 'cz',
  'Canadá': 'ca', 'Bosnia y Herzegovina': 'ba', 'Catar': 'qa', 'Suiza': 'ch',
  'Brasil': 'br', 'Marruecos': 'ma', 'Haití': 'ht', 'Escocia': 'gb-sct',
  'Estados Unidos': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Turquía': 'tr',
  'Alemania': 'de', 'Curazao': 'cw', 'Costa de Marfil': 'ci', 'Ecuador': 'ec',
  'Países Bajos': 'nl', 'Japón': 'jp', 'Suecia': 'se', 'Túnez': 'tn',
  'Bélgica': 'be', 'Egipto': 'eg', 'Irán': 'ir', 'Nueva Zelanda': 'nz',
  'España': 'es', 'Cabo Verde': 'cv', 'Arabia Saudita': 'sa', 'Uruguay': 'uy',
  'Francia': 'fr', 'Senegal': 'sn', 'Irak': 'iq', 'Noruega': 'no',
  'Argentina': 'ar', 'Argelia': 'dz', 'Austria': 'at', 'Jordania': 'jo',
  'Portugal': 'pt', 'RD Congo': 'cd', 'Inglaterra': 'gb-eng', 'Croacia': 'hr',
  'Ghana': 'gh', 'Panamá': 'pa', 'Uzbekistán': 'uz', 'Colombia': 'co'
}

export default function GroupsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [dbMatches, setDbMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  
  // Control de la jornada activa (1, 2, o 3)
  const [activeJourney, setActiveJourney] = useState<number>(1)

  // Separar los partidos de fase de grupos por jornadas exactas de 24 partidos cada una
  const matchesByJourney = useMemo(() => {
    const journeys: Record<number, Match[]> = { 1: [], 2: [], 3: [] }
    dbMatches.forEach((match, index) => {
      if (index < 24) {
        journeys[1].push(match)
      } else if (index < 48) {
        journeys[2].push(match)
      } else if (index < 72) {
        journeys[3].push(match)
      }
    })
    return journeys
  }, [dbMatches])

  useEffect(() => {
    if (!user) return
    
    async function loadAllData() {
      try {
        const { data: fetchedMatches, error: matchesError } = await supabase
          .from('matches')
          .select('id, group_name, home_team, away_team, match_date, match_time')
          .eq('phase', 'groups')
        
        if (matchesError) throw matchesError
        
        let sorted: Match[] = []
        if (fetchedMatches) {
          // Tomar los primeros 72 partidos correspondientes a la Fase de Grupos
          sorted = (fetchedMatches as Match[])
            .sort((a, b) => a.id - b.id)
            .slice(0, 72)
          setDbMatches(sorted)
        }

        const { data: userPreds, error: predsError } = await supabase
          .from('predictions')
          .select('match_id, prediction')
          .eq('user_id', user.id)

        if (predsError) throw predsError

        if (userPreds && userPreds.length > 0) {
          const initialPreds: Record<number, string> = {}
          userPreds.forEach(item => {
            initialPreds[item.match_id] = item.prediction
          })
          setPredictions(initialPreds)

          const validGroupMatchIds = new Set(sorted.map(m => m.id))
          const groupPredictionsCount = userPreds.filter(p => validGroupMatchIds.has(p.match_id)).length

          // Guardamos el total acumulado de las predicciones de grupos reales en la tabla
          await supabase
            .from('submissions')
            .upsert({
              user_id: user.id,
              phase: 'groups',
              predictions_count: groupPredictionsCount,
              submitted_at: new Date().toISOString()
            }, { onConflict: 'user_id,phase' })
        }

      } catch (err) {
        console.error("Error al cargar y sincronizar pronósticos:", err)
      } finally {
        setLoading(false)
      }
    }
    
    loadAllData()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-400 font-medium">
        Sincronizando partidos con la Base de Datos...
      </div>
    )
  }

  const currentJourneyMatches = matchesByJourney[activeJourney] || []

  return (
    <div className="px-4 pt-6 pb-[100px] min-h-screen bg-[#0a0a0a] text-white">
      {/* Cabecera principal limpia */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm font-bold text-[#009AFE] mb-2 block">← Volver</button>
          <h1 className="text-2xl font-bold tracking-tight">Mis Pronósticos</h1>
          <p className="text-xs text-gray-500 mt-1">Consulta las predicciones registradas para la fase de grupos</p>
        </div>
      </div>

      {/* Selector de Jornadas (3 pestañas superiores limpias) */}
      <div className="mb-6 pb-2 border-b border-[#1f1f1f]">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Jornadas Fase de Grupos</span>
        <div className="flex gap-2">
          {[1, 2, 3].map((journeyNum) => (
            <button
              key={journeyNum}
              type="button"
              onClick={() => setActiveJourney(journeyNum)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                activeJourney === journeyNum
                  ? 'bg-[#009AFE] border-[#33adff] text-white'
                  : 'bg-[#141414] border-[#1f1f1f] text-gray-400 hover:bg-[#1a1a1a]'
              }`}
            >
              Jornada {journeyNum}
            </button>
          ))}
        </div>
      </div>

      {/* Renderizado de los 24 partidos correspondientes a la Jornada Seleccionada */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-[#009AFE] rounded-md flex items-center justify-center font-bold text-xs text-white">
            {activeJourney}
          </div>
          <h2 className="text-base font-bold text-gray-200">Partidos · Jornada {activeJourney}</h2>
        </div>
        
        <div className="flex flex-col gap-4">
          {currentJourneyMatches.map((match) => (
            <div key={match.id} className="p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f] shadow-sm">
              <div className="flex justify-between items-center px-1 mb-3">
                <span className="text-[10px] bg-[#1a1a1a] px-2 py-0.5 rounded-md border border-[#2a2a2a] text-gray-400 font-bold">
                  Grupo {match.group_name}
                </span>
                <p className="text-[10px] text-gray-500 font-mono">
                  Partido #{match.id} · {match.match_date} - {match.match_time}
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-2 items-stretch auto-rows-fr">
                
                {/* Botón Equipo Local (Sólo vista) */}
                <div className={`flex flex-col items-center justify-center p-3 rounded-xl gap-2 border h-full opacity-100 ${
                  predictions[match.id] === 'home' 
                    ? 'bg-[#009AFE] border-[#33adff] text-white font-bold' 
                    : 'bg-[#1a1a1a] border-transparent text-gray-500'
                }`}>
                  <img 
                    src={`https://flagcdn.com/w80/${FLAG_MAP[match.home_team] || 'un'}.png`} 
                    alt={match.home_team}
                    className="w-8 h-5 object-cover rounded shadow-sm"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://flagcdn.com/w80/un.png' }}
                  />
                  <span className="text-[11px] font-semibold truncate w-full text-center">{match.home_team}</span>
                </div>

                {/* Botón Empate (Sólo vista) */}
                <div className={`flex flex-col items-center justify-center p-3 rounded-xl gap-1 border h-full opacity-100 ${
                  predictions[match.id] === 'draw' 
                    ? 'bg-[#009AFE] border-[#33adff] text-white font-bold' 
                    : 'bg-[#1a1a1a] border-transparent text-gray-500'
                }`}>
                  <span className="text-lg leading-none">🤝</span>
                  <span className="text-[11px] font-semibold">Empate</span>
                </div>

                {/* Botón Equipo Visitante (Sólo vista) */}
                <div className={`flex flex-col items-center justify-center p-3 rounded-xl gap-2 border h-full opacity-100 ${
                  predictions[match.id] === 'away' 
                    ? 'bg-[#009AFE] border-[#33adff] text-white font-bold' 
                    : 'bg-[#1a1a1a] border-transparent text-gray-500'
                }`}>
                  <img 
                    src={`https://flagcdn.com/w80/${FLAG_MAP[match.away_team] || 'un'}.png`} 
                    alt={match.away_team}
                    className="w-8 h-5 object-cover rounded shadow-sm"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://flagcdn.com/w80/un.png' }}
                  />
                  <span className="text-[11px] font-semibold truncate w-full text-center">{match.away_team}</span>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
