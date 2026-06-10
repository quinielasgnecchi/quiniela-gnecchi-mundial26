import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { TEAMS, getTeamFlag } from '../../types'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [favoriteTeam, setFavoriteTeam] = useState(user?.favorite_team ?? '')
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url ?? '')

  if (!user) return null

  const flag = getTeamFlag(user.favorite_team ?? '')

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
      favorite_team: favoriteTeam,
      avatar_url: avatarUrl,
    }).eq('id', user!.id)

    setSaving(false)
    setEditing(false)
    window.location.reload()
  }

  return (
    <div className="px-4 pt-6 pb-nav">
      <h1 className="text-xl font-bold mb-6">Mi perfil</h1>

      {/* Avatar + info */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-3">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center">
            {avatarPreview
              ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              : <span className="text-4xl">{flag}</span>
            }
          </div>
          {editing && (
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#0299fc] rounded-full flex items-center justify-center cursor-pointer">
              <span className="text-xs">📷</span>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          )}
        </div>
        {!editing && (
          <>
            <p className="font-bold text-lg">{user.full_name}</p>
            <p className="text-gray-500 text-sm">{user.email}</p>
            {user.favorite_team && (
              <div className="flex items-center gap-1.5 mt-2 bg-[#1a1a1a] px-3 py-1.5 rounded-full">
                <span>{flag}</span>
                <span className="text-sm">{user.favorite_team}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit form */}
      {editing ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nombre completo</label>
            <input
              className="input-dark"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Selección favorita</label>
            <select
              className="input-dark"
              value={favoriteTeam}
              onChange={e => setFavoriteTeam(e.target.value)}
            >
              {TEAMS.map(t => (
                <option key={t.name} value={t.name}>{t.flag} {t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button
              className="btn-primary"
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            className="btn-primary"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
            onClick={() => setEditing(true)}
          >
            ✏️ Editar perfil
          </button>

          {user.role === 'admin' && (
            <button
              className="btn-primary"
              style={{ background: 'rgba(2,153,252,0.1)', border: '1px solid rgba(2,153,252,0.3)' }}
              onClick={() => window.location.href = '/admin'}
            >
              🛡 Panel de administrador
            </button>
          )}

          <button
            className="btn-primary mt-4"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
            onClick={signOut}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
