import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Manejamos un solo flujo visual, pero internamente dejamos que el usuario alterne 
  // si es su primera vez de forma muy sutil, manteniendo el botón único de "Ingresar".
  const [isFirstTime, setIsFirstTime] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isFirstTime) {
        // FLUJO REGISTRO: Si es su primera vez, creamos la cuenta
        if (!fullName.trim()) {
          throw new Error('Por favor, ingresa tu nombre completo para el ranking.')
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        })
        if (signUpError) throw signUpError
        setMessage({ type: 'success', text: '¡Registro exitoso! Revisa tu correo para verificar tu cuenta o ingresa directamente.' })
      } else {
        // FLUJO INGRESO DIRECTO: Intento de inicio de sesión tradicional
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
      }
    } catch (error: any) {
      // Si el usuario intenta ingresar pero no existe, le avisamos sutilmente que debe registrarse
      if (error.message?.includes('Invalid login credentials')) {
        setMessage({ 
          type: 'error', 
          text: 'No encontramos tu cuenta con esa contraseña. Si es tu primera vez, marca la casilla de abajo para registrarte.' 
        })
      } else {
        setMessage({ type: 'error', text: error.message || 'Ocurrió un error inesperado.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md p-6 rounded-3xl bg-[#141414] border border-[#1f1f1f] shadow-xl">
        
        {/* Logo / Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-white">
            QUINIELA<span className="text-[#009AFE]">2026</span>
          </h1>
          <p className="text-xs text-gray-500 mt-2">
            {isFirstTime ? 'Crea tu perfil de competidor' : 'Introduce tus credenciales para acceder'}
          </p>
        </div>

        {/* Alertas */}
        {message && (
          <div className={`mb-4 p-3 rounded-xl text-xs font-medium text-center border ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20 text-[#01CB3B]' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Formulario Unificado */}
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          
          {/* Si es primera vez, se despliega el campo de Nombre automáticamente */}
          {isFirstTime && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nombre Completo</label>
              <input 
                type="text" 
                placeholder="Ej. Juan Pérez"
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

          {/* BOTÓN ÚNICO DE ACCIÓN */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-xl bg-[#009AFE] hover:bg-[#0086dd] text-white font-bold text-sm transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : isFirstTime ? '🚀 Registrarme e Ingresar' : '🚪 Ingresar'}
          </button>
        </form>

        {/* Switch sutil e Inteligente en la parte inferior */}
        <div className="mt-6 pt-4 border-t border-[#1f1f1f] text-center">
          <button
            type="button"
            onClick={() => {
              setIsFirstTime(!isFirstTime)
              setMessage(null)
            }}
            className="text-xs text-gray-400 hover:text-white transition-colors underline decoration-dotted underline-offset-4"
          >
            {isFirstTime ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿Es tu primera vez participando? Regístrate aquí'}
          </button>
        </div>

      </div>
    </div>
  )
}
