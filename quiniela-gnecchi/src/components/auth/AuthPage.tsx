import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import wallpaper from '../../../wallpaper.jpg'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError
    } catch (error: any) {
      if (error.message?.includes('Email signup is disabled') || error.message?.includes('invalid')) {
        setMessage({
          type: 'error',
          text: '⚠️ No puedes ingresar todavía. Por favor, revisa tu correo electrónico y haz clic en el enlace de validación que te enviamos.'
        })
      } else if (error.message?.includes('Invalid login credentials')) {
        setMessage({ 
          type: 'error', 
          text: 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.' 
        })
      } else {
        setMessage({ type: 'error', text: error.message || 'Ocurrió un error inesperado.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen text-white flex flex-col justify-center items-center px-4 relative overflow-hidden bg-[#0a0a0a]">
      
      {/* Fondo de pantalla nítido (sin bokeh) con opacidad para visibilidad */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-60 pointer-events-none"
        style={{ backgroundImage: `url(${wallpaper})` }}
      />
      
      {/* Contenedor principal: Un 30% más estrecho (max-w-xs) y Blanco al 50% de transparencia */}
      <div className="w-full max-w-xs p-6 rounded-3xl bg-white/50 border border-white/20 shadow-2xl relative z-10 backdrop-blur-md">
        
        {/* Cabecera con los Colores Oficiales del Mundial 2026 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight leading-tight flex flex-col items-center">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900 font-extrabold text-lg">
              QUINIELA GNECCHI
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#01CB3B] via-[#E91E63] to-[#009AFE] font-black uppercase text-3xl mt-1 tracking-tighter filter drop-shadow-sm">
              MUNDIAL
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FFA500] font-black text-3xl font-mono tracking-widest mt-1">
              2026
            </span>
          </h1>
          <p className="text-[11px] text-gray-800 mt-3 font-bold">
            Introduce tus credenciales para acceder
          </p>
        </div>

        {message && (
          <div className={`mb-5 p-4 rounded-xl text-xs font-semibold text-center border ${
            message.type === 'success' 
              ? 'bg-green-500/20 border-green-500/30 text-green-800' 
              : message.type === 'info'
              ? 'bg-blue-500/20 border-blue-500/30 text-blue-800'
              : 'bg-red-500/20 border-red-500/30 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/90 border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#009AFE] transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/90 border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#009AFE] transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-[#009AFE] hover:bg-[#0086dd] text-white font-bold text-sm transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? 'Procesando...' : '🚪 Ingresar'}
          </button>
        </form>

      </div>
    </div>
  )
}
