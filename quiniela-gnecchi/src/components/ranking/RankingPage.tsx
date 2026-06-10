import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Interfaz para mapear los usuarios registrados en tu base de datos
interface RankingUser {
  id: string
  full_name: string | null
  avatar_url: string | null
  points: number // Por defecto será 0 si no se ha calculado nada
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRanking() {
      try {
        setLoading(true)
        
        // Consultamos la tabla pública de perfiles/usuarios.
        // Ordenamos por puntos de mayor a menor, y si empatan (como al inicio), por nombre.
        const { data, error } = await supabase
          .from('profiles') // Si tu tabla se llama 'users', cambia 'profiles' por 'users'
          .select('id, full_name, avatar_url, points')
          .order('points', { ascending: false })
          .order('full_name', { ascending: true })

        if (error) throw error

        if (data) {
          // Si por algún motivo la columna 'points' viene vacía/null de la BD, aseguramos un 0
          const formattedData = (data as any[]).map(user => ({
            id: user.id,
            full_name: user.full_name || 'Usuario Anónimo',
            avatar_url: user.avatar_url,
            points: user.points ?? 0
          }))
          setRanking(formattedData)
        }
      } catch (err) {
        console.error("Error al cargar el ranking de competidores:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchRanking()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-400 font-medium">
        Cargando tabla de posiciones...
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-[100px] min-h-screen bg-[#0a0a0a] text-white">
      {/* Cabecera de la sección */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tabla de Posiciones</h1>
        <p className="text-xs text-gray-500 mt-1">
          Lista global de competidores registrados en la quiniela.
        </p>
      </div>

      {ranking.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#141414] border border-[#1f1f1f] text-center text-gray-500 text-sm">
          No hay ningún usuario registrado todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ranking.map((player, index) => {
            const position = index + 1
            
            // Estilos especiales para el podio (Top 3)
            let badgeStyle = "bg-[#1a1a1a] text-gray-400"
            if (position === 1) badgeStyle = "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
            if (position === 2) badgeStyle = "bg-gray-400/10 text-gray-300 border border-gray-400/20"
            if (position === 3) badgeStyle = "bg-amber-700/10 text
