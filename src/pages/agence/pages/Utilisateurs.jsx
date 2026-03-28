import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import toast from 'react-hot-toast'

// ── Constantes ──────────────────────────────────────────
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
const LICENCES = {
  global_admin:['Imoloc Pro','Loci IA','Gestion complète'],
  user_admin:['Imoloc Standard','Gestion utilisateurs'],
  billing_admin:['Imoloc Standard','Module facturation'],
  reports_reader:['Imoloc Standard','Rapports & Analytics'],
  agent:['Imoloc Standard'], comptable:['Imoloc Standard','Module comptabilité'],
  lecteur:['Imoloc Lecteur'], invite:['Accès invité — Lecture seule'],
}
const ALL_COLS = [
  { key:'displayName', label:'Nom d\'affichage', checked:true, disabled:true },
  { key:'userPrincipalName', label:'Nom d\'utilisateur', checked:true },
  { key:'licenses', label:'Licences', checked:true },
  { key:'role', label:'Rôle', checked:true },
  { key:'isGuest', label:'Invité', checked:false },
  { key:'signInStatus', label:'État de connexion', checked:false },
  { key:'department', label:'Département', checked:false },
  { key:'firstName', label:'Prénom', checked:false },
  { key:'lastName', label:'Nom', checked:false },
  { key:'jobTitle', label:'Titre', checked:false },
  { key:'city', label:'Ville', checked:false },
  { key:'country', label:'Pays ou région', checked:false },
  { key:'office', label:'Bureau', checked:false },
  { key:'usageLocation', label:'Lieu d\'utilisation', checked:false },
  { key:'lastSignIn', label:'Dernière connexion', checked:false },
]
const DEFAULT_COLS = ALL_COLS.filter(c=>c.checked).map(c=>c.key)
const getInitials = (p) => ((p?.prenom?.[0]||'')+(p?.nom?.[0]||'')).toUpperCase() || p?.email?.[0]?.toUpperCase() || '?'

// ── Composant principal ──────────────────────────────────
export default function Utilisateurs() {
  const { profile } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const tab = location.pathname.includes('/invites') ? 'invites'
    : location.pathname.includes('/supprimes') ? 'supprimes'
    : location.pathname.includes('/contacts') ? 'contacts' : 'actifs'

  const [agence, setAgence] = useState(null)
  const [actifs, setActifs] = useState([])
  const [invites, setInvites] = useState([])
  const [supprimes, setSupprimes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [viewMode, setViewMode] = useState('normal') // 'normal' | 'compact'
  const [cols, setCols] = useState(DEFAULT_COLS)
  const [colWidths, setColWidths] = useState({})
  const [filterRole, setFilterRole] = useState('Tous')
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [showColsPanel, setShowColsPanel] = useState(false)
  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userPanelTab, setUserPanelTab] = useState('compte')
  const [rowMenu, setRowMenu] = useState(null)
  const [inviteForm, setInviteForm] = useState({ email:'', prenom:'', nom:'', organisation:'', message:'' })
  const [inviting, setInviting] = useState(false)
  const resizingCol = useRef(null)
  const startX = useRef(0)
  const startW = useRef(0)
  const tableRef = useRef(null)

  useEffect(() => { fetchData() }, [])
  useEffect(() => { setSelected([]) }, [tab])

  // Resize colonnes
  const startResize = useCallback((e, colKey) => {
    e.preventDefault()
    resizingCol.current = colKey
    startX.current = e.clientX
    startW.current = colWidths[colKey] || 180
    const onMove = (ev) => {
      const diff = ev.clientX - startX.current
      setColWidths(prev => ({ ...prev, [resizingCol.current]: Math.max(80, startW.current + diff) }))
    }
    const onUp = () => {
      resizingCol.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [colWidths])

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
          supabase.from('utilisateurs_supprimes').select('*').eq('agence_id', ag.id).order('date_suppression',{ascending:false}),
          supabase.from('utilisateurs_invites').select('*').eq('agence_id', ag.id).order('date_invitation',{ascending:false}),
        ])
        const userIds = [...new Set([ag.profile_id,...(auData||[]).map(u=>u.user_id).filter(Boolean)])]
        const { data:profilesData } = await supabase.from('profiles').select('*').in('id', userIds)
        setActifs((profilesData||[]).map(p=>({
          ...p,
          isOwner: p.id===ag.profile_id,
          role: p.id===ag.profile_id ? 'global_admin' : (auData?.find(a=>a.user_id===p.id)?.role||p.role||'agent'),
          poste: auData?.find(a=>a.user_id===p.id)?.poste||'',
          departement: auData?.find(a=>a.user_id===p.id)?.departement||'',
        })))
        setInvites(invData||[])
        setSupprimes(supData||[])
      }
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleDelete = async (user) => {
    if (!confirm(`Déplacer ${user.prenom} ${user.nom} dans la corbeille ?`)) return
    try {
      await supabase.from('utilisateurs_supprimes').insert({
        agence_id:agence.id, user_id:user.id, email:user.email,
        nom:user.nom, prenom:user.prenom, role:user.role,
        type_compte:user.type_compte||'organisation', donnees_originales:user,
      })
      await supabase.from('agence_users').delete().eq('user_id',user.id).eq('agence_id',agence.id)
      toast.success(`${user.prenom} déplacé dans la corbeille`)
      setSelectedUser(null)
      fetchData()
    } catch(e) { toast.error('Erreur') }
  }

  const handleRestore = async (sup) => {
    try {
      await supabase.from('utilisateurs_supprimes').delete().eq('id',sup.id)
      if (sup.user_id) await supabase.from('agence_users').insert({
        agence_id:agence.id, user_id:sup.user_id,
        email:sup.email, nom:sup.nom, prenom:sup.prenom, role:sup.role
      })
      toast.success(`${sup.prenom} restauré`)
      fetchData()
    } catch(e) { toast.error('Erreur') }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviting(true)
    try {
      await supabase.from('utilisateurs_invites').insert({
        agence_id:agence.id, email:inviteForm.email, nom:inviteForm.nom,
        prenom:inviteForm.prenom, organisation_externe:inviteForm.organisation, invite_par:profile?.id,
      })
      toast.success(`Invitation envoyée à ${inviteForm.email}`)
      setInviteForm({email:'',prenom:'',nom:'',organisation:'',message:''})
      setShowInvitePanel(false)
      fetchData()
    } catch(e) { toast.error('Erreur') }
    finally { setInviting(false) }
  }

  // Export CSV
  const exportCSV = () => {
    const data = selected.length>0 ? actifs.filter(u=>selected.includes(u.id)) : filtered
    const headers = ['Prénom','Nom','Email','Rôle','Département','Statut']
    const rows = data.map(u=>[u.prenom,u.nom,u.email,ROLES_LABELS[u.role]||u.role,u.departement||'',u.statut||'actif'])
    const csv = [headers,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`utilisateurs_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    toast.success(`${data.length} utilisateur${data.length>1?'s':''} exporté${data.length>1?'s':''}`)
  }

  const filtered = actifs.filter(u => {
    const term = search.toLowerCase()
    return `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(term)
      && (filterRole==='Tous' || u.role===filterRole)
      && (filterStatut==='Tous' || (filterStatut==='Actif'&&(!u.statut||u.statut==='actif')) || (filterStatut==='Inactif'&&u.statut==='inactif'))
  })

  const toggleSelect = (id) => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])
  const toggleAll = () => setSelected(s=>s.length===filtered.length?[]:filtered.map(u=>u.id))
  const rowH = viewMode==='compact' ? '38px' : '54px'
  const ROLES_UNIQUES = [...new Set(actifs.map(u=>u.role))]

  return (
    <>
      <style>{`
        .us-page{animation:us-in 0.25s ease}
        @keyframes us-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .us-bc{display:flex;align-items:center;gap:7px;font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:16px}
        .us-bcl{cursor:pointer;transition:color 0.1s}.us-bcl:hover{color:#4da6ff}
        .us-title{font-size:24px;font-weight:700;color:#e6edf3;letter-spacing:-0.02em;margin-bottom:4px}
        .us-sub{font-size:13px;color:rgba(255,255,255,0.35);margin-bottom:22px}
        .us-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:20px}
        .us-tab{padding:10px 18px;font-size:13.5px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;white-space:nowrap;display:flex;align-items:center;gap:7px}
        .us-tab:hover{color:rgba(255,255,255,0.75)}.us-tab.active{color:#e6edf3;border-bottom-color:#0078d4}
        .us-cnt{font-size:11px;padding:1px 7px;border-radius:100px;background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.4)}
        .us-tab.active .us-cnt{background:rgba(0,120,212,0.2);color:#4da6ff}

        /* Stats */
        .us-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
        .us-sc{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:12px 16px;transition:all 0.2s;cursor:pointer}
        .us-sc:hover{border-color:rgba(255,255,255,0.13);transform:translateY(-1px)}
        .us-sv{font-size:22px;font-weight:800;letter-spacing:-0.02em;margin-bottom:2px}
        .us-sl{font-size:11.5px;color:rgba(255,255,255,0.35)}

        /* Toolbar */
        .us-toolbar{display:flex;align-items:center;gap:6px;margin-bottom:14px;flex-wrap:wrap}
        .us-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:'Inter',sans-serif;transition:all 0.15s;white-space:nowrap}
        .us-btn:hover:not(:disabled){background:rgba(255,255,255,0.09);color:#e6edf3;border-color:rgba(255,255,255,0.15)}
        .us-btn:disabled{opacity:0.35;cursor:not-allowed}
        .us-btn-p{background:#0078d4;border-color:#0078d4;color:#fff}.us-btn-p:hover:not(:disabled){background:#006cc1;border-color:#006cc1}
        .us-btn-d{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.22);color:#ef4444}.us-btn-d:hover:not(:disabled){background:rgba(239,68,68,0.15)}
        .us-btn-g{background:rgba(0,200,150,0.08);border-color:rgba(0,200,150,0.22);color:#00c896}.us-btn-g:hover:not(:disabled){background:rgba(0,200,150,0.15)}
        .us-sep{width:1px;height:22px;background:rgba(255,255,255,0.08)}
        .us-sr{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:4px;padding:7px 12px;margin-left:auto;transition:border-color 0.15s}
        .us-sr:focus-within{border-color:rgba(0,120,212,0.4)}
        .us-sr input{background:none;border:none;outline:none;font-family:'Inter',sans-serif;font-size:13px;color:#e6edf3;width:220px}
        .us-sr input::placeholder{color:rgba(255,255,255,0.25)}

        /* Filtres */
        .us-filters{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
        .us-fl{font-size:12px;color:rgba(255,255,255,0.3);margin-right:2px}
        .us-fc{display:inline-flex;align-items:center;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);transition:all 0.15s;font-family:'Inter',sans-serif}
        .us-fc:hover{background:rgba(255,255,255,0.08);color:#e6edf3}.us-fc.on{background:rgba(0,120,212,0.1);border-color:rgba(0,120,212,0.3);color:#4da6ff}

        /* Barre sélection */
        .us-selbar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(0,120,212,0.07);border:1px solid rgba(0,120,212,0.18);border-radius:8px;margin-bottom:12px;animation:us-in 0.2s ease}
        .us-selbar-txt{font-size:13px;color:#4da6ff;font-weight:500;flex:1}

        /* Table */
        .us-tw{border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden}
        .us-thead-bar{display:flex;align-items:center;justify-content:space-between;padding:9px 16px;border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)}
        .us-table{width:100%;border-collapse:collapse;table-layout:fixed}
        .us-table th{font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.4);padding:9px 14px;text-align:left;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.07);white-space:nowrap;position:relative;user-select:none;overflow:hidden}
        .us-table th:first-child{width:44px;text-align:center}
        .us-table td{padding:0 14px;font-size:13px;color:rgba(255,255,255,0.65);border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .us-table td:first-child{text-align:center}
        .us-table tr{transition:background 0.08s;height:${rowH}}
        .us-table tr:hover td{background:rgba(255,255,255,0.025);cursor:pointer}
        .us-table tr.sel td{background:rgba(0,120,212,0.06)}
        .us-table tr:last-child td{border-bottom:none}
        .us-resize-handle{position:absolute;right:0;top:0;bottom:0;width:5px;cursor:col-resize;background:transparent;z-index:1}
        .us-resize-handle:hover,.us-resize-handle:active{background:rgba(0,120,212,0.4)}
        .us-cb{width:15px;height:15px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.12s;margin:0 auto;flex-shrink:0}
        .us-cb.on{background:#0078d4;border-color:#0078d4}
        .us-cb.half{background:rgba(0,120,212,0.3);border-color:#0078d4}
        .us-av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex-shrink:0;position:relative}
        .us-avdot{position:absolute;bottom:0;right:0;width:8px;height:8px;border-radius:50%;background:#00c896;border:2px solid #161b22}
        .us-uname{font-weight:600;color:#e6edf3;display:flex;align-items:center;gap:7px}
        .us-uemail{font-size:11.5px;color:rgba(255,255,255,0.35);margin-top:1px}
        .us-owner{font-size:10px;font-weight:700;padding:1px 7px;border-radius:100px;background:rgba(0,120,212,0.12);color:#4da6ff;border:1px solid rgba(0,120,212,0.2)}
        .us-pill{display:inline-flex;align-items:center;padding:2px 9px;border-radius:100px;font-size:11px;font-weight:600}
        .us-lic{display:flex;flex-direction:column;gap:2px}
        .us-li{font-size:11px;color:rgba(255,255,255,0.5);display:flex;align-items:center;gap:5px}
        .us-li::before{content:'';width:4px;height:4px;border-radius:50%;background:#0078d4;flex-shrink:0}
        .us-mbtn{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);padding:5px 7px;border-radius:5px;font-size:15px;transition:all 0.1s;line-height:1}
        .us-mbtn:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .us-dd{position:absolute;right:8px;top:calc(100% - 4px);background:#1c2434;border:1px solid rgba(255,255,255,0.1);border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,0.55);z-index:100;min-width:210px;overflow:hidden}
        .us-ddi{display:flex;align-items:center;gap:9px;padding:9px 14px;font-size:13px;color:rgba(255,255,255,0.65);cursor:pointer;transition:background 0.1s;border:none;background:none;font-family:'Inter',sans-serif;width:100%;text-align:left}
        .us-ddi:hover{background:rgba(255,255,255,0.05);color:#e6edf3}
        .us-ddi.red:hover{background:rgba(239,68,68,0.08);color:#ef4444}
        .us-dds{height:1px;background:rgba(255,255,255,0.07)}
        .us-empty{text-align:center;padding:60px 20px;color:rgba(255,255,255,0.3)}
        .us-empty-ic{font-size:44px;margin-bottom:14px;opacity:0.35}
        .us-empty-t{font-size:16px;font-weight:600;color:rgba(255,255,255,0.4);margin-bottom:8px}
        .us-foot{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:rgba(255,255,255,0.3)}

        /* Panel Colonnes */
        .up-ov{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:300;display:flex;justify-content:flex-end}
        .up-panel{width:340px;height:100%;background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:up-sl 0.2s ease}
        @keyframes up-sl{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .up-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .up-title{font-size:16px;font-weight:700;color:#e6edf3}
        .up-cls{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:5px;border-radius:4px;display:flex;transition:all 0.1s}
        .up-cls:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .up-body{flex:1;overflow-y:auto;padding:16px 22px}
        .up-body::-webkit-scrollbar{width:4px}
        .up-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .up-desc{font-size:13px;color:rgba(255,255,255,0.4);line-height:1.65;margin-bottom:18px}
        .up-item{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .up-item:last-child{border-bottom:none}
        .up-lbl{font-size:13.5px;color:rgba(255,255,255,0.7)}
        .up-lbl.dis{color:rgba(255,255,255,0.35);cursor:not-allowed}
        .up-cb{width:17px;height:17px;border-radius:3px;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;flex-shrink:0}
        .up-cb.on{background:#0078d4;border-color:#0078d4}.up-cb.dis{opacity:0.4;cursor:not-allowed}
        .up-foot{padding:16px 22px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:10px;flex-shrink:0}
        .up-fbtn{flex:1;padding:10px;border-radius:5px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .up-fbtn-b{background:#0078d4;color:#fff}.up-fbtn-b:hover{background:#006cc1}
        .up-fbtn-g{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}.up-fbtn-g:hover{background:rgba(255,255,255,0.09);color:#e6edf3}

        /* Drawer utilisateur */
        .ud-ov{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:400;display:flex;justify-content:flex-end}
        .ud-panel{width:480px;height:100%;background:#161b22;border-left:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;animation:up-sl 0.22s ease;overflow:hidden}
        .ud-head{padding:22px 24px 0;background:linear-gradient(135deg,rgba(0,120,212,0.06),rgba(108,99,255,0.04));border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .ud-head-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px}
        .ud-av{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;flex-shrink:0}
        .ud-name{font-size:18px;font-weight:700;color:#e6edf3;margin-bottom:4px}
        .ud-role{font-size:12px;color:rgba(255,255,255,0.4)}
        .ud-quick{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
        .ud-qa{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:5px;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-family:'Inter',sans-serif;transition:all 0.15s}
        .ud-qa:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .ud-qa.red{border-color:rgba(239,68,68,0.25);color:#ef4444;background:rgba(239,68,68,0.05)}.ud-qa.red:hover{background:rgba(239,68,68,0.12)}
        .ud-tabs{display:flex;overflow-x:auto;gap:0}
        .ud-tab{padding:9px 16px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;white-space:nowrap}
        .ud-tab:hover{color:rgba(255,255,255,0.75)}.ud-tab.active{color:#e6edf3;border-bottom-color:#0078d4}
        .ud-body{flex:1;overflow-y:auto;padding:22px 24px}
        .ud-body::-webkit-scrollbar{width:4px}
        .ud-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .ud-section{margin-bottom:26px}
        .ud-sh{font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}
        .ud-sa{font-size:12px;color:#4da6ff;cursor:pointer;text-transform:none;letter-spacing:0;font-weight:500;background:none;border:none;font-family:'Inter',sans-serif}
        .ud-sa:hover{text-decoration:underline}
        .ud-row{display:flex;align-items:flex-start;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .ud-row:last-child{border-bottom:none}
        .ud-rk{font-size:13px;color:rgba(255,255,255,0.4);flex-shrink:0;width:150px}
        .ud-rv{font-size:13px;color:#e6edf3;font-weight:500;text-align:right;flex:1;word-break:break-word}
        .ud-rv a{color:#4da6ff;text-decoration:none}.ud-rv a:hover{text-decoration:underline}
        .ud-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;transition:all 0.15s;cursor:pointer}
        .ud-card:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.05)}
        .ud-group-av{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
        .ud-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;font-size:12px;font-weight:600}
        .ud-no-admin{font-size:13.5px;color:rgba(255,255,255,0.45);font-style:italic}
        .ud-empty-tab{text-align:center;padding:40px;color:rgba(255,255,255,0.25);font-size:13.5px}

        /* Supprimés */
        .us-sup{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;display:flex;align-items:center;gap:14px;margin-bottom:10px;transition:all 0.15s}
        .us-sup:hover{border-color:rgba(255,255,255,0.12)}

        /* Invités */
        .us-inv-info{padding:12px 16px;border-radius:8px;background:rgba(0,120,212,0.06);border:1px solid rgba(0,120,212,0.15);font-size:13px;color:rgba(255,255,255,0.5);line-height:1.7;margin-bottom:20px;display:flex;gap:10px;max-width:700px}

        /* Contacts */
        .us-ct{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:48px;text-align:center;max-width:560px;margin:0 auto}

        /* Panel inviter */
        .ui-ov{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:450;display:flex;justify-content:flex-end}
        .ui-panel{width:430px;height:100%;background:#161b22;border-left:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;animation:up-sl 0.2s ease}
        .ui-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .ui-body{flex:1;overflow-y:auto;padding:22px}
        .ui-body::-webkit-scrollbar{width:4px}
        .ui-f{margin-bottom:16px}
        .ui-l{display:block;font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.55);margin-bottom:7px}
        .ui-i{width:100%;padding:10px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s}
        .ui-i:focus{border-color:#0078d4;background:rgba(255,255,255,0.07)}
        .ui-ta{width:100%;padding:10px 13px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:5px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;resize:vertical;min-height:80px;transition:border-color 0.15s}
        .ui-ta:focus{border-color:#0078d4}
        .ui-foot{padding:16px 22px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:10px;flex-shrink:0}
        .ui-fb{flex:1;padding:10px;border-radius:5px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .ui-fb-b{background:#0078d4;color:#fff}.ui-fb-b:hover:not(:disabled){background:#006cc1}.ui-fb-b:disabled{opacity:0.4;cursor:not-allowed}
        .ui-fb-g{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1)}.ui-fb-g:hover{background:rgba(255,255,255,0.09)}

        /* View toggle */
        .us-vtog{display:flex;gap:2px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:5px;padding:3px}
        .us-vbtn{background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:3px;color:rgba(255,255,255,0.4);transition:all 0.15s;font-size:12px;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:4px}
        .us-vbtn.active{background:rgba(255,255,255,0.1);color:#e6edf3}

        @media(max-width:1100px){.us-stats{grid-template-columns:1fr 1fr}}
        @media(max-width:700px){.ud-panel,.ui-panel,.up-panel{width:100%}.us-toolbar{flex-direction:column}}
      `}</style>

      <div className="us-page">
        {/* Breadcrumb */}
        <div className="us-bc">
          <span className="us-bcl" onClick={()=>navigate('/agence')}>Accueil</span>
          <span style={{color:'rgba(255,255,255,0.2)'}}>›</span>
          <span style={{color:'rgba(255,255,255,0.65)'}}>
            {{actifs:'Utilisateurs actifs',contacts:'Contacts',invites:'Utilisateurs invités',supprimes:'Utilisateurs supprimés'}[tab]}
          </span>
        </div>

        {/* Titre */}
        <div className="us-title">
          {{actifs:'Utilisateurs actifs',contacts:'Contacts',invites:'Utilisateurs invités',supprimes:'Utilisateurs supprimés'}[tab]}
        </div>
        <div className="us-sub">
          {tab==='actifs'&&`${actifs.length} utilisateur${actifs.length>1?'s':''} · ${agence?.nom||'Organisation'}`}
          {tab==='invites'&&`${invites.length} invitation${invites.length>1?'s':''} en cours`}
          {tab==='supprimes'&&`${supprimes.length} utilisateur${supprimes.length>1?'s':''} dans la corbeille`}
          {tab==='contacts'&&'Personnes externes visibles par votre organisation'}
        </div>

        {/* Tabs navigation */}
        <div className="us-tabs">
          {[
            {id:'actifs',label:'Utilisateurs actifs',path:'/agence/utilisateurs',cnt:actifs.length},
            {id:'contacts',label:'Contacts',path:'/agence/utilisateurs/contacts',cnt:null},
            {id:'invites',label:'Utilisateurs invités',path:'/agence/utilisateurs/invites',cnt:invites.length},
            {id:'supprimes',label:'Utilisateurs supprimés',path:'/agence/utilisateurs/supprimes',cnt:supprimes.length},
          ].map(t=>(
            <button key={t.id} className={`us-tab ${tab===t.id?'active':''}`} onClick={()=>navigate(t.path)}>
              {t.label}{t.cnt!==null&&<span className="us-cnt">{t.cnt}</span>}
            </button>
          ))}
        </div>

        {/* ══ PAGE UTILISATEURS ACTIFS ══ */}
        {tab==='actifs'&&(
          <>
            {/* Stats */}
            <div className="us-stats">
              {[
                {ic:'👥',lbl:'Total',val:actifs.length,col:'#0078d4'},
                {ic:'👑',lbl:'Administrateurs',val:actifs.filter(u=>u.role?.includes('admin')).length,col:'#ef4444'},
                {ic:'💼',lbl:'Agents & Comptables',val:actifs.filter(u=>['agent','comptable'].includes(u.role)).length,col:'#6c63ff'},
                {ic:'👁️',lbl:'Lecteurs',val:actifs.filter(u=>u.role==='lecteur').length,col:'rgba(255,255,255,0.4)'},
              ].map((s,i)=>(
                <div key={i} className="us-sc">
                  <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}>
                    <span style={{fontSize:16}}>{s.ic}</span>
                    <span className="us-sl">{s.lbl}</span>
                  </div>
                  <div className="us-sv" style={{color:s.col}}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="us-toolbar">
              <button className="us-btn us-btn-p" onClick={()=>navigate('/agence',{state:{openAddUser:true}})}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                Ajouter un utilisateur
              </button>
              <button className="us-btn">📋 Modèles</button>
              <button className="us-btn">👥 Ajouter plusieurs</button>
              <button className="us-btn">🔐 MFA</button>
              <div className="us-sep"/>
              <button className="us-btn us-btn-d" disabled={selected.length===0} onClick={()=>{const u=actifs.find(x=>x.id===selected[0]);if(u)handleDelete(u)}}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916"/></svg>
                Supprimer{selected.length>0&&` (${selected.length})`}
              </button>
              <button className="us-btn us-btn-g" onClick={exportCSV}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                Exporter{selected.length>0&&` (${selected.length})`}
              </button>
              <button className="us-btn" onClick={fetchData}>🔄</button>
              <div className="us-sr">
                <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher dans la liste des utilisateurs"/>
                {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:16,padding:0,lineHeight:1}}>×</button>}
              </div>
            </div>

            {/* Filtres */}
            <div className="us-filters">
              <span className="us-fl">Filtre défini :</span>
              <button className={`us-fc ${filterRole==='Tous'?'on':''}`} onClick={()=>setFilterRole('Tous')}>Tous</button>
              {ROLES_UNIQUES.map(r=>(
                <button key={r} className={`us-fc ${filterRole===r?'on':''}`} onClick={()=>setFilterRole(filterRole===r?'Tous':r)}>
                  {ROLES_LABELS[r]||r}
                </button>
              ))}
              <div className="us-sep"/>
              {['Tous','Actif','Inactif'].map(s=>(
                <button key={s} className={`us-fc ${filterStatut===s?'on':''}`} onClick={()=>setFilterStatut(s)}>
                  {s==='Tous'?'État de connexion':s}
                </button>
              ))}
            </div>

            {/* Barre sélection */}
            {selected.length>0&&(
              <div className="us-selbar">
                <span className="us-selbar-txt">{selected.length} utilisateur{selected.length>1?'s':''} sélectionné{selected.length>1?'s':''}</span>
                <button className="us-btn" style={{padding:'5px 11px',fontSize:12}}>Modifier rôles</button>
                <button className="us-btn" style={{padding:'5px 11px',fontSize:12}}>Réinitialiser MDP</button>
                <button className="us-btn us-btn-g" style={{padding:'5px 11px',fontSize:12}} onClick={exportCSV}>Exporter</button>
                <button className="us-btn us-btn-d" style={{padding:'5px 11px',fontSize:12}}>Supprimer</button>
                <button onClick={()=>setSelected([])} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:20,padding:'0 4px',lineHeight:1}}>×</button>
              </div>
            )}

            {/* Table */}
            <div className="us-tw">
              <div className="us-thead-bar">
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>
                    {filtered.length} utilisateur{filtered.length>1?'s':''}{filtered.length!==actifs.length&&` (filtré)`}
                  </span>
                  <div className="us-vtog">
                    <button className={`us-vbtn ${viewMode==='normal'?'active':''}`} onClick={()=>setViewMode('normal')}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>
                      Normal
                    </button>
                    <button className={`us-vbtn ${viewMode==='compact'?'active':''}`} onClick={()=>setViewMode('compact')}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3.75 9h16.5m-16.5 6.75h16.5"/></svg>
                      Compact
                    </button>
                  </div>
                </div>
                <button className="us-btn" style={{padding:'5px 12px',fontSize:12}} onClick={()=>setShowColsPanel(true)}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"/></svg>
                  Choisir les colonnes
                </button>
              </div>

              <div style={{overflowX:'auto'}}>
                <table className="us-table" ref={tableRef}>
                  <thead>
                    <tr>
                      <th style={{width:44}}>
                        <div className={`us-cb ${selected.length===filtered.length&&filtered.length>0?'on':selected.length>0?'half':''}`} onClick={toggleAll}>
                          {selected.length===filtered.length&&filtered.length>0&&<svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                          {selected.length>0&&selected.length<filtered.length&&<div style={{width:8,height:2,background:'#fff',borderRadius:1}}/>}
                        </div>
                      </th>
                      <th style={{width:colWidths['displayName']||220,minWidth:120}}>
                        Nom d'affichage
                        <div className="us-resize-handle" onMouseDown={e=>startResize(e,'displayName')}/>
                      </th>
                      {cols.includes('userPrincipalName')&&(
                        <th style={{width:colWidths['userPrincipalName']||200,minWidth:100}}>
                          Nom d'utilisateur
                          <div className="us-resize-handle" onMouseDown={e=>startResize(e,'userPrincipalName')}/>
                        </th>
                      )}
                      {cols.includes('role')&&(
                        <th style={{width:colWidths['role']||160,minWidth:100}}>
                          Rôle
                          <div className="us-resize-handle" onMouseDown={e=>startResize(e,'role')}/>
                        </th>
                      )}
                      {cols.includes('licenses')&&(
                        <th style={{width:colWidths['licenses']||200,minWidth:120}}>
                          Licences
                          <div className="us-resize-handle" onMouseDown={e=>startResize(e,'licenses')}/>
                        </th>
                      )}
                      {cols.includes('department')&&(
                        <th style={{width:colWidths['department']||140,minWidth:80}}>
                          Département
                          <div className="us-resize-handle" onMouseDown={e=>startResize(e,'department')}/>
                        </th>
                      )}
                      {cols.includes('signInStatus')&&(
                        <th style={{width:colWidths['signInStatus']||120,minWidth:80}}>
                          État de connexion
                          <div className="us-resize-handle" onMouseDown={e=>startResize(e,'signInStatus')}/>
                        </th>
                      )}
                      {cols.includes('firstName')&&<th style={{width:colWidths['firstName']||100,minWidth:80}}>Prénom<div className="us-resize-handle" onMouseDown={e=>startResize(e,'firstName')}/></th>}
                      {cols.includes('lastName')&&<th style={{width:colWidths['lastName']||100,minWidth:80}}>Nom<div className="us-resize-handle" onMouseDown={e=>startResize(e,'lastName')}/></th>}
                      {cols.includes('jobTitle')&&<th style={{width:colWidths['jobTitle']||140,minWidth:80}}>Titre<div className="us-resize-handle" onMouseDown={e=>startResize(e,'jobTitle')}/></th>}
                      {cols.includes('city')&&<th style={{width:colWidths['city']||100,minWidth:80}}>Ville<div className="us-resize-handle" onMouseDown={e=>startResize(e,'city')}/></th>}
                      {cols.includes('country')&&<th style={{width:colWidths['country']||120,minWidth:80}}>Pays<div className="us-resize-handle" onMouseDown={e=>startResize(e,'country')}/></th>}
                      {cols.includes('lastSignIn')&&<th style={{width:colWidths['lastSignIn']||140,minWidth:100}}>Dernière connexion<div className="us-resize-handle" onMouseDown={e=>startResize(e,'lastSignIn')}/></th>}
                      {cols.includes('isGuest')&&<th style={{width:colWidths['isGuest']||80,minWidth:70}}>Invité<div className="us-resize-handle" onMouseDown={e=>startResize(e,'isGuest')}/></th>}
                      <th style={{width:50}}/>
                    </tr>
                  </thead>
                  <tbody>
                    {loading?(
                      <tr><td colSpan={20} style={{textAlign:'center',padding:50,color:'rgba(255,255,255,0.3)'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{animation:'spin 0.8s linear infinite'}}><path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3"/></svg>
                          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                          Chargement...
                        </div>
                      </td></tr>
                    ):filtered.length===0?(
                      <tr><td colSpan={20}>
                        <div className="us-empty">
                          <div className="us-empty-ic">👥</div>
                          <div className="us-empty-t">{search?`Aucun résultat pour "${search}"`:'Aucun utilisateur'}</div>
                          {!search&&<button className="us-btn us-btn-p" style={{margin:'0 auto'}} onClick={()=>navigate('/agence',{state:{openAddUser:true}})}>+ Ajouter un utilisateur</button>}
                        </div>
                      </td></tr>
                    ):filtered.map((u,i)=>{
                      const isSel = selected.includes(u.id)
                      const col = ROLES_COLORS[u.role]||'#0078d4'
                      const avSize = viewMode==='compact' ? 26 : 34
                      const fontSize = viewMode==='compact' ? 10 : 12
                      return (
                        <tr key={i} className={isSel?'sel':''} onClick={()=>{ if(rowMenu!==u.id) setSelectedUser(u); setUserPanelTab('compte') }}>
                          <td onClick={e=>{e.stopPropagation();toggleSelect(u.id)}}>
                            <div className={`us-cb ${isSel?'on':''}`}>
                              {isSel&&<svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                            </div>
                          </td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <div className="us-av" style={{width:avSize,height:avSize,background:`linear-gradient(135deg,${col},${col}88)`,fontSize}}>
                                {getInitials(u)}
                                {viewMode==='normal'&&<div className="us-avdot"/>}
                              </div>
                              <div>
                                <div className="us-uname" style={{fontSize:viewMode==='compact'?12.5:13.5}}>
                                  {u.prenom} {u.nom}
                                  {u.isOwner&&<span className="us-owner">👑</span>}
                                </div>
                                {viewMode==='normal'&&<div className="us-uemail">{u.email||'—'}</div>}
                              </div>
                            </div>
                          </td>
                          {cols.includes('userPrincipalName')&&<td style={{color:'rgba(255,255,255,0.45)',fontSize:12}}>{u.email||'—'}</td>}
                          {cols.includes('role')&&(
                            <td>
                              <span className="us-pill" style={{background:`${col}18`,color:col,fontSize:11}}>
                                {ROLES_LABELS[u.role]||u.role}
                              </span>
                            </td>
                          )}
                          {cols.includes('licenses')&&(
                            <td>
                              {viewMode==='compact'
                                ? <span style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>{(LICENCES[u.role]||['Imoloc Standard'])[0]}</span>
                                : <div className="us-lic">{(LICENCES[u.role]||['Imoloc Standard']).map((l,j)=><div key={j} className="us-li">{l}</div>)}</div>
                              }
                            </td>
                          )}
                          {cols.includes('department')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{u.departement||'—'}</td>}
                          {cols.includes('signInStatus')&&(
                            <td>
                              <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12}}>
                                <span style={{width:7,height:7,borderRadius:'50%',background:!u.statut||u.statut==='actif'?'#00c896':'#f59e0b'}}/>
                                {!u.statut||u.statut==='actif'?'Actif':'Inactif'}
                              </span>
                            </td>
                          )}
                          {cols.includes('firstName')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.55)'}}>{u.prenom||'—'}</td>}
                          {cols.includes('lastName')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.55)'}}>{u.nom||'—'}</td>}
                          {cols.includes('jobTitle')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{u.poste||'—'}</td>}
                          {cols.includes('city')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>—</td>}
                          {cols.includes('country')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{u.pays||'Bénin'}</td>}
                          {cols.includes('lastSignIn')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>{u.derniere_connexion?new Date(u.derniere_connexion).toLocaleDateString('fr-FR'):'—'}</td>}
                          {cols.includes('isGuest')&&<td style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{u.type_compte==='invite'?'Oui':'—'}</td>}
                          <td onClick={e=>e.stopPropagation()} style={{position:'relative'}}>
                            <button className="us-mbtn" onClick={e=>{e.stopPropagation();setRowMenu(rowMenu===u.id?null:u.id)}}>···</button>
                            {rowMenu===u.id&&(
                              <div className="us-dd">
                                <button className="us-ddi" onClick={()=>{setSelectedUser(u);setRowMenu(null)}}>👤 Voir le profil</button>
                                <button className="us-ddi" onClick={()=>setRowMenu(null)}>✏️ Modifier</button>
                                <button className="us-ddi" onClick={()=>setRowMenu(null)}>🔑 Gérer les rôles</button>
                                <button className="us-ddi" onClick={()=>setRowMenu(null)}>🔐 Réinitialiser le MDP</button>
                                <button className="us-ddi" onClick={()=>setRowMenu(null)}>🚫 Bloquer la connexion</button>
                                <div className="us-dds"/>
                                {!u.isOwner&&<button className="us-ddi red" onClick={()=>{setRowMenu(null);handleDelete(u)}}>🗑️ Supprimer</button>}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="us-foot">
                <span>{filtered.length} utilisateur{filtered.length>1?'s':''} affiché{filtered.length>1?'s':''}</span>
                <span>{selected.length>0&&`${selected.length} sélectionné${selected.length>1?'s':''}`}</span>
              </div>
            </div>
          </>
        )}

        {/* ══ PAGE CONTACTS ══ */}
        {tab==='contacts'&&(
          <div className="us-ct">
            <div style={{fontSize:48,marginBottom:18}}>📇</div>
            <div style={{fontSize:20,fontWeight:700,color:'#e6edf3',marginBottom:12}}>Contacts</div>
            <div style={{fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:1.85,marginBottom:24}}>
              Les contacts sont des personnes externes à votre organisation que vous aimeriez que tout le monde puisse trouver. Toutes les personnes répertoriées ici sont disponibles dans <strong style={{color:'rgba(255,255,255,0.7)'}}>Outlook</strong> sous Personnes dans <strong style={{color:'rgba(255,255,255,0.7)'}}>Microsoft 365</strong>.
            </div>
            <div style={{padding:'14px 20px',borderRadius:8,background:'rgba(0,120,212,0.07)',border:'1px solid rgba(0,120,212,0.18)',fontSize:13.5,color:'rgba(255,255,255,0.4)'}}>
              🚧 Fonctionnalité disponible prochainement.
            </div>
          </div>
        )}

        {/* ══ PAGE UTILISATEURS INVITÉS ══ */}
        {tab==='invites'&&(
          <>
            <div className="us-toolbar">
              <button className="us-btn us-btn-p" onClick={()=>setShowInvitePanel(true)}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                Inviter un utilisateur externe
              </button>
              <button className="us-btn" onClick={fetchData}>🔄 Actualiser</button>
              <div className="us-sr">
                <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
                <input placeholder="Rechercher un invité"/>
              </div>
            </div>
            <div className="us-inv-info">
              <span style={{fontSize:18,flexShrink:0}}>ℹ️</span>
              <div>Les utilisateurs invités sont <strong style={{color:'rgba(255,255,255,0.7)'}}>externes</strong> à votre organisation et ont un accès en <strong style={{color:'rgba(255,255,255,0.7)'}}>lecture seule</strong>. Ils ne peuvent pas modifier les données.</div>
            </div>
            <div className="us-tw">
              <table className="us-table" style={{tableLayout:'auto'}}>
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
                        <div className="us-empty-ic">✉️</div>
                        <div className="us-empty-t">Aucun utilisateur invité</div>
                        <div style={{fontSize:13.5,marginBottom:16}}>Invitez des personnes externes en lecture seule</div>
                        <button className="us-btn us-btn-p" style={{margin:'0 auto'}} onClick={()=>setShowInvitePanel(true)}>+ Inviter</button>
                      </div>
                    </td></tr>
                  ):invites.map((inv,i)=>{
                    const exp = new Date(inv.date_expiration)<new Date()
                    const sc = inv.statut==='accepte'?{c:'#00c896',l:'Accepté'}:exp?{c:'#ef4444',l:'Expiré'}:{c:'#f59e0b',l:'En attente'}
                    return (
                      <tr key={i}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div className="us-av" style={{width:32,height:32,background:'rgba(108,99,255,0.2)',color:'#a78bfa',fontSize:11}}>
                              {(inv.prenom?.[0]||'').toUpperCase()}{(inv.nom?.[0]||inv.email?.[0]||'').toUpperCase()}
                            </div>
                            <div>
                              <div className="us-uname" style={{fontSize:13}}>{inv.prenom} {inv.nom}</div>
                              <div className="us-uemail">{inv.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{fontSize:12.5,color:'rgba(255,255,255,0.5)'}}>{inv.organisation_externe||'—'}</td>
                        <td style={{fontSize:12.5,color:'rgba(255,255,255,0.5)'}}>{new Date(inv.date_invitation).toLocaleDateString('fr-FR')}</td>
                        <td style={{fontSize:12.5,color:exp?'#ef4444':'rgba(255,255,255,0.5)'}}>{new Date(inv.date_expiration).toLocaleDateString('fr-FR')}</td>
                        <td><span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12.5,color:sc.c,fontWeight:500}}><span style={{width:7,height:7,borderRadius:'50%',background:sc.c}}/>{sc.l}</span></td>
                        <td>
                          <button className="us-mbtn" onClick={async()=>{if(confirm('Supprimer cette invitation ?')){await supabase.from('utilisateurs_invites').delete().eq('id',inv.id);fetchData();toast.success('Invitation supprimée')}}}>🗑️</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══ PAGE UTILISATEURS SUPPRIMÉS ══ */}
        {tab==='supprimes'&&(
          <>
            <div style={{padding:'13px 16px',borderRadius:8,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)',fontSize:13.5,color:'rgba(255,255,255,0.45)',lineHeight:1.7,marginBottom:20,display:'flex',gap:10,maxWidth:700}}>
              <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
              <div>Les utilisateurs supprimés sont conservés <strong style={{color:'rgba(255,255,255,0.7)'}}>30 jours</strong> avant suppression définitive. Restaurez-les ou supprimez-les définitivement.</div>
            </div>
            {supprimes.length===0?(
              <div className="us-empty">
                <div className="us-empty-ic">🗑️</div>
                <div className="us-empty-t">La corbeille est vide</div>
                <div>Les utilisateurs supprimés apparaissent ici pendant 30 jours</div>
              </div>
            ):supprimes.map((sup,i)=>{
              const jr = Math.max(0,Math.ceil((new Date(sup.date_suppression_definitive)-new Date())/(1000*60*60*24)))
              return (
                <div key={i} className="us-sup">
                  <div className="us-av" style={{width:38,height:38,background:'rgba(239,68,68,0.12)',color:'#ef4444',fontSize:13,flexShrink:0}}>
                    {(sup.prenom?.[0]||'').toUpperCase()}{(sup.nom?.[0]||'').toUpperCase()||'?'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:2}}>{sup.prenom} {sup.nom}</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>{sup.email} · {ROLES_LABELS[sup.role]||sup.role}</div>
                    <div style={{fontSize:11.5,color:jr<=7?'#ef4444':'#f59e0b',marginTop:3,display:'flex',alignItems:'center',gap:4}}>
                      {jr<=7?'🔴':'⏱️'} Suppression définitive dans {jr} jour{jr>1?'s':''}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8,flexShrink:0}}>
                    <button className="us-btn us-btn-g" onClick={()=>handleRestore(sup)}>↩️ Restaurer</button>
                    <button className="us-btn us-btn-d" onClick={async()=>{if(confirm('Supprimer définitivement ?')){await supabase.from('utilisateurs_supprimes').delete().eq('id',sup.id);toast.success('Supprimé définitivement');fetchData()}}}>🗑️ Supprimer définitivement</button>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* ══ DRAWER DÉTAIL UTILISATEUR ══ */}
      {selectedUser&&(
        <div className="ud-ov" onClick={e=>e.target===e.currentTarget&&setSelectedUser(null)}>
          <div className="ud-panel">
            <div className="ud-head">
              <div className="ud-head-top">
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div className="ud-av" style={{background:`linear-gradient(135deg,${ROLES_COLORS[selectedUser.role]||'#0078d4'},${ROLES_COLORS[selectedUser.role]||'#0078d4'}88)`}}>
                    {getInitials(selectedUser)}
                  </div>
                  <div>
                    <div className="ud-name">{selectedUser.prenom} {selectedUser.nom}</div>
                    <div className="ud-role">{selectedUser.email}</div>
                    <div style={{marginTop:4}}>
                      <span className="us-pill" style={{background:`${ROLES_COLORS[selectedUser.role]||'#0078d4'}18`,color:ROLES_COLORS[selectedUser.role]||'#0078d4',fontSize:11}}>
                        {ROLES_LABELS[selectedUser.role]||selectedUser.role}
                      </span>
                      {selectedUser.isOwner&&<span className="us-owner" style={{marginLeft:6}}>👑 Propriétaire</span>}
                    </div>
                  </div>
                </div>
                <button className="up-cls" onClick={()=>setSelectedUser(null)}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="ud-quick">
                <button className="ud-qa">🔑 Réinitialiser le mot de passe</button>
                <button className="ud-qa">🚫 Bloquer la connexion</button>
                {!selectedUser.isOwner&&<button className="ud-qa red" onClick={()=>handleDelete(selectedUser)}>❌ Supprimer</button>}
              </div>
              <div className="ud-tabs">
                {['compte','appareils','licences','courrier','onedrive'].map(t=>(
                  <button key={t} className={`ud-tab ${userPanelTab===t?'active':''}`} onClick={()=>setUserPanelTab(t)}>
                    {{compte:'Compte',appareils:'Appareils',licences:'Licences et applications',courrier:'Courrier',onedrive:'OneDrive'}[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="ud-body">
              {/* ── Onglet Compte ── */}
              {userPanelTab==='compte'&&(
                <>
                  <div className="ud-section">
                    <div className="ud-sh">
                      Identité
                      <button className="ud-sa">Gérer le nom d'utilisateur</button>
                    </div>
                    <div className="ud-row"><span className="ud-rk">Nom d'utilisateur</span><span className="ud-rv">{selectedUser.email||'—'}</span></div>
                    <div className="ud-row"><span className="ud-rk">Prénom</span><span className="ud-rv">{selectedUser.prenom||'—'}</span></div>
                    <div className="ud-row"><span className="ud-rk">Nom</span><span className="ud-rv">{selectedUser.nom||'—'}</span></div>
                    <div className="ud-row"><span className="ud-rk">Type de compte</span><span className="ud-rv">{selectedUser.type_compte||'Organisation'}</span></div>
                  </div>

                  <div className="ud-section">
                    <div className="ud-sh">
                      Activité
                      <button className="ud-sa">Afficher les 7 derniers jours</button>
                    </div>
                    <div className="ud-row"><span className="ud-rk">Dernière connexion</span><span className="ud-rv">{selectedUser.derniere_connexion?new Date(selectedUser.derniere_connexion).toLocaleDateString('fr-FR'):<span style={{color:'rgba(255,255,255,0.3)',fontStyle:'italic'}}>Jamais connecté</span>}</span></div>
                    <div className="ud-row"><span className="ud-rk">Statut</span>
                      <span className="ud-rv" style={{display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}>
                        <span style={{width:8,height:8,borderRadius:'50%',background:!selectedUser.statut||selectedUser.statut==='actif'?'#00c896':'#f59e0b'}}/>
                        {!selectedUser.statut||selectedUser.statut==='actif'?'Actif':'Inactif'}
                      </span>
                    </div>
                    <div className="ud-row"><span className="ud-rk">Membre depuis</span><span className="ud-rv">{selectedUser.created_at?new Date(selectedUser.created_at).toLocaleDateString('fr-FR'):'—'}</span></div>
                  </div>

                  <div className="ud-section">
                    <div className="ud-sh">
                      Sécurité
                      <button className="ud-sa">Gérer</button>
                    </div>
                    <div className="ud-row"><span className="ud-rk">Email de secours</span><span className="ud-rv"><a href="#">Ajouter une adresse</a></span></div>
                    <div className="ud-row"><span className="ud-rk">Sessions actives</span><span className="ud-rv"><a href="#">Déconnecter de toutes les sessions</a></span></div>
                    <div className="ud-row"><span className="ud-rk">MFA</span><span className="ud-rv" style={{color:'rgba(255,255,255,0.35)',fontStyle:'italic'}}>Non configuré</span></div>
                  </div>

                  <div className="ud-section">
                    <div className="ud-sh">
                      Organisation
                      <button className="ud-sa">Gérer les équipes</button>
                    </div>
                    <div className="ud-row"><span className="ud-rk">Agence</span><span className="ud-rv">{agence?.nom||'—'}</span></div>
                    <div className="ud-row"><span className="ud-rk">Département</span><span className="ud-rv">{selectedUser.departement||<span style={{color:'rgba(255,255,255,0.3)',fontStyle:'italic'}}>Non renseigné</span>}</span></div>
                    <div className="ud-row"><span className="ud-rk">Poste</span><span className="ud-rv">{selectedUser.poste||<span style={{color:'rgba(255,255,255,0.3)',fontStyle:'italic'}}>Non renseigné</span>}</span></div>
                  </div>

                  <div className="ud-section">
                    <div className="ud-sh">
                      Rôles
                      <button className="ud-sa">Gérer les rôles</button>
                    </div>
                    {selectedUser.isOwner ? (
                      <div style={{padding:'12px 14px',borderRadius:8,background:'rgba(0,120,212,0.07)',border:'1px solid rgba(0,120,212,0.18)',fontSize:13.5,color:'rgba(255,255,255,0.65)'}}>
                        👑 <strong style={{color:'#4da6ff'}}>Administrateur global</strong> — Accès complet à tous les paramètres et fonctionnalités de l'organisation.
                      </div>
                    ):(
                      <>
                        {selectedUser.role==='lecteur'
                          ? <div className="ud-no-admin">Aucun accès administrateur</div>
                          : <div style={{padding:'12px 14px',borderRadius:8,background:`${ROLES_COLORS[selectedUser.role]||'#0078d4'}0f`,border:`1px solid ${ROLES_COLORS[selectedUser.role]||'#0078d4'}25`,fontSize:13.5,color:'rgba(255,255,255,0.65)'}}>
                              <span style={{color:ROLES_COLORS[selectedUser.role]||'#0078d4',fontWeight:600}}>{ROLES_LABELS[selectedUser.role]||selectedUser.role}</span>
                            </div>
                        }
                      </>
                    )}
                  </div>

                  <div className="ud-section">
                    <div className="ud-sh">Informations de contact</div>
                    <div className="ud-row"><span className="ud-rk">Nom d'affichage</span><span className="ud-rv">{selectedUser.prenom} {selectedUser.nom}</span></div>
                    <div className="ud-row"><span className="ud-rk">Email</span><span className="ud-rv">{selectedUser.email||'—'}</span></div>
                    <div className="ud-row"><span className="ud-rk">Téléphone</span><span className="ud-rv">{selectedUser.telephone||<a href="#">Ajouter</a>}</span></div>
                    <div className="ud-row"><span className="ud-rk">Lieu</span><span className="ud-rv">{selectedUser.pays||'Bénin'}</span></div>
                  </div>
                </>
              )}

              {/* ── Onglet Appareils ── */}
              {userPanelTab==='appareils'&&(
                <div className="ud-empty-tab">
                  <div style={{fontSize:36,marginBottom:12,opacity:0.3}}>💻</div>
                  <div style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Aucun appareil enregistré</div>
                  <div>Les appareils connectés de cet utilisateur apparaîtront ici.</div>
                </div>
              )}

              {/* ── Onglet Licences ── */}
              {userPanelTab==='licences'&&(
                <div className="ud-section">
                  <div className="ud-sh">Licences Imoloc</div>
                  {(LICENCES[selectedUser.role]||['Imoloc Standard']).map((l,i)=>(
                    <div key={i} className="ud-card">
                      <div className="ud-group-av" style={{background:'rgba(0,120,212,0.12)',color:'#4da6ff'}}>📦</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3',marginBottom:2}}>{l}</div>
                        <div style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>Actif · Attribué via le rôle</div>
                      </div>
                      <span style={{width:8,height:8,borderRadius:'50%',background:'#00c896',flexShrink:0}}/>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Onglets Courrier & OneDrive ── */}
              {(userPanelTab==='courrier'||userPanelTab==='onedrive')&&(
                <div className="ud-empty-tab">
                  <div style={{fontSize:36,marginBottom:12,opacity:0.3}}>{userPanelTab==='courrier'?'📧':'☁️'}</div>
                  <div style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,0.4)',marginBottom:8}}>
                    {userPanelTab==='courrier'?'Courrier':'OneDrive'}
                  </div>
                  <div>Fonctionnalité disponible prochainement.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ PANEL CHOIX COLONNES ══ */}
      {showColsPanel&&(
        <div className="up-ov" onClick={e=>e.target===e.currentTarget&&setShowColsPanel(false)}>
          <div className="up-panel">
            <div className="up-head">
              <span className="up-title">Choisir les colonnes</span>
              <button className="up-cls" onClick={()=>setShowColsPanel(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="up-body">
              <div className="up-desc">Sélectionnez et réorganisez les colonnes à afficher. Faites glisser les en-têtes du tableau pour redimensionner les colonnes.</div>
              {ALL_COLS.map(col=>(
                <div key={col.key} className="up-item">
                  <span className={`up-lbl ${col.disabled?'dis':''}`}>{col.label}</span>
                  <div
                    className={`up-cb ${cols.includes(col.key)?'on':''} ${col.disabled?'dis':''}`}
                    onClick={()=>{
                      if (col.disabled) return
                      setCols(c=>c.includes(col.key)?c.filter(x=>x!==col.key):[...c,col.key])
                    }}>
                    {cols.includes(col.key)&&<svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                  </div>
                </div>
              ))}
            </div>
            <div className="up-foot">
              <button className="up-fbtn up-fbtn-g" onClick={()=>{setCols(DEFAULT_COLS);setColWidths({})}}>Rétablir</button>
              <button className="up-fbtn up-fbtn-b" onClick={()=>setShowColsPanel(false)}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PANEL INVITATION ══ */}
      {showInvitePanel&&(
        <div className="ui-ov" onClick={e=>e.target===e.currentTarget&&setShowInvitePanel(false)}>
          <div className="ui-panel">
            <div className="ui-head">
              <span style={{fontSize:16,fontWeight:700,color:'#e6edf3'}}>Inviter un utilisateur externe</span>
              <button className="up-cls" onClick={()=>setShowInvitePanel(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="ui-body">
              <div style={{padding:'12px 14px',borderRadius:7,background:'rgba(0,120,212,0.07)',border:'1px solid rgba(0,120,212,0.18)',fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.65,marginBottom:20,display:'flex',gap:10}}>
                <span style={{fontSize:18,flexShrink:0}}>ℹ️</span>
                <div>Les utilisateurs invités sont <strong style={{color:'rgba(255,255,255,0.7)'}}>externes</strong> à votre organisation avec un accès en <strong style={{color:'rgba(255,255,255,0.7)'}}>lecture seule</strong> uniquement.</div>
              </div>
              <form id="invite-form" onSubmit={handleInvite}>
                <div className="ui-f">
                  <label className="ui-l">Email <span style={{color:'#ef4444'}}>*</span></label>
                  <input className="ui-i" type="email" required value={inviteForm.email} onChange={e=>setInviteForm(f=>({...f,email:e.target.value}))} placeholder="email@exemple.com" autoFocus/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="ui-f">
                    <label className="ui-l">Prénom</label>
                    <input className="ui-i" value={inviteForm.prenom} onChange={e=>setInviteForm(f=>({...f,prenom:e.target.value}))} placeholder="Jean"/>
                  </div>
                  <div className="ui-f">
                    <label className="ui-l">Nom</label>
                    <input className="ui-i" value={inviteForm.nom} onChange={e=>setInviteForm(f=>({...f,nom:e.target.value}))} placeholder="Dupont"/>
                  </div>
                </div>
                <div className="ui-f">
                  <label className="ui-l">Organisation externe</label>
                  <input className="ui-i" value={inviteForm.organisation} onChange={e=>setInviteForm(f=>({...f,organisation:e.target.value}))} placeholder="Nom de l'entreprise"/>
                </div>
                <div className="ui-f">
                  <label className="ui-l">Message <span style={{color:'rgba(255,255,255,0.3)',fontWeight:400}}>(optionnel)</span></label>
                  <textarea className="ui-ta" value={inviteForm.message} onChange={e=>setInviteForm(f=>({...f,message:e.target.value}))} placeholder="Message personnalisé..."/>
                </div>
              </form>
            </div>
            <div className="ui-foot">
              <button className="ui-fb ui-fb-g" onClick={()=>setShowInvitePanel(false)}>Annuler</button>
              <button className="ui-fb ui-fb-b" form="invite-form" type="submit" disabled={inviting}>{inviting?'Envoi...':'Envoyer l\'invitation'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
