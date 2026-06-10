import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Forzamos la carga directa desde la tabla 'profiles'
  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single()

        if (error) throw error
        
        if (data) {
          setFullName(data.full_name || user.email?.split('@')[0] || '')
          setAvatarPreview(data.avatar_url ?? '')
        }
      } catch (err) {
        console.error('Error al cargar perfil real:', err)
        // Fallback inmediato si no encuentra fila
        setFullName(user.email?.split('@')[0] || '')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [user])

  if (!user || loading) return <div className="p-4 text-white">Cargando perfil...</div>

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!fullName.trim()) return
    setSaving(true)

    let avatarUrl = avatarPreview

    if (avatarFile) {
      try {
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'png'
        // Agregamos un timestamp dinámico para evitar problemas de caché en el almacenamiento
        const filePath = `${user.id}/${Date.now()}.${ext}`

        // Subida al almacenamiento
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { 
            cacheControl: '3600',
            upsert: true 
          })

        if (uploadError) throw uploadError

        if (uploadData) {
          // Obtención de la URL pública oficial
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(uploadData.path)
          
          if (urlData?.publicUrl) {
            avatarUrl = urlData.publicUrl
          }
        }
      } catch (uploadErr: any) {
        console.error('Error al subir la imagen:', uploadErr)
        alert('Error al subir la imagen al servidor: ' + (uploadErr.message || 'Intenta de nuevo'))
        setSaving(false)
        return
      }
    }

    // Guardado directo y limpio en la base de datos
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: fullName.trim(),
      avatar_url: avatarUrl,
    })

    if (error) {
      alert('Error en Supabase al guardar el nombre: ' + error.message)
    } else {
      setEditing(false)
      window.location.reload() // Recarga para unificar estados de la app
    }
    setSaving(false)
  }

  const initials = fullName.charAt(0).toUpperCase() || '?'

  return (
    <div className="px-4 pt-6 pb-nav min-h-screen bg-[#0a0a0a]">
      <h1 className="text-xl font-bold mb-6 text-white">Mi perfil</h1>
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-3">
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center" style={{ background: '#1a1a1a', border: '2px solid #2a2a2a' }}>
            {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-white">{initials}</span>}
          </div>
          {editing && (
            <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ background: '#244ffe' }}>
              <span className="text-sm">📷</span>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          )}
        </div>
        {!editing && (
          <>
            <p className="font-bold text-lg text-white">{fullName}</p>
            <p className="text-sm mt-1" style={{ color: '#555' }}>{user.email}</p>
          </>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#888' }}>Nombre de usuario</label>
            <input className="input-dark" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }} onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button className="btn-primary" style={{ background: '#244ffe' }} onClick={handleSave} disabled={saving || !fullName.trim()}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button className="btn-primary" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }} onClick={() => setEditing(true)}>
            ✏️ Editar nombre y foto
          </button>
          <button className="btn-primary mt-4" style={{ background: 'rgba(234,0,1,0.1)', border: '1px solid rgba(234,0,1,0.2)', color: '#EA0001' }} onClick={signOut}>
            Cerrar sesión
          </button>
        </div>
      )}
