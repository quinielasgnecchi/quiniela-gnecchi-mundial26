import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session

      if (!session?.user) {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      await fetchProfile(session.user.id)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return

      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId: string) {
    try {
    const { data: sessionData } = await supabase.auth.getSession()
const email = sessionData.session?.user?.email ?? ''
      const defaultName = email.split('@')[0]

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!profile) {
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

      const fixedProfile = {
        ...profile,
        full_name: profile.full_name || defaultName,
      }

      setUser(fixedProfile)
    } catch (err) {
      console.error('Auth error:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
