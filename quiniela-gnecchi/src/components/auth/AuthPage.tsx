import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [isFirstTime, setIsFirstTime] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isFirstTime) {
        if (!fullName.trim()) {
          throw new Error('Por favor, ingresa tu nombre completo para el ranking.')
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        })
        if (signUpError) throw signUpError

        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          setMessage({
            type: 'info',
            text: '📧 Este correo ya está registrado. Si no confirmaste tu cuenta antes, busca el enlace de validación en tu bandeja de entrada.'
          })
        } else {
          setMessage({ 
            type: 'success', 
            text: '📩 ¡Registro recibido! Hemos enviado un enlace de validación a tu correo electrónico. Por favor, confírmalo para poder ingresar.' 
          })
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
      }
    } catch (error: any) {
      if (error.message?.includes('Email signup is disabled') || error.message?.includes('invalid')) {
        setMessage({
          type: 'error',
          text: '⚠️ No puedes ingresar todavía. Por favor, revisa tu correo electrónico y haz clic en el enlace de validación que te enviamos.'
        })
      } else if (error.message?.includes('Invalid login credentials')) {
        setMessage({ 
          type: 'error', 
          text: 'Contraseña incorrecta. Si es tu primera vez participando, marca la opción de registrarte abajo.' 
        })
      } else {
        setMessage({ type: 'error', text: error.message || 'Ocurrió un error inesperado.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col justify-center items-center px-4 relative overflow-hidden">
      
      {/* Efecto de luz ambiental mundialista de fondo (Azul y Verde) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-tr from-[#009AFE]/10 to-[#01CB3B]/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md p-6 rounded-3xl bg-[#141414] border border-[#1f1f1f] shadow-2xl relative z-10 backdrop-blur-sm">
        
        {/* Cabecera con los Colores Oficiales del Mundial 2026 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight leading-tight flex flex-col items-center">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 font-extrabold text-2xl">
              QUINIELA GNECCHI
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#01CB3B] via-[#E91E63] to-[#009AFE] font-black uppercase text-4xl mt-1 tracking-tighter filter drop-shadow-sm">
              MUNDIAL
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FFA500] font-black text-4xl font-mono tracking-widest mt-1">
              2026
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-3 font-medium">
            {isFirstTime ? 'Crea tu perfil de competidor' : 'Introduce tus credenciales para acceder'}
          </p>
        </div>

        {message && (
          <div className={`mb-5 p-4 rounded-xl text-xs font-medium text-center border ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20 text-[#01CB3B]' 
              : message.type === 'info'
              ? 'bg-blue-500/10 border-blue-500/20 text-[#009AFE]'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          
          {isFirstTime && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nombre Completo</label>
              <input 
                type="text" 
                placeholder="Ej. Juan Cantera"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#262626] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#009AFE] transition-colors"
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#262626] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#009AFE] transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#262626] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#009AFE] transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-xl bg-[#009AFE] hover:bg-[#0086dd] text-white font-bold text-sm transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? 'Procesando...' : isFirstTime ? '🚀 Registrarme' : '🚪 Ingresar'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#1f1f1f] text-center">
          {isFirstTime ? (
            <button
              type="button"
              onClick={() => {
                setIsFirstTime(false)
                setMessage(null)
              }}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              ¿Ya tienes cuenta?{' '}
              <span 
                className="underline decoration-dotted underline-offset-4 font-bold"
                style={{ color: '#009AFE' }}
              >
                Inicia sesión aquí
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsFirstTime(true)
                setMessage(null)
              }}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              ¿Es tu primera vez participando?{' '}
              <span 
                className="underline decoration-dotted underline-offset-4 font-bold"
                style={{ color: '#01CB3B' }}
              >
                Regístrate aquí
              </span>
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
