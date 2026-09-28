// La brique invisible du domaine E : "qu'est-ce que cet utilisateur a le
// droit de faire, dans cette organisation ?" — à partir des vraies tables
// (roles, role_permissions, agence_users_roles) plutôt que du champ texte
// agence_users.role, jamais vérifié nulle part (B3).
//
// Règle de bypass : le propriétaire du compte agence (agences.profile_id)
// a un accès total, exactement comme le rôle Administrateur général —
// aucune ligne agence_users_roles n'est nécessaire pour lui, ce qui
// correspond à ce que la RLS (is_my_agence) lui accorde déjà aujourd'hui.
// Un membre d'équipe (agence_users) obtient ses droits par ses rôles
// attribués ; sans ligne agence_users_roles, il n'a aucune permission.
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const EMPTY = { loading: false, isBypass: false, permissions: new Set() }

export async function fetchPermissions(agenceId, userId, agenceProfileId) {
  if (!agenceId || !userId) return { isBypass: false, permissions: new Set() }

  if (agenceProfileId && agenceProfileId === userId) {
    return { isBypass: true, permissions: new Set() }
  }

  const { data: au } = await supabase
    .from('agence_users')
    .select('id')
    .eq('agence_id', agenceId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!au) return { isBypass: false, permissions: new Set() }

  const { data: rows, error } = await supabase
    .from('agence_users_roles')
    .select('roles(est_bypass, role_permissions(portee, permissions(code)))')
    .eq('agence_user_id', au.id)
  if (error) { console.error('fetchPermissions:', error); return { isBypass: false, permissions: new Set() } }

  let isBypass = false
  const permissions = new Set()
  for (const row of rows || []) {
    const role = row.roles
    if (!role) continue
    if (role.est_bypass) isBypass = true
    for (const rp of role.role_permissions || []) {
      if (rp.permissions?.code) permissions.add(rp.permissions.code)
    }
  }
  return { isBypass, permissions }
}

// code = "ressource.action", ex. "biens.creer". isBypass court-circuite tout.
export function canPermission({ isBypass, permissions }, code) {
  return isBypass || permissions.has(code)
}

// Acces reel a une "ressource" (composante d'un produit, ex. "biens",
// "baux" — voir table ressources), premier vrai consommateur du moteur
// ci-dessus. Deux cas, comme chez Microsoft (licence vs role admin) :
// - Ressource d'une application transverse (Imoloc Admin/ID, jamais
//   licenciee) -> gouvernee uniquement par le role (permission "<code>.voir").
// - Ressource d'une application licenciee (Imoloc Manager, ImoField...) ->
//   abonnement actif + licence de l'utilisateur pour cette application, et
//   pas desactivee individuellement (agence_users_ressources_desactivees) —
//   exactement le decoché individuel d'un "plan de service" chez Microsoft.
export function useResourceAccess(ressourceCode) {
  const [state, setState] = useState({ loading: true, allowed: true, reason: null })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) setState({ loading: false, allowed: true, reason: null }); return }

        const { data: ressource } = await supabase.from('ressources')
          .select('id, application:applications(code, est_transverse)')
          .eq('code', ressourceCode).maybeSingle()
        if (!ressource) { if (!cancelled) setState({ loading: false, allowed: true, reason: null }); return }

        const { data: ag } = await supabase.from('agences').select('id, profile_id').eq('profile_id', user.id).maybeSingle()
        const isOwner = !!ag?.id
        let agenceId = ag?.id || null
        let agenceProfileId = ag?.profile_id || null
        if (!agenceId) {
          const { data: prof } = await supabase.from('profiles').select('cree_par_agence_id').eq('id', user.id).maybeSingle()
          agenceId = prof?.cree_par_agence_id || null
          if (agenceId) {
            const { data: agB } = await supabase.from('agences').select('profile_id').eq('id', agenceId).maybeSingle()
            agenceProfileId = agB?.profile_id || null
          }
        }

        if (isOwner) { if (!cancelled) setState({ loading: false, allowed: true, reason: null }); return }

        if (ressource.application?.est_transverse) {
          const res = await fetchPermissions(agenceId, user.id, agenceProfileId)
          const allowed = canPermission(res, `${ressourceCode}.voir`)
          if (!cancelled) setState({ loading: false, allowed, reason: allowed ? null : 'sans_role' })
          return
        }

        if (agenceId) {
          const { data: ab } = await supabase.from('abonnements').select('statut')
            .eq('agence_id', agenceId).order('created_at', { ascending: false }).limit(1).maybeSingle()
          if (ab?.statut === 'suspendu') { if (!cancelled) setState({ loading: false, allowed: false, reason: 'suspendu' }); return }
        }

        const { data: lu } = await supabase.from('licences_utilisateurs')
          .select('licences(licences_applications(applications(code)))')
          .eq('user_id', user.id).eq('actif', true)
        const appCodes = new Set()
        ;(lu || []).forEach(r => (r.licences?.licences_applications || []).forEach(la => {
          if (la.applications?.code) appCodes.add(la.applications.code)
        }))
        if (!appCodes.has(ressource.application?.code)) {
          if (!cancelled) setState({ loading: false, allowed: false, reason: 'sans_licence' })
          return
        }

        const { data: au } = await supabase.from('agence_users').select('id')
          .eq('agence_id', agenceId).eq('user_id', user.id).maybeSingle()
        if (au?.id) {
          const { data: desactivee } = await supabase.from('agence_users_ressources_desactivees')
            .select('ressource_id').eq('agence_user_id', au.id).eq('ressource_id', ressource.id).maybeSingle()
          if (desactivee) { if (!cancelled) setState({ loading: false, allowed: false, reason: 'desactivee' }); return }
        }

        if (!cancelled) setState({ loading: false, allowed: true, reason: null })
      } catch {
        if (!cancelled) setState({ loading: false, allowed: true, reason: null })
      }
    })()
    return () => { cancelled = true }
  }, [ressourceCode])

  return state
}

export function usePermissions(agenceId, userId, agenceProfileId) {
  const [state, setState] = useState({ ...EMPTY, loading: true })

  useEffect(() => {
    let cancelled = false
    if (!agenceId || !userId) { setState({ ...EMPTY, loading: false }); return }
    setState(s => ({ ...s, loading: true }))
    fetchPermissions(agenceId, userId, agenceProfileId).then(res => {
      if (!cancelled) setState({ ...res, loading: false })
    })
    return () => { cancelled = true }
  }, [agenceId, userId, agenceProfileId])

  return { ...state, can: (code) => canPermission(state, code) }
}
