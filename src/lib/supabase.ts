import { createClient } from '@supabase/supabase-js'
export const URL = import.meta.env.VITE_SUPABASE_URL as string
export const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
export const supabase = createClient(URL, KEY)
export const money = (n: any) => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const msg = (e: any) => e?.message || String(e)
