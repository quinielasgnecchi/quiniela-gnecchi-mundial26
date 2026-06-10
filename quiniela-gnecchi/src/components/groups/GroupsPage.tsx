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
        .ups
