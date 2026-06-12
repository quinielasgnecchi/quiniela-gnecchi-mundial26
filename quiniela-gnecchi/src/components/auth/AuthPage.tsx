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
      
      {/* Contenedor principal: Modificado con bordes negros y curvatura adaptada al teléfono del fondo */}
      <div className="w-full max-w-[214px] px-4 py-6 rounded-[36px] bg-black border border-black relative z-10">
        
        {/* Cabecera con títulos del mismo tamaño, tipografía común y color #BCD100 */}
        <div className="text-center mb-4">
          <h1 className="tracking-tight leading-tight flex flex-col items-center text-[#BCD100]">
            {/* Renglón 1 */}
            <span className="font-extrabold text-base uppercase">
              QUINIELA GNECCHI
            </span>
            {/* Renglón 2: Mundial 2026 juntos con la misma tipografía y tamaño */}
            <span className="flex items-center gap-1 mt-0.5 font-black text-base filter drop-shadow-sm">
              <span className="uppercase tracking-tighter">
                MUNDIAL
              </span>
              <span className="tracking-wider">
                2026
              </span>
            </span>
          </h1>
        </div>

        {message && (
          <div className={`mb-3 p-3 rounded-xl text-xs font-semibold text-center border ${
            message.type === 'success' 
              ? 'bg-green-500/20 border-green-500/30 text-green-400' 
              : message.type === 'info'
              ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
              : 'bg-red-500/20 border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-3">
          
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Correo Electrónico</label>
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
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Contraseña</label>
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
