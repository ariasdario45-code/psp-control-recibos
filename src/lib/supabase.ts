import { createClient } from '@supabase/supabase-js'

// ⚠️ Reemplaza estos valores con tus credenciales reales de Supabase
const supabaseUrl = 'https://fdgslpppevqdufaohyoi.supabase.co'
const supabaseAnonKey = 'sb_publishable_S9kCAS3wZ5KAh0rJaMJk2A_k5T2nl7D'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)