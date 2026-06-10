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

  const phaseOpen = now < DEADLINE

  useEffect(() => {
    if (!user) return
    fetchStats()
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [user])

  async function fetchStats() {
    if (!user) return
    const { data: pts } = await supabase.from('points_summary').select('*').eq('user_id', user.id).single()
    const { data: sub } = await supabase.from('submissions').select('*').eq('user_id', user.id).eq('phase', 'groups').single()
    const { data: rankData } = await supabase.from('ranking_view').select('position').eq('user_id', user.id).single()
    setStats({
      total_points: pts?.total_points ?? 0,
      position: rankData?.position ?? 0,
      predictions_done: sub?.predictions_count ?? 0,
      submitted: !!sub,
      submitted_at: sub?.submitted_at,
    })
  }

  const total = 72
  const done = stats?.predictions_done ?? 0
  const progress = Math.round((done / total) * 100)

  // Countdown
  const diff = DEADLINE.getTime() - now.getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  const initials = (user?.full_name ?? user?.email ?? '?').charAt(0).toUpperCase()
  const displayName = user?.full_name ?? user?.email?.split('@')[0] ?? 'Bienvenido'

  return (
    <div className="px-4 pt-6 pb-nav">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs mb-1" style={{color:'#555'}}>Bienvenido de vuelta</p>
          <h1 className="text-xl font-bold text-white">{displayName} 👋</h1>
        </div>
        <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
          style={{background:'#1a1a1a',border:'2px solid #2a2a2a'}}>
          {user?.avatar_url
            ? <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            : <span className="font-bold text-white">{initials}</span>
          }
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-4 rounded-2xl" style={{background:'#141414',border:'1px solid #1f1f1f'}}>
          <p className="text-xs mb-1" style={{color:'#555'}}>Puntos</p>
          <p className="text-3xl font-bold" style={{color:'#244ffe'}}>{stats?.total_points ?? 0}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{background:'#141414',border:'1px solid #1f1f1f'}}>
          <p className="text-xs mb-1" style={{color:'#555'}}>Posición</p>
          <p className="text-3xl font-bold text-white">{stats?.position ? `#${stats.position}` : '—'}</p>
        </div>
      </div>

      {/* Countdown */}
      {phaseOpen && !stats?.submitted && (
        <div className="p-4 rounded-2xl mb-5 text-center" style={{background:'rgba(36,79,254,0.08)',border:'1px solid rgba(36,79,254,0.2)'}}>
          <p className="text-xs mb-2" style={{color:'#555'}}>Tiempo para registrar pronósticos</p>
          <p className="text-2xl font-bold" style={{color:'#244ffe'}}>
            {diff > 0 ? `${hours}h ${minutes}m ${seconds}s` : 'Cerrado'}
          </p>
          <p className="text-xs mt-1" style={{color:'#555'}}>Cierra el 11 jun · 1:00pm hora México</p>
        </div>
      )}

      {/* Phase card */}
      <div className="p-5 rounded-2xl mb-5" style={{background:'#141414',border:'1px solid #1f1f1f'}}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-white">Fase de grupos</p>
          <div className="px-3 py-1 rounded-full text-xs font-medium"
            style={phaseOpen
              ? {background:'rgba(0,202,66,0.15)',color:'#00CA42'}
              : {background:'rgba(234,0,1,0.15)',color:'#EA0001'}}>
            {phaseOpen ? 'Abierta' : 'Cerrada'}
          </div>
        </div>
        <div className="flex justify-between text-xs mb-1" style={{color:'#555'}}>
          <span>{done} de {total} partidos</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{background:'#1a1a1a'}}>
          <div className="h-full rounded-full transition-all" style={{width:`${progress}%`,background:'#244ffe'}} />
        </div>
        {stats?.submitted && (
          <div className="mt-3 flex items-center gap-2 text-xs" style={{color:'#00CA42'}}>
            <span>✅</span>
            <span>Enviada el {new Date(stats.submitted_at!).toLocaleDateString('es-MX', {
              day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'
            })}</span>
          </div>
        )}
      </div>

      {/* CTA */}
      {phaseOpen && !stats?.submitted && (
        <button className="btn-primary" onClick={() => navigate('/pronosticos')}>
          ⚽ Registrar pronósticos
        </button>
      )}
      {stats?.submitted && (
        <button className="btn-primary" style={{background:'#1a1a1a',border:'1px solid #2a2a2a'}}
          onClick={() => navigate('/pronosticos')}>
          👁 Ver mis pronósticos
        </button>
      )}
      {!phaseOpen && !stats?.submitted && (
        <div className="p-4 rounded-2xl text-center text-sm" style={{background:'#141414',color:'#555'}}>
          El tiempo para registrar pronósticos ha cerrado
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button onClick={() => navigate('/ranking')} className="p-4 rounded-2xl text-left"
          style={{background:'#141414',border:'1px solid #1f1f1f'}}>
          <p className="text-lg mb-1">🏆</p>
          <p className="text-sm font-medium text-white">Ranking</p>
          <p className="text-xs" style={{color:'#555'}}>Ver tabla</p>
        </button>
        <button onClick={() => navigate('/resultados')} className="p-4 rounded-2xl text-left"
          style={{background:'#141414',border:'1px solid #1f1f1f'}}>
          <p className="text-lg mb-1">⚽</p>
          <p className="text-sm font-medium text-white">Resultados</p>
          <p className="text-xs" style={{color:'#555'}}>Ver partidos</p>
        </button>
      </div>
    </div>
  )
}
