import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Vérifie qu'une adresse email n'est pas déjà utilisée par un compte —
// dans TOUTE la base Imoloc (toutes les agences), pas seulement celle de
// l'appelant, puisque les emails sont uniques au niveau de l'authentification
// Supabase, partagée par toute la plateforme. Exige la clé service_role pour
// lire au-delà de ce que la RLS laisserait voir à l'appelant sur les autres
// organisations ; ne renvoie qu'un booléen, jamais les données du compte
// trouvé.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await anonClient.auth.getUser()
    if (!caller) return json({ available: null, error: 'Non authentifié' })

    const { email } = await req.json()
    if (!email || typeof email !== 'string') return json({ available: null, error: 'email requis' })

    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', email.trim())
      .limit(1)
      .maybeSingle()
    if (error) return json({ available: null, error: error.message })

    return json({ available: !data })
  } catch (err) {
    return json({ available: null, error: (err as Error).message })
  }
})
