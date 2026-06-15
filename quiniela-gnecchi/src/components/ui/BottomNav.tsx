import { useLocation, useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/', label: 'Inicio', icon: '🏠' },
  { path: '/pronosticos', label: 'Partidos', icon: '⚽' },
  { path: '/ranking', label: 'Ranking', icon: '🏆' },
  { path: '/perfil', label: 'Perfil', icon: '👤' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => {
        const active = location.pathname === item.path
        return (
          <button key={item.path} onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-1 px-4 py-1 min-w-[60px]">
            <span className={`text-xl transition-transform ${active ? 'scale-110' : 'scale-100 opacity-40'}`}>
              {item.icon}
            </span>
            <span className="text-[10px] font-medium transition-colors"
              style={{color: active ? '#244ffe' : '#555'}}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
