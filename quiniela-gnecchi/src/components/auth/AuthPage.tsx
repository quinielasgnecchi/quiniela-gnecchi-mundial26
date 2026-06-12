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
      
      {/* Contenedor principal: Optimizado un 35% más pequeño verticalmente y un 10% más estrecho */}
      <div className="w-full max-w-[288px] p-4 rounded-2xl bg-white/50 border border-white/20 shadow-2xl relative z-10 backdrop-blur-md">
        
        {/* Cabecera con títulos organizados en dos renglones del mismo tamaño */}
        <div className="text-center mb-4">
          <h1 className="tracking-tight leading-tight flex flex-col items-center">
            {/* Renglón 1 */}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900 font-extrabold text-base uppercase">
              QUINIELA GNECCHI
            </span>
            {/* Renglón 2: Mundial 2026 juntos, del mismo tamaño (text-base) y con color fijo #005EFF */}
            <span className="flex items-center gap-1 mt-0.5 font-black text-base text-[#005EFF] filter drop-shadow-sm">
              <span className="uppercase tracking-tighter">
                MUNDIAL
              </span>
              <span className="font-mono tracking-wider">
                2026
              </span>
            </span>
          </h1>
        </div>

        {message && (
          <div className={`mb-3 p-3 rounded-xl text-xs font-semibold text-center border ${
            message.type === 'success' 
              ? 'bg-green-500/20 border-green-500/30 text-green-800' 
              : message.type === 'info'
              ? 'bg-blue-500/20 border-blue-500/30 text-blue-800'
              : 'bg-red-500/20 border-red-500/30 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-3">
          
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-800 uppercase tracking-wider">Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/90 border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#009AFE] transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-800 uppercase tracking-wider">Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/90 border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#009AFE] transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 py-2.5 rounded-xl bg-[#009AFE] hover:bg-[#0086dd] text-white font-bold text-xs transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Ingresar'}
          </button>
        </form>

      </div>
    </div>
  )
}
