import { supabase } from './supabase'

export async function creerNotification({ profile_id, titre, message, type = 'info', lien = null }) {
  if (!profile_id) return
  try {
    await supabase.from('notifications').insert({
      profile_id, titre, message, type, lien, lu: false,
      created_at: new Date().toISOString(),
    })
  } catch(e) { console.error('Notification error:', e) }
}

export async function notifierPaiementRecu({ agence_id, montant, devise, bien_nom, locataire_nom }) {
  const { data:users } = await supabase.from('agence_users').select('user_id').eq('agence_id', agence_id)
  const msg = `${locataire_nom || 'Un locataire'} a paye ${Number(montant).toLocaleString('fr-FR')} ${devise || 'FCFA'} pour ${bien_nom || 'un bien'}`
  for (const u of users || []) {
    await creerNotification({ profile_id: u.user_id, titre: 'Paiement recu', message: msg, type: 'success', lien: '/imoloc/paiements' })
  }
}

export async function notifierRetardPaiement({ agence_id, montant, devise, bien_nom, locataire_nom }) {
  const { data:users } = await supabase.from('agence_users').select('user_id').eq('agence_id', agence_id)
  const msg = `Retard de paiement : ${locataire_nom || 'Locataire'} — ${Number(montant).toLocaleString('fr-FR')} ${devise || 'FCFA'} — ${bien_nom || ''}`
  for (const u of users || []) {
    await creerNotification({ profile_id: u.user_id, titre: 'Retard de paiement', message: msg, type: 'warning', lien: '/imoloc/paiements' })
  }
}

export async function notifierBailSigne({ agence_id, bien_nom, locataire_nom }) {
  const { data:users } = await supabase.from('agence_users').select('user_id').eq('agence_id', agence_id)
  const msg = `Le bail de ${locataire_nom || 'un locataire'} pour ${bien_nom || 'un bien'} a ete signe`
  for (const u of users || []) {
    await creerNotification({ profile_id: u.user_id, titre: 'Bail signe', message: msg, type: 'success', lien: '/imoloc/baux' })
  }
}

export async function notifierNouveauTicket({ agence_id, titre_ticket, bien_nom, priorite }) {
  const { data:users } = await supabase.from('agence_users').select('user_id').eq('agence_id', agence_id)
  const msg = `Nouveau ticket ${priorite === 'urgente' ? 'URGENT' : ''} : ${titre_ticket} — ${bien_nom || ''}`
  const type = priorite === 'urgente' ? 'error' : 'warning'
  for (const u of users || []) {
    await creerNotification({ profile_id: u.user_id, titre: 'Nouveau ticket maintenance', message: msg, type, lien: '/imoloc/maintenance' })
  }
}

export async function notifierBailExpirant({ agence_id, bien_nom, locataire_nom, jours }) {
  const { data:users } = await supabase.from('agence_users').select('user_id').eq('agence_id', agence_id)
  const msg = `Le bail de ${locataire_nom || 'un locataire'} pour ${bien_nom || 'un bien'} expire dans ${jours} jours`
  for (const u of users || []) {
    await creerNotification({ profile_id: u.user_id, titre: 'Bail expirant bientot', message: msg, type: jours <= 15 ? 'error' : 'warning', lien: '/imoloc/baux' })
  }
}
