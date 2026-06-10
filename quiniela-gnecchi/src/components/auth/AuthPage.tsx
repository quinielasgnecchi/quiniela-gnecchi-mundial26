import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type Mode = 'login' | 'register'

const DEADLINE = new Date('2026-06-11T19:00:00Z')

function useCountdown() {
  const [now, setNow] = useState(new Date())
  useState(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  })
  const diff = DEADLINE.getTime() - now.getTime()
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { h, m, s }
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const navigate = useNavigate()
  const countdown = useCountdown()

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleLogin() {
    if (!email || !password) return setError('Ingresa tu correo y contraseña')
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Correo o contraseña incorrectos')
    setLoading(false)
  }

  async function handleRegister() {
    if (!fullName.trim()) return setError('Ingresa tu nombre completo')
    if (!email) return setError('Ingresa tu correo')
    if (password.length < 6) return setError('La contraseña debe tener mínimo 6 caracteres')
    setLoading(true); setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    const userId = authData.user?.id
    if (!userId) { setError('Error al crear cuenta, intenta de nuevo'); setLoading(false); return }

    let avatarUrl = ''
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const { data: uploadData } = await supabase.storage
        .from('avatars').upload(`${userId}.${ext}`, avatarFile, { upsert: true })
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path)
        avatarUrl = urlData.publicUrl
      }
    }

    await supabase.from('profiles').insert({
      id: userId, email, full_name: fullName, avatar_url: avatarUrl, role: 'user',
    })

    setSuccess('¡Cuenta creada! Ya puedes iniciar sesión.')
    setMode('login')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <div className="mb-6 text-center">
        <div className="text-5xl mb-3">⚽</div>
        <h1 className="text-3xl font-bold">
          <span className="text-white">Quiniela </span>
          <span style={{color:'#244ffe'}}>Gnecchi</span>
        </h1>
        <p className="text-sm mt-1" style={{color:'#555'}}>Mundial 2026 · Predice. Compite. Diviértete.</p>
      </div>

      {/* Countdown */}
      {countdown && (
        <div className="w-full max-w-sm mb-5 p-4 rounded-2xl text-center" style={{background:'rgba(36,79,254,0.08)',border:'1px solid rgba(36,79,254,0.25)'}}>
          <p className="text-xs mb-3 font-medium" style={{color:'#888'}}>⏱ Tiempo para registrar pronósticos</p>
          <div className="flex justify-center gap-3">
            {[{val: countdown.h, label:'hrs'},{val: countdown.m, label:'min'},{val: countdown.s, label:'seg'}].map(({val, label}) => (
              <div key={label} className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-2xl text-white" style={{background:'#141414',border:'1px solid #2a2a2a'}}>
                  {String(val).padStart(2,'0')}
                </div>
                <span className="text-xs mt-1" style={{color:'#555'}}>{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{color:'#444'}}>Cierra el 11 jun · 1:00pm hora México</p>
        </div>
      )}

      {/* Auth card */}
      <div className="w-full max-w-sm" style={{background:'#141414',border:'1px solid #1f1f1f',borderRadius:'20px',padding:'24px'}}>
        <div className="flex rounded-xl p-1 mb-6" style={{background:'#0a0a0a'}}>
          {(['login','register'] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={mode === m ? {background:'#244ffe',color:'white'} : {color:'#666'}}>
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {mode === 'register' && (
            <>
              <div className="flex flex-col items-center gap-2">
                <label className="cursor-pointer">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden"
                    style={{background:'#1a1a1a',border:'2px dashed #2a2a2a'}}>
                    {avatarPreview
                      ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      : <span className="text-3xl">📷</span>}
                  </div>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
                <span className="text-xs" style={{color:'#555'}}>Foto de perfil (opcional)</span>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{color:'#888'}}>Nombre completo</label>
                <input className="input-dark" placeholder="Ej: Juan García" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
            </>
          )}

          <div>
            <label className="text-xs mb-1 block" style={{color:'#888'}}>Correo electrónico</label>
            <input className="input-dark" type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{color:'#888'}}>Contraseña</label>
            <input className="input-dark" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          {error && <div className="rounded-xl px-3 py-2 text-sm" style={{background:'rgba(234,0,1,0.1)',border:'1px solid rgba(234,0,1,0.3)',color:'#EA0001'}}>{error}</div>}
          {success && <div className="rounded-xl px-3 py-2 text-sm" style={{background:'rgba(0,202,66,0.1)',border:'1px solid rgba(0,202,66,0.3)',color:'#00CA42'}}>{success}</div>}

          <button onClick={mode === 'login' ? handleLogin : handleRegister} disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-white"
            style={{background:'#244ffe',opacity:loading ? 0.6 : 1}}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm mt-4">
        <button onClick={() => navigate('/ranking')}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{background:'#141414',border:'1px solid #1f1f1f'}}>
          🏆 Ver ranking público
        </button>
        <button onClick={() => navigate('/resultados')}
          className="w-full py-3.5 rounded-xl font-medium text-white"
          style={{background:'#141414',border:'1px solid #1f1f1f'}}>
          ⚽ Ver resultados de partidos
        </button>
      </div>

      <p className="text-xs mt-6 text-center" style={{color:'#333'}}>
        Quiniela privada · Solo invitados · Sin apuestas de dinero
      </p>
    </div>
  )
}
