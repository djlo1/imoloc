import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const STEPS = [
  { id:1, label:'Informations de base' },
  { id:2, label:'Licences de produits' },
  { id:3, label:'Applications' },
  { id:4, label:'Paramètres facultatifs' },
  { id:5, label:'Terminer' },
]

const ROLES = [
  { id:'global_admin', label:'Administrateur global', desc:'Accès complet à tous les paramètres.', badge:'', badgeColor:'#ef4444' },
  { id:'user_admin', label:'Administrateur des utilisateurs', desc:'Gère les comptes, mots de passe et licences.', badge:'Élevé', badgeColor:'#f59e0b' },
  { id:'billing_admin', label:'Administrateur de facturation', desc:'Gère abonnements, paiements et factures.', badge:'Élevé', badgeColor:'#f59e0b' },
  { id:'reports_reader', label:'Administrateur des rapports', desc:'Accès aux statistiques. Lecture seule.', badge:'Standard', badgeColor:'#0078d4' },
  { id:'security_admin', label:'Administrateur de sécurité', desc:'Gère politiques de sécurité et alertes.', badge:'Élevé', badgeColor:'#f59e0b' },
  { id:'password_admin', label:'Administrateur des mots de passe', desc:'Peut réinitialiser les mots de passe.', badge:'Standard', badgeColor:'#0078d4' },
  { id:'agent', label:'Agent', desc:'Accès opérationnel selon les permissions accordées.', badge:'Standard', badgeColor:'#0078d4' },
  { id:'comptable', label:'Comptable', desc:'Accès paiements, rapports financiers et exports.', badge:'Standard', badgeColor:'#0078d4' },
  { id:'lecteur', label:'Lecteur', desc:'Lecture seule de toutes les données.', badge:'Limité', badgeColor:'#6c63ff' },
]

const LICENCES = [
  { id:'gestion_biens', label:'Gestion des biens immobiliers', desc:'Ajout, modification et suivi des biens', plan:'Basic', color:'#0078d4' },
  { id:'gestion_locataires', label:'Gestion des locataires', desc:'Profils, historiques et dossiers locataires', plan:'Basic', color:'#0078d4' },
  { id:'paiements', label:'Paiements & Loyers', desc:'Suivi des loyers, reçus et retards', plan:'Basic', color:'#0078d4' },
  { id:'rapports', label:'Rapports & Statistiques', desc:'Tableaux de bord et exports', plan:'Standard', color:'#6c63ff' },
  { id:'baux', label:'Gestion des baux', desc:'Création, renouvellement et résiliation', plan:'Standard', color:'#6c63ff' },
  { id:'signature', label:'Signature électronique', desc:'Signature numérique des contrats', plan:'Standard', color:'#6c63ff' },
  { id:'mobile_money', label:'Paiements Mobile Money', desc:'Intégration MTN MoMo, Moov, Wave', plan:'Standard', color:'#6c63ff' },
  { id:'maintenance', label:'Gestion de la maintenance', desc:'Plaintes, interventions et suivi', plan:'Premium', color:'#f59e0b' },
  { id:'api', label:'API & Intégrations avancées', desc:'Accès API et webhooks', plan:'Premium', color:'#f59e0b' },
]

const APPS = [
  { id:'biens', label:'Biens immobiliers', icon:'🏢' },
  { id:'locataires', label:'Locataires', icon:'👥' },
  { id:'paiements', label:'Paiements', icon:'💳' },
  { id:'baux', label:'Baux', icon:'📄' },
  { id:'rapports', label:'Rapports', icon:'📊' },
  { id:'maintenance', label:'Maintenance', icon:'🔧' },
  { id:'integrations', label:'Intégrations', icon:'🔌' },
  { id:'securite', label:'Sécurité', icon:'🔐' },
]

// Détecter le fournisseur d'email
const detectProvider = (email) => {
  if (!email || !email.includes('@')) return null
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return null
  const providers = {
    'gmail.com': { name:'Gmail', icon:'https://www.google.com/favicon.ico', color:'#EA4335', label:'Google' },
    'googlemail.com': { name:'Gmail', icon:'https://www.google.com/favicon.ico', color:'#EA4335', label:'Google' },
    'outlook.com': { name:'Outlook', icon:'https://outlook.live.com/favicon.ico', color:'#0078D4', label:'Microsoft Outlook' },
    'hotmail.com': { name:'Outlook', icon:'https://outlook.live.com/favicon.ico', color:'#0078D4', label:'Microsoft Outlook' },
    'live.com': { name:'Outlook', icon:'https://outlook.live.com/favicon.ico', color:'#0078D4', label:'Microsoft Outlook' },
    'msn.com': { name:'Outlook', icon:'https://outlook.live.com/favicon.ico', color:'#0078D4', label:'Microsoft' },
    'icloud.com': { name:'iCloud', icon:'https://www.apple.com/favicon.ico', color:'#555', label:'Apple iCloud' },
    'me.com': { name:'iCloud', icon:'https://www.apple.com/favicon.ico', color:'#555', label:'Apple iCloud' },
    'apple.com': { name:'iCloud', icon:'https://www.apple.com/favicon.ico', color:'#555', label:'Apple' },
    'yahoo.com': { name:'Yahoo', icon:'https://yahoo.com/favicon.ico', color:'#6001D2', label:'Yahoo Mail' },
    'yahoo.fr': { name:'Yahoo', icon:'https://yahoo.com/favicon.ico', color:'#6001D2', label:'Yahoo Mail' },
    'protonmail.com': { name:'ProtonMail', icon:'https://proton.me/favicon.ico', color:'#6D4AFF', label:'ProtonMail' },
    'proton.me': { name:'ProtonMail', icon:'https://proton.me/favicon.ico', color:'#6D4AFF', label:'ProtonMail' },
  }
  if (providers[domain]) return providers[domain]
  // Email professionnel avec domaine personnalisé
  if (domain && domain.includes('.')) {
    return { name:'Pro', color:'#00c896', label:`Adresse professionnelle · ${domain}`, isPro: true }
  }
  return null
}

const generatePassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
  return Array.from({length: 12}, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function AddUserModal({ onClose, agenceName='Mon organisation', agenceId=null }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [generatedPass, setGeneratedPass] = useState('')
  const [showPass, setShowPass] = useState(false)

  const [form, setForm] = useState({
    prenom:'', nom:'', email:'',
    auto_password:true, password:'', force_change:true,
    licences:['gestion_biens','gestion_locataires','paiements'],
    no_licence:false,
    apps:['biens','locataires','paiements'],
    role:'agent',
    poste:'', departement:'', manager:'',
    telephone:'', email_secondaire:'', adresse:'',
    pays:'Bénin', langue:'Français', groupes:'',
  })

  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const toggleLicence = (id) => setForm(f=>({...f, licences: f.licences.includes(id)?f.licences.filter(l=>l!==id):[...f.licences,id]}))
  const toggleApp = (id) => setForm(f=>({...f, apps: f.apps.includes(id)?f.apps.filter(a=>a!==id):[...f.apps,id]}))

  const provider = detectProvider(form.email)
  const canNext = () => {
    if (step===1) return form.prenom.trim() && form.nom.trim() && form.email.includes('@')
    return true
  }

  const handleGeneratePass = () => {
    const p = generatePassword()
    setGeneratedPass(p)
    set('password', p)
    setShowPass(true)
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      const finalPassword = form.auto_password ? (generatedPass || generatePassword()) : form.password

      // 1. Créer l'invitation en base
      const { data: inv, error: invError } = await supabase
        .from('invitations')
        .insert({
          agence_id: agenceId,
          email: form.email,
          prenom: form.prenom,
          nom: form.nom,
          role: form.role,
          password_temp: finalPassword,
          force_change_password: form.force_change,
          licences: form.no_licence ? [] : form.licences,
          apps: form.apps,
          poste: form.poste,
          departement: form.departement,
          statut: 'en_attente',
        })
        .select()
        .single()

      if (invError) throw invError

      // 2. Créer le compte Supabase
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: finalPassword,
        options: {
          data: { prenom: form.prenom, nom: form.nom, role: form.role }
        }
      })

      if (signUpError && !signUpError.message.includes('already registered')) {
        throw signUpError
      }

      // 3. Mettre à jour statut invitation
      await supabase.from('invitations').update({ statut: 'envoyée' }).eq('id', inv.id)

      // 4. Mettre à jour le profil si compte créé
      if (signUpData?.user?.id) {
        await supabase.from('profiles').update({
          prenom: form.prenom,
          nom: form.nom,
          telephone: form.telephone,
          role: form.role,
        }).eq('id', signUpData.user.id)

        // Associer à l'agence
        if (agenceId) {
          await supabase.from('agence_users').upsert({
            agence_id: agenceId,
            user_id: signUpData.user.id,
            role: form.role,
            poste: form.poste,
            departement: form.departement,
            licences: form.no_licence ? [] : form.licences,
            apps: form.apps,
          })
        }
      }

      // Appeler la Edge Function pour envoyer l'email
      const SUPABASE_URL = 'https://zecyfnurrcslukxvmpca.supabase.co'
      const { data: { session } } = await supabase.auth.getSession()
      const siteUrl = window.location.origin
      const loginUrl = `${siteUrl}/premiere-connexion?email=${encodeURIComponent(form.email)}&force=${form.force_change}`

      await fetch(`${SUPABASE_URL}/functions/v1/send-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          email: form.email,
          prenom: form.prenom,
          nom: form.nom,
          agenceName: agenceName,
          role: ROLES.find(r => r.id === form.role)?.label || form.role,
          password: finalPassword,
          force_change: form.force_change,
          loginUrl,
        }),
      })

      toast.success(`✅ Invitation envoyée à ${form.email} !`)
      onClose()
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err.message || 'Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <style>{`
        .au-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:500;display:flex;align-items:stretch;justify-content:flex-end;backdrop-filter:blur(6px)}
        .au-panel{width:100%;max-width:860px;background:#161b22;display:flex;flex-direction:column;animation:au-slide 0.25s ease;overflow:hidden}
        @keyframes au-slide{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .au-head{display:flex;align-items:center;justify-content:space-between;padding:22px 32px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .au-head-title{font-size:22px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em}
        .au-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:6px;border-radius:6px;display:flex;transition:all 0.1s}
        .au-close:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .au-body{display:flex;flex:1;overflow:hidden}
        .au-steps{width:210px;border-right:1px solid rgba(255,255,255,0.07);padding:24px 0;flex-shrink:0;display:flex;flex-direction:column}
        .au-step{display:flex;align-items:center;gap:14px;padding:11px 22px;cursor:pointer;position:relative}
        .au-step-circle{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;transition:all 0.2s;border:2px solid rgba(255,255,255,0.12)}
        .au-step-circle.done{background:#0078d4;border-color:#0078d4;color:#fff}
        .au-step-circle.active{background:#0078d4;border-color:#0078d4;color:#fff;box-shadow:0 0 12px rgba(0,120,212,0.4)}
        .au-step-circle.pending{background:transparent;border-color:rgba(255,255,255,0.12);color:rgba(255,255,255,0.3)}
        .au-step-lbl{font-size:13px;color:rgba(255,255,255,0.4)}
        .au-step-lbl.active{color:#e6edf3;font-weight:600}
        .au-step-lbl.done{color:rgba(255,255,255,0.55)}
        .au-step-line{position:absolute;left:35px;top:37px;width:2px;height:calc(100% - 11px);background:rgba(255,255,255,0.07)}
        .au-step-line.done{background:rgba(0,120,212,0.4)}
        .au-content{flex:1;overflow-y:auto;padding:28px 32px}
        .au-content::-webkit-scrollbar{width:4px}
        .au-content::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .au-content-title{font-size:20px;font-weight:700;color:#e6edf3;margin-bottom:6px;letter-spacing:-0.02em}
        .au-content-sub{font-size:13.5px;color:rgba(255,255,255,0.4);margin-bottom:24px;line-height:1.65}
        .au-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .au-field{margin-bottom:16px}
        .au-field-full{grid-column:1/-1}
        .au-lbl{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,0.45);margin-bottom:6px;letter-spacing:0.03em}
        .au-lbl span{color:#ef4444;margin-left:2px}
        .au-input{width:100%;padding:9px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s}
        .au-input:focus{border-color:#0078d4;background:rgba(255,255,255,0.07)}
        .au-input option{background:#1c2434}
        .au-input-wrap{position:relative}
        .au-input-icon{position:absolute;right:12px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:6px;pointer-events:none}
        .au-provider-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:100px;font-size:12px;font-weight:500;margin-top:7px}
        .au-eye{position:absolute;right:40px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);display:flex;padding:2px}
        .au-eye:hover{color:rgba(255,255,255,0.7)}
        .au-copy{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);display:flex;padding:4px}
        .au-copy:hover{color:rgba(255,255,255,0.7)}
        .au-pass-actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
        .au-pass-btn{padding:7px 14px;border-radius:5px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.55);font-family:'Inter',sans-serif;transition:all 0.15s;display:flex;align-items:center;gap:6px}
        .au-pass-btn:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .au-pass-btn.blue{background:rgba(0,120,212,0.12);border-color:rgba(0,120,212,0.25);color:#4da6ff}
        .au-pass-btn.blue:hover{background:rgba(0,120,212,0.2)}
        .au-pass-strength{height:4px;border-radius:100px;margin-top:8px;transition:all 0.3s;background:rgba(255,255,255,0.06)}
        .au-pass-strength-fill{height:100%;border-radius:100px;transition:width 0.3s}
        .au-checkbox-wrap{display:flex;align-items:flex-start;gap:10px;padding:11px 14px;border-radius:6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);margin-bottom:10px;cursor:pointer;transition:background 0.1s}
        .au-checkbox-wrap:hover{background:rgba(255,255,255,0.05)}
        .au-checkbox{width:16px;height:16px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.3);background:none;flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
        .au-checkbox.checked{background:#0078d4;border-color:#0078d4}
        .au-checkbox-lbl{font-size:13.5px;color:rgba(255,255,255,0.7);line-height:1.5}
        .au-checkbox-sub{font-size:12px;color:rgba(255,255,255,0.3);margin-top:2px}
        .au-section{font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:rgba(0,120,212,0.7);margin:20px 0 10px;display:flex;align-items:center;gap:10px}
        .au-section::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.06)}
        .au-licence-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border:1px solid rgba(255,255,255,0.07);border-radius:6px;margin-bottom:7px;cursor:pointer;transition:all 0.15s}
        .au-licence-item:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.03)}
        .au-licence-item.selected{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.06)}
        .au-licence-check{width:17px;height:17px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s}
        .au-licence-check.on{background:#0078d4;border-color:#0078d4}
        .au-plan-badge{padding:2px 8px;border-radius:100px;font-size:10px;font-weight:700;margin-left:auto;flex-shrink:0}
        .au-apps-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .au-app-item{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 8px;border:1px solid rgba(255,255,255,0.07);border-radius:8px;cursor:pointer;transition:all 0.15s;position:relative}
        .au-app-item:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.03)}
        .au-app-item.selected{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.06)}
        .au-app-icon{font-size:22px}
        .au-app-name{font-size:11.5px;color:rgba(255,255,255,0.6);text-align:center;font-weight:500}
        .au-app-check{position:absolute;top:5px;right:5px;width:15px;height:15px;border-radius:50%;background:#0078d4;display:flex;align-items:center;justify-content:center}
        .au-role-item{display:flex;align-items:flex-start;gap:12px;padding:11px 14px;border:1px solid rgba(255,255,255,0.07);border-radius:6px;margin-bottom:7px;cursor:pointer;transition:all 0.15s}
        .au-role-item:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.03)}
        .au-role-item.selected{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.06)}
        .au-role-radio{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.2);flex-shrink:0;margin-top:3px;transition:all 0.15s;display:flex;align-items:center;justify-content:center}
        .au-role-radio.on{border-color:#0078d4}
        .au-role-radio.on::after{content:'';width:7px;height:7px;border-radius:50%;background:#0078d4}
        .au-summary{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:18px;margin-bottom:14px}
        .au-summary-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13.5px}
        .au-summary-row:last-child{border-bottom:none}
        .au-summary-key{color:rgba(255,255,255,0.4);font-weight:500}
        .au-summary-val{color:#e6edf3;font-weight:500;text-align:right;max-width:60%}
        .au-info-box{display:flex;align-items:flex-start;gap:10px;padding:11px 14px;border-radius:6px;background:rgba(0,120,212,0.08);border:1px solid rgba(0,120,212,0.2);margin-bottom:18px;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.55}
        .au-email-preview{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:8px;overflow:hidden;margin-top:14px}
        .au-email-preview-head{padding:12px 16px;background:rgba(0,120,212,0.08);border-bottom:1px solid rgba(255,255,255,0.07);font-size:12px;color:rgba(255,255,255,0.4);display:flex;align-items:center;gap:8px}
        .au-email-preview-body{padding:20px;font-size:13px;color:rgba(255,255,255,0.55);line-height:1.7}
        .au-email-link{display:inline-block;padding:10px 22px;border-radius:6px;background:#0078d4;color:#fff;font-size:13.5px;font-weight:600;text-decoration:none;margin:14px 0}
        .au-foot{padding:16px 32px;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#161b22}
        .au-foot-left{font-size:13px;color:rgba(255,255,255,0.3)}
        .au-foot-btns{display:flex;gap:10px}
        .au-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 20px;border-radius:4px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .au-btn-blue{background:#0078d4;color:#fff}
        .au-btn-blue:hover:not(:disabled){background:#006cc1}
        .au-btn-blue:disabled{opacity:0.5;cursor:not-allowed}
        .au-btn-ghost{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}
        .au-btn-ghost:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .au-spin{width:14px;height:14px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:au-s 0.6s linear infinite}
        @keyframes au-s{to{transform:rotate(360deg)}}
        .au-success-ring{width:56px;height:56px;border-radius:50%;background:rgba(0,200,150,0.12);border:2px solid rgba(0,200,150,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 18px}
        @media(max-width:768px){.au-panel{max-width:100%}.au-steps{display:none}.au-apps-grid{grid-template-columns:repeat(2,1fr)}.au-grid2{grid-template-columns:1fr}}
      `}</style>

      <div className="au-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="au-panel">

          <div className="au-head">
            <div className="au-head-title">Ajouter un utilisateur</div>
            <button className="au-close" onClick={onClose}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="au-body">
            {/* Steps sidebar */}
            <div className="au-steps">
              {STEPS.map((s,i) => (
                <div key={s.id} style={{position:'relative'}}>
                  <div className="au-step" onClick={()=>step>s.id&&setStep(s.id)}>
                    <div className={`au-step-circle ${step>s.id?'done':step===s.id?'active':'pending'}`}>
                      {step>s.id?<svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>:s.id}
                    </div>
                    <span className={`au-step-lbl ${step===s.id?'active':step>s.id?'done':''}`}>{s.label}</span>
                  </div>
                  {i<STEPS.length-1&&<div className={`au-step-line ${step>s.id?'done':''}`}/>}
                </div>
              ))}
            </div>

            <div className="au-content">

              {/* ══ ÉTAPE 1 ══ */}
              {step===1 && (
                <>
                  <div className="au-content-title">Configurer les éléments de base</div>
                  <div className="au-content-sub">Renseignez les informations de la personne que vous ajoutez à votre organisation.</div>

                  <div className="au-grid2">
                    <div className="au-field">
                      <label className="au-lbl">Prénom <span>*</span></label>
                      <input className="au-input" value={form.prenom} onChange={e=>set('prenom',e.target.value)} placeholder="Jean" autoFocus/>
                    </div>
                    <div className="au-field">
                      <label className="au-lbl">Nom <span>*</span></label>
                      <input className="au-input" value={form.nom} onChange={e=>set('nom',e.target.value)} placeholder="Dupont"/>
                    </div>

                    {/* Email avec détection provider */}
                    <div className="au-field au-field-full">
                      <label className="au-lbl">Adresse email <span>*</span></label>
                      <div className="au-input-wrap">
                        <input
                          type="email"
                          className="au-input"
                          value={form.email}
                          onChange={e=>set('email',e.target.value)}
                          placeholder="jean.dupont@gmail.com"
                          style={{paddingRight: provider ? '140px' : '12px'}}
                        />
                        {provider && (
                          <div className="au-input-icon">
                            <span style={{fontSize:11,color:provider.color,fontWeight:600,background:`${provider.color}18`,padding:'3px 10px',borderRadius:'100px',border:`1px solid ${provider.color}30`,whiteSpace:'nowrap'}}>
                              {provider.isPro ? '🏢 Pro' : provider.label}
                            </span>
                          </div>
                        )}
                      </div>
                      {provider && (
                        <div className="au-provider-badge" style={{background:`${provider.color}12`,color:provider.color,border:`1px solid ${provider.color}25`}}>
                          {provider.isPro
                            ? <>🏢 <strong>Adresse professionnelle</strong> · Le compte sera associé au domaine {form.email.split('@')[1]}</>
                            : <>✓ <strong>{provider.label}</strong> détecté · Connexion possible via ce fournisseur</>
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{height:'1px',background:'rgba(255,255,255,0.07)',margin:'4px 0 20px'}}/>

                  {/* Mot de passe */}
                  <div className="au-field-full">
                    <label className="au-lbl">Mot de passe</label>

                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                      {/* Option auto */}
                      <div
                        className={`au-checkbox-wrap ${form.auto_password?'':'opacity-50'}`}
                        style={{border:`1.5px solid ${form.auto_password?'rgba(0,120,212,0.4)':'rgba(255,255,255,0.07)'}`,background:form.auto_password?'rgba(0,120,212,0.06)':'rgba(255,255,255,0.02)'}}
                        onClick={()=>set('auto_password',true)}>
                        <div className={`au-checkbox ${form.auto_password?'checked':''}`}>{form.auto_password&&<svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}</div>
                        <div>
                          <div className="au-checkbox-lbl" style={{fontSize:13}}>Générer automatiquement</div>
                          <div className="au-checkbox-sub">Mot de passe aléatoire sécurisé</div>
                        </div>
                      </div>
                      {/* Option manuelle */}
                      <div
                        className="au-checkbox-wrap"
                        style={{border:`1.5px solid ${!form.auto_password?'rgba(0,120,212,0.4)':'rgba(255,255,255,0.07)'}`,background:!form.auto_password?'rgba(0,120,212,0.06)':'rgba(255,255,255,0.02)'}}
                        onClick={()=>set('auto_password',false)}>
                        <div className={`au-checkbox ${!form.auto_password?'checked':''}`}>{!form.auto_password&&<svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}</div>
                        <div>
                          <div className="au-checkbox-lbl" style={{fontSize:13}}>Définir manuellement</div>
                          <div className="au-checkbox-sub">Choisir un mot de passe personnalisé</div>
                        </div>
                      </div>
                    </div>

                    {form.auto_password ? (
                      <div>
                        <div style={{position:'relative'}}>
                          <input
                            type={showPass?'text':'password'}
                            className="au-input"
                            value={form.password || generatedPass}
                            readOnly
                            placeholder="Cliquez sur Générer →"
                            style={{paddingRight:80,fontFamily:form.password?'monospace':'Inter',letterSpacing:form.password?'0.05em':'normal',color:form.password?'#00c896':'rgba(255,255,255,0.3)'}}
                          />
                          {form.password && <>
                            <button className="au-eye" onClick={()=>setShowPass(v=>!v)} style={{right:36}}>
                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            </button>
                            <button className="au-copy" onClick={()=>{navigator.clipboard.writeText(form.password);toast.success('Copié !')}}>
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/></svg>
                            </button>
                          </>}
                        </div>
                        <div className="au-pass-actions">
                          <button className="au-pass-btn blue" onClick={handleGeneratePass}>
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
                            Générer un mot de passe
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{position:'relative'}}>
                        <input
                          type={showPass?'text':'password'}
                          className="au-input"
                          value={form.password}
                          onChange={e=>set('password',e.target.value)}
                          placeholder="Minimum 8 caractères..."
                          style={{paddingRight:44}}
                        />
                        <button className="au-eye" onClick={()=>setShowPass(v=>!v)} style={{right:10}}>
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </button>
                        {form.password && (
                          <div className="au-pass-strength">
                            <div className="au-pass-strength-fill" style={{
                              width: form.password.length<6?'20%':form.password.length<8?'45%':form.password.length<10?'65%':'90%',
                              background: form.password.length<6?'#ef4444':form.password.length<8?'#f59e0b':form.password.length<10?'#0078d4':'#00c896'
                            }}/>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{marginTop:14}}>
                    <div className="au-checkbox-wrap" onClick={()=>set('force_change',!form.force_change)}>
                      <div className={`au-checkbox ${form.force_change?'checked':''}`}>{form.force_change&&<svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}</div>
                      <div>
                        <div className="au-checkbox-lbl">Demander à l'utilisateur de modifier son mot de passe à la première connexion</div>
                        <div className="au-checkbox-sub">L'utilisateur sera redirigé vers une page de changement de mot de passe lors de sa première connexion</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ══ ÉTAPE 2 ══ */}
              {step===2 && (
                <>
                  <div className="au-content-title">Licences de produits</div>
                  <div className="au-content-sub">Attribuez des licences pour donner accès aux fonctionnalités selon votre plan.</div>
                  <div className="au-checkbox-wrap" onClick={()=>set('no_licence',!form.no_licence)} style={{marginBottom:18}}>
                    <div className={`au-checkbox ${form.no_licence?'checked':''}`}>{form.no_licence&&<svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}</div>
                    <div><div className="au-checkbox-lbl">Créer un utilisateur sans licence</div><div className="au-checkbox-sub">Accès aux fonctionnalités gratuites uniquement</div></div>
                  </div>
                  {!form.no_licence && ['Basic','Standard','Premium'].map(plan => (
                    <div key={plan}>
                      <div className="au-section">{plan}</div>
                      {LICENCES.filter(l=>l.plan===plan).map(lic => (
                        <div key={lic.id} className={`au-licence-item ${form.licences.includes(lic.id)?'selected':''}`} onClick={()=>toggleLicence(lic.id)}>
                          <div className={`au-licence-check ${form.licences.includes(lic.id)?'on':''}`}>{form.licences.includes(lic.id)&&<svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}</div>
                          <div style={{flex:1}}><div style={{fontSize:13.5,color:'#e6edf3',fontWeight:500,marginBottom:2}}>{lic.label}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>{lic.desc}</div></div>
                          <span className="au-plan-badge" style={{background:`${lic.color}18`,color:lic.color,border:`1px solid ${lic.color}30`}}>{lic.plan}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}

              {/* ══ ÉTAPE 3 ══ */}
              {step===3 && (
                <>
                  <div className="au-content-title">Applications</div>
                  <div className="au-content-sub">Sélectionnez les applications auxquelles cet utilisateur aura accès.</div>
                  <div className="au-apps-grid">
                    {APPS.map(app => (
                      <div key={app.id} className={`au-app-item ${form.apps.includes(app.id)?'selected':''}`} onClick={()=>toggleApp(app.id)}>
                        {form.apps.includes(app.id)&&<div className="au-app-check"><svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg></div>}
                        <div className="au-app-icon">{app.icon}</div>
                        <div className="au-app-name">{app.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
                    <button onClick={()=>set('apps',APPS.map(a=>a.id))} style={{padding:'6px 14px',borderRadius:4,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',color:'rgba(255,255,255,0.55)',fontSize:12.5,cursor:'pointer',fontFamily:'Inter'}}>Tout sélectionner</button>
                    <button onClick={()=>set('apps',[])} style={{padding:'6px 14px',borderRadius:4,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',color:'rgba(255,255,255,0.55)',fontSize:12.5,cursor:'pointer',fontFamily:'Inter'}}>Tout désélectionner</button>
                    <button onClick={()=>set('apps',['biens','locataires'])} style={{padding:'6px 14px',borderRadius:4,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',color:'rgba(255,255,255,0.55)',fontSize:12.5,cursor:'pointer',fontFamily:'Inter'}}>Accès minimal</button>
                  </div>
                </>
              )}

              {/* ══ ÉTAPE 4 ══ */}
              {step===4 && (
                <>
                  <div className="au-content-title">Paramètres facultatifs</div>
                  <div className="au-content-sub">Définissez le rôle et complétez le profil. Modifiable ultérieurement.</div>
                  <div className="au-section" style={{marginTop:0}}>Rôle dans l'organisation</div>
                  <div style={{maxHeight:240,overflowY:'auto',paddingRight:4}}>
                    {ROLES.map(role => (
                      <div key={role.id} className={`au-role-item ${form.role===role.id?'selected':''}`} onClick={()=>set('role',role.id)}>
                        <div className={`au-role-radio ${form.role===role.id?'on':''}`}/>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                            <span style={{fontSize:13.5,color:'#e6edf3',fontWeight:500}}>{role.label}</span>
                            <span style={{padding:'1px 7px',borderRadius:'100px',fontSize:10,fontWeight:700,background:`${role.badgeColor}18`,color:role.badgeColor}}>{role.badge}</span>
                          </div>
                          <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',lineHeight:1.5}}>{role.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="au-section">Informations professionnelles</div>
                  <div className="au-grid2">
                    <div className="au-field"><label className="au-lbl">Poste</label><input className="au-input" value={form.poste} onChange={e=>set('poste',e.target.value)} placeholder="Agent immobilier"/></div>
                    <div className="au-field"><label className="au-lbl">Département</label><input className="au-input" value={form.departement} onChange={e=>set('departement',e.target.value)} placeholder="Gestion locative"/></div>
                    <div className="au-field"><label className="au-lbl">Responsable</label><input className="au-input" value={form.manager} onChange={e=>set('manager',e.target.value)} placeholder="Nom du manager"/></div>
                    <div className="au-field"><label className="au-lbl">Équipe</label><input className="au-input" value={form.groupes} onChange={e=>set('groupes',e.target.value)} placeholder="Agence Cotonou..."/></div>
                  </div>
                  <div className="au-section">Contact</div>
                  <div className="au-grid2">
                    <div className="au-field"><label className="au-lbl">Téléphone</label><input className="au-input" value={form.telephone} onChange={e=>set('telephone',e.target.value)} placeholder="+229 00 00 00 00"/></div>
                    <div className="au-field"><label className="au-lbl">Email secondaire</label><input type="email" className="au-input" value={form.email_secondaire} onChange={e=>set('email_secondaire',e.target.value)}/></div>
                    <div className="au-field au-field-full"><label className="au-lbl">Adresse</label><input className="au-input" value={form.adresse} onChange={e=>set('adresse',e.target.value)} placeholder="Adresse complète"/></div>
                  </div>
                  <div className="au-section">Localisation</div>
                  <div className="au-grid2">
                    <div className="au-field"><label className="au-lbl">Pays</label><select className="au-input" value={form.pays} onChange={e=>set('pays',e.target.value)}>{['Bénin','Togo','Côte d\'Ivoire','Sénégal','Cameroun','Mali','Niger','France','Belgique'].map(p=><option key={p}>{p}</option>)}</select></div>
                    <div className="au-field"><label className="au-lbl">Langue</label><select className="au-input" value={form.langue} onChange={e=>set('langue',e.target.value)}>{['Français','English','Português'].map(l=><option key={l}>{l}</option>)}</select></div>
                  </div>
                </>
              )}

              {/* ══ ÉTAPE 5 ══ */}
              {step===5 && (
                <>
                  <div style={{textAlign:'center',marginBottom:24}}>
                    <div className="au-success-ring">
                      <svg width="26" height="26" fill="none" stroke="#00c896" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <div className="au-content-title" style={{textAlign:'center'}}>Récapitulatif</div>
                    <div className="au-content-sub" style={{textAlign:'center'}}>Vérifiez avant de créer l'utilisateur.</div>
                  </div>

                  <div className="au-summary">
                    <div className="au-section" style={{marginTop:0}}>Identité</div>
                    {[
                      {k:'Nom complet', v:`${form.prenom} ${form.nom}`.trim()||'—'},
                      {k:'Email', v:form.email||'—'},
                      {k:'Mot de passe', v:form.auto_password?'Généré automatiquement':'Défini manuellement'},
                      {k:'Modifier à la 1ʳᵉ connexion', v:form.force_change?'✓ Oui':'Non'},
                    ].map((r,i)=>(
                      <div key={i} className="au-summary-row"><span className="au-summary-key">{r.k}</span><span className="au-summary-val">{r.v}</span></div>
                    ))}
                  </div>

                  <div className="au-summary">
                    <div className="au-section" style={{marginTop:0}}>Accès & Rôle</div>
                    {[
                      {k:'Rôle', v:ROLES.find(r=>r.id===form.role)?.label||'—'},
                      {k:'Licences', v:form.no_licence?'Aucune licence':`${form.licences.length} licence${form.licences.length>1?'s':''}`},
                      {k:'Applications', v:`${form.apps.length} application${form.apps.length>1?'s':''}`},
                      {k:'Poste', v:form.poste||'—'},
                    ].map((r,i)=>(
                      <div key={i} className="au-summary-row"><span className="au-summary-key">{r.k}</span><span className="au-summary-val">{r.v}</span></div>
                    ))}
                  </div>

                  {/* Aperçu de l'email d'invitation */}
                  <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.45)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.07em'}}>Aperçu de l'email d'invitation</div>
                  <div className="au-email-preview">
                    <div className="au-email-preview-head">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                      <span>À : <strong style={{color:'rgba(255,255,255,0.7)'}}>{form.email || 'jean.dupont@gmail.com'}</strong></span>
                      <span style={{marginLeft:'auto'}}>Objet : Votre invitation Imoloc</span>
                    </div>
                    <div className="au-email-preview-body">
                      <div style={{marginBottom:8}}>Bonjour <strong style={{color:'#e6edf3'}}>{form.prenom || 'Prénom'} {form.nom || 'Nom'}</strong>,</div>
                      <div style={{marginBottom:12}}>
                        Vous avez été invité(e) à rejoindre l'organisation <strong style={{color:'#4da6ff'}}>{agenceName}</strong> sur la plateforme <strong style={{color:'#4da6ff'}}>Imoloc</strong>.
                      </div>
                      <div style={{marginBottom:8}}>Vos informations de connexion :</div>
                      <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,padding:'12px 14px',marginBottom:14,fontFamily:'monospace',fontSize:13}}>
                        <div>📧 Email : <span style={{color:'#4da6ff'}}>{form.email || 'jean.dupont@gmail.com'}</span></div>
                        <div>🔐 Mot de passe : <span style={{color:'#00c896'}}>{form.auto_password ? '(généré automatiquement)' : '(défini par l\'administrateur)'}</span></div>
                        <div>🏢 Organisation : <span style={{color:'#e6edf3'}}>{agenceName}</span></div>
                        <div>👤 Rôle : <span style={{color:'#e6edf3'}}>{ROLES.find(r=>r.id===form.role)?.label}</span></div>
                      </div>
                      <div style={{marginBottom:12}}>Cliquez sur le bouton ci-dessous pour accéder à votre espace :</div>
                      <div className="au-email-link" style={{display:'inline-block',cursor:'default'}}>
                        🚀 Accéder à Imoloc
                      </div>
                      {form.force_change && (
                        <div style={{marginTop:10,padding:'10px 12px',borderRadius:6,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',fontSize:12,color:'rgba(255,255,255,0.45)'}}>
                          ⚠️ Vous devrez modifier votre mot de passe lors de votre première connexion.
                        </div>
                      )}
                      <div style={{marginTop:16,fontSize:12,color:'rgba(255,255,255,0.25)',borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:12}}>
                        Ce lien est valable 7 jours. Si vous n'avez pas demandé cette invitation, ignorez cet email.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="au-foot">
            <div className="au-foot-left">Étape {step} sur {STEPS.length}</div>
            <div className="au-foot-btns">
              <button className="au-btn au-btn-ghost" onClick={()=>step>1?setStep(step-1):onClose()}>
                {step===1?'Annuler':'← Précédent'}
              </button>
              {step<STEPS.length ? (
                <button className="au-btn au-btn-blue" disabled={!canNext()} onClick={()=>setStep(step+1)}>Suivant →</button>
              ) : (
                <button className="au-btn au-btn-blue" disabled={saving} onClick={handleFinish}>
                  {saving?<><span className="au-spin"/>Création en cours…</>:'✅ Terminer et envoyer l\'invitation'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
