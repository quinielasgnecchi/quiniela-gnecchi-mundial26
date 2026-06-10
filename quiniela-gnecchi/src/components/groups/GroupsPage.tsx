import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { GROUP_MATCHES } from '../../data/matches'

// Mapeo de nombres de equipos a códigos de banderas (FlagCDN)
const FLAG_MAP: Record<string, string> = {
  'México': 'mx', 'Sudáfrica': 'za', 'Corea del Sur': 'kr', 'Chequia': 'cz',
  'Canadá': 'ca', 'Bosnia y Herzegovina': 'ba', 'Catar': 'qa', 'Suiza': 'ch',
  'Brasil': 'br', 'Marruecos': 'ma', 'Haití': 'ht', 'Escocia': 'gb-sct',
  'Estados Unidos': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Turquía': 'tr',
  'Alemania': 'de', 'Curazao': 'cw', 'Costa de Marfil': 'ci', 'Ecuador': 'ec',
  'Países Bajos': 'nl', 'Japón': 'jp', 'Suecia': 'se', 'Túnez': 'tn',
  'España': 'es', 'Cabo Verde': 'cv', 'Uruguay': 'uy', 'Arabia Saudita': 'sa',
  'Bélgica': 'be', 'Egipto': 'eg', 'Irán': 'ir', 'Nueva Zelanda': 'nz',
  'Francia': 'fr', 'Senegal': 'sn', 'Irak': 'iq', 'Noruega': 'no',
  'Argentina': 'ar', 'Argelia': 'dz', 'Austria': 'at', 'Jordania': 'jo',
  'Portugal': 'pt', 'RD Congo': 'cd', 'Inglaterra': 'gb-eng', 'Croacia': 'hr',
  'Ghana': 'gh', 'Panamá': 'pa', 'Uzbekistán': 'uz', 'Colombia': 'co'
}

export default function GroupsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [predictions, setPredictions] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Agrupamos los partidos por nombre de grupo (A, B, C...)
  const matchesByGroup = useMemo(() => {
    const groups: Record<string, typeof GROUP_MATCHES> = {}
    GROUP_MATCHES.forEach(match => {
      if (!groups[match.group_name]) groups[match.group_name] = []
      groups[match.group_name].push(match)
    })
    return groups
  }, [])

  useEffect(() => {
    if (!user) return
    async function fetchPreds() {
      const { data } = await supabase.from('predictions').select('match_id, prediction').eq('user_id', user.id)
      if (data) {
        const p: Record<number, string> = {}
        data.forEach(item => p[item.match_id] = item.prediction)
        setPredictions(p)
      }
      setLoading(false)
    }
    fetchPreds()
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const payload = Object.entries(predictions).map(([id, val]) => ({
      user_id: user.id, match_id: parseInt(id), prediction: val, phase: 'groups'
    }))
    const { error } = await supabase.from('predictions').upsert(payload, { onConflict: 'user_id,match_id' })
    if (!error) {
      await supabase.from('submissions').upsert({ user_id: user.id, phase: 'groups', predictions_count: payload.length, submitted_at: new Date().toISOString() }, { onConflict: 'user_id,phase' })
      alert("¡Guardado!")
      navigate('/dashboard')
    }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-500">Cargando...</div>

  return (
    <div className="px-4 pt-6 pb-[100px] min-h-screen bg-[#0a0a0a] text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Fase de Grupos</h1>
        <button onClick={handleSave} disabled={saving} className="bg-[#244ffe] px-6 py-2 rounded-xl font-bold">{saving ? '...' : 'Guardar Todo'}</button>
      </div>

      {Object.entries(matchesByGroup).sort().map(([groupName, matches]) => (
        <div key={groupName} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-[#244ffe] rounded-lg flex items-center justify-center font-bold text-sm">G</div>
            <h2 className="text-lg font-bold">Grupo {groupName}</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            {matches.map(match => (
              <div key={match.id} className="p-4 rounded-2xl bg-[#141414] border border-[#1f1f1f]">
                <p className="text-[10px] text-gray-500 text-center mb-3">Partido #{match.id} · {match.match_date}</p>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <button onClick={() => setPredictions({...predictions, [match.id]: 'home'})} className={`flex flex-col items-center p-3 rounded-xl gap-2 ${predictions[match.id] === 'home' ? 'bg-[#244ffe]' : 'bg-[#1a1a1a]'}`}>
                    <img src={`https://flagcdn.com/w80/${FLAG_MAP[match.home_team] || 'un'}.png`} className="w-8 h-6 object-cover rounded shadow" />
                    <span className="text-[10px] font-bold truncate w-full">{match.home_team}</span>
                  </button>
                  <button onClick={() => setPredictions({...predictions, [match.id]: 'draw'})} className={`p-4 rounded-xl font-bold text-xs ${predictions[match.id] === 'draw' ? 'bg-[#2a2a2a]' : 'bg-[#1a1a1a]'}`}>Empate</button>
                  <button onClick={() => setPredictions({...predictions, [match.id]: 'away'})} className={`flex flex-col items-center p-3 rounded-xl gap-2 ${predictions[match.id] === 'away' ? 'bg-[#244ffe]' : 'bg-[#1a1a1a]'}`}>
                    <img src={`https://flagcdn.com/w80/${FLAG_MAP[match.away_team] || 'un'}.png`} className="w-8 h-6 object-cover rounded shadow" />
                    <span className="text-[10px] font-bold truncate w-full">{match.away_team}</span>
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

¡Espero que esto sea exactamente lo que buscabas! Avísame si necesitas cualquier otro ajuste.
