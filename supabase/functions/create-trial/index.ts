import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { data: { user } } = await anonClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Non authentifie' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { agence_id, plan, prix_mensuel, prix_annuel, nombre_licences } = await req.json()
    if (!agence_id || !plan) {
      return new Response(JSON.stringify({ success: false, error: 'Parametres manquants' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // L'utilisateur doit etre le proprietaire de l'agence pour laquelle il demande un essai
    const { data: agence } = await supabase.from('agences').select('id, profile_id').eq('id', agence_id).single()
    if (!agence || agence.profile_id !== user.id) {
      return new Response(JSON.stringify({ success: false, error: 'Acces refuse' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const dateDebut = new Date()
    const dateFin = new Date()
    dateFin.setMonth(dateFin.getMonth() + 1)

    const { error: abError } = await supabase.from('abonnements').upsert({
      agence_id,
      plan,
      statut: 'essai',
      date_debut: dateDebut.toISOString().split('T')[0],
      date_fin: dateFin.toISOString().split('T')[0],
      prix_mensuel,
      prix_annuel,
      renouvellement_auto: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'agence_id' })

    if (abError) {
      console.error('Trial abonnement error:', JSON.stringify(abError))
      return new Response(JSON.stringify({ success: false, error: abError.message }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Sieges Imoloc Manager choisis pour l essai : accordes tout de suite,
    // sans paiement (au-dela de l inclus gratuit du palier).
    if (nombre_licences) {
      const { data: planRow } = await supabase.from('plans').select('id').eq('code', plan).maybeSingle()
      const { data: licenceManager } = await supabase.from('licences').select('id').eq('type', 'imoloc_standard').maybeSingle()
      if (planRow?.id && licenceManager?.id) {
        const { data: pl } = await supabase.from('plans_licences').select('licences_incluses')
          .eq('plan_id', planRow.id).eq('licence_id', licenceManager.id).maybeSingle()
        const inclus = pl?.licences_incluses ?? 0
        const quantite = Math.max(0, nombre_licences - inclus)
        await supabase.from('agence_licences_achetees').upsert({
          agence_id,
          licence_id: licenceManager.id,
          quantite,
          mis_a_jour_le: new Date().toISOString(),
        }, { onConflict: 'agence_id,licence_id' })
      }
    }

    await supabase.from('notifications').insert({
      profile_id: user.id,
      titre: 'Essai gratuit active !',
      message: `Votre essai gratuit du plan ${plan} est actif pour 1 mois.`,
      type: 'success',
      lien: '/agence/abonnement',
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
