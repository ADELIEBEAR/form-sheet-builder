import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ncvjuwkfjcqktcwyphew.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_bW7m17SD5qnFvgW1dbisUQ_iWONmlaB'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const SUPABASE_URL = supabaseUrl
export const ASSET_BUCKET = 'form-maker-assets'
