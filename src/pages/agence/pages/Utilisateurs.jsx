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
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [showBulkPanel, setShowBulkPanel] = useState(false)
  const [addForm, setAddForm] = useState({ prenom:'', nom:'', email:'', role:'agent', poste:'', departement:'' })
  const [adding, setAdding] = useState(false)
  const [bulkRows, setBulkRows] = useState([
    { prenom:'', nom:'', email:'', role:'agent' },
    { prenom:'', nom:'', email:'', role:'agent' },
  ])
  const [bulkAdding, setBulkAdding] = useState(false)
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

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!agence?.id) return toast.error('Aucune agence trouvée')
    setAdding(true)
    try {
      // Créer le profil
      const { data:{ user:cu } } = await supabase.auth.getUser()
      const { data:newProfile, error:pErr } = await supabase.from('profiles').insert({
        email: addForm.email,
        nom: addForm.nom,
        prenom: addForm.prenom,
        role: addForm.role,
        type_compte: 'organisation',
        statut: 'actif',
      }).select().single()
      if (pErr) throw pErr

      // Lier à l'agence
      await supabase.from('agence_users').insert({
        agence_id: agence.id,
        user_id: newProfile.id,
        email: addForm.email,
        nom: addForm.nom,
        prenom: addForm.prenom,
        role: addForm.role,
        poste: addForm.poste,
        departement: addForm.departement,
      })

      // Envoyer invitation email
      await fetch('https://zecyfnurrcslukxvmpca.supabase.co/functions/v1/send-invitation', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          email: addForm.email,
          prenom: addForm.prenom,
          nom: addForm.nom,
          agenceName: agence.nom,
          role: ROLES_LABELS[addForm.role]||addForm.role,
          loginUrl: window.location.origin+'/login',
        })
      })

      toast.success(`✅ ${addForm.prenom} ${addForm.nom} ajouté avec succès !`)
      setAddForm({ prenom:'', nom:'', email:'', role:'agent', poste:'', departement:'' })
      setShowAddPanel(false)
      fetchData()
    } catch(e) {
      console.error(e)
      toast.error(e.message||"Erreur lors de l'ajout")
    } finally { setAdding(false) }
  }

  const handleBulkAdd = async () => {
    const validRows = bulkRows.filter(r=>r.email&&r.prenom)
    if (!validRows.length) return toast.error('Remplissez au moins une ligne complète')
    if (!agence?.id) return toast.error('Aucune agence trouvée')
    setBulkAdding(true)
    let success = 0, errors = 0
    for (const row of validRows) {
      try {
        const { data:np } = await supabase.from('profiles').insert({
          email:row.email, nom:row.nom, prenom:row.prenom,
          role:row.role, type_compte:'organisation', statut:'actif',
        }).select().single()
        if (np) {
          await supabase.from('agence_users').insert({
            agence_id:agence.id, user_id:np.id,
            email:row.email, nom:row.nom, prenom:row.prenom, role:row.role,
          })
          success++
        }
      } catch(e) { errors++ }
    }
    toast.success(`✅ ${success} utilisateur(s) ajouté(s)${errors>0?' · '+errors+' erreur(s)':''}`)
    setBulkRows([{prenom:'',nom:'',email:'',role:'agent'},{prenom:'',nom:'',email:'',role:'agent'}])
    setShowBulkPanel(false)
    fetchData()
    setBulkAdding(false)
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
        .ud-panel{width:920px;height:100%;background:#161b22;border-left:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;animation:up-sl 0.22s ease;overflow:hidden}
        .ud-head{padding:32px 36px 0;background:linear-gradient(135deg,rgba(0,120,212,0.06),rgba(108,99,255,0.04));border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .ud-head-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px}
        .ud-av{width:86px;height:86px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800;color:#fff;flex-shrink:0}
        .ud-name{font-size:26px;font-weight:700;color:#e6edf3;margin-bottom:6px}
        .ud-role{font-size:12px;color:rgba(255,255,255,0.4)}
        .ud-quick{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px}
        .ud-qa{display:none}
        
        
        .ud-tabs{display:flex;overflow-x:visible;gap:0;flex-wrap:wrap}
        .ud-tab{padding:12px 20px;font-size:14px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;white-space:nowrap}
        .ud-tab:hover{color:rgba(255,255,255,0.75)}.ud-tab.active{color:#e6edf3;border-bottom-color:#0078d4}
        .ud-body{flex:1;overflow-y:auto;padding:32px 36px}
        .ud-body::-webkit-scrollbar{width:4px}
        .ud-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .ud-section{margin-bottom:40px}
        .ud-grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:0}
        .ud-field{display:flex;flex-direction:column;gap:6px;padding:14px 16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;transition:all 0.15s}
        .ud-field:hover{border-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.04)}
        .ud-field-lbl{font-size:12px;color:rgba(255,255,255,0.35);font-weight:500;text-transform:uppercase;letter-spacing:0.06em}
        .ud-field-val{font-size:14.5px;color:#e6edf3;font-weight:500}
        .ud-field-val a{color:#4da6ff;text-decoration:none}.ud-field-val a:hover{text-decoration:underline}
        .ud-field-val.empty{color:rgba(255,255,255,0.25);font-style:italic;font-weight:400}
        .ud-device-card{display:flex;align-items:center;gap:14px;padding:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;margin-bottom:10px;transition:all 0.15s}
        .ud-device-card:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.05)}
        .ud-device-icon{width:44px;height:44px;border-radius:10px;background:rgba(0,120,212,0.12);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
        .ud-device-name{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:3px}
        .ud-device-meta{font-size:12px;color:rgba(255,255,255,0.35)}
        .ud-device-status{display:flex;align-items:center;gap:5px;font-size:12px;color:#00c896;margin-top:3px}
        .ud-revoke-btn{margin-left:auto;padding:7px 14px;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;border:1px solid rgba(239,68,68,0.25);background:rgba(239,68,68,0.07);color:#ef4444;font-family:Inter,sans-serif;transition:all 0.15s;flex-shrink:0}
        .ud-revoke-btn:hover{background:rgba(239,68,68,0.15)}
        .ud-mail-card{display:flex;align-items:center;gap:12px;padding:14px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;margin-bottom:10px;transition:all 0.15s}
        .ud-mail-card:hover{border-color:rgba(255,255,255,0.12)}
        .ud-mail-icon{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
        .ud-add-btn{display:flex;align-items:center;gap:8px;padding:11px 16px;border-radius:8px;border:1.5px dashed rgba(255,255,255,0.1);background:none;color:rgba(255,255,255,0.4);font-family:Inter,sans-serif;font-size:13.5px;cursor:pointer;transition:all 0.15s;width:100%}
        .ud-add-btn:hover{border-color:rgba(0,120,212,0.4);color:#4da6ff;background:rgba(0,120,212,0.05)}
        .ud-file-card{display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:8px;transition:all 0.15s;cursor:pointer}
        .ud-file-card:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.05)}
        .ud-file-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
        .ud-file-name{font-size:13.5px;font-weight:500;color:#e6edf3;margin-bottom:2px}
        .ud-file-meta{font-size:11.5px;color:rgba(255,255,255,0.3)}
        .ud-file-dl{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);padding:5px;border-radius:5px;transition:all 0.1s;display:flex;flex-shrink:0}
        .ud-file-dl:hover{background:rgba(255,255,255,0.08);color:#e6edf3}
        .ud-drive-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .ud-drive-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px}
        .ud-drive-stat{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px 14px;text-align:center}
        .ud-sh{font-size:13px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between}
        .ud-sa{font-size:12px;color:#4da6ff;cursor:pointer;text-transform:none;letter-spacing:0;font-weight:500;background:none;border:none;font-family:'Inter',sans-serif}
        .ud-sa:hover{text-decoration:underline}
        .ud-row{display:flex;align-items:flex-start;justify-content:space-between;padding:15px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .ud-row:last-child{border-bottom:none}
        .ud-rk{font-size:14px;color:rgba(255,255,255,0.4);flex-shrink:0;width:200px}
        .ud-rv{font-size:14.5px;color:#e6edf3;font-weight:500;text-align:right;flex:1;word-break:break-word}
        .ud-rv a{color:#4da6ff;text-decoration:none}.ud-rv a:hover{text-decoration:underline}
        .ud-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;transition:all 0.15s;cursor:pointer}
        .ud-card:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.05)}
        .ud-group-av{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
        .ud-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;font-size:12px;font-weight:600}
        .ud-no-admin{font-size:13.5px;color:rgba(255,255,255,0.45);font-style:italic}
        .ud-empty-tab{text-align:center;padding:40px;color:rgba(255,255,255,0.25);font-size:13.5px}
        .ud-field-lbl2{font-size:14px;font-weight:600;color:#e6edf3;margin-bottom:4px}
        .ud-field-val2{font-size:13.5px;color:rgba(255,255,255,0.55);margin-bottom:5px;line-height:1.5}
        .ud-link{font-size:13px;color:#0078d4;text-decoration:none;display:inline-block;cursor:pointer}
        .ud-link:hover{text-decoration:underline}
        .ud-progress{height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden}
        .ud-progress-fill{height:100%;border-radius:2px;background:#0078d4}
        .ud-accord{border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;margin-bottom:8px}
        .ud-accord-head{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;cursor:pointer;transition:background 0.15s;font-size:14px;font-weight:600;color:#e6edf3}
        .ud-accord-head:hover{background:rgba(255,255,255,0.04)}
        .ud-accord-body{padding:4px 16px 14px;border-top:1px solid rgba(255,255,255,0.06)}
        .ud-lic-item{display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .ud-lic-item:last-child{border-bottom:none}
        .ud-lic-cb{width:17px;height:17px;border-radius:3px;background:#0078d4;border:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
        .ud-blk{display:flex;flex-direction:column;gap:3px;margin-bottom:28px}
        .ud-section-title{font-size:15px;font-weight:700;color:#e6edf3;margin-bottom:20px}
        .ud-divider{height:1px;background:rgba(255,255,255,0.07);margin:24px 0}

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
              <button className="us-btn us-btn-p" onClick={()=>setShowAddPanel(true)}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                Ajouter un utilisateur
              </button>
              <button className="us-btn" onClick={()=>{
                const csv = 'Prenom,Nom,Email,Role\nJean,Dupont,jean@exemple.com,agent'
                const blob = new Blob([csv],{type:'text/csv'})
                const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='modele_utilisateurs.csv'; a.click()
                toast.success('Modèle CSV téléchargé !')
              }}>📋 Modèles</button>
              <button className="us-btn" onClick={()=>setShowBulkPanel(true)}>👥 Ajouter plusieurs</button>
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
              <div style={{display:'flex',alignItems:'center',gap:24,marginBottom:20,flexWrap:'wrap'}}>
                <span style={{display:'flex',alignItems:'center',gap:8,fontSize:13.5,color:'rgba(255,255,255,0.8)',cursor:'pointer'}}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/></svg>
                  Réinitialiser le mot de passe
                </span>
                <span style={{display:'flex',alignItems:'center',gap:8,fontSize:13.5,color:'rgba(255,255,255,0.8)',cursor:'pointer'}}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                  Bloquer la connexion
                </span>
                {!selectedUser.isOwner&&(
                  <span style={{display:'flex',alignItems:'center',gap:8,fontSize:13.5,color:'rgba(255,255,255,0.8)',cursor:'pointer'}} onClick={()=>handleDelete(selectedUser)}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"/></svg>
                    Supprimer l'utilisateur
                  </span>
                )}
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
                  {/* Grille 2 colonnes - ZÉRO carte */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 2.5rem',marginBottom:32}}>

                    {/* Colonne gauche */}
                    <div>
                      <div className="ud-blk">
                        <div className="ud-field-lbl2">Nom d'utilisateur et adresse électronique</div>
                        <div className="ud-field-val2">{selectedUser.email||'—'}</div>
                        <a href="#" className="ud-link">Gérer le nom d'utilisateur et le courrier</a>
                      </div>
                      <div className="ud-blk">
                        <div className="ud-field-lbl2">Dernière connexion</div>
                        <div className="ud-field-val2">{selectedUser.derniere_connexion?new Date(selectedUser.derniere_connexion).toLocaleDateString('fr-FR'):'Jamais connecté'}</div>
                        <a href="#" className="ud-link">Afficher les 7 derniers jours</a>
                      </div>
                      <div className="ud-blk">
                        <div className="ud-field-lbl2">Adresse email de secours</div>
                        <div className="ud-field-val2">Aucune adresse fournie</div>
                        <a href="#" className="ud-link">Ajouter une adresse email de secours</a>
                      </div>
                      <div className="ud-blk">
                        <div className="ud-field-lbl2">Rôles</div>
                        <div className="ud-field-val2">
                          {selectedUser.isOwner?'Administrateur global':ROLES_LABELS[selectedUser.role]||selectedUser.role}
                        </div>
                        <a href="#" className="ud-link">Gérer les rôles</a>
                      </div>
                    </div>

                    {/* Colonne droite */}
                    <div>
                      <div className="ud-blk">
                        <div className="ud-field-lbl2">Alias</div>
                        <div className="ud-field-val2">Aucun alias configuré</div>
                        <a href="#" className="ud-link">Gérer le nom d'utilisateur et le courrier</a>
                      </div>
                      <div className="ud-blk">
                        <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                          <div className="ud-field-lbl2" style={{marginBottom:0}}>Déconnexion</div>
                          <span style={{fontSize:15,color:'rgba(255,255,255,0.35)',lineHeight:1}}>ⓘ</span>
                        </div>
                        <div className="ud-field-val2">Signer l'utilisateur à partir de toutes les sessions Microsoft 365 actives.</div>
                        <a href="#" className="ud-link">Déconnectez-vous de toutes les sessions</a>
                      </div>
                      <div className="ud-blk">
                        <div className="ud-field-lbl2">Groupes</div>
                        <div style={{marginBottom:6}}>
                          {[agence?.nom||'Organisation principale','Tous les utilisateurs'].map((g,i)=>(
                            <div key={i} className="ud-field-val2" style={{marginBottom:2}}>{g}</div>
                          ))}
                        </div>
                        <a href="#" className="ud-link">Gérer les groupes</a>
                      </div>
                      <div className="ud-blk">
                        <div className="ud-field-lbl2">Responsable</div>
                        <div className="ud-field-val2">Non renseigné</div>
                        <a href="#" className="ud-link">Modifier le responsable</a>
                      </div>
                    </div>
                  </div>

                  {/* Séparateur */}
                  <div className="ud-divider"/>

                  {/* Informations de contact */}
                  <div style={{marginBottom:28}}>
                    <div className="ud-section-title">Informations de contact</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 2.5rem'}}>
                      <div>
                        <div className="ud-blk">
                          <div className="ud-field-lbl2">Nom d'affichage</div>
                          <div className="ud-field-val2">{selectedUser.prenom} {selectedUser.nom}</div>
                        </div>
                        <div className="ud-blk">
                          <div className="ud-field-lbl2">Numéro de téléphone</div>
                          <div className="ud-field-val2">{selectedUser.telephone||'Non renseigné'}</div>
                          <a href="#" className="ud-link">Ajouter un numéro de téléphone</a>
                        </div>
                      </div>
                      <div>
                        <div className="ud-blk">
                          <div className="ud-field-lbl2">Prénom</div>
                          <div className="ud-field-val2">{selectedUser.prenom||'—'}</div>
                        </div>
                        <div className="ud-blk">
                          <div className="ud-field-lbl2">Nom</div>
                          <div className="ud-field-val2">{selectedUser.nom||'—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Séparateur */}
                  <div className="ud-divider"/>

                  {/* Activations & MFA */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 2.5rem'}}>
                    <div className="ud-blk">
                      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                        <div className="ud-field-lbl2" style={{marginBottom:0}}>Activations Imoloc</div>
                        <span style={{fontSize:15,color:'rgba(255,255,255,0.35)'}}>ⓘ</span>
                      </div>
                      <a href="#" className="ud-link">Afficher les activations</a>
                    </div>
                    <div className="ud-blk">
                      <div className="ud-field-lbl2">Authentification multifacteur</div>
                      <div className="ud-field-val2">Non configuré</div>
                      <a href="#" className="ud-link">Gérer l'authentification multifacteur</a>
                    </div>
                  </div>
                </>
              )}

              {/* ── Onglet Appareils ── */}
              {userPanelTab==='appareils'&&(
                <>
                  <div className="ud-section">
                    <div className="ud-sh">
                      Appareils connectés
                      <button className="ud-sa">Tout révoquer</button>
                    </div>
                    {[
                      {ic:'💻',name:'Kali Linux — Chrome',type:'Navigateur web',loc:'Cotonou, Bénin',last:'Maintenant',active:true},
                      {ic:'📱',name:'Android — Samsung Galaxy',type:'Application mobile',loc:'Abomey-Calavi, Bénin',last:'Il y a 2 heures',active:false},
                    ].map((d,i)=>(
                      <div key={i} className="ud-device-card">
                        <div className="ud-device-icon">{d.ic}</div>
                        <div style={{flex:1}}>
                          <div className="ud-device-name">{d.name}</div>
                          <div className="ud-device-meta">{d.type} · {d.loc}</div>
                          <div className="ud-device-status">
                            <span style={{width:7,height:7,borderRadius:'50%',background:d.active?'#00c896':'rgba(255,255,255,0.25)'}}/>
                            {d.active?'Session active':'Dernière activité : '+d.last}
                          </div>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                          <button className="ud-revoke-btn">Révoquer l'accès</button>
                          {d.active&&<button className="ud-revoke-btn" style={{borderColor:'rgba(245,158,11,0.25)',background:'rgba(245,158,11,0.07)',color:'#f59e0b'}}>Fermer la session</button>}
                        </div>
                      </div>
                    ))}
                    <button className="ud-add-btn" style={{marginTop:10}}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                      Ajouter un appareil approuvé
                    </button>
                  </div>
                </>
              )}

              {/* ── Onglet Licences ── */}
              {userPanelTab==='licences'&&(
                <>
                  {/* Bannière info */}
                  <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,marginBottom:22}}>
                    <span style={{fontSize:16,flexShrink:0}}>ⓘ</span>
                    <div style={{flex:1,fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>
                      Les licences sont attribuées automatiquement selon le rôle de l'utilisateur dans l'organisation.
                      <a href="#" className="ud-link" style={{marginLeft:8}}>Gérer les abonnements</a>
                    </div>
                    <button style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:16,padding:4}}>×</button>
                  </div>

                  {/* Sélecteur lieu */}
                  <div style={{marginBottom:22}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#e6edf3',marginBottom:8}}>
                      Sélectionner un lieu <span style={{color:'#ef4444'}}>*</span>
                    </div>
                    <select style={{width:'100%',padding:'9px 13px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:5,color:'#e6edf3',fontFamily:'Inter',fontSize:14,outline:'none'}}>
                      <option value="BJ">Bénin</option>
                      <option value="TG">Togo</option>
                      <option value="CI">Côte d'Ivoire</option>
                      <option value="SN">Sénégal</option>
                      <option value="FR">France</option>
                    </select>
                  </div>

                  {/* Accordéon Licences */}
                  <div className="ud-accord">
                    <div className="ud-accord-head">
                      <span>Licences ({(LICENCES[selectedUser.role]||['Imoloc Standard']).length})</span>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/></svg>
                    </div>
                    <div className="ud-accord-body">
                      {(LICENCES[selectedUser.role]||['Imoloc Standard']).map((l,i)=>(
                        <div key={i} className="ud-lic-item">
                          <div className="ud-lic-cb">
                            <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                          </div>
                          <div>
                            <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:3}}>{l}</div>
                            <div style={{fontSize:12.5,color:'rgba(255,255,255,0.35)'}}>Attribué · 1 licence utilisée</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accordéon Applications */}
                  <div className="ud-accord">
                    <div className="ud-accord-head">
                      <span>Applications (3)</span>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
                    </div>
                  </div>

                  <button style={{marginTop:20,padding:'10px 22px',background:'#0078d4',border:'none',borderRadius:5,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'Inter'}}>
                    Enregistrer les modifications
                  </button>
                </>
              )}

              {/* ── Onglet Courrier ── */}
              {userPanelTab==='courrier'&&(
                <>
                  {/* Jauge stockage */}
                  <div style={{marginBottom:28}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                      <span style={{fontSize:13.5,fontWeight:600,color:'#e6edf3'}}>Stockage de la boîte aux lettres</span>
                      <span style={{fontSize:13,color:'rgba(255,255,255,0.45)'}}>0.1% (50 Mo / 50 Go)</span>
                    </div>
                    <div className="ud-progress"><div className="ud-progress-fill" style={{width:'0.1%'}}/></div>
                    <a href="#" className="ud-link" style={{marginTop:6,display:'inline-block',fontSize:12.5}}>En savoir plus sur le stockage</a>
                  </div>

                  {/* Grille 2 colonnes */}
                  <div className="ud-grid2" style={{marginBottom:28}}>
                    {/* Col 1 */}
                    <div style={{display:'flex',flexDirection:'column',gap:22}}>
                      <div>
                        <div className="ud-field-lbl2">Adresse email principale</div>
                        <div className="ud-field-val2">{selectedUser.email||'—'}</div>
                        <a href="#" className="ud-link">Gérer les adresses email</a>
                      </div>
                      <div>
                        <div className="ud-field-lbl2">Affichage dans la liste globale</div>
                        <div className="ud-field-val2">Oui</div>
                        <a href="#" className="ud-link">Modifier</a>
                      </div>
                      <div>
                        <div className="ud-field-lbl2">Réponses automatiques</div>
                        <div className="ud-field-val2" style={{color:'rgba(255,255,255,0.4)'}}>Désactivé</div>
                        <a href="#" className="ud-link">Configurer</a>
                      </div>
                    </div>
                    {/* Col 2 */}
                    <div style={{display:'flex',flexDirection:'column',gap:22}}>
                      <div>
                        <div className="ud-field-lbl2">Adresse de récupération</div>
                        <div className="ud-field-val2" style={{color:'rgba(255,255,255,0.3)',fontStyle:'italic'}}>Non configurée</div>
                        <a href="#" className="ud-link">Ajouter une adresse de récupération</a>
                      </div>
                      <div>
                        <div className="ud-field-lbl2">Transfert des courriers</div>
                        <div className="ud-field-val2" style={{color:'rgba(255,255,255,0.4)'}}>Aucun</div>
                        <a href="#" className="ud-link">Configurer le transfert</a>
                      </div>
                      <div>
                        <div className="ud-field-lbl2">Autres actions</div>
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          <a href="#" className="ud-link">Convertir en boîte partagée</a>
                          <a href="#" className="ud-link">Modifier les autorisations</a>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── Onglet Drive Imoloc ── */}
              {userPanelTab==='onedrive'&&(
                <>
                  {/* Grille supérieure 2 colonnes */}
                  <div className="ud-grid2" style={{marginBottom:28}}>
                    <div>
                      <div className="ud-field-lbl2">Accédez aux fichiers</div>
                      <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.65,marginBottom:8}}>
                        Créez un lien d'accès pour accéder aux fichiers de cet utilisateur même si son compte est désactivé.
                      </div>
                      <a href="#" className="ud-link">Créer un lien d'accès</a>
                    </div>
                    <div>
                      <div className="ud-field-lbl2">Stockage utilisé</div>
                      <div style={{fontSize:13.5,color:'rgba(255,255,255,0.55)',marginBottom:8}}>0 Mo / 5 Go (0%)</div>
                      <div className="ud-progress" style={{marginBottom:8}}><div className="ud-progress-fill" style={{width:'0%'}}/></div>
                      <a href="#" className="ud-link">Modifier le stockage</a>
                    </div>
                  </div>

                  {/* Partage */}
                  <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:22,marginBottom:26}}>
                    <div style={{fontSize:15,fontWeight:700,color:'#e6edf3',marginBottom:8}}>Partage</div>
                    <div style={{fontSize:13.5,color:'rgba(255,255,255,0.45)',lineHeight:1.65,marginBottom:10}}>
                      Définissez les paramètres de partage pour les fichiers et dossiers de cet utilisateur au sein de l'organisation.
                    </div>
                    <a href="#" className="ud-link">Gérer le partage externe</a>
                  </div>

                  {/* Paramètres organisation */}
                  <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:22,marginBottom:24}}>
                    <div style={{fontSize:15,fontWeight:700,color:'#e6edf3',marginBottom:18}}>Paramètres Drive de votre organisation</div>
                    <div className="ud-grid2">
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                          <div className="ud-field-lbl2" style={{margin:0}}>Conservation des données</div>
                          <span style={{color:'rgba(255,255,255,0.3)'}}>ⓘ</span>
                        </div>
                        <div className="ud-field-val2">30 jour(s)</div>
                        <a href="#" className="ud-link">Modifier</a>
                      </div>
                      <div>
                        <div className="ud-field-lbl2">Espace de stockage</div>
                        <div className="ud-field-val2">5 Go par utilisateur</div>
                        <a href="#" className="ud-link">Modifier</a>
                      </div>
                    </div>
                  </div>

                  {/* Fichiers récents */}
                  <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:22}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                      <div style={{fontSize:15,fontWeight:700,color:'#e6edf3'}}>Fichiers de l'utilisateur</div>
                      <button style={{display:'flex',alignItems:'center',gap:7,padding:'7px 14px',borderRadius:6,background:'rgba(0,120,212,0.1)',border:'1px solid rgba(0,120,212,0.25)',color:'#4da6ff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'Inter'}}>
                        📦 Télécharger tout en ZIP
                      </button>
                    </div>
                    <div style={{textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.25)',background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px dashed rgba(255,255,255,0.07)'}}>
                      <div style={{fontSize:36,marginBottom:12,opacity:0.4}}>📂</div>
                      <div style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,0.35)',marginBottom:8}}>Aucun fichier disponible</div>
                      <div style={{fontSize:13}}>Les baux, contrats et documents de cet utilisateur apparaîtront ici.</div>
                    </div>
                  </div>
                </>
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
    <>
      {/* ══ PANEL AJOUTER UN UTILISATEUR ══ */}
      {showAddPanel&&(
        <div className="ui-ov" onClick={e=>e.target===e.currentTarget&&setShowAddPanel(false)}>
          <div className="ui-panel">
            <div className="ui-head">
              <span style={{fontSize:16,fontWeight:700,color:'#e6edf3'}}>Ajouter un utilisateur</span>
              <button className="up-cls" onClick={()=>setShowAddPanel(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="ui-body">
              <div style={{padding:'12px 14px',borderRadius:7,background:'rgba(0,120,212,0.07)',border:'1px solid rgba(0,120,212,0.18)',fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.65,marginBottom:20,display:'flex',gap:10}}>
                <span style={{fontSize:18,flexShrink:0}}>ℹ️</span>
                <div>L'utilisateur recevra un email d'invitation avec ses identifiants de connexion à <strong style={{color:'rgba(255,255,255,0.7)'}}>{agence?.nom}</strong>.</div>
              </div>
              <form id="add-form" onSubmit={handleAdd}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="ui-f">
                    <label className="ui-l">Prénom <span style={{color:'#ef4444'}}>*</span></label>
                    <input className="ui-i" required value={addForm.prenom} onChange={e=>setAddForm(f=>({...f,prenom:e.target.value}))} placeholder="Jean" autoFocus/>
                  </div>
                  <div className="ui-f">
                    <label className="ui-l">Nom <span style={{color:'#ef4444'}}>*</span></label>
                    <input className="ui-i" required value={addForm.nom} onChange={e=>setAddForm(f=>({...f,nom:e.target.value}))} placeholder="Dupont"/>
                  </div>
                </div>
                <div className="ui-f">
                  <label className="ui-l">Email <span style={{color:'#ef4444'}}>*</span></label>
                  <input className="ui-i" type="email" required value={addForm.email} onChange={e=>setAddForm(f=>({...f,email:e.target.value}))} placeholder="jean.dupont@exemple.com"/>
                </div>
                <div className="ui-f">
                  <label className="ui-l">Rôle <span style={{color:'#ef4444'}}>*</span></label>
                  <select className="ui-i" value={addForm.role} onChange={e=>setAddForm(f=>({...f,role:e.target.value}))}>
                    {Object.entries(ROLES_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="ui-f">
                    <label className="ui-l">Poste</label>
                    <input className="ui-i" value={addForm.poste} onChange={e=>setAddForm(f=>({...f,poste:e.target.value}))} placeholder="Responsable commercial"/>
                  </div>
                  <div className="ui-f">
                    <label className="ui-l">Département</label>
                    <input className="ui-i" value={addForm.departement} onChange={e=>setAddForm(f=>({...f,departement:e.target.value}))} placeholder="Commercial"/>
                  </div>
                </div>
              </form>
            </div>
            <div className="ui-foot">
              <button className="ui-fb ui-fb-g" onClick={()=>setShowAddPanel(false)}>Annuler</button>
              <button className="ui-fb ui-fb-b" form="add-form" type="submit" disabled={adding}>
                {adding?'Ajout en cours...':'Ajouter l'utilisateur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PANEL AJOUTER PLUSIEURS UTILISATEURS ══ */}
      {showBulkPanel&&(
        <div className="ui-ov" onClick={e=>e.target===e.currentTarget&&setShowBulkPanel(false)}>
          <div className="ui-panel" style={{width:680}}>
            <div className="ui-head">
              <span style={{fontSize:16,fontWeight:700,color:'#e6edf3'}}>Ajouter plusieurs utilisateurs</span>
              <button className="up-cls" onClick={()=>setShowBulkPanel(false)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="ui-body">
              {/* Options */}
              <div style={{display:'flex',gap:10,marginBottom:20}}>
                <div style={{flex:1,padding:'14px 16px',borderRadius:8,background:'rgba(0,120,212,0.08)',border:'1px solid rgba(0,120,212,0.25)',cursor:'pointer'}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#4da6ff',marginBottom:4}}>📋 Saisie manuelle</div>
                  <div style={{fontSize:12.5,color:'rgba(255,255,255,0.4)'}}>Remplissez le tableau ligne par ligne</div>
                </div>
                <div onClick={()=>{
                  const csv = 'Prénom,Nom,Email,Rôle
Jean,Dupont,jean@exemple.com,agent
Marie,Martin,marie@exemple.com,comptable'
                  const blob = new Blob([csv],{type:'text/csv'})
                  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='modele_utilisateurs.csv'; a.click()
                  toast.success('Modèle CSV téléchargé !')
                }} style={{flex:1,padding:'14px 16px',borderRadius:8,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.09)',cursor:'pointer',transition:'all 0.15s'}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:4}}>📥 Import CSV</div>
                  <div style={{fontSize:12.5,color:'rgba(255,255,255,0.4)'}}>Téléchargez le modèle et importez</div>
                </div>
              </div>

              {/* Tableau saisie */}
              <div style={{marginBottom:12}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr>
                      {['Prénom *','Nom','Email *','Rôle'].map((h,i)=>(
                        <th key={i} style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.4)',padding:'8px 10px',textAlign:'left',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                          {h}
                        </th>
                      ))}
                      <th style={{width:36}}/>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row,i)=>(
                      <tr key={i}>
                        {['prenom','nom','email'].map(field=>(
                          <td key={field} style={{padding:'5px 4px'}}>
                            <input
                              className="ui-i"
                              style={{padding:'7px 10px',fontSize:13}}
                              value={row[field]}
                              onChange={e=>setBulkRows(prev=>prev.map((r,j)=>j===i?{...r,[field]:e.target.value}:r))}
                              placeholder={field==='prenom'?'Jean':field==='nom'?'Dupont':'email@ex.com'}
                            />
                          </td>
                        ))}
                        <td style={{padding:'5px 4px'}}>
                          <select
                            className="ui-i"
                            style={{padding:'7px 8px',fontSize:12}}
                            value={row.role}
                            onChange={e=>setBulkRows(prev=>prev.map((r,j)=>j===i?{...r,role:e.target.value}:r))}>
                            {Object.entries(ROLES_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                          </select>
                        </td>
                        <td style={{padding:'5px 4px',textAlign:'center'}}>
                          <button onClick={()=>setBulkRows(p=>p.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.25)',fontSize:16,padding:'2px 5px',lineHeight:1,transition:'color 0.1s'}}
                            onMouseOver={e=>e.currentTarget.style.color='#ef4444'}
                            onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.25)'}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={()=>setBulkRows(p=>[...p,{prenom:'',nom:'',email:'',role:'agent'}])}
                style={{display:'flex',alignItems:'center',gap:7,padding:'8px 14px',borderRadius:6,border:'1px dashed rgba(255,255,255,0.12)',background:'none',color:'rgba(255,255,255,0.4)',fontSize:13,cursor:'pointer',fontFamily:'Inter',width:'100%',justifyContent:'center',marginBottom:16,transition:'all 0.15s'}}
                onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(0,120,212,0.4)';e.currentTarget.style.color='#4da6ff'}}
                onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';e.currentTarget.style.color='rgba(255,255,255,0.4)'}}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                Ajouter une ligne
              </button>

              <div style={{fontSize:12.5,color:'rgba(255,255,255,0.3)',padding:'10px 14px',borderRadius:6,background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.15)'}}>
                ⚠️ {bulkRows.filter(r=>r.email&&r.prenom).length} ligne(s) valide(s) sur {bulkRows.length} · Seules les lignes avec prénom et email seront importées.
              </div>
            </div>
            <div className="ui-foot">
              <button className="ui-fb ui-fb-g" onClick={()=>setShowBulkPanel(false)}>Annuler</button>
              <button className="ui-fb ui-fb-b" onClick={handleBulkAdd} disabled={bulkAdding||!bulkRows.filter(r=>r.email&&r.prenom).length}>
                {bulkAdding?'Import en cours...':'Importer les utilisateurs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
    </>
  )
}
