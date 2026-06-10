import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url ?? '')

  if (!user) return null

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setSaving(true)
    let avatarUrl = user!.avatar_url ?? ''

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const { data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(`${user!.id}.${ext}`, avatarFile, { upsert: true })
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path)
        avatarUrl = urlData.publicUrl
      }
    }

    await supabase.from('profiles').update({
      full_name: fullName,
      avatar_url: avatarUrl,
    }).eq('id', user!.id)

    setSaving(false)
    setEditing(false)
    window.location.reload()
  }

  const initials = (user.full_name ?? user.email ?? '?').charAt(0).toUpperCase()

  return (
    <div className="px-4 pt-6 pb-nav">
      <h1 className="text-xl font-bold mb-6 text-white">Mi perfil</h1>

      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-3">
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
            style={{background:'#1a1a1a',border:'2px solid #2a2a2a'}}>
            {avatarPreview
              ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              : <span className="text-3xl font-bold text-white">{initials}</span>
            }
          </div>
          {editing && (
            <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{background:'#244ffe'}}>
              <span className="text-xs">📷</span>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          )}
        </div>
        {!editing && (
          <>
            <p className="font-bold text-lg text-white">{user.full_name ?? user.email}</p>
            <p className="text-sm mt-1" style={{color:'#555'}}>{user.email}</p>
          </>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs mb-1 block" style={{color:'#888'}}>Nombre completo</label>
            <input className="input-dark" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" style={{background:'#1a1a1a',border:'1px solid #2a2a2a'}} onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button className="btn-primary" style={{background:'#244ffe'}} onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button className="btn-primary" style={{background:'#1a1a1a',border:'1px solid #2a2a2a'}} onClick={() => setEditing(true)}>
            ✏️ Editar perfil
          </button>
          {user.role === 'admin' && (
            <button className="btn-primary" style={{background:'rgba(36,79,254,0.1)',border:'1px solid rgba(36,79,254,0.3)'}}
              onClick={() => window.location.href = '/admin'}>
              🛡 Panel de administrador
            </button>
          )}
          <button className="btn-primary mt-4" style={{background:'rgba(234,0,1,0.1)',border:'1px solid rgba(234,0,1,0.2)',color:'#EA0001'}}
            onClick={signOut}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
