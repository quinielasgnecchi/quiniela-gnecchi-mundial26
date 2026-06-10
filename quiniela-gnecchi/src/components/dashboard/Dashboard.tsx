import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

// Deadline: Jueves 11 de junio 2026 a la 1:00pm hora México (UTC-6)
const DEADLINE = new Date('2026-06-11T19:00:00Z')

interface Stats {
  total_points: number
  position: number
  predictions_done: number
  submitted: boolean
  submitted_at?: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(true)

  const phaseOpen = now < DEADLINE

  useEffect(() => {
    if (!user) return
    fetchStats()
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [user])

  async function fetchStats() {
    if (!user) return
    try {
      // 1. Consultar puntos directamente de la tabla 'profiles'
      const { data: profileData } = await supabase
        .from('profiles')
        .select('points, full_name')
        .eq('id', user.id)
        .maybeSingle()

      // 2. Obtener la posición en tiempo real contando cuántos tienen más puntos
      const { count: positionCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('points', profileData?.points ?? 0)

      // 3. Consultar el estado de los envíos en 'submissions'
      const { data: sub } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('phase', 'groups')
        .maybeSingle()

      setStats({
        total_points: profileData?.points ?? 0,
        position: profileData ? (positionCount ?? 0) + 1 : 0,
        predictions_done: sub?.predictions_count ?? 0,
        submitted: !!sub,
        submitted_at: sub?.submitted_at,
      })
    } catch (error) {
      console.error('Error cargando estadísticas del Dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const total = 72
  const done = stats?.predictions_done ?? 0
  const progress = Math.round((done / total) * 100)

  // Countdown
  const diff = DEAD
