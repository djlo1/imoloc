import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const result = await resp.json()
    console.log('Status response:', JSON.stringify(result))

    // Format v2: { data: { status: "COMPLETED", ... }, status: "FOUND" }
    const depositStatus = result?.data?.status || result?.status || 'UNKNOWN'

    return new Response(JSON.stringify({
      success: true,
      status: depositStatus,
      raw: result?.data
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message, status: 'UNKNOWN' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
