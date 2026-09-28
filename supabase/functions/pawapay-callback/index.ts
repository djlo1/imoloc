import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const callback = await req.json()
    console.log('PawaPay callback received:', JSON.stringify(callback))

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const depositId = callback.depositId
    const status = callback.status // COMPLETED | FAILED

    // Mettre a jour la transaction
    const { data: tx } = await supabase
      .from('pawapay_transactions')
      .update({ statut: status, pawapay_status: status, updated_at: new Date().toISOString() })
      .eq('deposit_id', depositId)
      .select()
      .single()

    // Si paiement reussi -> activer l abonnement (repart a 'actif' meme si
    // l abonnement etait en_attente/suspendu — paiement tardif = reactivation)
    if (status === 'COMPLETED' && tx) {
      const periode = tx.periode || 'mensuel'
      const dateDebut = new Date()
      const dateFin = new Date()
      if (periode === 'annuel') dateFin.setFullYear(dateFin.getFullYear() + 1)
      else dateFin.setMonth(dateFin.getMonth() + 1)

      await supabase.from('abonnements').upsert({
        agence_id: tx.agence_id,
        plan: tx.plan_id,
        statut: 'actif',
        date_debut: dateDebut.toISOString().split('T')[0],
        date_fin: dateFin.toISOString().split('T')[0],
        grace_fin: null,
        periode,
        prix_mensuel: tx.amount,
        renouvellement_auto: true,
        reference_paiement: depositId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agence_id' })

      // Sieges Imoloc Manager choisis par l organisation : le total reel
      // (inclus + achete) doit refleter nombre_licences ; on ne stocke dans
      // agence_licences_achetees que la part au-dela de l inclus du palier.
      const { data: plan } = await supabase.from('plans').select('id').eq('code', tx.plan_id).maybeSingle()
      const { data: licenceManager } = await supabase.from('licences').select('id').eq('type', 'imoloc_standard').maybeSingle()
      if (plan?.id && licenceManager?.id) {
        const { data: pl } = await supabase.from('plans_licences').select('licences_incluses')
          .eq('plan_id', plan.id).eq('licence_id', licenceManager.id).maybeSingle()
        const inclus = pl?.licences_incluses ?? 0
        const quantite = Math.max(0, (tx.nombre_licences || 0) - inclus)
        await supabase.from('agence_licences_achetees').upsert({
          agence_id: tx.agence_id,
          licence_id: licenceManager.id,
          quantite,
          mis_a_jour_le: new Date().toISOString(),
        }, { onConflict: 'agence_id,licence_id' })
      }

      // Creer la facture
      await supabase.from('factures').insert({
        agence_id: tx.agence_id,
        numero: 'IMO-' + new Date().getFullYear() + '-' + depositId.slice(0, 6).toUpperCase(),
        montant: tx.amount,
        devise: tx.currency,
        statut: 'paye',
        date_paiement: new Date().toISOString(),
        details: { plan: tx.plan_id, methode: 'Mobile Money', operateur: tx.correspondent, phone: tx.phone, nombre_licences: tx.nombre_licences || 0 },
      })

      // Notification
      const { data: agence } = await supabase.from('agences').select('profile_id').eq('id', tx.agence_id).single()
      if (agence?.profile_id) {
        await supabase.from('notifications').insert({
          profile_id: agence.profile_id,
          titre: 'Abonnement active !',
          message: `Votre paiement de ${tx.amount} ${tx.currency} a ete confirme. Abonnement actif.`,
          type: 'success',
          lien: '/agence/abonnement',
        })
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Callback error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
