import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { depositId } = await req.json()

    const PAWAPAY_TOKEN = Deno.env.get('PAWAPAY_API_TOKEN')
    const PAWAPAY_URL = Deno.env.get('PAWAPAY_BASE_URL') || 'https://api.sandbox.pawapay.io'

    const resp = await fetch(`${PAWAPAY_URL}/v2/deposits/${depositId}`, {
      headers: { 'Authorization': `Bearer ${PAWAPAY_TOKEN}` }
    })
    const data = await resp.json()

    // Sync avec notre DB aussi
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    await supabase.from('pawapay_transactions')
      .update({ pawapay_status: data[0]?.status, updated_at: new Date().toISOString() })
      .eq('deposit_id', depositId)

    return new Response(JSON.stringify({ status: data[0]?.status || 'UNKNOWN', raw: data[0] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
