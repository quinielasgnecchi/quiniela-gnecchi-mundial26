import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AuthPage from './components/auth/AuthPage'
import Dashboard from './components/dashboard/Dashboard'
import { GroupsPage } from './components/groups/GroupsPage'
import ResultsPage from './components/groups/ResultsPage'
import RankingPage from './components/ranking/RankingPage'
import ProfilePage from './components/dashboard/ProfilePage'
import AdminPage from './components/admin/AdminPage'
import BottomNav from './components/ui/BottomNav'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-bounce">⚽</span>
          <p className="text-sm" style={{ color: '#555' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto relative min-h-screen">
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <AuthPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/resultados" element={<ResultsPage />} />

        {/* Rutas privadas */}
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/pronosticos" element={user ? <GroupsPage user={user} /> : <Navigate to="/login" />} />
        <Route path="/perfil" element={user ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user ? <AdminPage /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
      {user && <BottomNav />}
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
