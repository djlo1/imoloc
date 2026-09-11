import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cree un compte de connexion pour un locataire deja saisi dans imoloc, afin
// qu'il puisse acceder au portail locataire (paiement Mobile Money, plaintes,
// documents). Le bouton "Creer un compte" du formulaire d'ajout de locataire
// appelait auparavant supabase.auth.admin.createUser(...) directement depuis
// le navigateur — cette API n'existe que cote serveur (cle service_role),
// l'appel etait donc silencieusement un no-op (Locataires.jsx:170).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function genererMotDePasseTemporaire() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let mdp = ''
  for (let i = 0; i < 12; i++) mdp += alphabet[Math.floor(Math.random() * alphabet.length)]
  return mdp
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
    const { data: { user } } = await anonClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Non authentifie' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { locataire_id } = await req.json()
    if (!locataire_id) {
      return new Response(JSON.stringify({ success: false, error: 'locataire_id requis' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Le locataire doit appartenir a une agence dont l'appelant est le
    // proprietaire du compte — meme verification que create-trial.
    const { data: locataire } = await admin.from('locataires').select('id, nom, prenom, email, agence_id, user_id').eq('id', locataire_id).single()
    if (!locataire) {
      return new Response(JSON.stringify({ success: false, error: 'Locataire introuvable' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const { data: agence } = await admin.from('agences').select('id, profile_id').eq('id', locataire.agence_id).single()
    if (!agence || agence.profile_id !== user.id) {
      return new Response(JSON.stringify({ success: false, error: 'Acces refuse' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!locataire.email) {
      return new Response(JSON.stringify({ success: false, error: 'Ce locataire n\'a pas d\'adresse email' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (locataire.user_id) {
      return new Response(JSON.stringify({ success: false, error: 'Ce locataire a deja un compte' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const motDePasse = genererMotDePasseTemporaire()

    // role/nom/prenom passes explicitement dans user_metadata : le trigger
    // handle_new_user() retombe sinon sur role='global_admin' par defaut.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: locataire.email,
      password: motDePasse,
      email_confirm: true,
      user_metadata: { role: 'locataire', nom: locataire.nom, prenom: locataire.prenom },
    })
    if (createError) {
      return new Response(JSON.stringify({ success: false, error: createError.message }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    await admin.from('locataires').update({ user_id: created.user.id }).eq('id', locataire_id)

    return new Response(JSON.stringify({ success: true, email: locataire.email, mot_de_passe_temporaire: motDePasse }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
