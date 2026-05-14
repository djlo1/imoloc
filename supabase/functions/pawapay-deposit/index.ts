import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { amount, currency, phone, correspondent, agence_id, plan_id, description } = await req.json()

    if (!amount || !phone || !correspondent || !agence_id) {
      return new Response(JSON.stringify({ error: 'Parametres manquants' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const PAWAPAY_TOKEN = Deno.env.get('PAWAPAY_API_TOKEN')
    const PAWAPAY_URL = Deno.env.get('PAWAPAY_BASE_URL') || 'https://api.sandbox.pawapay.io'

    // Generer un ID unique pour ce depot
    const depositId = crypto.randomUUID()

    // Appel API PawaPay
    const payload = {
      depositId,
      amount: String(amount),
      currency: currency || 'XOF',
      correspondent,
      payer: {
        type: 'MSISDN',
        address: { value: phone }
      },
      customerTimestamp: new Date().toISOString(),
      statementDescription: description || 'Abonnement Imoloc',
    }

    const pawapayResp = await fetch(`${PAWAPAY_URL}/v2/deposits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAWAPAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const pawapayData = await pawapayResp.json()

    if (!pawapayResp.ok) {
      console.error('PawaPay error:', pawapayData)
      return new Response(JSON.stringify({ error: 'Erreur PawaPay', details: pawapayData }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Sauvegarder la transaction en DB
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabase.from('pawapay_transactions').upsert({
      deposit_id: depositId,
      agence_id,
      plan_id,
      amount: parseFloat(amount),
      currency: currency || 'XOF',
      phone,
      correspondent,
      statut: 'INITIATED',
      pawapay_status: pawapayData.status,
      created_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({
      depositId,
      status: pawapayData.status,
      message: 'Demande de paiement envoyee. Approuvez sur votre telephone.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
