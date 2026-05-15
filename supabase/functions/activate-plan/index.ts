import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { agence_id, plan_id, prix_mensuel, depositId, devise, phone, correspondent, periode } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const dateDebut = new Date()
    const dateFin = new Date()
    dateFin.setMonth(dateFin.getMonth() + (periode === 'an' ? 12 : 1))

    // Upsert abonnement avec service role (bypass RLS)
    const { error: abError } = await supabase.from('abonnements').upsert({
      agence_id,
      plan: plan_id,
      statut: 'actif',
      date_debut: dateDebut.toISOString().split('T')[0],
      date_fin: dateFin.toISOString().split('T')[0],
      prix_mensuel,
      renouvellement_auto: true,
      reference_paiement: depositId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'agence_id' })

    if (abError) {
      console.error('Abonnement error:', JSON.stringify(abError))
      return new Response(JSON.stringify({ success: false, error: abError.message, details: abError }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Creer facture
    await supabase.from('factures').insert({
      agence_id,
      numero: 'IMO-' + new Date().getFullYear() + '-' + depositId.slice(0,6).toUpperCase(),
      montant: prix_mensuel,
      devise: devise || 'XOF',
      statut: 'paye',
      date_paiement: new Date().toISOString(),
      details: { plan: plan_id, periode, operateur: correspondent, phone },
    })

    // Notification
    const { data: ag } = await supabase.from('agences').select('profile_id').eq('id', agence_id).single()
    if (ag?.profile_id) {
      await supabase.from('notifications').insert({
        profile_id: ag.profile_id,
        titre: 'Abonnement active !',
        message: `Votre abonnement ${plan_id} est maintenant actif.`,
        type: 'success',
        lien: '/agence/abonnement',
      })
    }

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
