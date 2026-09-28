import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Panneau "Réinitialiser le mot de passe" de la page Utilisateurs actifs
// (reproduction du flux M365 : auto-génération ou saisie manuelle, mot de
// passe révélé une fois à l'admin). auth.admin.updateUserById exige la clé
// service_role, qui ne doit jamais quitter le serveur — d'où cette fonction
// plutôt qu'un appel direct depuis Utilisateurs.jsx.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function genererMotDePasseTemporaire() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let mdp = ''
  for (let i = 0; i < 12; i++) mdp += alphabet[Math.floor(Math.random() * alphabet.length)]
  return mdp
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await anonClient.auth.getUser()
    if (!caller) return json({ success: false, error: 'Non authentifié' })

    const { target_user_id, new_password, auto_generate, notify } = await req.json()
    if (!target_user_id) return json({ success: false, error: 'target_user_id requis' })

    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    // Retrouve l'agence de la cible : soit elle est propriétaire (agences.profile_id),
    // soit elle est membre (agence_users.user_id) — même modèle que src/lib/permissions.js.
    let agenceId: string | null = null
    const { data: agenceOwned } = await admin.from('agences').select('id').eq('profile_id', target_user_id).maybeSingle()
    if (agenceOwned) {
      agenceId = agenceOwned.id
    } else {
      const { data: targetAu } = await admin.from('agence_users').select('agence_id').eq('user_id', target_user_id).maybeSingle()
      if (targetAu) agenceId = targetAu.agence_id
    }
    if (!agenceId) return json({ success: false, error: 'Utilisateur introuvable' })

    const { data: agence } = await admin.from('agences').select('profile_id').eq('id', agenceId).single()
    let authorized = agence?.profile_id === caller.id
    if (!authorized) {
      const { data: callerAu } = await admin.from('agence_users').select('id').eq('agence_id', agenceId).eq('user_id', caller.id).maybeSingle()
      if (callerAu) {
        const { data: rows } = await admin.from('agence_users_roles')
          .select('roles(est_bypass, role_permissions(permissions(code)))')
          .eq('agence_user_id', callerAu.id)
        for (const row of rows || []) {
          const role = (row as { roles: { est_bypass: boolean; role_permissions: { permissions: { code: string } }[] } }).roles
          if (!role) continue
          if (role.est_bypass) { authorized = true; break }
          if ((role.role_permissions || []).some((rp) => rp.permissions?.code === 'utilisateurs.reinitialiser_mdp')) { authorized = true; break }
        }
      }
    }
    if (!authorized) return json({ success: false, error: "Vous n'avez pas la permission de réinitialiser ce mot de passe" })

    const password = auto_generate ? genererMotDePasseTemporaire() : new_password
    if (!password || password.length < 8) return json({ success: false, error: 'Mot de passe invalide (8 caractères minimum)' })

    const { error } = await admin.auth.admin.updateUserById(target_user_id, { password })
    if (error) return json({ success: false, error: error.message })

    // Rend la case "Demander à cet utilisateur de modifier son mot de passe
    // lors de sa première connexion" réellement effective : lue par
    // PrivateRoute à chaque connexion, qui redirige vers
    // /changer-mot-de-passe tant que c'est vrai. Auparavant envoyée au
    // serveur (paramètre "notify") mais jamais lue ni appliquée nulle part.
    await admin.from('profiles').update({ doit_changer_mot_de_passe: !!notify }).eq('id', target_user_id)

    return json({ success: true, password })
  } catch (e) {
    return json({ success: false, error: String(e) })
  }
})
