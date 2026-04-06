import { createClient } from '@supabase/supabase-js'

// Debes configurar estas variables de entorno en el archivo .env alojado en el root del directorio
// VITE_SUPABASE_URL=tu_url_de_supabase
// VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
