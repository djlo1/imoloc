import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { amount, currency, phone, correspondent, agence_id, plan_id } = await req.json()

    if (!amount || !phone || !correspondent) {
      return new Response(JSON.stringify({ success: false, error: 'Parametres manquants' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const PAWAPAY_TOKEN = Deno.env.get('PAWAPAY_API_TOKEN')
    const PAWAPAY_URL = Deno.env.get('PAWAPAY_BASE_URL') || 'https://api.sandbox.pawapay.io'
    const depositId = crypto.randomUUID()

    const payload = {
      depositId,
      amount: String(amount),
      currency: currency || 'XOF',
      payer: {
        type: 'MMO',
        accountDetails: {
          phoneNumber: String(phone).replace(/\s/g, ''),
          provider: correspondent
        }
      }
    }

    console.log('Calling PawaPay with:', JSON.stringify(payload))

    const pawapayResp = await fetch(`${PAWAPAY_URL}/v2/deposits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAWAPAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const pawapayData = await pawapayResp.json()
    console.log('PawaPay response:', JSON.stringify(pawapayData))

    // Toujours retourner 200 - le frontend gere le statut
    if (pawapayData.status === 'REJECTED' || pawapayData.status === 'FAILED') {
      return new Response(JSON.stringify({
        success: false,
        error: pawapayData.failureReason?.failureMessage || 'Paiement rejete par l operateur',
        code: pawapayData.failureReason?.failureCode,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Sauvegarder en DB si possible
    if (agence_id && agence_id !== 'test') {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        await supabase.from('pawapay_transactions').insert({
          deposit_id: depositId,
          agence_id,
          plan_id,
          amount: parseFloat(amount),
          currency: currency || 'XOF',
          phone: String(phone),
          correspondent,
          statut: 'INITIATED',
          pawapay_status: pawapayData.status,
        })
      } catch(dbErr) {
        console.error('DB save error (non-fatal):', dbErr)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      depositId,
      status: pawapayData.status,
      message: 'Demande envoyee. Approuvez sur votre telephone.',
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Fatal error:', err)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
