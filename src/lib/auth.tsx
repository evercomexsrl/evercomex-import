import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'
const Ctx = createContext<any>(null)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const load = async (uid?: string) => {
    if (!uid) { setProfile(null); setLoading(false); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile(data); setLoading(false)
  }
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setTimeout(() => load(s?.user.id), 0) })
    return () => sub.subscription.unsubscribe()
  }, [])
  const isAdmin = profile?.role === 'admin' && profile?.is_active
  return <Ctx.Provider value={{ profile, loading, isAdmin, signOut: () => supabase.auth.signOut() }}>{children}</Ctx.Provider>
}
