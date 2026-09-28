import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Meme cle/expediteur que send-invitation/index.ts (API transactionnelle Brevo).
const BREVO_KEY = Deno.env.get('BREVO_API_KEY') ?? ''
const LOGO = 'https://zecyfnurrcslukxvmpca.supabase.co/storage/v1/object/public/assets-publics/imoloc-icon-email.png'

async function envoyerEmail(email: string, prenom: string, sujet: string, titre: string, message: string, ctaLabel: string, ctaUrl: string) {
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f2f1;font-family:Segoe UI,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f2f1;padding:32px 0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden">
  <tr><td style="padding:24px 40px 0"><img src="${LOGO}" width="40" height="40" alt="Imoloc" style="border-radius:8px"></td></tr>
  <tr><td style="padding:20px 40px 8px"><h1 style="font-size:20px;color:#1a1a1a;margin:0 0 8px">${titre}</h1>
    <p style="font-size:14px;color:#444;line-height:1.6;margin:0">Bonjour ${prenom},</p>
    <p style="font-size:14px;color:#444;line-height:1.6;margin:12px 0 0">${message}</p>
  </td></tr>
  <tr><td style="padding:24px 40px 32px">
    <a href="${ctaUrl}" style="display:inline-block;background:#007BFF;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 24px;border-radius:6px">${ctaLabel}</a>
  </td></tr>
  <tr><td style="background:#f7f7f7;padding:18px 40px">
    <p style="margin:0 0 6px;font-size:11.5px;color:#888">© 2026 Imoloc — DJLOTECH Society · Cotonou, Bénin</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Imoloc', email: 'immolocapps@gmail.com' },
      to: [{ email, name: prenom }],
      subject: sujet,
      htmlContent: html,
    }),
  })
}

serve(async (req) => {
  try {
    const secret = req.headers.get('x-cron-secret')
    if (!secret || secret !== Deno.env.get('CRON_SECRET')) {
      return new Response(JSON.stringify({ error: 'Non autorise' }), { status: 401 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    // A remplacer par le vrai domaine de production une fois disponible.
    const SITE_URL = Deno.env.get('SITE_URL') || 'https://app.imoloc.example'
    const planUrl = `${SITE_URL}/agence/abonnement/plan`

    const today = new Date().toISOString().split('T')[0]
    const results = { relances: 0, suspensions: 0 }

    const { data: licenceManager } = await supabase.from('licences').select('id').eq('type', 'imoloc_standard').maybeSingle()

    // 1) Essais termines -> demande de paiement pour le nombre de licences choisi + delai de grace de 15 jours
    const { data: essaisExpires } = await supabase
      .from('abonnements')
      .select('id, agence_id, plan_id, periode')
      .eq('statut', 'essai')
      .lte('date_fin', today)

    for (const ab of essaisExpires || []) {
      const { data: plan } = await supabase.from('plans')
        .select('nom, prix_mensuel, prix_mensuel_annuel, cout_utilisateur_supplementaire')
        .eq('id', ab.plan_id).maybeSingle()

      let montant = ab.periode === 'annuel' ? (plan?.prix_mensuel_annuel || 0) * 12 : (plan?.prix_mensuel || 0)
      if (licenceManager?.id) {
        const { data: achetee } = await supabase.from('agence_licences_achetees')
          .select('quantite').eq('agence_id', ab.agence_id).eq('licence_id', licenceManager.id).maybeSingle()
        montant += (achetee?.quantite || 0) * (plan?.cout_utilisateur_supplementaire || 0)
      }

      const graceFin = new Date()
      graceFin.setDate(graceFin.getDate() + 15)
      const graceFinStr = graceFin.toISOString().split('T')[0]

      await supabase.from('abonnements').update({
        statut: 'en_attente', grace_fin: graceFinStr, updated_at: new Date().toISOString(),
      }).eq('id', ab.id)

      const { data: agence } = await supabase.from('agences').select('profile_id').eq('id', ab.agence_id).single()
      if (agence?.profile_id) {
        const { data: profil } = await supabase.from('profiles').select('email, prenom').eq('id', agence.profile_id).maybeSingle()
        const graceFinFr = graceFin.toLocaleDateString('fr-FR')
        await supabase.from('notifications').insert({
          profile_id: agence.profile_id,
          titre: 'Votre essai gratuit est termine',
          message: `Reglez ${montant.toLocaleString('fr-FR')} FCFA avant le ${graceFinFr} pour garder votre abonnement ${plan?.nom || ''} actif.`,
          type: 'warning',
          lien: '/agence/abonnement/plan',
        })
        if (profil?.email) {
          await envoyerEmail(
            profil.email, profil.prenom || '',
            'Votre essai gratuit Imoloc est termine',
            'Votre essai gratuit est termine',
            `Reglez <strong>${montant.toLocaleString('fr-FR')} FCFA</strong> avant le <strong>${graceFinFr}</strong> pour garder votre abonnement Imoloc ${plan?.nom || ''} actif. Passe ce delai, l acces aux applications payantes sera suspendu (Imoloc Admin restera accessible).`,
            'Payer maintenant', planUrl
          )
        }
      }
      results.relances++
    }

    // 2) Delai de grace depasse sans paiement -> suspension
    const { data: enAttenteDepasses } = await supabase
      .from('abonnements')
      .select('id, agence_id')
      .eq('statut', 'en_attente')
      .lte('grace_fin', today)

    for (const ab of enAttenteDepasses || []) {
      await supabase.from('abonnements').update({
        statut: 'suspendu', updated_at: new Date().toISOString(),
      }).eq('id', ab.id)

      const { data: agence } = await supabase.from('agences').select('profile_id').eq('id', ab.agence_id).single()
      if (agence?.profile_id) {
        const { data: profil } = await supabase.from('profiles').select('email, prenom').eq('id', agence.profile_id).maybeSingle()
        await supabase.from('notifications').insert({
          profile_id: agence.profile_id,
          titre: 'Abonnement suspendu',
          message: 'Faute de paiement, l acces aux applications payantes est suspendu. Imoloc Admin reste accessible pour regulariser.',
          type: 'error',
          lien: '/agence/abonnement/plan',
        })
        if (profil?.email) {
          await envoyerEmail(
            profil.email, profil.prenom || '',
            'Votre abonnement Imoloc est suspendu',
            'Abonnement suspendu',
            'Faute de paiement recu dans le delai de grace, l acces aux applications payantes (Imoloc Manager, ImoField, Imo Assist, Imoloc Insights, Loci AI, ImoConnect) a ete suspendu. Imoloc Admin reste pleinement accessible pour regulariser votre situation.',
            'Regulariser maintenant', planUrl
          )
        }
      }
      results.suspensions++
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('abonnements-cycle error:', err)
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 })
  }
})
