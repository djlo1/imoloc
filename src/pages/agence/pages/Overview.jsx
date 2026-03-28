import AddUserModal from '../components/AddUserModal'
import ResetPasswordPanel from '../components/ResetPasswordPanel'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'

const TABLEAU_ITEMS = [
  { id:'biens', label:'Gestion des biens', visible:true },
  { id:'locataires', label:'Gestion des locataires', visible:true },
  { id:'paiements', label:'Facturation & Paiements', visible:true },
  { id:'guides', label:'Guides & Formation', visible:true },
  { id:'apps', label:'Applications actives', visible:true },
  { id:'stats', label:'Statistiques', visible:true },
]

export default function Overview() {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({ biens:0, locataires:0, revenus:0, retards:0 })
  const [agence, setAgence] = useState(null)
  const [biens, setBiens] = useState([])
  const [locataires, setLocataires] = useState([])
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('simplifie')
  const [viewDropdown, setViewDropdown] = useState(false)
  const [actionDropdown, setActionDropdown] = useState(false)
  const [customDropdown, setCustomDropdown] = useState(false)
  const [visibleItems, setVisibleItems] = useState(TABLEAU_ITEMS)
  const [orgTab, setOrgTab] = useState('biens')
  const [showResetModal, setShowResetModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showResetPanel, setShowResetPanel] = useState(false)
  const [showAddTeamModal, setShowAddTeamModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [newUser, setNewUser] = useState({ prenom:'', nom:'', email:'', role:'Agent' })
  const [newTeam, setNewTeam] = useState({ nom:'', description:'' })
  const viewRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data:{ user } } = await supabase.auth.getUser()
        if (!user) return
        const { data:ag } = await supabase.from('agences').select('*').eq('profile_id', user.id).single()
        setAgence(ag)
        if (ag?.id) {
          const [{ data:b },{ data:l },{ data:p }] = await Promise.all([
            supabase.from('biens').select('*').eq('agence_id', ag.id).order('created_at',{ascending:false}),
            supabase.from('locataires').select('*').eq('agence_id', ag.id).order('created_at',{ascending:false}),
            supabase.from('paiements').select('*').eq('agence_id', ag.id).order('created_at',{ascending:false}),
          ])
          const bD=b||[], lD=l||[], pD=p||[]
          setBiens(bD); setLocataires(lD); setPaiements(pD)
          const rev = pD.filter(x=>x.statut==='payé'&&new Date(x.date_paiement).getMonth()===new Date().getMonth()).reduce((s,x)=>s+Number(x.montant||0),0)
          setStats({ biens:bD.length, locataires:lD.length, revenus:rev, retards:pD.filter(x=>x.statut==='retard').length })
        }
      } catch(e){ console.error(e) }
      finally { setLoading(false) }
    }
    init()
  }, [])

  const nom = profile?.nom ? `${profile.prenom||''} ${profile.nom}`.trim() : 'Admin'
  const bienOcc = biens.filter(b=>b.statut==='occupé').length
  const bienLib = biens.filter(b=>b.statut==='libre').length
  const tauxOcc = biens.length>0 ? Math.round((bienOcc/biens.length)*100) : 0

  const toggleItem = (id) => setVisibleItems(prev => prev.map(i => i.id===id ? {...i, visible:!i.visible} : i))
  const isVisible = (id) => visibleItems.find(i=>i.id===id)?.visible

  const BAR_ACTIONS_FULL = [
    { id:'vue', label: viewMode==='simplifie' ? 'Affichage simplifié' : 'Affichage du tableau de bord', hasDropdown:true },
    { id:'adduser', label:'Ajouter un utilisateur' },
    { id:'reset', label:'Réinitialiser le mot de passe' },
    { id:'addteam', label:'Ajouter une équipe' },
    { id:'facture', label:'Afficher votre facture', path:'/agence/abonnement' },
  ]

  const handleBarAction = (id) => {
    setViewDropdown(false); setActionDropdown(false); setCustomDropdown(false)
    if (id==='vue') setViewDropdown(v=>!v)
    else if (id==='adduser') setShowAddUserModal(true)
    else if (id==='reset') setShowResetModal(true)
    else if (id==='addteam') setShowAddTeamModal(true)
  }

  return (
    <>
      <style>{`
        /* ── Action bar ── */
        .ov-bar{display:flex;align-items:center;background:#1c2434;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:0 4px;margin-bottom:24px;overflow:hidden}
        .ov-bar-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 13px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.55);transition:all 0.1s;text-decoration:none;white-space:nowrap;flex-shrink:0}
        .ov-bar-btn:hover{background:rgba(255,255,255,0.06);color:#e6edf3}
        .ov-bar-sep{width:1px;height:20px;background:rgba(255,255,255,0.08);flex-shrink:0}
        .ov-bar-right{margin-left:auto;padding:0 12px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.5);white-space:nowrap}
        .ov-bar-more{display:inline-flex;align-items:center;padding:9px 12px;font-size:16px;cursor:pointer;border:none;background:none;color:rgba(255,255,255,0.4);transition:all 0.1s;flex-shrink:0}
        .ov-bar-more:hover{color:#e6edf3;background:rgba(255,255,255,0.06)}

        /* ── Vue dropdown ── */
        .ov-vd{position:absolute;top:calc(100% + 4px);left:0;background:#1c2434;border:1px solid rgba(255,255,255,0.09);border-radius:6px;box-shadow:0 8px 32px rgba(0,0,0,0.6);z-index:500;min-width:240px;overflow:hidden}
        .ov-vd-item{display:flex;align-items:center;gap:10px;padding:10px 16px;font-size:13.5px;color:rgba(255,255,255,0.6);cursor:pointer;transition:background 0.1s;border:none;background:none;width:100%;text-align:left;font-family:'Inter',sans-serif}
        .ov-vd-item:hover{background:rgba(255,255,255,0.05);color:#e6edf3}
        .ov-vd-item.active{color:#4da6ff}
        .ov-vd-check{width:16px;height:16px;flex-shrink:0}

        /* ── More dropdown ── */
        .ov-md{position:absolute;top:calc(100% + 4px);right:0;background:#1c2434;border:1px solid rgba(255,255,255,0.09);border-radius:6px;box-shadow:0 8px 32px rgba(0,0,0,0.6);z-index:500;min-width:220px;overflow:hidden}

        /* ── Custom dropdown ── */
        .ov-cd{position:absolute;top:calc(100% + 4px);right:0;background:#1c2434;border:1px solid rgba(255,255,255,0.09);border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.6);z-index:500;width:280px}
        .ov-cd-head{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.07);font-size:14px;font-weight:600;color:#e6edf3}
        .ov-cd-item{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;cursor:pointer;transition:background 0.1s}
        .ov-cd-item:hover{background:rgba(255,255,255,0.04)}
        .ov-cd-lbl{font-size:13.5px;color:rgba(255,255,255,0.65)}
        .ov-cd-toggle{width:38px;height:20px;border-radius:100px;border:none;cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0}
        .ov-cd-toggle.on{background:#0078d4}
        .ov-cd-toggle.off{background:rgba(255,255,255,0.12)}
        .ov-cd-toggle::after{content:'';position:absolute;width:14px;height:14px;border-radius:50%;background:#fff;top:3px;transition:left 0.2s}
        .ov-cd-toggle.on::after{left:21px}
        .ov-cd-toggle.off::after{left:3px}

        /* ── Modal ── */
        .ov-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)}
        .ov-modal{background:#161b22;border:1px solid rgba(255,255,255,0.09);border-radius:10px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto}
        .ov-modal-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.07)}
        .ov-modal-title{font-size:16px;font-weight:700;color:#e6edf3}
        .ov-modal-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:4px;border-radius:5px;display:flex;transition:all 0.1s}
        .ov-modal-close:hover{background:rgba(255,255,255,0.06);color:#e6edf3}
        .ov-modal-body{padding:22px 24px}
        .ov-modal-foot{padding:14px 24px;border-top:1px solid rgba(255,255,255,0.07);display:flex;justify-content:flex-end;gap:10px}
        .ov-form-lbl{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);margin-bottom:7px;text-transform:uppercase;letter-spacing:0.06em}
        .ov-form-input{width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.1);border-radius:7px;font-family:'Inter',sans-serif;font-size:14px;color:#e6edf3;outline:none;transition:border-color 0.15s;margin-bottom:14px}
        .ov-form-input:focus{border-color:#0078d4}
        .ov-form-input option{background:#1c2434}
        .ov-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:6px;font-size:13.5px;font-weight:600;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.15s}
        .ov-btn-blue{background:#0078d4;color:#fff}
        .ov-btn-blue:hover{background:#006cc1}
        .ov-btn-ghost{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.55);border:1px solid rgba(255,255,255,0.09)}
        .ov-btn-ghost:hover{background:rgba(255,255,255,0.09);color:#e6edf3}

        /* ── Vue simplifiée ── */
        .ov-simple{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
        .ov-simple-card{background:#1c2434;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:20px;position:relative}
        .ov-simple-card-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px}
        .ov-simple-card-name{font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.45)}
        .ov-simple-more{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.2);font-size:16px;padding:0}
        .ov-simple-val{font-size:28px;font-weight:700;letter-spacing:-0.03em;margin-bottom:4px}
        .ov-simple-lbl{font-size:12.5px;color:rgba(255,255,255,0.35);margin-bottom:14px}
        .ov-simple-status{display:flex;align-items:center;gap:7px;font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:8px}
        .ov-simple-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
        .ov-simple-btns{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
        .ov-simple-btn{padding:7px 14px;border-radius:5px;font-size:12.5px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.15s;text-decoration:none;display:inline-flex;align-items:center;gap:5px}
        .ov-simple-btn.blue{background:rgba(0,120,212,0.15);color:#4da6ff;border:1px solid rgba(0,120,212,0.25)}
        .ov-simple-btn.blue:hover{background:rgba(0,120,212,0.25)}
        .ov-simple-btn.ghost{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.45);border:1px solid rgba(255,255,255,0.08)}
        .ov-simple-btn.ghost:hover{background:rgba(255,255,255,0.08);color:#e6edf3}

        /* ── Vue tableau de bord ── */
        .ov-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px}
        .ov-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .ov-card{background:#1c2434;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:20px}
        .ov-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
        .ov-card-title{font-size:13px;font-weight:600;color:rgba(255,255,255,0.5)}
        .ov-card-more{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.2);font-size:16px;padding:0}
        .ov-org-tabs{display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.07);margin-bottom:14px}
        .ov-org-tab{padding:9px 16px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.4);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s}
        .ov-org-tab.active{color:#e6edf3;border-bottom-color:#0078d4}
        .ov-table{width:100%;border-collapse:collapse}
        .ov-table th{font-size:11px;font-weight:600;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.07em;padding:7px 10px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.05)}
        .ov-table td{padding:10px 10px;font-size:13px;color:rgba(255,255,255,0.6);border-bottom:1px solid rgba(255,255,255,0.04)}
        .ov-table tr:hover td{background:rgba(255,255,255,0.02)}
        .ov-badge{padding:2px 8px;border-radius:100px;font-size:11px;font-weight:600}
        .ov-link{font-size:13px;color:#4da6ff;text-decoration:none}
        .ov-link:hover{text-decoration:underline}
        .ov-empty{text-align:center;padding:30px;color:rgba(255,255,255,0.25);font-size:13px}
        .ov-progress{height:5px;background:rgba(255,255,255,0.06);border-radius:100px;overflow:hidden;margin-top:5px}
        .ov-progress-fill{height:100%;border-radius:100px}
        .ov-item-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px}
        .ov-item-row:last-child{border-bottom:none}

        @media(max-width:1100px){.ov-simple,.ov-grid3{grid-template-columns:1fr 1fr}}
        @media(max-width:768px){.ov-simple,.ov-grid3,.ov-grid2{grid-template-columns:1fr}.ov-bar{overflow-x:auto}}
        @media(max-width:500px){.ov-simple{grid-template-columns:1fr}}
      `}</style>

      {/* ══ BARRE D'ACTIONS ══ */}
      <div style={{position:'relative'}}>
        <div className="ov-bar">
          {/* Vue */}
          <div style={{position:'relative',flexShrink:0}}>
            <button className="ov-bar-btn" onClick={() => { setViewDropdown(v=>!v); setActionDropdown(false); setCustomDropdown(false) }}
              style={{color:'#e6edf3'}}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
              {viewMode==='simplifie' ? 'Affichage simplifié' : 'Affichage du tableau de bord'}
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
            </button>
            {viewDropdown && (
              <div className="ov-vd">
                <button className={`ov-vd-item ${viewMode==='simplifie'?'active':''}`} onClick={()=>{setViewMode('simplifie');setViewDropdown(false)}}>
                  <svg className="ov-vd-check" fill="none" stroke={viewMode==='simplifie'?'#4da6ff':'transparent'} strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                  Affichage simplifié
                </button>
                <button className={`ov-vd-item ${viewMode==='tableau'?'active':''}`} onClick={()=>{setViewMode('tableau');setViewDropdown(false)}}>
                  <svg className="ov-vd-check" fill="none" stroke={viewMode==='tableau'?'#4da6ff':'transparent'} strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                  Affichage du tableau de bord
                </button>
              </div>
            )}
          </div>

          <div className="ov-bar-sep"/>

          {/* Ajouter un utilisateur */}
          <button className="ov-bar-btn" onClick={()=>setShowAddUserModal(true)}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"/></svg>
            Ajouter un utilisateur
          </button>

          <div className="ov-bar-sep"/>

          {/* Réinitialiser mot de passe */}
          <button className="ov-bar-btn" onClick={()=>setShowResetPanel(true)}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
            Réinitialiser le mot de passe
          </button>

          <div className="ov-bar-sep"/>

          {/* Ajouter une équipe */}
          <button className="ov-bar-btn" onClick={()=>setShowAddTeamModal(true)}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>
            Ajouter une équipe
          </button>

          <div className="ov-bar-sep"/>

          {/* Afficher votre facture */}
          <Link to="/agence/abonnement" className="ov-bar-btn">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/></svg>
            Afficher votre facture
          </Link>

          {/* More ··· */}
          <div style={{position:'relative',marginLeft:'auto'}}>
            <button className="ov-bar-more" onClick={()=>{ setActionDropdown(a=>!a); setViewDropdown(false); setCustomDropdown(false) }}>···</button>
            {actionDropdown && (
              <div className="ov-md" style={{position:'absolute',top:'calc(100% + 4px)',right:0}}>
                <div style={{position:'relative'}}>
                  <button className="ov-vd-item" onClick={()=>{ setCustomDropdown(true); setActionDropdown(false) }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Personnaliser le tableau de bord
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="ov-bar-right">{agence?.nom || 'Mon organisation'}</div>
        </div>

        {/* Personnaliser dropdown */}
        {customDropdown && (
          <div className="ov-cd" style={{position:'absolute',top:'calc(100% + 4px)',right:0}}>
            <div className="ov-cd-head">Personnaliser l'affichage</div>
            {visibleItems.map(item => (
              <div key={item.id} className="ov-cd-item">
                <span className="ov-cd-lbl">{item.label}</span>
                <button className={`ov-cd-toggle ${item.visible?'on':'off'}`} onClick={()=>toggleItem(item.id)}/>
              </div>
            ))}
            <div style={{padding:'12px 16px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'flex-end'}}>
              <button className="ov-btn ov-btn-blue" onClick={()=>setCustomDropdown(false)}>Appliquer</button>
            </div>
          </div>
        )}
      </div>

      {/* ══ VUE SIMPLIFIÉE ══ */}
      {viewMode === 'simplifie' && (
        <>
          {/* Ligne 1 — 3 grandes cartes */}
          <div className="ov-simple">

            {/* Biens */}
            {isVisible('biens') && (
              <div className="ov-simple-card">
                <div className="ov-simple-card-top">
                  <span className="ov-simple-card-name">Gestion des biens</span>
                  <button className="ov-simple-more">···</button>
                </div>
                <div className="ov-simple-val" style={{color:'#0078d4'}}>{stats.biens}</div>
                <div className="ov-simple-lbl">Biens enregistrés</div>
                <div className="ov-simple-status">
                  <div className="ov-simple-dot" style={{background: bienOcc>0?'#0078d4':'#00c896'}}/>
                  {bienOcc} occupé{bienOcc>1?'s':''} — {bienLib} libre{bienLib>1?'s':''}
                </div>
                <div className="ov-simple-status">
                  <div className="ov-simple-dot" style={{background:tauxOcc>50?'#00c896':'#f59e0b'}}/>
                  Taux d'occupation : {tauxOcc}%
                </div>
                <div className="ov-progress">
                  <div className="ov-progress-fill" style={{width:`${tauxOcc}%`,background:'#0078d4'}}/>
                </div>
                <div className="ov-simple-btns">
                  <Link to="/agence/biens" className="ov-simple-btn blue">Gérer les biens</Link>
                  <Link to="/agence/biens" className="ov-simple-btn ghost">Ajouter un bien</Link>
                </div>
              </div>
            )}

            {/* Locataires */}
            {isVisible('locataires') && (
              <div className="ov-simple-card">
                <div className="ov-simple-card-top">
                  <span className="ov-simple-card-name">Gestion des locataires</span>
                  <button className="ov-simple-more">···</button>
                </div>
                <div className="ov-simple-val" style={{color:'#6c63ff'}}>{stats.locataires}</div>
                <div className="ov-simple-lbl">Locataires actifs</div>
                <div className="ov-simple-status">
                  <div className="ov-simple-dot" style={{background: stats.retards===0?'#00c896':'#ef4444'}}/>
                  {stats.retards===0 ? 'Aucun loyer en retard' : `${stats.retards} loyer${stats.retards>1?'s':''} en retard`}
                </div>
                <div className="ov-simple-status">
                  <div className="ov-simple-dot" style={{background:'#0078d4'}}/>
                  {paiements.filter(p=>p.statut==='en attente').length} paiement(s) en attente
                </div>
                <div className="ov-simple-btns">
                  <Link to="/agence/locataires" className="ov-simple-btn blue">Voir les locataires</Link>
                  <Link to="/agence/locataires" className="ov-simple-btn ghost">Ajouter</Link>
                </div>
              </div>
            )}

            {/* Facturation */}
            {isVisible('paiements') && (
              <div className="ov-simple-card">
                <div className="ov-simple-card-top">
                  <span className="ov-simple-card-name">Facturation & Paiements</span>
                  <button className="ov-simple-more">···</button>
                </div>
                <div className="ov-simple-val" style={{color:'#00c896',fontSize:22}}>{stats.revenus.toLocaleString()}<span style={{fontSize:13,fontWeight:400,color:'rgba(255,255,255,0.3)'}}> FCFA</span></div>
                <div className="ov-simple-lbl">Revenus encaissés ce mois</div>
                <div className="ov-simple-status">
                  <div className="ov-simple-dot" style={{background:'#0078d4'}}/>
                  Abonnement actif : Plan Standard
                </div>
                <div className="ov-simple-status">
                  <div className="ov-simple-dot" style={{background: stats.retards>0?'#ef4444':'#00c896'}}/>
                  {stats.retards>0 ? `${stats.retards} loyer${stats.retards>1?'s':''} en retard` : 'Tous les loyers à jour'}
                </div>
                <div className="ov-simple-btns">
                  <Link to="/agence/paiements" className="ov-simple-btn blue">Voir les paiements</Link>
                  <Link to="/agence/abonnement" className="ov-simple-btn ghost">Ma facture</Link>
                </div>
              </div>
            )}
          </div>

          {/* Ligne 2 — 3 cartes secondaires */}
          <div className="ov-simple">

            {/* Guides */}
            {isVisible('guides') && (
              <div className="ov-simple-card">
                <div className="ov-simple-card-top">
                  <span className="ov-simple-card-name">Formation, guides et assistance</span>
                  <button className="ov-simple-more">···</button>
                </div>
                {[
                  { icon:'📹', title:'Guide de démarrage rapide', sub:'Configurez votre organisation en 5 étapes' },
                  { icon:'📘', title:'Guides administration avancés', sub:'Rapports, exports, multi-biens' },
                  { icon:'🎓', title:'Formation pour les agents', sub:'Utilisez Imoloc au quotidien' },
                ].map((g,i) => (
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'8px 0',borderBottom: i<2?'1px solid rgba(255,255,255,0.04)':'none',cursor:'pointer'}}>
                    <span style={{fontSize:20,flexShrink:0}}>{g.icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:500,color:'#e6edf3',marginBottom:2}}>{g.title}</div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>{g.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Apps */}
            {isVisible('apps') && (
              <div className="ov-simple-card">
                <div className="ov-simple-card-top">
                  <span className="ov-simple-card-name">Applications Imoloc</span>
                  <button className="ov-simple-more">···</button>
                </div>
                <div style={{fontSize:22,fontWeight:700,color:'#e6edf3',marginBottom:4}}>3 <span style={{fontSize:13,fontWeight:400,color:'rgba(255,255,255,0.3)'}}>sur 5</span></div>
                <div style={{fontSize:12.5,color:'rgba(255,255,255,0.35)',marginBottom:14}}>modules actifs sur votre plan Standard</div>
                {[
                  { name:'Gestion des biens', ok:true },
                  { name:'Gestion des locataires', ok:true },
                  { name:'Paiements & Loyers', ok:true },
                  { name:'Signature électronique', ok:false },
                  { name:'App mobile locataires', ok:false },
                ].map((a,i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <span style={{fontSize:12.5,color:a.ok?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.25)'}}>{a.name}</span>
                    <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:'100px',background:a.ok?'rgba(0,200,150,0.1)':'rgba(255,255,255,0.05)',color:a.ok?'#00c896':'rgba(255,255,255,0.2)'}}>{a.ok?'Actif':'Upgrade'}</span>
                  </div>
                ))}
                <Link to="/agence/abonnement" className="ov-link" style={{fontSize:12.5,marginTop:8,display:'block'}}>Voir mon abonnement →</Link>
              </div>
            )}

            {/* Stats */}
            {isVisible('stats') && (
              <div className="ov-simple-card">
                <div className="ov-simple-card-top">
                  <span className="ov-simple-card-name">Statistiques de l'organisation</span>
                  <button className="ov-simple-more">···</button>
                </div>
                {[
                  { lbl:'Biens gérés', val:stats.biens, max:100, color:'#0078d4' },
                  { lbl:'Locataires actifs', val:stats.locataires, max:100, color:'#6c63ff' },
                  { lbl:"Taux d'occupation", val:tauxOcc, max:100, color:'#00c896', suffix:'%' },
                  { lbl:'Loyers en retard', val:stats.retards, max:10, color:'#ef4444' },
                ].map((s,i) => (
                  <div key={i} style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12.5,color:'rgba(255,255,255,0.4)'}}>{s.lbl}</span>
                      <span style={{fontSize:13,fontWeight:700,color:s.color}}>{s.val}{s.suffix||''}</span>
                    </div>
                    <div className="ov-progress">
                      <div className="ov-progress-fill" style={{width:`${Math.min((s.val/s.max)*100,100)}%`,background:s.color}}/>
                    </div>
                  </div>
                ))}
                <Link to="/agence/rapports" className="ov-link" style={{fontSize:12.5,marginTop:4,display:'block'}}>Voir tous les rapports →</Link>
              </div>
            )}
          </div>

          {/* Votre organisation (tabs) */}
          <div className="ov-card">
            <div className="ov-card-head" style={{marginBottom:0}}>
              <span style={{fontSize:15,fontWeight:600,color:'#e6edf3'}}>Votre organisation</span>
            </div>
            <div className="ov-org-tabs">
              {['biens','locataires','paiements','baux'].map(t => (
                <button key={t} className={`ov-org-tab ${orgTab===t?'active':''}`} onClick={()=>setOrgTab(t)}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
            {orgTab==='biens' && (
              biens.length===0 ? <div className="ov-empty">Aucun bien. <Link to="/agence/biens" className="ov-link">Ajouter un bien →</Link></div> :
              <table className="ov-table">
                <thead><tr><th>Nom</th><th>Type</th><th>Ville</th><th>Loyer/mois</th><th>Statut</th></tr></thead>
                <tbody>{biens.slice(0,5).map((b,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:500,color:'#e6edf3'}}>{b.nom}</td>
                    <td>{b.type}</td>
                    <td>{b.ville||'—'}</td>
                    <td style={{color:'#0078d4',fontWeight:600}}>{Number(b.loyer||0).toLocaleString()} FCFA</td>
                    <td><span className="ov-badge" style={{background:b.statut==='libre'?'rgba(0,200,150,0.1)':b.statut==='occupé'?'rgba(0,120,212,0.1)':'rgba(245,158,11,0.1)',color:b.statut==='libre'?'#00c896':b.statut==='occupé'?'#0078d4':'#f59e0b'}}>{b.statut}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            {orgTab==='locataires' && (
              locataires.length===0 ? <div className="ov-empty">Aucun locataire. <Link to="/agence/locataires" className="ov-link">Ajouter →</Link></div> :
              <table className="ov-table">
                <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Ajouté le</th></tr></thead>
                <tbody>{locataires.slice(0,5).map((l,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:500,color:'#e6edf3'}}>{l.prenom} {l.nom}</td>
                    <td>{l.email||'—'}</td>
                    <td>{l.telephone||'—'}</td>
                    <td>{l.created_at?new Date(l.created_at).toLocaleDateString('fr-FR'):'—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            {orgTab==='paiements' && (
              paiements.length===0 ? <div className="ov-empty">Aucun paiement. <Link to="/agence/paiements" className="ov-link">Enregistrer →</Link></div> :
              <table className="ov-table">
                <thead><tr><th>Date</th><th>Montant</th><th>Mode</th><th>Statut</th></tr></thead>
                <tbody>{paiements.slice(0,5).map((p,i)=>(
                  <tr key={i}>
                    <td>{p.date_paiement?new Date(p.date_paiement).toLocaleDateString('fr-FR'):'—'}</td>
                    <td style={{fontWeight:600,color:'#00c896'}}>{Number(p.montant||0).toLocaleString()} FCFA</td>
                    <td>{p.mode||'—'}</td>
                    <td><span className="ov-badge" style={{background:p.statut==='payé'?'rgba(0,200,150,0.1)':p.statut==='retard'?'rgba(239,68,68,0.1)':'rgba(245,158,11,0.1)',color:p.statut==='payé'?'#00c896':p.statut==='retard'?'#ef4444':'#f59e0b'}}>{p.statut}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            {orgTab==='baux' && <div className="ov-empty">Aucun bail. <Link to="/agence/baux" className="ov-link">Créer un bail →</Link></div>}
          </div>
        </>
      )}

      {/* ══ VUE TABLEAU DE BORD ══ */}
      {viewMode === 'tableau' && (
        <>
          <div className="ov-grid3">
            <div className="ov-card"><div className="ov-card-head"><span className="ov-card-title">Biens</span><button className="ov-card-more">···</button></div><div style={{fontSize:32,fontWeight:700,color:'#0078d4'}}>{stats.biens}</div><div style={{fontSize:12.5,color:'rgba(255,255,255,0.3)',marginTop:4}}>{bienOcc} occupés · {bienLib} libres</div><div className="ov-progress" style={{marginTop:12}}><div className="ov-progress-fill" style={{width:`${tauxOcc}%`,background:'#0078d4'}}/></div><Link to="/agence/biens" className="ov-link" style={{fontSize:12.5,marginTop:10,display:'block'}}>Gérer les biens →</Link></div>
            <div className="ov-card"><div className="ov-card-head"><span className="ov-card-title">Locataires</span><button className="ov-card-more">···</button></div><div style={{fontSize:32,fontWeight:700,color:'#6c63ff'}}>{stats.locataires}</div><div style={{fontSize:12.5,color:'rgba(255,255,255,0.3)',marginTop:4}}>{stats.retards} loyer{stats.retards>1?'s':''} en retard</div><Link to="/agence/locataires" className="ov-link" style={{fontSize:12.5,marginTop:10,display:'block'}}>Voir les locataires →</Link></div>
            <div className="ov-card"><div className="ov-card-head"><span className="ov-card-title">Revenus ce mois</span><button className="ov-card-more">···</button></div><div style={{fontSize:22,fontWeight:700,color:'#00c896'}}>{stats.revenus.toLocaleString()} FCFA</div><div style={{fontSize:12.5,color:'rgba(255,255,255,0.3)',marginTop:4}}>Plan Standard actif</div><Link to="/agence/paiements" className="ov-link" style={{fontSize:12.5,marginTop:10,display:'block'}}>Voir les paiements →</Link></div>
          </div>
          <div className="ov-grid2">
            <div className="ov-card"><div className="ov-card-head"><span className="ov-card-title">Biens récents</span><Link to="/agence/biens" className="ov-link" style={{fontSize:12}}>Voir tout</Link></div>{biens.length===0?<div className="ov-empty">Aucun bien</div>:biens.slice(0,4).map((b,i)=><div key={i} className="ov-item-row"><span style={{color:'#e6edf3',fontWeight:500}}>{b.nom}</span><span className="ov-badge" style={{background:b.statut==='libre'?'rgba(0,200,150,0.1)':'rgba(0,120,212,0.1)',color:b.statut==='libre'?'#00c896':'#0078d4'}}>{b.statut}</span></div>)}</div>
            <div className="ov-card"><div className="ov-card-head"><span className="ov-card-title">Paiements récents</span><Link to="/agence/paiements" className="ov-link" style={{fontSize:12}}>Voir tout</Link></div>{paiements.length===0?<div className="ov-empty">Aucun paiement</div>:paiements.slice(0,4).map((p,i)=><div key={i} className="ov-item-row"><span style={{color:'rgba(255,255,255,0.6)'}}>{Number(p.montant||0).toLocaleString()} FCFA</span><span className="ov-badge" style={{background:p.statut==='payé'?'rgba(0,200,150,0.1)':'rgba(239,68,68,0.1)',color:p.statut==='payé'?'#00c896':'#ef4444'}}>{p.statut}</span></div>)}</div>
          </div>
        </>
      )}

      {/* ══ MODAL AJOUTER UTILISATEUR ══ */}
      {showResetPanel && <ResetPasswordPanel onClose={() => setShowResetPanel(false)} agenceId={agence?.id}/>}
      {showAddUserModal && <AddUserModal onClose={() => setShowAddUserModal(false)} agenceName={agence?.nom || 'Mon organisation'}/>}

            {/* ══ MODAL RÉINITIALISER MOT DE PASSE ══ */}
      {showResetModal && (
        <div className="ov-modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowResetModal(false)}>
          <div className="ov-modal">
            <div className="ov-modal-head">
              <span className="ov-modal-title">Réinitialiser le mot de passe</span>
              <button className="ov-modal-close" onClick={()=>setShowResetModal(false)}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="ov-modal-body">
              <div style={{padding:'12px 14px',borderRadius:8,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:18}}>
                Un email de réinitialisation sera envoyé à l'utilisateur concerné.
              </div>
              <label className="ov-form-lbl">Email de l'utilisateur *</label>
              <input className="ov-form-input" type="email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} placeholder="utilisateur@organisation.com"/>
            </div>
            <div className="ov-modal-foot">
              <button className="ov-btn ov-btn-ghost" onClick={()=>setShowResetModal(false)}>Annuler</button>
              <button className="ov-btn ov-btn-blue">Envoyer le lien de réinitialisation</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL AJOUTER ÉQUIPE ══ */}
      {showAddTeamModal && (
        <div className="ov-modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAddTeamModal(false)}>
          <div className="ov-modal">
            <div className="ov-modal-head">
              <span className="ov-modal-title">Ajouter une équipe</span>
              <button className="ov-modal-close" onClick={()=>setShowAddTeamModal(false)}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="ov-modal-body">
              <div style={{padding:'12px 14px',borderRadius:8,background:'rgba(108,99,255,0.08)',border:'1px solid rgba(108,99,255,0.2)',fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:18}}>
                Créez une équipe pour regrouper vos agents par agence ou par zone géographique.
              </div>
              <label className="ov-form-lbl">Nom de l'équipe *</label>
              <input className="ov-form-input" value={newTeam.nom} onChange={e=>setNewTeam(p=>({...p,nom:e.target.value}))} placeholder="Ex: Agence Cotonou Nord"/>
              <label className="ov-form-lbl">Description</label>
              <textarea className="ov-form-input" rows={3} value={newTeam.description} onChange={e=>setNewTeam(p=>({...p,description:e.target.value}))} placeholder="Description de l'équipe..." style={{resize:'vertical'}}/>
              <div style={{padding:'10px 14px',borderRadius:8,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',fontSize:13,color:'rgba(255,255,255,0.35)'}}>
                ⭐ La gestion d'équipes multiples est disponible sur le plan <strong style={{color:'#4da6ff'}}>Standard et supérieur</strong>.
              </div>
            </div>
            <div className="ov-modal-foot">
              <button className="ov-btn ov-btn-ghost" onClick={()=>setShowAddTeamModal(false)}>Annuler</button>
              <button className="ov-btn ov-btn-blue">Créer l'équipe</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
