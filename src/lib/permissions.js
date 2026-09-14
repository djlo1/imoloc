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
