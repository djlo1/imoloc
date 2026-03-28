import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

const ROLES_LABELS = {
  global_admin:'Administrateur global', user_admin:'Admin utilisateurs',
  billing_admin:'Admin facturation', reports_reader:'Admin rapports',
  security_admin:'Admin sécurité', password_admin:'Admin mots de passe',
  agent:'Agent', comptable:'Comptable', lecteur:'Lecteur', invite:'Invité',
}
const ROLES_COLORS = {
  global_admin:'#ef4444', user_admin:'#f59e0b', billing_admin:'#f59e0b',
  reports_reader:'#0078d4', security_admin:'#f59e0b', password_admin:'#0078d4',
  agent:'#0078d4', comptable:'#6c63ff', lecteur:'#6c63ff', invite:'#a78bfa',
}
const LICENCES_IMOLOC = {
  global_admin:['Imoloc Pro', 'Loci IA', 'Gestion complète'],
  user_admin:['Imoloc Standard', 'Gestion utilisateurs'],
  billing_admin:['Imoloc Standard', 'Module facturation'],
  reports_reader:['Imoloc Standard', 'Rapports & Analytics'],
  agent:['Imoloc Standard'],
  comptable:['Imoloc Standard', 'Module comptabilité'],
  lecteur:['Imoloc Lecteur'],
  invite:['Accès invité — Lecture seule'],
}

const getInitials = (p) => {
  const a = (p?.prenom?.[0]||'').toUpperCase()
  const b = (p?.nom?.[0]||'').toUpperCase()
  return a+b || p?.email?.[0]?.toUpperCase() || '?'
}

const COLONNES_DISPONIBLES = [
  { id:'nom', label:'Nom d\'affichage', default:true },
  { id:'email', label:'Nom d\'utilisateur', default:true },
  { id:'role', label:'Rôle', default:true },
  { id:'licences', label:'Licences', default:true },
  { id:'departement', label:'Département', default:false },
  { id:'statut', label:'Statut', default:false },
  { id:'derniere_connexion', label:'Dernière connexion', default:false },
]

export default function Utilisateurs() {
  const { profile } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [agence, setAgence] = useState(null)
  const [actifs, setActifs] = useState([])
  const [invites, setInvites] = useState([])
  const [supprimes, setSupprimes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [showColsPanel, setShowColsPanel] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(null)
  const [colonnes, setColonnes] = useState(COLONNES_DISPONIBLES.filter(c=>c.default).map(c=>c.id))
  const [filterDomaine, setFilterDomaine] = useState('Tous')
  const [filterRole, setFilterRole] = useState('Tous')
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [inviteForm, setInviteForm] = useState({ email:'', prenom:'', nom:'', organisation:'', message:'' })
  const [inviting, setInviting] = useState(false)
  const menuRef = useRef(null)

  const tab = location.pathname.includes('/invites') ? 'invites'
    : location.pathname.includes('/supprimes') ? 'supprimes'
    : location.pathname.includes('/contacts') ? 'contacts'
    : 'actifs'

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      const { data:agList } = await supabase.from('agences').select('*')
      const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
      setAgence(ag)
      if (ag?.id) {
        const [{ data:auData },{ data:supData },{ data:invData }] = await Promise.all([
          supabase.from('agence_users').select('*').eq('agence_id', ag.id),
          supabase.from('utilisateurs_supprimes').select('*').eq('agence_id', ag.id).order('date_suppression', { ascending:false }),
          supabase.from('utilisateurs_invites').select('*').eq('agence_id', ag.id).order('date_invitation', { ascending:false }),
        ])
        const userIds = [...new Set([ag.profile_id, ...(auData||[]).map(u=>u.user_id).filter(Boolean)])]
        const { data:profilesData } = await supabase.from('profiles').select('*').in('id', userIds)
        const actifsList = (profilesData||[]).map(p => ({
          ...p,
          isOwner: p.id === ag.profile_id,
          role: p.id === ag.profile_id ? 'global_admin' : (auData?.find(a=>a.user_id===p.id)?.role || p.role || 'agent'),
          poste: auData?.find(a=>a.user_id===p.id)?.poste || '',
          departement: auData?.find(a=>a.user_id===p.id)?.departement || '',
        }))
        setActifs(actifsList)
        setInvites(invData||[])
        setSupprimes(supData||[])
      }
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleDelete = async (user) => {
    if (!confirm(`Supprimer ${user.prenom} ${user.nom} ?`)) return
    try {
      await supabase.from('utilisateurs_supprimes').insert({
        agence_id: agence.id, user_id: user.id, email: user.email,
        nom: user.nom, prenom: user.prenom, role: user.role,
        type_compte: user.type_compte||'organisation', donnees_originales: user,
      })
      await supabase.from('agence_users').delete().eq('user_id', user.id).eq('agence_id', agence.id)
      toast.success(`${user.prenom} déplacé dans la corbeille`)
      fetchData()
    } catch(e) { toast.error('Erreur') }
  }

  const handleRestore = async (sup) => {
    try {
      await supabase.from('utilisateurs_supprimes').delete().eq('id', sup.id)
      if (sup.user_id) await supabase.from('agence_users').insert({ agence_id:agence.id, user_id:sup.user_id, email:sup.email, nom:sup.nom, prenom:sup.prenom, role:sup.role })
      toast.success(`${sup.prenom} restauré`)
      fetchData()
    } catch(e) { toast.error('Erreur') }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviting(true)
    try {
      await supabase.from('utilisateurs_invites').insert({
        agence_id: agence.id, email: inviteForm.email, nom: inviteForm.nom,
        prenom: inviteForm.prenom, organisation_externe: inviteForm.organisation, invite_par: profile?.id,
      })
      toast.success(`Invitation envoyée à ${inviteForm.email}`)
      setInviteForm({ email:'', prenom:'', nom:'', organisation:'', message:'' })
      setShowInvitePanel(false)
      fetchData()
    } catch(e) { toast.error('Erreur') }
    finally { setInviting(false) }
  }

  const filtered = actifs.filter(u => {
    const term = search.toLowerCase()
    const matchSearch = `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(term)
    const matchRole = filterRole==='Tous' || u.role===filterRole
    const matchStatut = filterStatut==='Tous' || (filterStatut==='Actif'&&(u.statut==='actif'||!u.statut)) || (filterStatut==='Inactif'&&u.statut==='inactif')
    return matchSearch && matchRole && matchStatut
  })

  const toggleSelect = (id) => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])
  const toggleAll = () => setSelected(s=>s.length===filtered.length?[]:filtered.map(u=>u.id))

  const ROLES_UNIQUES = [...new Set(actifs.map(u=>u.role))]

  return (
    <>
      <style>{`
        .us-page{animation:us-fadein 0.3s ease}
        @keyframes us-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .us-breadcrumb{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:16px}
        .us-breadcrumb-link{color:rgba(255,255,255,0.4);text-decoration:none;cursor:pointer;transition:color 0.1s}
        .us-breadcrumb-link:hover{color:#4da6ff}
        .us-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px}
        .us-title{font-size:24px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em}
        .us-title-sub{font-size:13px;color:rgba(255,255,255,0.35);margin-top:4px}
        .us-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:20px}
        .us-tab{padding:10px 18px;font-size:13.5px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;display:flex;align-items:center;gap:7px;white-space:nowrap}
        .us-tab:hover{color:rgba(255,255,255,0.75)}
        .us-tab.active{color:#e6edf3;border-bottom-color:#0078d4}
        .us-tab-count{font-size:11px;padding:1px 7px;border-radius:100px;background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.45);transition:all 0.15s}
        .us-tab.active .us-tab-count{background:rgba(0,120,212,0.2);color:#4da6ff}

        /* Toolbar */
        .us-toolbar{display:flex;align-items:center;gap:6px;margin-bottom:14px;flex-wrap:wrap}
        .us-tbtn{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:'Inter',sans-serif;transition:all 0.15s;white-space:nowrap}
        .us-tbtn:hover:not(:disabled){background:rgba(255,255,255,0.09);color:#e6edf3;border-color:rgba(255,255,255,0.15)}
        .us-tbtn:disabled{opacity:0.35;cursor:not-allowed}
        .us-tbtn-primary{background:#0078d4;border-color:#0078d4;color:#fff}
        .us-tbtn-primary:hover:not(:disabled){background:#006cc1;border-color:#006cc1}
        .us-tbtn-danger{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.25);color:#ef4444}
        .us-tbtn-danger:hover:not(:disabled){background:rgba(239,68,68,0.15)}
        .us-sep{width:1px;height:22px;background:rgba(255,255,255,0.08)}
        .us-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:4px;padding:7px 12px;margin-left:auto;transition:border-color 0.15s}
        .us-search:focus-within{border-color:rgba(0,120,212,0.4)}
        .us-search input{background:none;border:none;outline:none;font-family:'Inter',sans-serif;font-size:13px;color:#e6edf3;width:220px}
        .us-search input::placeholder{color:rgba(255,255,255,0.25)}

        /* Filtres */
        .us-filters{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
        .us-filter-label{font-size:12.5px;color:rgba(255,255,255,0.35);margin-right:4px}
        .us-filter-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:100px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.55);transition:all 0.15s;font-family:'Inter',sans-serif}
        .us-filter-chip:hover{background:rgba(255,255,255,0.08);color:#e6edf3}
        .us-filter-chip.active{background:rgba(0,120,212,0.12);border-color:rgba(0,120,212,0.35);color:#4da6ff}

        /* Stats rapides */
        .us-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
        .us-stat-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:12px 16px;transition:all 0.2s;cursor:pointer}
        .us-stat-card:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.04)}
        .us-stat-val{font-size:22px;font-weight:800;letter-spacing:-0.02em;margin-bottom:2px}
        .us-stat-lbl{font-size:11.5px;color:rgba(255,255,255,0.35)}

        /* Table */
        .us-table-wrap{border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden}
        .us-table-header{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)}
        .us-table{width:100%;border-collapse:collapse}
        .us-table th{font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);padding:10px 14px;text-align:left;background:rgba(255,255,255,0.02);white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.07)}
        .us-table th:first-child{width:44px;text-align:center}
        .us-table td{padding:13px 14px;font-size:13.5px;color:rgba(255,255,255,0.7);border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle}
        .us-table tr:last-child td{border-bottom:none}
        .us-table tr{transition:background 0.1s}
        .us-table tr:hover td{background:rgba(255,255,255,0.025)}
        .us-table tr.selected td{background:rgba(0,120,212,0.05)}
        .us-cb{width:16px;height:16px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;margin:0 auto;flex-shrink:0}
        .us-cb.checked{background:#0078d4;border-color:#0078d4}
        .us-cb.partial{background:rgba(0,120,212,0.3);border-color:#0078d4}
        .us-avatar{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;position:relative}
        .us-online-dot{position:absolute;bottom:0;right:0;width:9px;height:9px;border-radius:50%;background:#00c896;border:2px solid #161b22}
        .us-display-name{font-size:13.5px;font-weight:600;color:#e6edf3;margin-bottom:2px;display:flex;align-items:center;gap:7px}
        .us-email{font-size:12px;color:rgba(255,255,255,0.35)}
        .us-owner-badge{font-size:10px;font-weight:700;padding:1px 7px;border-radius:100px;background:rgba(0,120,212,0.12);color:#4da6ff;border:1px solid rgba(0,120,212,0.2)}
        .us-role-pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;font-size:11.5px;font-weight:600}
        .us-licence{display:flex;flex-direction:column;gap:3px}
        .us-lic-item{font-size:11.5px;color:rgba(255,255,255,0.5);display:flex;align-items:center;gap:5px}
        .us-lic-item::before{content:'';width:5px;height:5px;border-radius:50%;background:#0078d4;flex-shrink:0}
        .us-unlicensed{font-size:12px;color:rgba(255,255,255,0.25);font-style:italic}
        .us-menu-btn{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);padding:5px 7px;border-radius:5px;font-size:16px;transition:all 0.1s;line-height:1}
        .us-menu-btn:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .us-dropdown{position:absolute;right:0;top:calc(100% + 4px);background:#1c2434;border:1px solid rgba(255,255,255,0.1);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.5);z-index:50;min-width:200px;overflow:hidden}
        .us-dd-item{display:flex;align-items:center;gap:9px;padding:9px 14px;font-size:13px;color:rgba(255,255,255,0.65);cursor:pointer;transition:background 0.1s;border:none;background:none;font-family:'Inter',sans-serif;width:100%;text-align:left}
        .us-dd-item:hover{background:rgba(255,255,255,0.05);color:#e6edf3}
        .us-dd-item.red:hover{background:rgba(239,68,68,0.08);color:#ef4444}
        .us-dd-sep{height:1px;background:rgba(255,255,255,0.07)}
        .us-empty{text-align:center;padding:60px 20px;color:rgba(255,255,255,0.3)}
        .us-empty-icon{font-size:44px;margin-bottom:14px;opacity:0.35}
        .us-empty-title{font-size:16px;font-weight:600;color:rgba(255,255,255,0.45);margin-bottom:8px}
        .us-selected-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;background:rgba(0,120,212,0.08);border:1px solid rgba(0,120,212,0.2);border-radius:8px;margin-bottom:12px;animation:us-fadein 0.2s ease}
        .us-selected-bar-text{font-size:13px;color:#4da6ff;font-weight:500;flex:1}

        /* Colonnes panel */
        .us-cols-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:300;display:flex;justify-content:flex-end}
        .us-cols-panel{width:320px;height:100%;background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:us-slide 0.2s ease}
        @keyframes us-slide{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .us-cols-head{padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between}
        .us-cols-title{font-size:15px;font-weight:700;color:#e6edf3}
        .us-cols-body{flex:1;overflow-y:auto;padding:16px 22px}
        .us-cols-item{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer}
        .us-cols-item:hover{color:#e6edf3}
        .us-cols-lbl{font-size:13.5px;color:rgba(255,255,255,0.65)}
        .us-toggle{width:36px;height:20px;border-radius:100px;border:none;cursor:pointer;transition:all 0.2s;position:relative;flex-shrink:0}
        .us-toggle.on{background:#0078d4}
        .us-toggle.off{background:rgba(255,255,255,0.12)}
        .us-toggle-thumb{position:absolute;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:all 0.2s}
        .us-toggle.on .us-toggle-thumb{left:18px}
        .us-toggle.off .us-toggle-thumb{left:2px}

        /* Invite panel */
        .us-panel-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:400;display:flex;justify-content:flex-end}
        .us-panel{width:430px;height:100%;background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:us-slide 0.2s ease}
        .us-panel-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .us-panel-title{font-size:17px;font-weight:700;color:#e6edf3}
        .us-panel-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:5px;border-radius:4px;display:flex;transition:all 0.1s}
        .us-panel-close:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .us-panel-body{flex:1;overflow-y:auto;padding:22px}
        .us-field{margin-bottom:16px}
        .us-lbl{display:block;font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.55);margin-bottom:7px}
        .us-lbl-req{color:#ef4444;margin-left:2px}
        .us-input{width:100%;padding:10px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s}
        .us-input:focus{border-color:#0078d4;background:rgba(255,255,255,0.07)}
        .us-textarea{width:100%;padding:10px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;resize:vertical;min-height:80px;transition:border-color 0.15s}
        .us-textarea:focus{border-color:#0078d4}
        .us-info-box{padding:12px 14px;border-radius:7px;background:rgba(0,120,212,0.07);border:1px solid rgba(0,120,212,0.2);font-size:13px;color:rgba(255,255,255,0.5);line-height:1.65;margin-bottom:20px;display:flex;gap:10px}
        .us-panel-foot{padding:16px 22px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:10px;flex-shrink:0}
        .us-pfbtn{flex:1;padding:10px;border-radius:5px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .us-pfbtn-blue{background:#0078d4;color:#fff}
        .us-pfbtn-blue:hover:not(:disabled){background:#006cc1}
        .us-pfbtn-blue:disabled{opacity:0.4;cursor:not-allowed}
        .us-pfbtn-ghost{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}
        .us-pfbtn-ghost:hover{background:rgba(255,255,255,0.09)}

        /* Supprimés */
        .us-sup-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;display:flex;align-items:center;gap:14px;margin-bottom:10px;transition:all 0.15s;animation:us-fadein 0.3s ease}
        .us-sup-card:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.03)}
        .us-sup-deadline{font-size:11.5px;color:#f59e0b;margin-top:3px;display:flex;align-items:center;gap:4px}

        /* Contacts */
        .us-contacts-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:48px;text-align:center;max-width:580px;margin:0 auto}

        @media(max-width:1100px){.us-stats{grid-template-columns:1fr 1fr}.us-table{display:block;overflow-x:auto}}
        @media(max-width:700px){.us-panel,.us-cols-panel{width:100%}.us-toolbar{flex-direction:column;align-items:stretch}.us-search{margin-left:0}}
      `}</style>

      <div className="us-page">
        {/* Breadcrumb */}
        <div className="us-breadcrumb">
          <span className="us-breadcrumb-link" onClick={()=>navigate('/agence')}>Accueil</span>
          <span style={{color:'rgba(255,255,255,0.2)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.65)'}}>Utilisateurs</span>
          {tab!=='actifs'&&<><span style={{color:'rgba(255,255,255,0.2)'}}>›</span><span style={{color:'rgba(255,255,255,0.65)'}}>{{contacts:'Contacts',invites:'Utilisateurs invités',supprimes:'Utilisateurs supprimés'}[tab]}</span></>}
        </div>

        {/* Titre */}
        <div className="us-head">
          <div>
            <div className="us-title">
              {{actifs:'Utilisateurs actifs',contacts:'Contacts',invites:'Utilisateurs invités',supprimes:'Utilisateurs supprimés'}[tab]}
            </div>
            <div className="us-title-sub">
              {tab==='actifs'?`${actifs.length} utilisateur${actifs.length>1?'s':''} dans ${agence?.nom||'votre organisation'}`:
               tab==='invites'?`${invites.length} invitation${invites.length>1?'s':''} en cours`:
               tab==='supprimes'?`${supprimes.length} utilisateur${supprimes.length>1?'s':''} supprimé${supprimes.length>1?'s':''}`:
               'Personnes externes visibles par votre organisation'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="us-tabs">
          {[
            { id:'actifs', label:'Utilisateurs actifs', path:'/agence/utilisateurs', count:actifs.length },
            { id:'contacts', label:'Contacts', path:'/agence/utilisateurs/contacts', count:null },
            { id:'invites', label:'Utilisateurs invités', path:'/agence/utilisateurs/invites', count:invites.length },
            { id:'supprimes', label:'Utilisateurs supprimés', path:'/agence/utilisateurs/supprimes', count:supprimes.length },
          ].map(t=>(
            <button key={t.id} className={`us-tab ${tab===t.id?'active':''}`} onClick={()=>navigate(t.path)}>
              {t.label}
              {t.count!==null&&<span className="us-tab-count">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ══ UTILISATEURS ACTIFS ══ */}
        {tab==='actifs' && (
          <>
            {/* Stats rapides */}
            <div className="us-stats">
              {[
                { label:'Total utilisateurs', val:actifs.length, color:'#0078d4', icon:'👥' },
                { label:'Administrateurs', val:actifs.filter(u=>u.role?.includes('admin')).length, color:'#ef4444', icon:'👑' },
                { label:'Agents & Comptables', val:actifs.filter(u=>['agent','comptable'].includes(u.role)).length, color:'#6c63ff', icon:'💼' },
                { label:'Lecteurs', val:actifs.filter(u=>u.role==='lecteur').length, color:'rgba(255,255,255,0.4)', icon:'👁️' },
              ].map((s,i)=>(
                <div key={i} className="us-stat-card">
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <span style={{fontSize:18}}>{s.icon}</span>
                    <span style={{fontSize:11.5,color:'rgba(255,255,255,0.35)'}}>{s.label}</span>
                  </div>
                  <div className="us-stat-val" style={{color:s.color}}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="us-toolbar">
              <button className="us-tbtn us-tbtn-primary" onClick={()=>navigate('/agence',{state:{openAddUser:true}})}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                Ajouter un utilisateur
              </button>
              <button className="us-tbtn">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                Modèles utilisateur
              </button>
              <button className="us-tbtn">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>
                Ajouter plusieurs utilisateurs
              </button>
              <button className="us-tbtn">
                🔐 Authentification MFA
              </button>
              <div className="us-sep"/>
              <button className="us-tbtn us-tbtn-danger" disabled={selected.length===0} onClick={()=>{ const u=actifs.find(x=>x.id===selected[0]); if(u) handleDelete(u) }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                Supprimer {selected.length>0?`(${selected.length})`:''}
              </button>
              <button className="us-tbtn" onClick={fetchData}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
                Actualiser
              </button>
              <div className="us-search">
                <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher dans la liste des utilisateurs"/>
                {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:16,padding:0,lineHeight:1}}>×</button>}
              </div>
            </div>

            {/* Filtres */}
            <div className="us-filters">
              <span className="us-filter-label">Filtre :</span>
              <button className={`us-filter-chip ${filterRole==='Tous'?'active':''}`} onClick={()=>setFilterRole('Tous')}>Tous les rôles</button>
              {ROLES_UNIQUES.map(r=>(
                <button key={r} className={`us-filter-chip ${filterRole===r?'active':''}`} onClick={()=>setFilterRole(filterRole===r?'Tous':r)}>
                  {ROLES_LABELS[r]||r}
                </button>
              ))}
              <div className="us-sep"/>
              {['Tous','Actif','Inactif'].map(s=>(
                <button key={s} className={`us-filter-chip ${filterStatut===s?'active':''}`} onClick={()=>setFilterStatut(s)}>
                  {s==='Tous'?'Tous les statuts':s}
                </button>
              ))}
            </div>

            {/* Barre de sélection */}
            {selected.length>0&&(
              <div className="us-selected-bar">
                <span className="us-selected-bar-text">
                  {selected.length} utilisateur{selected.length>1?'s':''} sélectionné{selected.length>1?'s':''}
                </span>
                <button className="us-tbtn" style={{padding:'5px 12px',fontSize:12.5}}>Modifier les rôles</button>
                <button className="us-tbtn" style={{padding:'5px 12px',fontSize:12.5}}>Réinitialiser le MDP</button>
                <button className="us-tbtn us-tbtn-danger" style={{padding:'5px 12px',fontSize:12.5}}>Supprimer</button>
                <button onClick={()=>setSelected([])} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:18,padding:'0 4px',lineHeight:1}}>×</button>
              </div>
            )}

            {/* Table */}
            <div className="us-table-wrap">
              <div className="us-table-header">
                <div style={{fontSize:12.5,color:'rgba(255,255,255,0.35)'}}>
                  {filtered.length} utilisateur{filtered.length>1?'s':''}
                  {filtered.length!==actifs.length&&` (filtré sur ${actifs.length})`}
                </div>
                <button className="us-tbtn" style={{padding:'5px 12px',fontSize:12.5}} onClick={()=>setShowColsPanel(true)}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"/></svg>
                  Choisir les colonnes
                </button>
              </div>

              <table className="us-table">
                <thead>
                  <tr>
                    <th>
                      <div className={`us-cb ${selected.length===filtered.length&&filtered.length>0?'checked':selected.length>0?'partial':''}`} onClick={toggleAll}>
                        {selected.length===filtered.length&&filtered.length>0&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                        {selected.length>0&&selected.length<filtered.length&&<div style={{width:8,height:2,background:'#fff',borderRadius:1}}/>}
                      </div>
                    </th>
                    {colonnes.includes('nom')&&<th>Nom d'affichage</th>}
                    {colonnes.includes('email')&&<th>Nom d'utilisateur</th>}
                    {colonnes.includes('role')&&<th>Rôle</th>}
                    {colonnes.includes('licences')&&<th>Licences</th>}
                    {colonnes.includes('departement')&&<th>Département</th>}
                    {colonnes.includes('statut')&&<th>Statut</th>}
                    {colonnes.includes('derniere_connexion')&&<th>Dernière connexion</th>}
                    <th/>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} style={{textAlign:'center',padding:50,color:'rgba(255,255,255,0.3)'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{animation:'spin 0.8s linear infinite'}}><path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3"/></svg>
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        Chargement des utilisateurs...
                      </div>
                    </td></tr>
                  ) : filtered.length===0 ? (
                    <tr><td colSpan={10}>
                      <div className="us-empty">
                        <div className="us-empty-icon">👥</div>
                        <div className="us-empty-title">{search?`Aucun résultat pour "${search}"`:'Aucun utilisateur trouvé'}</div>
                        <div style={{fontSize:13.5,marginBottom:16}}>{search?'Essayez avec d\'autres termes':'Ajoutez des membres à votre organisation'}</div>
                        {!search&&<button className="us-tbtn us-tbtn-primary" onClick={()=>navigate('/agence',{state:{openAddUser:true}})}>+ Ajouter un utilisateur</button>}
                      </div>
                    </td></tr>
                  ) : filtered.map((u,i)=>{
                    const isSelected = selected.includes(u.id)
                    const color = ROLES_COLORS[u.role]||'#0078d4'
                    const licences = LICENCES_IMOLOC[u.role]||['Imoloc Standard']
                    return (
                      <tr key={i} className={isSelected?'selected':''}>
                        <td style={{textAlign:'center'}}>
                          <div className={`us-cb ${isSelected?'checked':''}`} onClick={()=>toggleSelect(u.id)}>
                            {isSelected&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                          </div>
                        </td>
                        {colonnes.includes('nom')&&(
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:11}}>
                              <div className="us-avatar" style={{background:`linear-gradient(135deg,${color},${color}88)`}}>
                                {getInitials(u)}
                                <div className="us-online-dot"/>
                              </div>
                              <div>
                                <div className="us-display-name">
                                  {u.prenom} {u.nom}
                                  {u.isOwner&&<span className="us-owner-badge">👑 Propriétaire</span>}
                                </div>
                                <div className="us-email">{u.email||'—'}</div>
                              </div>
                            </div>
                          </td>
                        )}
                        {colonnes.includes('email')&&<td style={{color:'rgba(255,255,255,0.5)',fontSize:13}}>{u.email||'—'}</td>}
                        {colonnes.includes('role')&&(
                          <td>
                            <span className="us-role-pill" style={{background:`${color}18`,color}}>
                              {ROLES_LABELS[u.role]||u.role}
                            </span>
                          </td>
                        )}
                        {colonnes.includes('licences')&&(
                          <td>
                            <div className="us-licence">
                              {licences.map((l,j)=><div key={j} className="us-lic-item">{l}</div>)}
                            </div>
                          </td>
                        )}
                        {colonnes.includes('departement')&&<td style={{color:'rgba(255,255,255,0.45)',fontSize:13}}>{u.departement||'—'}</td>}
                        {colonnes.includes('statut')&&(
                          <td>
                            <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13}}>
                              <span style={{width:8,height:8,borderRadius:'50%',background:u.statut==='actif'||!u.statut?'#00c896':'#f59e0b',flexShrink:0}}/>
                              {u.statut==='actif'||!u.statut?'Actif':'Inactif'}
                            </span>
                          </td>
                        )}
                        {colonnes.includes('derniere_connexion')&&<td style={{color:'rgba(255,255,255,0.35)',fontSize:12.5}}>{u.derniere_connexion?new Date(u.derniere_connexion).toLocaleDateString('fr-FR'):'—'}</td>}
                        <td style={{position:'relative'}}>
                          <button className="us-menu-btn" onClick={e=>{e.stopPropagation();setShowUserMenu(showUserMenu===u.id?null:u.id)}}>···</button>
                          {showUserMenu===u.id&&(
                            <div className="us-dropdown" ref={menuRef}>
                              <button className="us-dd-item">✏️ Modifier l'utilisateur</button>
                              <button className="us-dd-item">🔑 Gérer les rôles</button>
                              <button className="us-dd-item">🔐 Réinitialiser le mot de passe</button>
                              <button className="us-dd-item">📧 Renvoyer l'invitation</button>
                              <div className="us-dd-sep"/>
                              {!u.isOwner&&<button className="us-dd-item red" onClick={()=>{setShowUserMenu(null);handleDelete(u)}}>🗑️ Supprimer l'utilisateur</button>}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══ CONTACTS ══ */}
        {tab==='contacts' && (
          <div className="us-contacts-card">
            <div style={{fontSize:48,marginBottom:18}}>📇</div>
            <div style={{fontSize:20,fontWeight:700,color:'#e6edf3',marginBottom:12}}>Contacts</div>
            <div style={{fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:1.85,marginBottom:24}}>
              Les contacts sont des personnes externes à votre organisation que vous aimeriez que tout le monde puisse trouver. Toutes les personnes répertoriées ici sont disponibles dans <strong style={{color:'rgba(255,255,255,0.7)'}}>Outlook</strong> sous Personnes dans <strong style={{color:'rgba(255,255,255,0.7)'}}>Microsoft 365</strong>.
            </div>
            <div style={{padding:'14px 20px',borderRadius:8,background:'rgba(0,120,212,0.07)',border:'1px solid rgba(0,120,212,0.18)',fontSize:13.5,color:'rgba(255,255,255,0.4)'}}>
              🚧 Cette fonctionnalité sera disponible prochainement dans une prochaine mise à jour.
            </div>
          </div>
        )}

        {/* ══ UTILISATEURS INVITÉS ══ */}
        {tab==='invites' && (
          <>
            <div className="us-toolbar">
              <button className="us-tbtn us-tbtn-primary" onClick={()=>setShowInvitePanel(true)}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                Inviter un utilisateur externe
              </button>
              <button className="us-tbtn" onClick={fetchData}>🔄 Actualiser</button>
              <div className="us-search" style={{marginLeft:'auto'}}>
                <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
                <input placeholder="Rechercher un invité"/>
              </div>
            </div>
            <div className="us-info-box" style={{maxWidth:700,marginBottom:20}}>
              <span style={{fontSize:18,flexShrink:0}}>ℹ️</span>
              <div>Les utilisateurs invités sont des personnes <strong style={{color:'rgba(255,255,255,0.7)'}}>externes</strong> à votre organisation. Ils ont uniquement un accès en <strong style={{color:'rgba(255,255,255,0.7)'}}>lecture seule</strong> et ne peuvent modifier aucune donnée de votre organisation.</div>
            </div>
            <div className="us-table-wrap">
              <table className="us-table">
                <thead>
                  <tr>
                    <th>Nom / Email</th>
                    <th>Organisation externe</th>
                    <th>Date d'invitation</th>
                    <th>Expiration</th>
                    <th>Statut</th>
                    <th/>
                  </tr>
                </thead>
                <tbody>
                  {invites.length===0?(
                    <tr><td colSpan={6}>
                      <div className="us-empty">
                        <div className="us-empty-icon">✉️</div>
                        <div className="us-empty-title">Aucun utilisateur invité</div>
                        <div style={{fontSize:13.5,marginBottom:16}}>Invitez des personnes externes à accéder en lecture seule</div>
                        <button className="us-tbtn us-tbtn-primary" onClick={()=>setShowInvitePanel(true)}>+ Inviter un utilisateur externe</button>
                      </div>
                    </td></tr>
                  ):invites.map((inv,i)=>{
                    const expired = new Date(inv.date_expiration)<new Date()
                    const sc = inv.statut==='accepte'?{c:'#00c896',l:'Accepté'}:expired?{c:'#ef4444',l:'Expiré'}:{c:'#f59e0b',l:'En attente'}
                    return (
                      <tr key={i}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div className="us-avatar" style={{background:'rgba(108,99,255,0.2)',color:'#a78bfa',fontSize:11}}>
                              {(inv.prenom?.[0]||'').toUpperCase()}{(inv.nom?.[0]||inv.email?.[0]||'').toUpperCase()}
                            </div>
                            <div>
                              <div className="us-display-name" style={{fontSize:13.5}}>{inv.prenom} {inv.nom}</div>
                              <div className="us-email">{inv.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{color:'rgba(255,255,255,0.5)',fontSize:13}}>{inv.organisation_externe||'—'}</td>
                        <td style={{color:'rgba(255,255,255,0.5)',fontSize:13}}>{new Date(inv.date_invitation).toLocaleDateString('fr-FR')}</td>
                        <td style={{color:expired?'#ef4444':'rgba(255,255,255,0.5)',fontSize:13}}>{new Date(inv.date_expiration).toLocaleDateString('fr-FR')}</td>
                        <td><span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:sc.c,fontWeight:500}}><span style={{width:8,height:8,borderRadius:'50%',background:sc.c}}/>{sc.l}</span></td>
                        <td>
                          <button className="us-menu-btn">···</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══ UTILISATEURS SUPPRIMÉS ══ */}
        {tab==='supprimes' && (
          <>
            <div style={{padding:'14px 16px',borderRadius:8,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.18)',fontSize:13.5,color:'rgba(255,255,255,0.45)',lineHeight:1.7,marginBottom:20,display:'flex',gap:10,maxWidth:700}}>
              <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
              <div>Les utilisateurs supprimés sont conservés <strong style={{color:'rgba(255,255,255,0.7)'}}>30 jours</strong> avant suppression définitive automatique. Restaurez-les ou supprimez-les définitivement à tout moment.</div>
            </div>
            {supprimes.length===0?(
              <div className="us-empty">
                <div className="us-empty-icon">🗑️</div>
                <div className="us-empty-title">Aucun utilisateur supprimé</div>
                <div style={{fontSize:13.5}}>La corbeille est vide. Les utilisateurs supprimés apparaissent ici pendant 30 jours.</div>
              </div>
            ):supprimes.map((sup,i)=>{
              const joursR = Math.max(0,Math.ceil((new Date(sup.date_suppression_definitive)-new Date())/(1000*60*60*24)))
              const urgence = joursR<=7
              return (
                <div key={i} className="us-sup-card">
                  <div className="us-avatar" style={{background:'rgba(239,68,68,0.12)',color:'#ef4444',fontSize:12}}>
                    {(sup.prenom?.[0]||'').toUpperCase()}{(sup.nom?.[0]||'').toUpperCase()||'?'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:3}}>{sup.prenom} {sup.nom}</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>
                      {sup.email} · {ROLES_LABELS[sup.role]||sup.role} · {sup.type_compte}
                    </div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.3)',marginTop:2}}>
                      Supprimé le {new Date(sup.date_suppression).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="us-sup-deadline" style={{color:urgence?'#ef4444':'#f59e0b'}}>
                      {urgence?'🔴':'⏱️'} Suppression définitive dans {joursR} jour{joursR>1?'s':''}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8,flexShrink:0}}>
                    <button className="us-tbtn" style={{color:'#00c896',borderColor:'rgba(0,200,150,0.25)',background:'rgba(0,200,150,0.07)'}} onClick={()=>handleRestore(sup)}>↩️ Restaurer</button>
                    <button className="us-tbtn us-tbtn-danger" onClick={async()=>{if(confirm('Supprimer définitivement ?')){await supabase.from('utilisateurs_supprimes').delete().eq('id',sup.id);toast.success('Supprimé définitivement');fetchData()}}}>🗑️ Supprimer définitivement</button>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* ══ PANEL COLONNES ══ */}
      {showColsPanel&&(
        <div className="us-cols-overlay" onClick={e=>e.target===e.currentTarget&&setShowColsPanel(false)}>
          <div className="us-cols-panel">
            <div className="us-cols-head">
              <span className="us-cols-title">Choisir les colonnes</span>
              <button className="us-panel-close" onClick={()=>setShowColsPanel(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="us-cols-body">
              <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:16,lineHeight:1.6}}>
                Sélectionnez les colonnes à afficher dans le tableau des utilisateurs.
              </div>
              {COLONNES_DISPONIBLES.map(col=>(
                <div key={col.id} className="us-cols-item" onClick={()=>setColonnes(c=>c.includes(col.id)?c.filter(x=>x!==col.id):[...c,col.id])}>
                  <span className="us-cols-lbl">{col.label}</span>
                  <div className={`us-toggle ${colonnes.includes(col.id)?'on':'off'}`}>
                    <div className="us-toggle-thumb"/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ PANEL INVITATION ══ */}
      {showInvitePanel&&(
        <div className="us-panel-overlay" onClick={e=>e.target===e.currentTarget&&setShowInvitePanel(false)}>
          <div className="us-panel">
            <div className="us-panel-head">
              <span className="us-panel-title">Inviter un utilisateur externe</span>
              <button className="us-panel-close" onClick={()=>setShowInvitePanel(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="us-panel-body">
              <div className="us-info-box">
                <span style={{fontSize:18,flexShrink:0}}>ℹ️</span>
                <div>Les utilisateurs invités sont <strong style={{color:'rgba(255,255,255,0.7)'}}>externes</strong> à votre organisation et ont un accès en <strong style={{color:'rgba(255,255,255,0.7)'}}>lecture seule</strong>. Ils ne peuvent pas modifier les données.</div>
              </div>
              <form id="invite-form" onSubmit={handleInvite}>
                <div className="us-field">
                  <label className="us-lbl">Adresse email <span className="us-lbl-req">*</span></label>
                  <input className="us-input" type="email" required value={inviteForm.email} onChange={e=>setInviteForm(f=>({...f,email:e.target.value}))} placeholder="email@exemple.com" autoFocus/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="us-field">
                    <label className="us-lbl">Prénom</label>
                    <input className="us-input" value={inviteForm.prenom} onChange={e=>setInviteForm(f=>({...f,prenom:e.target.value}))} placeholder="Jean"/>
                  </div>
                  <div className="us-field">
                    <label className="us-lbl">Nom</label>
                    <input className="us-input" value={inviteForm.nom} onChange={e=>setInviteForm(f=>({...f,nom:e.target.value}))} placeholder="Dupont"/>
                  </div>
                </div>
                <div className="us-field">
                  <label className="us-lbl">Organisation externe</label>
                  <input className="us-input" value={inviteForm.organisation} onChange={e=>setInviteForm(f=>({...f,organisation:e.target.value}))} placeholder="Nom de l'entreprise"/>
                </div>
                <div className="us-field">
                  <label className="us-lbl">Message <span style={{color:'rgba(255,255,255,0.3)',fontWeight:400}}>(optionnel)</span></label>
                  <textarea className="us-textarea" value={inviteForm.message} onChange={e=>setInviteForm(f=>({...f,message:e.target.value}))} placeholder="Message personnalisé pour l'invitation..."/>
                </div>
              </form>
            </div>
            <div className="us-panel-foot">
              <button className="us-pfbtn us-pfbtn-ghost" onClick={()=>setShowInvitePanel(false)}>Annuler</button>
              <button className="us-pfbtn us-pfbtn-blue" form="invite-form" type="submit" disabled={inviting}>
                {inviting?'Envoi en cours...':'Envoyer l\'invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
