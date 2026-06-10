import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getTeamFlag } from '../../types'

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
  const [phaseOpen, setPhaseOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchStats()
    fetchPhase()
  }, [user])

  async function fetchStats() {
    if (!user) return
    const { data: pts } = await supabase
      .from('points_summary')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const { data: sub } = await supabase
      .from('submissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('phase', 'groups')
      .single()

    const { data: rankData } = await supabase
      .from('ranking_view')
      .select('position')
      .eq('user_id', user.id)
      .single()

    setStats({
      total_points: pts?.total_points ?? 0,
      position: rankData?.position ?? 0,
      predictions_done: sub?.predictions_count ?? 0,
      submitted: !!sub,
      submitted_at: sub?.submitted_at,
    })
  }

  async function fetchPhase() {
    const { data } = await supabase
      .from('phases')
      .select('is_open')
      .eq('phase_key', 'groups')
      .single()
    setPhaseOpen(data?.is_open ?? false)
  }

  const flag = user?.favorite_team ? getTeamFlag(user.favorite_team) : '⚽'
  const total = 72
  const done = stats?.predictions_done ?? 0
  const progress = Math.round((done / total) * 100)

  return (
    <div className="px-4 pt-6 pb-nav">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500 mb-1">Bienvenido de vuelta</p>
          <h1 className="text-xl font-bold">{user?.full_name?.split(' ')[0]} {flag}</h1>
        </div>
        <div className="w-11 h-11 rounded-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center">
          {user?.avatar_url
            ? <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            : <span className="text-xl">{flag}</span>
          }
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card-dark p-4">
          <p className="text-xs text-gray-500 mb-1">Puntos</p>
          <p className="text-3xl font-bold text-gradient">{stats?.total_points ?? 0}</p>
        </div>
        <div className="card-dark p-4">
          <p className="text-xs text-gray-500 mb-1">Posición</p>
          <p className="text-3xl font-bold">
            {stats?.position ? `#${stats.position}` : '—'}
          </p>
        </div>
      </div>

      {/* Phase card */}
      <div className="card-dark p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Fase activa</p>
            <p className="font-semibold">Fase de grupos</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            phaseOpen ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
          }`}>
            {phaseOpen ? 'Abierta' : 'Cerrada'}
          </div>
        </div>

        {/* Progress */}
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>{done} de {total} partidos</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #0299fc, #244ffe)'
            }}
          />
        </div>

        {stats?.submitted && (
          <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
            <span>✅</span>
            <span>Enviada el {new Date(stats.submitted_at!).toLocaleDateString('es-MX', {
              day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
            })}</span>
          </div>
        )}
      </div>

      {/* CTA Button */}
      {phaseOpen && !stats?.submitted && (
        <button className="btn-primary" onClick={() => navigate('/pronosticos')}>
          ⚽ Registrar pronósticos
        </button>
      )}
      {stats?.submitted && (
        <button
          className="btn-primary"
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
          onClick={() => navigate('/pronosticos')}
        >
          👁 Ver mis pronósticos
        </button>
      )}
      {!phaseOpen && !stats?.submitted && (
        <div className="card-dark p-4 text-center text-gray-500 text-sm">
          La fase de grupos está cerrada temporalmente
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          onClick={() => navigate('/ranking')}
          className="card-dark p-4 text-left hover:border-[#0299fc]/30 transition-colors"
        >
          <p className="text-lg mb-1">🏆</p>
          <p className="text-sm font-medium">Ranking</p>
          <p className="text-xs text-gray-500">Ver tabla</p>
        </button>
        <button
          onClick={() => navigate('/perfil')}
          className="card-dark p-4 text-left hover:border-[#0299fc]/30 transition-colors"
        >
          <p className="text-lg mb-1">{flag}</p>
          <p className="text-sm font-medium">Mi perfil</p>
          <p className="text-xs text-gray-500">Editar datos</p>
        </button>
      </div>
    </div>
  )
}
