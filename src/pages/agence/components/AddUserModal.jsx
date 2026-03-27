import { useState } from 'react'
import toast from 'react-hot-toast'

const STEPS = [
  { id: 1, label: 'Informations de base' },
  { id: 2, label: 'Licences de produits' },
  { id: 3, label: 'Applications' },
  { id: 4, label: 'Paramètres facultatifs' },
  { id: 5, label: 'Terminer' },
]

const ROLES = [
  { id: 'global_admin', label: 'Administrateur global', desc: 'Accès complet à tous les paramètres. Peut créer, modifier et supprimer utilisateurs, licences, rôles et configurations.', badge: 'Critique', badgeColor: '#ef4444' },
  { id: 'user_admin', label: 'Administrateur des utilisateurs', desc: 'Gère les comptes utilisateurs, réinitialise les mots de passe et attribue les licences.', badge: 'Élevé', badgeColor: '#f59e0b' },
  { id: 'billing_admin', label: 'Administrateur de facturation', desc: 'Gère les abonnements, paiements et factures Imoloc.', badge: 'Élevé', badgeColor: '#f59e0b' },
  { id: 'reports_reader', label: 'Administrateur des rapports', desc: 'Accès aux statistiques et rapports. Lecture seule.', badge: 'Standard', badgeColor: '#0078d4' },
  { id: 'app_admin', label: 'Administrateur des applications', desc: 'Gère les applications et permissions dans l\'organisation.', badge: 'Standard', badgeColor: '#0078d4' },
  { id: 'role_admin', label: 'Administrateur des rôles', desc: 'Gère l\'attribution des rôles administrateurs. Très sensible.', badge: 'Critique', badgeColor: '#ef4444' },
  { id: 'security_reader', label: 'Lecteur de sécurité', desc: 'Accès en lecture seule aux informations de sécurité.', badge: 'Limité', badgeColor: '#6c63ff' },
  { id: 'security_admin', label: 'Administrateur de sécurité', desc: 'Gère les politiques de sécurité, alertes et protection.', badge: 'Élevé', badgeColor: '#f59e0b' },
  { id: 'password_admin', label: 'Administrateur des mots de passe', desc: 'Peut réinitialiser les mots de passe des utilisateurs.', badge: 'Standard', badgeColor: '#0078d4' },
  { id: 'agent', label: 'Agent', desc: 'Accès opérationnel aux biens, locataires et paiements selon les permissions accordées.', badge: 'Standard', badgeColor: '#0078d4' },
  { id: 'comptable', label: 'Comptable', desc: 'Accès aux paiements, rapports financiers et exports comptables.', badge: 'Standard', badgeColor: '#0078d4' },
  { id: 'lecteur', label: 'Lecteur', desc: 'Accès en lecture seule à toutes les données de l\'organisation.', badge: 'Limité', badgeColor: '#6c63ff' },
]

const LICENCES = [
  { id: 'gestion_biens', label: 'Gestion des biens immobiliers', desc: 'Ajout, modification et suivi des biens', plan: 'Basic', color: '#0078d4' },
  { id: 'gestion_locataires', label: 'Gestion des locataires', desc: 'Profils, historiques et dossiers locataires', plan: 'Basic', color: '#0078d4' },
  { id: 'paiements', label: 'Paiements & Loyers', desc: 'Suivi des loyers, reçus et retards', plan: 'Basic', color: '#0078d4' },
  { id: 'rapports', label: 'Rapports & Statistiques', desc: 'Tableaux de bord et exports', plan: 'Standard', color: '#6c63ff' },
  { id: 'baux', label: 'Gestion des baux', desc: 'Création, renouvellement et résiliation', plan: 'Standard', color: '#6c63ff' },
  { id: 'signature', label: 'Signature électronique', desc: 'Signature numérique des contrats', plan: 'Standard', color: '#6c63ff' },
  { id: 'mobile_money', label: 'Paiements Mobile Money', desc: 'Intégration MTN MoMo, Moov, Wave', plan: 'Standard', color: '#6c63ff' },
  { id: 'maintenance', label: 'Gestion de la maintenance', desc: 'Plaintes, interventions et suivi', plan: 'Premium', color: '#f59e0b' },
  { id: 'multi_agences', label: 'Multi-agences', desc: 'Gestion de plusieurs agences', plan: 'Premium', color: '#f59e0b' },
  { id: 'api', label: 'API & Intégrations avancées', desc: 'Accès API et webhooks', plan: 'Premium', color: '#f59e0b' },
]

const APPS = [
  { id: 'biens', label: 'Biens immobiliers', icon: '🏢' },
  { id: 'locataires', label: 'Locataires', icon: '👥' },
  { id: 'paiements', label: 'Paiements', icon: '💳' },
  { id: 'baux', label: 'Baux', icon: '📄' },
  { id: 'rapports', label: 'Rapports', icon: '📊' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { id: 'integrations', label: 'Intégrations', icon: '🔌' },
  { id: 'securite', label: 'Sécurité', icon: '🔐' },
]

export default function AddUserModal({ onClose, agenceName = 'Mon organisation' }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    prenom: '', nom: '', nom_complet: '',
    username: '', agence: agenceName,
    password: '', auto_password: true, force_change: true,
    licences: ['gestion_biens', 'gestion_locataires', 'paiements'],
    no_licence: false,
    apps: ['biens', 'locataires', 'paiements'],
    role: 'agent',
    poste: '', departement: '', manager: '',
    telephone: '', email_secondaire: '', adresse: '',
    pays: 'Bénin', langue: 'Français',
    groupes: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleLicence = (id) => {
    setForm(f => ({
      ...f,
      licences: f.licences.includes(id)
        ? f.licences.filter(l => l !== id)
        : [...f.licences, id]
    }))
  }

  const toggleApp = (id) => {
    setForm(f => ({
      ...f,
      apps: f.apps.includes(id)
        ? f.apps.filter(a => a !== id)
        : [...f.apps, id]
    }))
  }

  const canNext = () => {
    if (step === 1) return form.prenom && form.nom && form.username
    return true
  }

  const handleFinish = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1200))
    toast.success(`✅ Utilisateur ${form.prenom} ${form.nom} créé avec succès !`)
    setSaving(false)
    onClose()
  }

  const selectedRole = ROLES.find(r => r.id === form.role)

  return (
    <>
      <style>{`
        .au-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:500;display:flex;align-items:stretch;justify-content:flex-end;backdrop-filter:blur(6px)}
        .au-panel{width:100%;max-width:860px;background:#161b22;display:flex;flex-direction:column;animation:au-slide 0.25s ease;overflow:hidden}
        @keyframes au-slide{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .au-head{display:flex;align-items:center;justify-content:space-between;padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .au-head-title{font-size:22px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em}
        .au-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:6px;border-radius:6px;display:flex;transition:all 0.1s}
        .au-close:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .au-body{display:flex;flex:1;overflow:hidden}

        /* Steps sidebar */
        .au-steps{width:220px;border-right:1px solid rgba(255,255,255,0.07);padding:28px 0;flex-shrink:0;display:flex;flex-direction:column;gap:0}
        .au-step{display:flex;align-items:center;gap:14px;padding:12px 24px;cursor:pointer;transition:background 0.1s;position:relative}
        .au-step:hover .au-step-lbl{color:rgba(255,255,255,0.7)}
        .au-step-circle{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;transition:all 0.2s;border:2px solid rgba(255,255,255,0.15)}
        .au-step-circle.done{background:#0078d4;border-color:#0078d4;color:#fff}
        .au-step-circle.active{background:#0078d4;border-color:#0078d4;color:#fff;box-shadow:0 0 12px rgba(0,120,212,0.4)}
        .au-step-circle.pending{background:transparent;border-color:rgba(255,255,255,0.15);color:rgba(255,255,255,0.3)}
        .au-step-lbl{font-size:13.5px;color:rgba(255,255,255,0.4);font-weight:400;transition:color 0.1s}
        .au-step-lbl.active{color:#e6edf3;font-weight:600}
        .au-step-lbl.done{color:rgba(255,255,255,0.55)}
        .au-step-line{position:absolute;left:37px;top:40px;width:2px;height:calc(100% - 12px);background:rgba(255,255,255,0.07)}
        .au-step-line.done{background:rgba(0,120,212,0.4)}

        /* Content */
        .au-content{flex:1;overflow-y:auto;padding:32px}
        .au-content::-webkit-scrollbar{width:4px}
        .au-content::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .au-content-title{font-size:20px;font-weight:700;color:#e6edf3;margin-bottom:6px;letter-spacing:-0.02em}
        .au-content-sub{font-size:14px;color:rgba(255,255,255,0.4);margin-bottom:28px;line-height:1.6}

        /* Form */
        .au-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .au-field{margin-bottom:18px}
        .au-field-full{grid-column:1/-1}
        .au-lbl{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:7px;letter-spacing:0.03em}
        .au-lbl span{color:#ef4444;margin-left:2px}
        .au-input{width:100%;padding:9px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s}
        .au-input:focus{border-color:#0078d4;background:rgba(255,255,255,0.07)}
        .au-input option{background:#1c2434}
        .au-username-wrap{display:flex;align-items:center;gap:8px}
        .au-at{font-size:16px;color:rgba(255,255,255,0.3);font-weight:600}
        .au-input-select{padding:9px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;font-family:'Inter',sans-serif;font-size:14px;color:rgba(255,255,255,0.6);outline:none;min-width:160px}
        .au-input-select option{background:#1c2434}
        .au-checkbox-wrap{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);margin-bottom:12px;cursor:pointer;transition:background 0.1s}
        .au-checkbox-wrap:hover{background:rgba(255,255,255,0.05)}
        .au-checkbox{width:16px;height:16px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.3);background:none;flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
        .au-checkbox.checked{background:#0078d4;border-color:#0078d4}
        .au-checkbox-lbl{font-size:13.5px;color:rgba(255,255,255,0.7);line-height:1.5}
        .au-checkbox-sub{font-size:12px;color:rgba(255,255,255,0.3);margin-top:2px}

        /* Licences */
        .au-licence-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid rgba(255,255,255,0.07);border-radius:6px;margin-bottom:8px;cursor:pointer;transition:all 0.15s}
        .au-licence-item:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.03)}
        .au-licence-item.selected{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.06)}
        .au-licence-item.disabled{opacity:0.35;cursor:not-allowed}
        .au-licence-check{width:18px;height:18px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s}
        .au-licence-check.on{background:#0078d4;border-color:#0078d4}
        .au-licence-name{font-size:13.5px;color:#e6edf3;font-weight:500;margin-bottom:2px}
        .au-licence-desc{font-size:12px;color:rgba(255,255,255,0.3)}
        .au-plan-badge{padding:2px 8px;border-radius:100px;font-size:10px;font-weight:700;margin-left:auto;flex-shrink:0}

        /* Apps */
        .au-apps-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .au-app-item{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 10px;border:1px solid rgba(255,255,255,0.07);border-radius:8px;cursor:pointer;transition:all 0.15s;position:relative}
        .au-app-item:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.03)}
        .au-app-item.selected{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.06)}
        .au-app-icon{font-size:24px}
        .au-app-name{font-size:12px;color:rgba(255,255,255,0.6);text-align:center;font-weight:500}
        .au-app-check{position:absolute;top:6px;right:6px;width:16px;height:16px;border-radius:50%;background:#0078d4;display:flex;align-items:center;justify-content:center}

        /* Rôles */
        .au-role-item{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border:1px solid rgba(255,255,255,0.07);border-radius:6px;margin-bottom:8px;cursor:pointer;transition:all 0.15s}
        .au-role-item:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.03)}
        .au-role-item.selected{border-color:rgba(0,120,212,0.4);background:rgba(0,120,212,0.06)}
        .au-role-radio{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.2);flex-shrink:0;margin-top:2px;transition:all 0.15s;display:flex;align-items:center;justify-content:center}
        .au-role-radio.on{border-color:#0078d4}
        .au-role-radio.on::after{content:'';width:7px;height:7px;border-radius:50%;background:#0078d4}
        .au-role-name{font-size:13.5px;color:#e6edf3;font-weight:500;margin-bottom:3px}
        .au-role-desc{font-size:12px;color:rgba(255,255,255,0.35);line-height:1.5}

        /* Section */
        .au-section{font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:rgba(0,120,212,0.7);margin:22px 0 12px;display:flex;align-items:center;gap:10px}
        .au-section::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.06)}

        /* Résumé */
        .au-summary{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:20px;margin-bottom:16px}
        .au-summary-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13.5px}
        .au-summary-row:last-child{border-bottom:none}
        .au-summary-key{color:rgba(255,255,255,0.4);font-weight:500}
        .au-summary-val{color:#e6edf3;font-weight:500;text-align:right;max-width:60%}
        .au-success-icon{width:56px;height:56px;border-radius:50%;background:rgba(0,200,150,0.15);border:2px solid rgba(0,200,150,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 20px}

        /* Footer */
        .au-foot{padding:18px 32px;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#161b22}
        .au-foot-left{font-size:13px;color:rgba(255,255,255,0.3)}
        .au-foot-btns{display:flex;gap:10px}
        .au-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 20px;border-radius:4px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .au-btn-blue{background:#0078d4;color:#fff}
        .au-btn-blue:hover:not(:disabled){background:#006cc1}
        .au-btn-blue:disabled{opacity:0.5;cursor:not-allowed}
        .au-btn-ghost{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}
        .au-btn-ghost:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .au-spin{width:14px;height:14px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:au-spin 0.6s linear infinite}
        @keyframes au-spin{to{transform:rotate(360deg)}}

        .au-info-box{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:6px;background:rgba(0,120,212,0.08);border:1px solid rgba(0,120,212,0.2);margin-bottom:20px;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.55}

        @media(max-width:768px){
          .au-panel{max-width:100%}
          .au-steps{display:none}
          .au-apps-grid{grid-template-columns:repeat(2,1fr)}
          .au-grid2{grid-template-columns:1fr}
        }
      `}</style>

      <div className="au-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="au-panel">

          {/* ── En-tête ── */}
          <div className="au-head">
            <div className="au-head-title">Ajouter un utilisateur</div>
            <button className="au-close" onClick={onClose}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* ── Corps ── */}
          <div className="au-body">

            {/* Sidebar des étapes */}
            <div className="au-steps">
              {STEPS.map((s, i) => (
                <div key={s.id} style={{position:'relative'}}>
                  <div className="au-step" onClick={() => step > s.id && setStep(s.id)}>
                    <div className={`au-step-circle ${step > s.id ? 'done' : step === s.id ? 'active' : 'pending'}`}>
                      {step > s.id
                        ? <svg width="13" height="13" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                        : s.id}
                    </div>
                    <span className={`au-step-lbl ${step === s.id ? 'active' : step > s.id ? 'done' : ''}`}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`au-step-line ${step > s.id ? 'done' : ''}`}/>
                  )}
                </div>
              ))}
            </div>

            {/* Contenu */}
            <div className="au-content">

              {/* ══ ÉTAPE 1 ══ */}
              {step === 1 && (
                <>
                  <div className="au-content-title">Configurer les éléments de base</div>
                  <div className="au-content-sub">Renseignez les informations de base sur la personne que vous ajoutez en tant qu'utilisateur.</div>
                  <div className="au-grid2">
                    <div className="au-field">
                      <label className="au-lbl">Prénom</label>
                      <input className="au-input" value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Jean"/>
                    </div>
                    <div className="au-field">
                      <label className="au-lbl">Nom <span>*</span></label>
                      <input className="au-input" value={form.nom} onChange={e => { set('nom', e.target.value); if(!form.nom_complet) set('nom_complet', `${form.prenom} ${e.target.value}`) }} placeholder="Dupont"/>
                    </div>
                    <div className="au-field au-field-full">
                      <label className="au-lbl">Nom complet <span>*</span></label>
                      <input className="au-input" value={form.nom_complet || `${form.prenom} ${form.nom}`.trim()} onChange={e => set('nom_complet', e.target.value)} placeholder="Jean Dupont"/>
                    </div>
                    <div className="au-field au-field-full">
                      <label className="au-lbl">Nom d'utilisateur <span>*</span></label>
                      <div className="au-username-wrap">
                        <input className="au-input" style={{flex:1}} value={form.username} onChange={e => set('username', e.target.value)} placeholder="jean.dupont"/>
                        <span className="au-at">@</span>
                        <select className="au-input-select" value={form.agence} onChange={e => set('agence', e.target.value)}>
                          <option>{agenceName}</option>
                          <option>Agence Cotonou Nord</option>
                          <option>Agence Cotonou Sud</option>
                        </select>
                      </div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,0.3)',marginTop:6}}>
                        Le nom d'utilisateur sera : {form.username || 'jean.dupont'}@{form.agence || agenceName}
                      </div>
                    </div>
                  </div>

                  <div style={{height:'1px',background:'rgba(255,255,255,0.07)',margin:'8px 0 20px'}}/>

                  <div className="au-field">
                    <label className="au-lbl">Mot de passe</label>
                    <div className="au-checkbox-wrap" onClick={() => set('auto_password', !form.auto_password)}>
                      <div className={`au-checkbox ${form.auto_password ? 'checked' : ''}`}>
                        {form.auto_password && <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                      </div>
                      <div>
                        <div className="au-checkbox-lbl">Créer automatiquement un mot de passe</div>
                        <div className="au-checkbox-sub">Un mot de passe sécurisé sera généré automatiquement</div>
                      </div>
                    </div>
                    {!form.auto_password && (
                      <input type="password" className="au-input" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mot de passe sécurisé..." style={{marginTop:8}}/>
                    )}
                  </div>

                  <div className="au-checkbox-wrap" onClick={() => set('force_change', !form.force_change)}>
                    <div className={`au-checkbox ${form.force_change ? 'checked' : ''}`}>
                      {form.force_change && <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                    </div>
                    <div className="au-checkbox-lbl">Demander à cet utilisateur de modifier son mot de passe lors de sa première connexion</div>
                  </div>
                </>
              )}

              {/* ══ ÉTAPE 2 — Licences ══ */}
              {step === 2 && (
                <>
                  <div className="au-content-title">Licences de produits</div>
                  <div className="au-content-sub">Attribuez des licences pour donner accès aux fonctionnalités payantes selon le plan de votre organisation.</div>

                  <div className="au-checkbox-wrap" onClick={() => set('no_licence', !form.no_licence)} style={{marginBottom:20}}>
                    <div className={`au-checkbox ${form.no_licence ? 'checked' : ''}`}>
                      {form.no_licence && <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                    </div>
                    <div>
                      <div className="au-checkbox-lbl">Créer un utilisateur sans licence</div>
                      <div className="au-checkbox-sub">L'utilisateur aura accès uniquement aux fonctionnalités gratuites du plan de base</div>
                    </div>
                  </div>

                  {!form.no_licence && (
                    <>
                      {['Basic','Standard','Premium'].map(plan => (
                        <div key={plan}>
                          <div className="au-section">{plan}</div>
                          {LICENCES.filter(l => l.plan === plan).map(lic => (
                            <div key={lic.id}
                              className={`au-licence-item ${form.licences.includes(lic.id) ? 'selected' : ''}`}
                              onClick={() => toggleLicence(lic.id)}>
                              <div className={`au-licence-check ${form.licences.includes(lic.id) ? 'on' : ''}`}>
                                {form.licences.includes(lic.id) && <svg width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                              </div>
                              <div style={{flex:1}}>
                                <div className="au-licence-name">{lic.label}</div>
                                <div className="au-licence-desc">{lic.desc}</div>
                              </div>
                              <span className="au-plan-badge" style={{background:`${lic.color}18`,color:lic.color,border:`1px solid ${lic.color}30`}}>{lic.plan}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* ══ ÉTAPE 3 — Applications ══ */}
              {step === 3 && (
                <>
                  <div className="au-content-title">Applications</div>
                  <div className="au-content-sub">Sélectionnez les applications et modules auxquels cet utilisateur aura accès dans votre organisation.</div>

                  <div className="au-info-box">
                    <svg width="15" height="15" fill="none" stroke="#4da6ff" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
                    L'accès aux applications dépend également des licences attribuées et du plan de votre organisation.
                  </div>

                  <div className="au-apps-grid">
                    {APPS.map(app => (
                      <div key={app.id}
                        className={`au-app-item ${form.apps.includes(app.id) ? 'selected' : ''}`}
                        onClick={() => toggleApp(app.id)}>
                        {form.apps.includes(app.id) && (
                          <div className="au-app-check">
                            <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                          </div>
                        )}
                        <div className="au-app-icon">{app.icon}</div>
                        <div className="au-app-name">{app.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{marginTop:20}}>
                    <div className="au-section">Sélection rapide</div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {[
                        { label:'Tout sélectionner', action:() => set('apps', APPS.map(a=>a.id)) },
                        { label:'Tout désélectionner', action:() => set('apps', []) },
                        { label:'Accès minimal', action:() => set('apps', ['biens','locataires']) },
                      ].map((btn,i) => (
                        <button key={i} onClick={btn.action}
                          style={{padding:'7px 14px',borderRadius:4,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',color:'rgba(255,255,255,0.6)',fontSize:12.5,cursor:'pointer',fontFamily:'Inter',transition:'all 0.1s'}}
                          onMouseOver={e=>e.target.style.background='rgba(255,255,255,0.09)'}
                          onMouseOut={e=>e.target.style.background='rgba(255,255,255,0.05)'}>
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ══ ÉTAPE 4 — Paramètres facultatifs ══ */}
              {step === 4 && (
                <>
                  <div className="au-content-title">Paramètres facultatifs</div>
                  <div className="au-content-sub">Définissez le rôle et complétez le profil de l'utilisateur. Ces informations peuvent être modifiées ultérieurement.</div>

                  {/* Rôles */}
                  <div className="au-section">Rôle dans l'organisation</div>
                  <div style={{maxHeight:260,overflowY:'auto',marginBottom:4}}>
                    {ROLES.map(role => (
                      <div key={role.id}
                        className={`au-role-item ${form.role === role.id ? 'selected' : ''}`}
                        onClick={() => set('role', role.id)}>
                        <div className={`au-role-radio ${form.role === role.id ? 'on' : ''}`}/>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                            <span className="au-role-name">{role.label}</span>
                            <span style={{padding:'1px 7px',borderRadius:'100px',fontSize:10,fontWeight:700,background:`${role.badgeColor}18`,color:role.badgeColor}}>{role.badge}</span>
                          </div>
                          <div className="au-role-desc">{role.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Infos professionnelles */}
                  <div className="au-section">Informations professionnelles</div>
                  <div className="au-grid2">
                    <div className="au-field">
                      <label className="au-lbl">Poste</label>
                      <input className="au-input" value={form.poste} onChange={e=>set('poste',e.target.value)} placeholder="Agent immobilier"/>
                    </div>
                    <div className="au-field">
                      <label className="au-lbl">Département</label>
                      <input className="au-input" value={form.departement} onChange={e=>set('departement',e.target.value)} placeholder="Gestion locative"/>
                    </div>
                    <div className="au-field">
                      <label className="au-lbl">Responsable (Manager)</label>
                      <input className="au-input" value={form.manager} onChange={e=>set('manager',e.target.value)} placeholder="Nom du responsable"/>
                    </div>
                    <div className="au-field">
                      <label className="au-lbl">Groupes / Équipes</label>
                      <input className="au-input" value={form.groupes} onChange={e=>set('groupes',e.target.value)} placeholder="Agence Cotonou..."/>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="au-section">Contact</div>
                  <div className="au-grid2">
                    <div className="au-field">
                      <label className="au-lbl">Téléphone</label>
                      <input className="au-input" value={form.telephone} onChange={e=>set('telephone',e.target.value)} placeholder="+229 00 00 00 00"/>
                    </div>
                    <div className="au-field">
                      <label className="au-lbl">Email secondaire</label>
                      <input type="email" className="au-input" value={form.email_secondaire} onChange={e=>set('email_secondaire',e.target.value)} placeholder="jean@gmail.com"/>
                    </div>
                    <div className="au-field au-field-full">
                      <label className="au-lbl">Adresse</label>
                      <input className="au-input" value={form.adresse} onChange={e=>set('adresse',e.target.value)} placeholder="Adresse complète"/>
                    </div>
                  </div>

                  {/* Localisation */}
                  <div className="au-section">Localisation & Préférences</div>
                  <div className="au-grid2">
                    <div className="au-field">
                      <label className="au-lbl">Pays</label>
                      <select className="au-input" value={form.pays} onChange={e=>set('pays',e.target.value)}>
                        {['Bénin','Togo','Côte d\'Ivoire','Sénégal','Cameroun','Mali','Niger','Burkina Faso','Ghana','Nigéria','France','Belgique'].map(p=><option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="au-field">
                      <label className="au-lbl">Langue</label>
                      <select className="au-input" value={form.langue} onChange={e=>set('langue',e.target.value)}>
                        {['Français','English','Português'].map(l=><option key={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* ══ ÉTAPE 5 — Résumé / Terminer ══ */}
              {step === 5 && (
                <>
                  <div style={{textAlign:'center',marginBottom:28}}>
                    <div className="au-success-icon">
                      <svg width="28" height="28" fill="none" stroke="#00c896" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div className="au-content-title" style={{textAlign:'center'}}>Récapitulatif</div>
                    <div className="au-content-sub" style={{textAlign:'center',maxWidth:500,margin:'0 auto'}}>
                      Vérifiez les informations avant de créer l'utilisateur. Un email de bienvenue lui sera envoyé.
                    </div>
                  </div>

                  <div className="au-summary">
                    <div className="au-section" style={{marginTop:0}}>Identité</div>
                    {[
                      { k:'Nom complet', v: form.nom_complet || `${form.prenom} ${form.nom}`.trim() || '—' },
                      { k:'Nom d\'utilisateur', v: `${form.username}@${form.agence}` },
                      { k:'Mot de passe', v: form.auto_password ? 'Généré automatiquement' : '••••••••' },
                      { k:'Changer à la connexion', v: form.force_change ? 'Oui' : 'Non' },
                    ].map((r,i) => (
                      <div key={i} className="au-summary-row">
                        <span className="au-summary-key">{r.k}</span>
                        <span className="au-summary-val">{r.v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="au-summary">
                    <div className="au-section" style={{marginTop:0}}>Accès & Rôle</div>
                    {[
                      { k:'Rôle', v: ROLES.find(r=>r.id===form.role)?.label || '—' },
                      { k:'Licences', v: form.no_licence ? 'Aucune licence' : `${form.licences.length} licence${form.licences.length>1?'s':''} attribuée${form.licences.length>1?'s':''}` },
                      { k:'Applications', v: `${form.apps.length} application${form.apps.length>1?'s':''}` },
                      { k:'Poste', v: form.poste || '—' },
                      { k:'Département', v: form.departement || '—' },
                    ].map((r,i) => (
                      <div key={i} className="au-summary-row">
                        <span className="au-summary-key">{r.k}</span>
                        <span className="au-summary-val">{r.v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="au-info-box">
                    <svg width="15" height="15" fill="none" stroke="#4da6ff" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                    Un email d'invitation sera envoyé à l'utilisateur avec ses identifiants de connexion.
                  </div>
                </>
              )}

            </div>
          </div>

          {/* ── Pied de page ── */}
          <div className="au-foot">
            <div className="au-foot-left">Étape {step} sur {STEPS.length}</div>
            <div className="au-foot-btns">
              <button className="au-btn au-btn-ghost" onClick={() => step > 1 ? setStep(step-1) : onClose()}>
                {step === 1 ? 'Annuler' : '← Précédent'}
              </button>
              {step < STEPS.length ? (
                <button className="au-btn au-btn-blue" disabled={!canNext()} onClick={() => setStep(step+1)}>
                  Suivant →
                </button>
              ) : (
                <button className="au-btn au-btn-blue" disabled={saving} onClick={handleFinish}>
                  {saving ? <><span className="au-spin"/>Création en cours…</> : '✅ Terminer'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
