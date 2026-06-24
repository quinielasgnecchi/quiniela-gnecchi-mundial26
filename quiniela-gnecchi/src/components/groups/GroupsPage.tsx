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
  
  const [activeGroup, setActiveGroup] = useState<string>('Grupo A')

  const matchesByGroup = useMemo(() => {
    const groups: Record<string, Match[]> = {}
    dbMatches.forEach(match => {
      if (!groups[match.group_name]) {
        groups[match.group_name] = []
      }
      groups[match.group_name].push(match)
    })
    return groups
  }, [dbMatches])

  const sortedGroupNames = useMemo(() => Object.keys(matchesByGroup).sort(), [matchesByGroup])

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
          sorted = (fetchedMatches as Match[]).sort((a, b) => a.id - b.id)
          setDbMatches(sorted)
          
          if (sorted.length > 0) {
            const firstGroup = sorted[0].group_name
            setActiveGroup(firstGroup)
          }
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

          // Ligamos los datos reales contando únicamente las predicciones que pertenecen a la fase de grupos (IDs de partidos cargados)
          const validGroupMatchIds = new Set(sorted.map(m => m.id))
          const groupPredictionsCount = userPreds.filter(p => validGroupMatchIds.has(p.match_id)).length

          // Sincronizamos la tabla submissions automáticamente con el conteo de la fase de grupos
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

      {/* Menú de iniciales de grupos */}
      <div className="mb-6 pb-2 border-b border-[#1f1f1f]">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Grupos</span>
        <div className="overflow-x-auto scrollbar-none flex gap-2">
          {sortedGroupNames.map((groupName) => (
            <button
              key={groupName}
              type="button"
              onClick={() => setActiveGroup(groupName)}
              className={`flex-none w-9 h-9 rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${
                activeGroup === groupName
                  ? 'bg-[#009AFE] border-[#33adff] text-white'
                  : 'bg-[#141414] border-[#1f1f1f] text-gray-400 hover:bg-[#1a1a1a]'
              }`}
            >
              {groupName.replace('Grupo ', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Renderizado único del Grupo Activo */}
      {activeGroup && matchesByGroup[activeGroup] && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-[#009AFE] rounded-md flex items-center justify-center font-bold text-xs text-white">
              {activeGroup.replace('Grupo ', '')}
            </div>
            <h2 className="text-base font-bold text-gray-200">Partidos {activeGroup}</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            {matchesByGroup[activeGroup].map((match) => (
              <div key={match.id} className="p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f] shadow-sm">
                <p className="text-[10px] text-gray-500 text-center mb-3 font-mono">
                  Partido #{match.id} · {match.match_date} a las {match.match_time}
                </p>
                
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
      )}
    </div>
  )
}
