import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Resout l abonnement de l agence courante, avec le meme pattern deja utilise
// partout ailleurs dans le centre admin (agences.profile_id === utilisateur
// connecte — voir Utilisateurs.jsx, AbonnementPlan.jsx).
export function useAbonnementStatut() {
  const [statut, setStatut] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) { setStatut(null); setLoading(false) }; return }
        const { data: ag } = await supabase.from('agences').select('id').eq('profile_id', user.id).maybeSingle()
        if (!ag?.id) { if (!cancelled) { setStatut(null); setLoading(false) }; return }
        const { data: ab } = await supabase.from('abonnements').select('statut')
          .eq('agence_id', ag.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (!cancelled) { setStatut(ab?.statut || null); setLoading(false) }
      } catch {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return { statut, suspendu: statut === 'suspendu', loading }
}

// Verifie l acces de l utilisateur CONNECTE a une application payante donnee
// (code de la table applications, ex. 'imoloc_manager') : bloque si
// l abonnement de l agence est suspendu, OU si l utilisateur n a lui-meme
// aucune licence active couvrant cette application (le proprietaire de
// l agence garde toujours un acces complet, comme le reste de l app le
// suppose deja — voir lib/permissions.js, agences.profile_id === userId).
export function useAppAccess(appCode) {
  const [state, setState] = useState({ loading: true, allowed: true, reason: null })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) setState({ loading: false, allowed: true, reason: null }); return }

        const { data: ag } = await supabase.from('agences').select('id').eq('profile_id', user.id).maybeSingle()
        const isOwner = !!ag?.id
        let agenceId = ag?.id || null
        if (!agenceId) {
          const { data: prof } = await supabase.from('profiles').select('cree_par_agence_id').eq('id', user.id).maybeSingle()
          agenceId = prof?.cree_par_agence_id || null
        }

        if (agenceId) {
          const { data: ab } = await supabase.from('abonnements').select('statut')
            .eq('agence_id', agenceId).order('created_at', { ascending: false }).limit(1).maybeSingle()
          if (ab?.statut === 'suspendu') { if (!cancelled) setState({ loading: false, allowed: false, reason: 'suspendu' }); return }
        }

        if (isOwner) { if (!cancelled) setState({ loading: false, allowed: true, reason: null }); return }

        const { data: lu } = await supabase.from('licences_utilisateurs')
          .select('licences(licences_applications(applications(code)))')
          .eq('user_id', user.id).eq('actif', true)
        const codes = new Set()
        ;(lu || []).forEach(r => (r.licences?.licences_applications || []).forEach(la => {
          if (la.applications?.code) codes.add(la.applications.code)
        }))
        const allowed = codes.has(appCode)
        if (!cancelled) setState({ loading: false, allowed, reason: allowed ? null : 'sans_licence' })
      } catch {
        if (!cancelled) setState({ loading: false, allowed: true, reason: null })
      }
    })()
    return () => { cancelled = true }
  }, [appCode])

  return state
}
