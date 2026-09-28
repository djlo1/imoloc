import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, ChevronUp, ArrowLeft, ArrowRight, Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { passwordRuleMet, passwordStrength, generatePassword } from '../../../lib/password'
import { useAbonnementStatut } from '../../../lib/abonnement'
import toast from 'react-hot-toast'

// Reproduit l'assistant "Ajouter un utilisateur" du vrai Centre d'administration
// M365 (vérifié en direct, étape par étape, sur le tenant de référence) : un
// panneau latéral qui laisse la liste visible à gauche (pas de fond sombre
// plein écran), 4 étapes identiques, mêmes champs, même ordre, mêmes libellés
// — mais avec les vraies données Imoloc (licences/rôles/applications du
// catalogue réel, colonnes réelles de profiles/agence_users). Deux
// adaptations délibérées faute d'équivalent Imoloc : pas de couple
// "nom d'utilisateur + domaine" (Imoloc n'a pas de domaines internes comme un
// tenant M365) — on garde l'adresse email réelle de la personne, déjà
// détectée par fournisseur ; et le rôle Imoloc reste une notion unique
// (fonction + permission, ex. Agent/Comptable/Lecteur) au lieu d'être scindé
// en "utilisateur / accès admin" comme chez Microsoft, où un rôle ne sert
// qu'à l'accès aux centres d'administration.
const STEPS = [
  { id:1, label:'Informations de base' },
  { id:2, label:'Licences de produits' },
  { id:3, label:'Paramètres facultatifs' },
  { id:4, label:'Terminer' },
]

const PAYS_LISTE = ['Bénin','Togo','Côte d\'Ivoire','Sénégal','Cameroun','Mali','Niger','France','Belgique']

// "Sélectionner un lieu" (étape Licences) — comme chez M365, une licence peut
// être attribuée à un utilisateur de n'importe quel pays, pas seulement ceux
// couverts par les opérations actuelles d'Imoloc ; liste mondiale complète,
// contrairement au champ "Pays" du profil (étape Paramètres facultatifs) qui
// garde la liste courte déjà utilisée ailleurs dans l'app.
const PAYS_MONDE = ['Afghanistan','Afrique du Sud','Albanie','Algérie','Allemagne','Andorre','Angola','Anguilla','Antarctique','Antigua-et-Barbuda','Antilles néerlandaises (anciennement)','Arabie saoudite','Argentine','Arménie','Aruba','Australie','Autorité palestinienne','Autriche','Azerbaïdjan','Bahamas','Bahreïn','Bangladesh','Barbade','Bélarus','Belgique','Belize','Bénin','Bermudes','Bhoutan','Bolivie','Bosnie-Herzégovine','Botswana','Brésil','Brunéi Darussalam','Bulgarie','Burkina Faso','Burundi','Cambodge','Cameroun','Canada','Cap-Vert','Chili','Chine','Chypre','Colombie','Comores','Congo','Congo (RDC)','Corée du Sud','Costa Rica','Côte d\'Ivoire','Croatie','Cuba','Danemark','Djibouti','Dominique','Égypte','Émirats arabes unis','Équateur','Érythrée','Espagne','Estonie','Eswatini','États-Unis','Éthiopie','Fidji','Finlande','France','Gabon','Gambie','Géorgie','Ghana','Gibraltar','Grèce','Grenade','Groenland','Guadeloupe','Guam','Guatemala','Guernesey','Guinée','Guinée équatoriale','Guinée-Bissau','Guyana','Guyane française','Haïti','Honduras','Hong Kong RAS','Hongrie','Île de Man','Île Norfolk','Îles Åland','Îles Caïmans','Îles Cook','Îles Féroé','Îles Malouines','Îles Mariannes du Nord','Îles Marshall','Îles Salomon','Îles Turques-et-Caïques','Îles Vierges britanniques','Îles Vierges des États-Unis','Inde','Indonésie','Irak','Iran','Irlande','Islande','Israël','Italie','Jamaïque','Japon','Jersey','Jordanie','Kazakhstan','Kenya','Kirghizistan','Kiribati','Koweït','Laos','Lesotho','Lettonie','Liban','Liberia','Libye','Liechtenstein','Lituanie','Luxembourg','Macao RAS','Macédoine du Nord','Madagascar','Malaisie','Malawi','Maldives','Mali','Malte','Maroc','Martinique','Maurice','Mauritanie','Mayotte','Mexique','Micronésie','Moldova','Monaco','Mongolie','Monténégro','Mozambique','Myanmar (Birmanie)','Namibie','Nauru','Népal','Nicaragua','Niger','Nigéria','Niue','Norvège','Nouvelle-Calédonie','Nouvelle-Zélande','Oman','Ouganda','Ouzbékistan','Pakistan','Palaos','Panama','Papouasie-Nouvelle-Guinée','Paraguay','Pays-Bas','Pérou','Philippines','Pologne','Polynésie française','Porto Rico','Portugal','Qatar','République centrafricaine','République dominicaine','République tchèque','Réunion','Roumanie','Royaume-Uni','Russie','Rwanda','Sahara occidental','Saint-Kitts-et-Nevis','Saint-Marin','Saint-Vincent-et-les-Grenadines','Sainte-Hélène','Sainte-Lucie','Salvador','Samoa','Samoa américaines','Sao Tomé-et-Principe','Sénégal','Serbie','Seychelles','Sierra Leone','Singapour','Slovaquie','Slovénie','Somalie','Soudan','Soudan du Sud','Sri Lanka','Suède','Suisse','Suriname','Syrie','Tadjikistan','Taïwan','Tanzanie','Tchad','Thaïlande','Timor oriental','Togo','Tonga','Trinité-et-Tobago','Tunisie','Turkménistan','Turquie','Tuvalu','Ukraine','Uruguay','Vanuatu','Vatican','Venezuela','Vietnam','Yémen','Zambie','Zimbabwe']

function SectionHeader({ title, open, onToggle, count, required, divider }) {
  return (
    <div className={`au-collapse-head ${divider ? 'au-collapse-head-divider' : ''}`} onClick={onToggle}>
      <span>{title}{count != null && ` (${count})`}{required && <span className="au-required">*</span>}</span>
      {open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
    </div>
  )
}

export default function AddUserModal({ onClose, agenceName='Mon organisation', agenceId=null }) {
  const { suspendu } = useAbonnementStatut()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [nomCompletTouched, setNomCompletTouched] = useState(false)
  // Vérifie l'unicité de l'email sur TOUTE la plateforme (pas seulement
  // l'agence courante) via la fonction check-email-available, avec un léger
  // délai après la frappe pour ne pas interroger le serveur à chaque touche.
  const [emailCheck, setEmailCheck] = useState({ status:'idle', message:'' }) // idle | checking | available | taken | error
  const emailCheckTimer = useRef(null)

  const [form, setForm] = useState({
    prenom:'', nom:'', nom_complet:'', email:'',
    auto_password:true, password:'', force_change:true,
    licences:[], no_licence:false,
    ressources_desactivees:[],
    roles:[],
    poste:'', departement:'', telephone:'', telephone2:'',
    rue:'', quartier:'', ville:'', pays:'Bénin',
  })

  const [licencesData, setLicencesData] = useState([])
  const [rolesData, setRolesData] = useState([])
  const [licenceCounts, setLicenceCounts] = useState({}) // licence_id -> attribuées (agence)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [licencesOpen, setLicencesOpen] = useState(true)
  const [appsOpen, setAppsOpen] = useState(false)
  const [appsFiltre, setAppsFiltre] = useState('toutes')
  const [rolesOpen, setRolesOpen] = useState(false)
  const [profilOpen, setProfilOpen] = useState(false)

  useEffect(() => {
    (async () => {
      const [{ data:lic, error:licErr }, { data:rl, error:rlErr }, { data:achetees }, { data:abo }] = await Promise.all([
        supabase.from('licences')
          .select('id, type, nom, description, prix_mensuel, max_utilisateurs, licences_applications(applications(code,nom,ressources(id,code,nom,assignable_individuellement)))')
          .eq('actif', true).order('nom'),
        supabase.from('roles')
          .select('id, code, nom, description, type, application:applications(code,nom)')
          .eq('est_systeme', true).order('type').order('nom'),
        agenceId ? supabase.from('agence_licences_achetees').select('licence_id, quantite').eq('agence_id', agenceId) : Promise.resolve({ data: [] }),
        // Vrai palier souscrit par l'agence — sert à aller chercher ensuite,
        // par produit, le nombre de licences incluses gratuitement (plans_licences).
        // Le plan reste resolu meme en_attente/suspendu (sinon le total
        // retombe a tort sur "illimite" faute de plan trouve) — le blocage
        // effectif des licences en cas de suspension est gere separement.
        agenceId ? supabase.from('abonnements').select('plan_id').eq('agence_id', agenceId).in('statut', ['actif','essai','en_attente','suspendu']).order('created_at', { ascending:false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
      ])
      if (licErr) console.error('licences:', licErr)
      if (rlErr) console.error('roles:', rlErr)
      setLicencesData(lic || [])
      setRolesData(rl || [])

      // Décompte réel "X sur Y disponibles" (comme M365) : attribuées =
      // licences_utilisateurs actives de l'agence ; achetées = sièges
      // additionnels réels (agence_licences_achetees) ; inclus = licences
      // gratuites par produit pour le palier souscrit (plans_licences), qui
      // remplace l'ancien champ ambigu plans.quota_utilisateurs_inclus (il ne
      // précisait pas pour quel produit). Total réel = inclus + achetées.
      if (agenceId && lic?.length) {
        const [{ data: attribuees }, { data: planLicences }] = await Promise.all([
          supabase.from('licences_utilisateurs').select('licence_id').eq('agence_id', agenceId).eq('actif', true),
          abo?.plan_id
            ? supabase.from('plans_licences').select('licence_id, licences_incluses').eq('plan_id', abo.plan_id)
            : Promise.resolve({ data: [] }),
        ])
        const counts = {}
        ;(attribuees||[]).forEach(r => { counts[r.licence_id] = (counts[r.licence_id]||0) + 1 })
        const achetéesMap = {}
        ;(achetees||[]).forEach(r => { achetéesMap[r.licence_id] = r.quantite })
        const inclusMap = {}
        ;(planLicences||[]).forEach(r => { inclusMap[r.licence_id] = r.licences_incluses })
        const withTotals = {}
        lic.forEach(l => {
          const attrib = counts[l.id] || 0
          const maxBase = l.id in inclusMap ? inclusMap[l.id] : l.max_utilisateurs
          const total = maxBase != null ? maxBase + (achetéesMap[l.id]||0) : null
          withTotals[l.id] = { attrib, total, disponible: total != null ? Math.max(0, total - attrib) : null }
        })
        setLicenceCounts(withTotals)
      }
      setLoadingCatalog(false)
    })()
  }, [agenceId])

  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const toggleLicence = (id) => setForm(f=>({...f, licences: f.licences.includes(id)?f.licences.filter(l=>l!==id):[...f.licences,id]}))
  const toggleRole = (id) => setForm(f=>({...f, roles: f.roles.includes(id)?f.roles.filter(r=>r!==id):[...f.roles,id]}))
  // Une ressource est cochee (accordee) par defaut — comme un "plan de
  // service" Microsoft inclus dans la licence — decocher l'ajoute a la liste
  // des ressources desactivees pour cet utilisateur.
  const toggleRessource = (id) => setForm(f=>({...f, ressources_desactivees: f.ressources_desactivees.includes(id)?f.ressources_desactivees.filter(r=>r!==id):[...f.ressources_desactivees,id]}))
  const selectAllRessources = (ids, coche) => setForm(f=>({
    ...f,
    ressources_desactivees: coche
      ? f.ressources_desactivees.filter(id => !ids.includes(id))
      : Array.from(new Set([...f.ressources_desactivees, ...ids])),
  }))

  // "Nom complet" — comme M365, pré-rempli à partir de Prénom + Nom mais
  // reste un champ indépendant et modifiable (pas un simple libellé calculé).
  useEffect(() => {
    if (nomCompletTouched) return
    const suggestion = `${form.prenom} ${form.nom}`.trim()
    if (suggestion) set('nom_complet', suggestion)
  }, [form.prenom, form.nom])

  // Unicité de l'email — vérifiée sur toute la plateforme Imoloc (toutes
  // agences confondues), pas seulement l'organisation courante, puisqu'un
  // compte Supabase Auth est unique par email pour toute la base. Débounce
  // de 500ms pour ne pas interroger le serveur à chaque frappe.
  useEffect(() => {
    clearTimeout(emailCheckTimer.current)
    const email = form.email.trim()
    if (!email.includes('@') || !email.includes('.')) { setEmailCheck({ status:'idle', message:'' }); return }
    setEmailCheck({ status:'checking', message:'' })
    emailCheckTimer.current = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('https://zecyfnurrcslukxvmpca.supabase.co/functions/v1/check-email-available', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${session?.access_token||''}` },
          body: JSON.stringify({ email }),
        })
        const data = await res.json()
        if (data.available === true) setEmailCheck({ status:'available', message:'' })
        else if (data.available === false) setEmailCheck({ status:'taken', message:'Cette adresse email est déjà utilisée par un autre compte Imoloc.' })
        else setEmailCheck({ status:'error', message:"Impossible de vérifier cette adresse pour l'instant." })
      } catch {
        setEmailCheck({ status:'error', message:"Impossible de vérifier cette adresse pour l'instant." })
      }
    }, 500)
    return () => clearTimeout(emailCheckTimer.current)
  }, [form.email])

  const selectedLicences = form.no_licence ? [] : licencesData.filter(l => form.licences.includes(l.id))
  const selectedRoles = rolesData.filter(r => form.roles.includes(r.id))
  const derivedApps = (() => {
    const map = new Map()
    selectedLicences.forEach(l => (l.licences_applications||[]).forEach(la => {
      if (la.applications) map.set(la.applications.code, la.applications.nom)
    }))
    return Array.from(map.values())
  })()
  // Composantes par application (façon "plans de service" M365) : toutes les
  // ressources des applications dérivées des licences cochées, regroupées
  // par application pour l'affichage et le filtre "Afficher pour : <licence>".
  const derivedRessourcesByApp = (() => {
    const map = new Map()
    selectedLicences.forEach(l => (l.licences_applications||[]).forEach(la => {
      if (!la.applications) return
      const key = la.applications.code
      if (!map.has(key)) map.set(key, { code: key, nom: la.applications.nom, ressources: [] })
      const entry = map.get(key)
      ;(la.applications.ressources||[]).forEach(r => {
        if (!entry.ressources.some(x => x.id === r.id)) entry.ressources.push(r)
      })
    }))
    return Array.from(map.values())
  })()
  const derivedRessourcesFlat = derivedRessourcesByApp.flatMap(a => a.ressources)
  const rolesByGroup = (() => {
    const groups = {}
    rolesData.forEach(r => {
      const key = r.type === 'transverse' ? 'Transverses' : (r.application?.nom || 'Applicatif')
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    })
    return groups
  })()

  const strength = passwordStrength(form.password)
  const canNext = () => {
    if (step===1) return form.prenom.trim() && form.nom.trim() && form.nom_complet.trim()
      && form.email.includes('@') && emailCheck.status!=='taken' && emailCheck.status!=='checking'
      && (form.auto_password || passwordRuleMet(form.password))
    if (step===2) return form.no_licence || form.licences.length>0
    return true
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      // Le mot de passe est généré ici, au moment réel de la création — c'est
      // cette valeur, jamais une autre, qui part dans l'email d'invitation
      // (voir l'appel à send-invitation plus bas).
      const finalPassword = form.auto_password ? generatePassword() : form.password
      const primaryRoleCode = selectedRoles[0]?.code || 'agent'
      const roleLabel = selectedRoles.map(r => r.nom).join(', ') || 'Agent'
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      const { data: inv, error: invError } = await supabase
        .from('invitations')
        .insert({
          agence_id: agenceId,
          email: form.email,
          prenom: form.prenom,
          nom: form.nom,
          role: roleLabel,
          password_temp: finalPassword,
          force_change_password: form.force_change,
          poste: form.poste,
          departement: form.departement,
          statut: 'en_attente',
        })
        .select()
        .single()
      if (invError) throw invError

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: finalPassword,
        options: { data: { prenom: form.prenom, nom: form.nom, role: primaryRoleCode } }
      })
      if (signUpError && !signUpError.message.includes('already registered')) throw signUpError

      await supabase.from('invitations').update({ statut: 'envoyée' }).eq('id', inv.id)

      if (signUpData?.user?.id) {
        const newUserId = signUpData.user.id
        await supabase.from('profiles').update({
          prenom: form.prenom, nom: form.nom,
          telephone: form.telephone, telephone2: form.telephone2,
          rue: form.rue, quartier: form.quartier, ville: form.ville, pays: form.pays,
          poste: form.poste, departement: form.departement,
          role: primaryRoleCode,
          // Rend la case "Demander à modifier le mot de passe" ci-dessus
          // réellement effective : lu par PrivateRoute à chaque connexion,
          // qui redirige vers /changer-mot-de-passe tant que c'est vrai.
          doit_changer_mot_de_passe: form.force_change,
        }).eq('id', newUserId)

        if (agenceId) {
          const { data: au, error: auError } = await supabase.from('agence_users').insert({
            agence_id: agenceId, user_id: newUserId, role: primaryRoleCode,
            poste: form.poste, departement: form.departement,
          }).select().single()
          if (auError) throw auError

          if (au?.id && selectedRoles.length) {
            const { error: rolesErr } = await supabase.from('agence_users_roles').insert(
              selectedRoles.map(r => ({ agence_user_id: au.id, role_id: r.id, attribue_par: currentUser?.id }))
            )
            if (rolesErr) console.error('agence_users_roles:', rolesErr)
          }
          // Composantes décochées à l'étape "Applications" (façon "plan de
          // service" Microsoft décoché) — n'inclut que celles réellement
          // proposées (assignable_individuellement) pour cet utilisateur.
          const aDesactiver = derivedRessourcesFlat.filter(r => r.assignable_individuellement && form.ressources_desactivees.includes(r.id))
          if (au?.id && aDesactiver.length) {
            const { error: ressErr } = await supabase.from('agence_users_ressources_desactivees').insert(
              aDesactiver.map(r => ({ agence_user_id: au.id, ressource_id: r.id }))
            )
            if (ressErr) console.error('agence_users_ressources_desactivees:', ressErr)
          }
          if (selectedLicences.length) {
            const { error: licErr } = await supabase.from('licences_utilisateurs').insert(
              selectedLicences.map(l => ({ user_id: newUserId, agence_id: agenceId, licence_id: l.id, attribuee_par: currentUser?.id, actif: true }))
            )
            if (licErr) console.error('licences_utilisateurs:', licErr)
          }
        }
      }

      const SUPABASE_URL = 'https://zecyfnurrcslukxvmpca.supabase.co'
      const { data: { session } } = await supabase.auth.getSession()
      // Le changement de mot de passe forcé est appliqué automatiquement à la
      // connexion (PrivateRoute), pas via un paramètre d'URL. L'email est
      // pré-rempli (?email=...) pour que la personne n'ait qu'à saisir le
      // mot de passe déjà affiché juste au-dessus dans ce même message.
      const loginUrl = `${window.location.origin}/login?email=${encodeURIComponent(form.email)}`

      await fetch(`${SUPABASE_URL}/functions/v1/send-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({
          email: form.email, prenom: form.prenom, nom: form.nom,
          agenceName, role: roleLabel, password: finalPassword,
          force_change: form.force_change, loginUrl,
        }),
      })

      toast.success(`Invitation envoyée à ${form.email} !`)
      onClose()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err.message || 'Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  const jumpTo = (n) => setStep(n)

  return (
    <>
      <style>{`
        .au-panel{position:fixed;top:0;right:0;bottom:0;width:80%;max-width:1500px;min-width:0;background:#1b1b1b;display:flex;flex-direction:column;z-index:500;animation:au-slide 0.22s ease;box-shadow:-8px 0 28px rgba(0,0,0,0.4);border-left:1px solid rgba(255,255,255,0.07)}
        @keyframes au-slide{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .au-head{display:flex;align-items:center;justify-content:space-between;padding:20px 32px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .au-head-title{font-size:20px;font-weight:600;color:#fff;letter-spacing:0}
        .au-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:6px;border-radius:6px;display:flex;transition:all 0.1s}
        .au-close:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .au-body{display:flex;flex:1;overflow:hidden}
        .au-steps{width:190px;border-right:1px solid rgba(255,255,255,0.07);padding:24px 0;flex-shrink:0;display:flex;flex-direction:column}
        .au-step{display:flex;align-items:center;gap:14px;padding:11px 22px;cursor:pointer;position:relative}
        .au-step-circle{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;transition:all 0.2s;border:2px solid rgba(255,255,255,0.6)}
        .au-step-circle.done{background:#2c85dd;border-color:#2c85dd;color:#fff}
        .au-step-circle.active{background:#2c85dd;border-color:#2c85dd;color:#fff}
        .au-step-circle.pending{background:transparent;border-color:rgba(255,255,255,0.6);color:#fff}
        .au-step-lbl{font-size:14px;color:#fff}
        .au-step-lbl.active{color:#fff;font-weight:600}
        .au-step-lbl.done{color:#fff}
        .au-step-line{position:absolute;left:33px;top:35px;width:2px;height:calc(100% - 11px);background:rgba(255,255,255,0.07)}
        .au-step-line.done{background:rgba(0,120,212,0.4)}
        .au-content{flex:1;overflow-y:auto;padding:28px 40px}
        .au-content::-webkit-scrollbar{width:4px}
        .au-content::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .au-step-body{max-width:640px}
        .au-content-title{font-size:20px;font-weight:600;color:#fff;margin-bottom:8px;letter-spacing:0}
        .au-content-sub{font-size:14px;color:rgba(255,255,255,0.75);margin-bottom:24px;line-height:1.6}
        .au-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .au-field{margin-bottom:18px}
        .au-field-full{grid-column:1/-1}
        .au-lbl{display:block;font-size:14px;font-weight:600;color:#fff;margin-bottom:6px}
        .au-lbl span{color:#ef4444;margin-left:2px}
        .au-input{width:100%;padding:8px 12px;background:#1b1b1b;border:1px solid rgba(255,255,255,0.7);border-radius:2px;font-family:'Segoe UI','Inter',sans-serif;font-size:14px;color:#fff;outline:none;transition:border-color 0.15s}
        .au-input::placeholder{color:rgba(255,255,255,0.45)}
        .au-input:focus{border-color:#2c85dd;border-width:2px;padding:7px 11px}
        .au-input option{background:#1b1b1b}
        .au-input-wrap{position:relative;display:flex;align-items:center}
        .au-input-wrap .au-input{flex:1}
        .au-input-icon{position:absolute;right:10px;top:0;bottom:0;display:flex;align-items:center;gap:8px;pointer-events:none}
        .au-spin-icon{animation:au-s 0.8s linear infinite}
        .au-eye{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.6);display:flex;align-items:center;padding:2px;pointer-events:auto}
        .au-eye:hover{color:#fff}
        .au-checkbox-row{display:flex;align-items:flex-start;gap:8px;cursor:pointer;margin-bottom:10px}
        .au-checkbox{width:16px;height:16px;border-radius:2px;border:1.5px solid rgba(255,255,255,0.7);background:none;flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
        .au-checkbox.checked{background:#2c85dd;border-color:#2c85dd}
        .au-checkbox-lbl{font-size:14px;color:#fff;line-height:1.4}
        .au-radio-row{display:flex;align-items:flex-start;gap:8px;cursor:pointer;margin-bottom:10px}
        .au-radio{width:16px;height:16px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.7);flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
        .au-radio.on{border-color:#2c85dd}
        .au-radio.on::after{content:'';width:8px;height:8px;border-radius:50%;background:#2c85dd}
        .au-radio-lbl{font-size:14px;color:#fff;font-weight:600}
        .au-radio-sub{font-size:12.5px;color:rgba(255,255,255,0.6);margin-top:2px;line-height:1.5}
        .au-help{font-size:13px;color:rgba(255,255,255,0.6);line-height:1.6;margin-bottom:12px}
        .au-divider{height:1px;background:rgba(255,255,255,0.15);margin:20px 0}
        .au-collapse-head{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.2);cursor:pointer;font-size:14px;font-weight:600;color:#fff;margin-bottom:4px}
        .au-collapse-head-divider{border-top:1px solid rgba(255,255,255,0.15);margin-top:14px;padding-top:14px}
        .au-required{color:#ef4444;margin-left:3px}
        .au-licence-item{display:flex;align-items:center;gap:10px;padding:9px 2px;cursor:pointer}
        .au-licence-item.au-licence-disabled{cursor:not-allowed}
        .au-licence-item.au-licence-disabled .au-checkbox{border-color:rgba(255,255,255,0.25)}
        .au-licence-item.au-licence-disabled .au-licence-name{color:rgba(255,255,255,0.4)}
        .au-licence-item.au-licence-disabled .au-licence-sub{color:rgba(255,255,255,0.3)}
        .au-licence-name{font-size:14px;color:#fff;font-weight:500}
        .au-licence-sub{font-size:12.5px;color:rgba(255,255,255,0.6);margin-top:1px}
        .au-role-item{display:flex;align-items:flex-start;gap:10px;padding:8px 2px;cursor:pointer}
        .au-section-lbl{font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin:16px 0 8px}
        .au-summary-block{margin-bottom:22px}
        .au-summary-title{font-size:14px;font-weight:700;color:#fff;margin-bottom:6px}
        .au-summary-line{font-size:13.5px;color:rgba(255,255,255,0.8);line-height:1.6}
        .au-summary-link{font-size:12.5px;color:#2c85dd;cursor:pointer;margin-top:4px;display:inline-block}
        .au-summary-link:hover{text-decoration:underline}
        .au-warn{display:flex;gap:8px;padding:10px 12px;border-radius:4px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);font-size:12.5px;color:rgba(255,255,255,0.7);line-height:1.5;margin:8px 0}
        .au-foot{padding:16px 32px;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-shrink:0;background:#1b1b1b}
        .au-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 18px;border-radius:2px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Segoe UI','Inter',sans-serif;transition:all 0.15s}
        .au-btn-blue{background:#2c85dd;color:#fff}
        .au-btn-blue:hover:not(:disabled){background:#1c6cc4}
        .au-btn-blue:disabled{opacity:0.4;cursor:not-allowed}
        .au-btn-ghost{background:none;color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.25)}
        .au-btn-ghost:hover{background:rgba(255,255,255,0.06);color:#e6edf3}
        .au-spin{width:14px;height:14px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:au-s 0.6s linear infinite}
        @keyframes au-s{to{transform:rotate(360deg)}}
        @media(max-width:768px){.au-panel{max-width:100%}.au-steps{display:none}.au-grid2{grid-template-columns:1fr}}
      `}</style>

      <div className="au-panel" onClick={e=>e.stopPropagation()}>
        <div className="au-head">
          <div className="au-head-title">Ajouter un utilisateur</div>
          <button className="au-close" onClick={onClose}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="au-body">
          <div className="au-steps">
            {STEPS.map((s,i) => (
              <div key={s.id} style={{position:'relative'}}>
                <div className="au-step" onClick={()=>step>s.id&&jumpTo(s.id)}>
                  <div className={`au-step-circle ${step>s.id?'done':step===s.id?'active':'pending'}`}>
                    {step>s.id?<Check size={12}/>:s.id}
                  </div>
                  <span className={`au-step-lbl ${step===s.id?'active':step>s.id?'done':''}`}>{s.label}</span>
                </div>
                {i<STEPS.length-1&&<div className={`au-step-line ${step>s.id?'done':''}`}/>}
              </div>
            ))}
          </div>

          <div className="au-content">
          <div className="au-step-body">

            {/* ══ ÉTAPE 1 — Informations de base ══ */}
            {step===1 && (
              <>
                <div className="au-content-title">Configurer les éléments de base</div>
                <div className="au-content-sub">Pour commencer, renseignez des informations de base sur la personne que vous ajoutez en tant qu'utilisateur.</div>

                <div className="au-grid2">
                  <div className="au-field"><label className="au-lbl">Prénom</label><input className="au-input" value={form.prenom} onChange={e=>set('prenom',e.target.value)} autoFocus/></div>
                  <div className="au-field"><label className="au-lbl">Nom</label><input className="au-input" value={form.nom} onChange={e=>set('nom',e.target.value)}/></div>
                </div>
                <div className="au-field au-field-full">
                  <label className="au-lbl">Nom complet <span>*</span></label>
                  <input className="au-input" value={form.nom_complet} onChange={e=>{setNomCompletTouched(true);set('nom_complet',e.target.value)}}/>
                </div>
                <div className="au-field au-field-full">
                  <label className="au-lbl">Adresse email <span>*</span></label>
                  <div className="au-input-wrap">
                    <input
                      type="email" className="au-input" value={form.email} onChange={e=>set('email',e.target.value)}
                      placeholder="jean.dupont@gmail.com" style={{paddingRight:36}}
                      aria-invalid={emailCheck.status==='taken'}
                    />
                    <div className="au-input-icon">
                      {emailCheck.status==='checking' && <Loader2 size={15} className="au-spin-icon" color="rgba(255,255,255,0.6)"/>}
                      {emailCheck.status==='available' && <Check size={15} color="#00c896"/>}
                      {emailCheck.status==='taken' && <AlertTriangle size={15} color="#ef4444"/>}
                    </div>
                  </div>
                  {emailCheck.status==='taken' && <div style={{color:'#ef4444',fontSize:12.5,marginTop:6}}>{emailCheck.message}</div>}
                  {emailCheck.status==='error' && <div style={{color:'#f59e0b',fontSize:12.5,marginTop:6}}>{emailCheck.message}</div>}
                </div>

                <div className="au-checkbox-row" onClick={()=>set('auto_password',!form.auto_password)} style={{marginTop:6}}>
                  <div className={`au-checkbox ${form.auto_password?'checked':''}`}>{form.auto_password&&<Check size={10} color="#fff"/>}</div>
                  <span className="au-checkbox-lbl">Créer automatiquement un mot de passe</span>
                </div>

                {!form.auto_password && (
                  <div style={{marginBottom:6}}>
                    <div className="au-help">Les mots de passe doivent comprendre entre 8 et 256 caractères et utiliser une combinaison d'au moins trois des éléments suivants : majuscules, minuscules, chiffres et symboles.</div>
                    <label className="au-lbl">Mot de passe <span>*</span></label>
                    <div className="au-input-wrap">
                      <input type={showPass?'text':'password'} className="au-input" value={form.password} onChange={e=>set('password',e.target.value)} style={{paddingRight:70}}/>
                      <div className="au-input-icon">
                        {strength && <span style={{fontSize:11.5,fontWeight:600,color:strength.color}}>{strength.label}</span>}
                        <button className="au-eye" onClick={()=>setShowPass(v=>!v)}>{showPass?<EyeOff size={15}/>:<Eye size={15}/>}</button>
                      </div>
                    </div>
                    {form.password && !passwordRuleMet(form.password) && (
                      <div style={{color:'#ef4444',fontSize:12.5,marginTop:6}}>Ce mot de passe ne respecte pas encore la règle ci-dessus.</div>
                    )}
                  </div>
                )}

                <div className="au-checkbox-row" onClick={()=>set('force_change',!form.force_change)} style={{marginTop:6}}>
                  <div className={`au-checkbox ${form.force_change?'checked':''}`}>{form.force_change&&<Check size={10} color="#fff"/>}</div>
                  <span className="au-checkbox-lbl">Demander à cet utilisateur de modifier son mot de passe lors de sa première connexion</span>
                </div>
              </>
            )}

            {/* ══ ÉTAPE 2 — Licences de produits ══ */}
            {step===2 && (
              <>
                <div className="au-content-title">Affecter des licences de produits</div>
                <div className="au-content-sub">Affectez les licences souhaitées à cet utilisateur.</div>

                <div className="au-field" style={{maxWidth:320}}>
                  <label className="au-lbl">Sélectionner un lieu <span>*</span></label>
                  <select className="au-input" value={form.pays} onChange={e=>set('pays',e.target.value)}>
                    {PAYS_MONDE.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>

                <SectionHeader title="Licences" count={form.no_licence?0:form.licences.length} required open={licencesOpen} onToggle={()=>setLicencesOpen(v=>!v)}/>
                {licencesOpen && (
                  <div style={{padding:'10px 0'}}>
                    <div className="au-radio-row" onClick={()=>set('no_licence',false)}>
                      <div className={`au-radio ${!form.no_licence?'on':''}`}/>
                      <span className="au-radio-lbl">Attribuer une licence de produit à l'utilisateur</span>
                    </div>
                    {!form.no_licence && (
                      <div style={{paddingLeft:24,marginBottom:6}}>
                        {loadingCatalog && <div style={{fontSize:13,color:'rgba(255,255,255,0.35)'}}>Chargement du catalogue…</div>}
                        {suspendu && <div style={{fontSize:12.5,color:'#ef4444',marginBottom:10}}>Abonnement suspendu — attribution de licences bloquée jusqu'à régularisation.</div>}
                        {licencesData.map(lic => {
                          const c = licenceCounts[lic.id]
                          const epuisee = suspendu || (c?.total != null && c.disponible <= 0)
                          return (
                            <div key={lic.id} className={`au-licence-item ${epuisee?'au-licence-disabled':''}`} onClick={()=>{ if (!epuisee) toggleLicence(lic.id) }}>
                              <div className={`au-checkbox ${form.licences.includes(lic.id)?'checked':''}`}>{form.licences.includes(lic.id)&&<Check size={10} color="#fff"/>}</div>
                              <div>
                                <div className="au-licence-name">{lic.nom}</div>
                                <div className="au-licence-sub">{c?.total != null ? `${c.disponible} licence(s) sur ${c.total} disponible(s)` : 'Nombre illimité de licences disponibles'}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div className="au-radio-row" onClick={()=>set('no_licence',true)} style={{marginTop:8}}>
                      <div className={`au-radio ${form.no_licence?'on':''}`}/>
                      <div>
                        <span className="au-radio-lbl">Créer un utilisateur sans licence de produit (non recommandé)</span>
                        <div className="au-radio-sub">Il est possible que l'accès de l'utilisateur à Imoloc soit limité ou bloqué tant que vous ne lui avez pas attribué de licence.</div>
                      </div>
                    </div>
                  </div>
                )}

                <SectionHeader title="Applications" count={derivedRessourcesFlat.filter(r=>!form.ressources_desactivees.includes(r.id)).length} divider open={appsOpen} onToggle={()=>setAppsOpen(v=>!v)}/>
                {appsOpen && (
                  <div style={{padding:'10px 0'}}>
                    {derivedRessourcesByApp.length===0 ? (
                      <div style={{fontSize:13,color:'rgba(255,255,255,0.35)'}}>Aucune licence sélectionnée : aucune application accessible.</div>
                    ) : (() => {
                      const visibleApps = appsFiltre==='toutes' ? derivedRessourcesByApp : derivedRessourcesByApp.filter(a=>a.code===appsFiltre)
                      const visibleIds = visibleApps.flatMap(a=>a.ressources.filter(r=>r.assignable_individuellement).map(r=>r.id))
                      const allChecked = visibleIds.length>0 && visibleIds.every(id=>!form.ressources_desactivees.includes(id))
                      return (
                        <>
                          <div style={{marginBottom:14}}>
                            <label className="au-lbl">Afficher les applications pour :</label>
                            <select className="au-input" value={appsFiltre} onChange={e=>setAppsFiltre(e.target.value)}>
                              <option value="toutes">Toutes les licences</option>
                              {derivedRessourcesByApp.map(a => <option key={a.code} value={a.code}>{a.nom}</option>)}
                            </select>
                          </div>
                          {visibleIds.length>0 && (
                            <div className="au-checkbox-row" style={{marginBottom:10}} onClick={()=>selectAllRessources(visibleIds, !allChecked)}>
                              <div className={`au-checkbox ${allChecked?'checked':''}`}>{allChecked&&<Check size={10} color="#fff"/>}</div>
                              <span className="au-checkbox-lbl">Sélectionner tout</span>
                            </div>
                          )}
                          {visibleApps.flatMap(app => app.ressources.map(r => {
                            const checked = !form.ressources_desactivees.includes(r.id)
                            const bloque = !r.assignable_individuellement
                            return (
                              <div key={r.id} className={`au-licence-item ${bloque?'au-licence-disabled':''}`} onClick={()=>{ if(!bloque) toggleRessource(r.id) }}>
                                <div className={`au-checkbox ${checked?'checked':''}`}>{checked&&<Check size={10} color="#fff"/>}</div>
                                <div>
                                  <div className="au-licence-name">{r.nom}</div>
                                  <div className="au-licence-sub">{app.nom}{bloque?" — Cette application est attribuée au niveau de l'organisation. Elle ne peut pas être attribuée individuellement.":''}</div>
                                </div>
                              </div>
                            )
                          }))}
                        </>
                      )
                    })()}
                    <div style={{marginTop:10,fontSize:12,color:'rgba(255,255,255,0.35)'}}>Imoloc ID et Imoloc Admin sont toujours accessibles, quelle que soit la licence.</div>
                  </div>
                )}
              </>
            )}

            {/* ══ ÉTAPE 3 — Paramètres facultatifs ══ */}
            {step===3 && (
              <>
                <div className="au-content-title">Paramètres facultatifs</div>
                <div className="au-content-sub">Vous pouvez choisir le rôle à affecter à cet utilisateur et renseigner les autres informations du profil.</div>

                <SectionHeader title={`Rôle${selectedRoles.length?` (${selectedRoles.map(r=>r.nom).join(', ')})`:' (Aucun)'}`} open={rolesOpen} onToggle={()=>setRolesOpen(v=>!v)}/>
                {rolesOpen && (
                  <div style={{padding:'10px 0',maxHeight:320,overflowY:'auto'}}>
                    {Object.entries(rolesByGroup).map(([groupe, roles]) => (
                      <div key={groupe}>
                        <div className="au-section-lbl">{groupe}</div>
                        {roles.map(role => (
                          <div key={role.id} className="au-role-item" onClick={()=>toggleRole(role.id)}>
                            <div className={`au-checkbox ${form.roles.includes(role.id)?'checked':''}`} style={{marginTop:2}}>{form.roles.includes(role.id)&&<Check size={10} color="#fff"/>}</div>
                            <div>
                              <div className="au-licence-name">{role.nom}</div>
                              {role.description && <div className="au-licence-sub">{role.description}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    {!loadingCatalog && rolesData.length===0 && <div style={{fontSize:13,color:'rgba(255,255,255,0.35)'}}>Aucun rôle disponible.</div>}
                  </div>
                )}

                <SectionHeader title="Informations de profil" divider open={profilOpen} onToggle={()=>setProfilOpen(v=>!v)}/>
                {profilOpen && (
                  <div style={{padding:'14px 0'}}>
                    <div className="au-field"><label className="au-lbl">Poste</label><input className="au-input" value={form.poste} onChange={e=>set('poste',e.target.value)} placeholder="Agent immobilier"/></div>
                    <div className="au-field"><label className="au-lbl">Service</label><input className="au-input" value={form.departement} onChange={e=>set('departement',e.target.value)} placeholder="Gestion locative"/></div>
                    <div className="au-grid2">
                      <div className="au-field"><label className="au-lbl">Téléphone</label><input className="au-input" value={form.telephone} onChange={e=>set('telephone',e.target.value)} placeholder="+229 00 00 00 00"/></div>
                      <div className="au-field"><label className="au-lbl">Téléphone secondaire</label><input className="au-input" value={form.telephone2} onChange={e=>set('telephone2',e.target.value)}/></div>
                    </div>
                    <div className="au-field au-field-full"><label className="au-lbl">Adresse</label><input className="au-input" value={form.rue} onChange={e=>set('rue',e.target.value)} placeholder="Rue, avenue..."/></div>
                    <div className="au-grid2">
                      <div className="au-field"><label className="au-lbl">Quartier</label><input className="au-input" value={form.quartier} onChange={e=>set('quartier',e.target.value)}/></div>
                      <div className="au-field"><label className="au-lbl">Ville</label><input className="au-input" value={form.ville} onChange={e=>set('ville',e.target.value)}/></div>
                    </div>
                    <div className="au-field" style={{maxWidth:320}}>
                      <label className="au-lbl">Pays</label>
                      <select className="au-input" value={form.pays} onChange={e=>set('pays',e.target.value)}>{PAYS_LISTE.map(p=><option key={p}>{p}</option>)}</select>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ══ ÉTAPE 4 — Terminer ══ */}
            {step===4 && (
              <>
                <div className="au-content-title">Examiner et finaliser</div>
                <div className="au-content-sub">Passez en revue les informations et paramètres de cet utilisateur avant de finaliser son ajout.</div>

                <div className="au-summary-block">
                  <div className="au-summary-title">Nom complet et adresse email</div>
                  <div className="au-summary-line">{form.nom_complet || '—'}</div>
                  <div className="au-summary-line">{form.email || '—'}</div>
                  <span className="au-summary-link" onClick={()=>jumpTo(1)}>Modifier</span>
                </div>

                <div className="au-summary-block">
                  <div className="au-summary-title">Mot de passe</div>
                  <div className="au-summary-line">Type : {form.auto_password ? 'Généré automatiquement' : 'Défini manuellement'}</div>
                  <span className="au-summary-link" onClick={()=>jumpTo(1)}>Modifier</span>
                </div>

                <div className="au-summary-block">
                  <div className="au-summary-title">Licences de produits</div>
                  <div className="au-summary-line">Emplacement : {form.pays}</div>
                  <div className="au-summary-line">Licences : {form.no_licence ? 'Aucune' : (selectedLicences.map(l=>l.nom).join(', ') || 'Aucune')}</div>
                  <div className="au-summary-line">Applications : {derivedApps.length} application{derivedApps.length>1?'s':''}</div>
                  <span className="au-summary-link" onClick={()=>jumpTo(2)}>Modifier</span>
                </div>

                <div className="au-summary-block">
                  <div className="au-summary-title">Rôle</div>
                  {selectedRoles.length===0 ? (
                    <div className="au-warn"><AlertTriangle size={14} style={{flexShrink:0,marginTop:1}}/> Aucun rôle sélectionné : cet utilisateur n'aura qu'un accès standard, sans droit d'administration.</div>
                  ) : (
                    <div className="au-summary-line">{selectedRoles.map(r=>r.nom).join(', ')}</div>
                  )}
                  <span className="au-summary-link" onClick={()=>jumpTo(3)}>Modifier</span>
                </div>

                <div className="au-summary-block">
                  <div className="au-summary-title">Informations de profil</div>
                  <div className="au-summary-line">{[form.poste, form.departement].filter(Boolean).join(' · ') || '—'}</div>
                  <span className="au-summary-link" onClick={()=>jumpTo(3)}>Modifier</span>
                </div>
              </>
            )}
          </div>
          </div>
        </div>

        <div className="au-foot">
          <button className="au-btn au-btn-ghost" style={{display:'inline-flex',alignItems:'center',gap:6}} onClick={()=>step>1?setStep(step-1):onClose()}>
            {step===1?'Annuler':<><ArrowLeft size={14}/> Précédent</>}
          </button>
          {step<STEPS.length ? (
            <button className="au-btn au-btn-blue" style={{display:'inline-flex',alignItems:'center',gap:6}} disabled={!canNext()} onClick={()=>setStep(step+1)}>Suivant <ArrowRight size={14}/></button>
          ) : (
            <button className="au-btn au-btn-blue" style={{display:'inline-flex',alignItems:'center',gap:6}} disabled={saving} onClick={handleFinish}>
              {saving?<><span className="au-spin"/>Ajout en cours…</>:<>Fin de l'ajout</>}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
