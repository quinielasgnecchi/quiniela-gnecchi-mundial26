import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, signOut: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id)
      else { setUser(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

 async function fetchProfile(userId: string) {
  const { data: authUser } = await supabase.auth.getUser()

  const email = authUser.user?.email ?? ''
  const defaultName = email.split('@')[0]

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    const { data: inserted } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: defaultName,
        role: 'user',
      })
      .select()
      .single()

    setUser(inserted)
    setLoading(false)
    return
  }

  // si no tiene nombre, usar email
  if (!data.full_name) {
    data.full_name = defaultName
  }

  setUser(data)
  setLoading(false)
}

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
