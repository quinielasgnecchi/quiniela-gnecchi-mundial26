import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AuthPage from './components/auth/AuthPage'
import Dashboard from './components/dashboard/Dashboard'
import GroupsPage from './components/groups/GroupsPage'
import ResultsPage from './components/groups/ResultsPage'
import RankingPage from './components/ranking/RankingPage'
import ProfilePage from './components/dashboard/ProfilePage'
import AdminPage from './components/admin/AdminPage'

function CustomBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const tabs = [
    { id: '/pronosticos', label: 'Pronósticos', icon: '🧩' },
    { id: '/resultados', label: 'Partidos', icon: '⚽' },
    { id: '/ranking', label: 'Ranking', icon: '🏆' },
    { id: '/perfil', label: 'Perfil', icon: '👤' }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-[#1a1a1a] px-4 py-2 flex justify-around items-center z-50 max-w-md mx-auto" style={{ background: '#0a0a0a' }}>
      {tabs.map(tab => {
        const isActive = location.pathname === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className="flex flex-col items-center gap-0.5 py-1 flex-1 transition-colors"
          >
            <span className="text-xl" style={{ opacity: isActive ? 1 : 0.4 }}>{tab.icon}</span>
            <span className="text-[10px] font-bold tracking-wide" style={{ color: isActive ? '#244ffe' : '#555' }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-bounce">⚽</span>
          <p className="text-sm" style={{color:'#555'}}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto relative min-h-screen">
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={user ? <Navigate to="/pronosticos" /> : <AuthPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/resultados" element={<ResultsPage />} />

        {/* Rutas privadas */}
        <Route path="/" element={<Navigate to="/pronosticos" />} />
        <Route path="/pronosticos" element={user ? <GroupsPage /> : <Navigate to="/login" />} />
        <Route path="/perfil" element={user ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user ? <AdminPage /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={user ? "/pronosticos" : "/login"} />} />
      </Routes>
      {user && <CustomBottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
