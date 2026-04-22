import { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

// ── Pages ─────────────────────────────────────────────────
import ImolocDashboard from './pages/ImolocDashboard'
import Maintenance from './pages/Maintenance'
import EtatsDesLieux from './pages/EtatsDesLieux'
import Rapports from './pages/Rapports'
import Proprietaires from './pages/Proprietaires'
import Biens from './pages/Biens'
import Locataires from './pages/Locataires'
import Baux from './pages/Baux'
import Paiements from './pages/Paiements'

const Soon = ({ title, icon }) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,gap:16}}>
    <div style={{fontSize:52,opacity:0.35}}>{icon}</div>
    <div style={{fontSize:19,fontWeight:600,color:"rgba(255,255,255,0.5)"}}>{title}</div>
    <div style={{fontSize:13.5,color:"rgba(255,255,255,0.25)"}}>Module en cours de developpement</div>
  </div>
)

// ── Nav items ─────────────────────────────────────────────
const NAV = [
  { id:"dashboard", label:"Accueil", path:"/imoloc", exact:true,
    icon:"M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" },
  { id:"proprietaires", label:"Proprietaires", path:"/imoloc/proprietaires",
    icon:"M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
  { id:"biens", label:"Biens", path:"/imoloc/biens",
    icon:"M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z",
    children:[
      {label:"Tous les biens", path:"/imoloc/biens"},
      {label:"Biens libres", path:"/imoloc/biens/libres"},
      {label:"Biens occupes", path:"/imoloc/biens/occupes"},
      {label:"En maintenance", path:"/imoloc/biens/maintenance"},
    ]
  },
  { id:"locataires", label:"Locataires", path:"/imoloc/locataires",
    icon:"M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197",
    children:[
      {label:"Locataires actifs", path:"/imoloc/locataires"},
      {label:"Historique", path:"/imoloc/locataires/historique"},
      {label:"Dossiers", path:"/imoloc/locataires/dossiers"},
    ]
  },
  { id:"baux", label:"Baux et Contrats", path:"/imoloc/baux",
    icon:"M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z",
    children:[
      {label:"Baux actifs", path:"/imoloc/baux"},
      {label:"Expiration proche", path:"/imoloc/baux/expiration"},
      {label:"Termines", path:"/imoloc/baux/termines"},
    ]
  },
  { id:"paiements", label:"Paiements", path:"/imoloc/paiements",
    icon:"M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
    children:[
      {label:"Tous les paiements", path:"/imoloc/paiements"},
      {label:"En retard", path:"/imoloc/paiements/retard"},
      {label:"Historique", path:"/imoloc/paiements/historique"},
    ]
  },
  { id:"loci", label:"Loci IA", path:"/imoloc/loci",
    icon:"M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z",
    loci: true },
  { id:"maintenance", label:"Maintenance", path:"/imoloc/maintenance",
    icon:"M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" },
  { id:"etats-lieux", label:"Etats des lieux", path:"/imoloc/etats-lieux",
    icon:"M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" },
  { id:"rapports", label:"Rapports", path:"/imoloc/rapports",
    icon:"M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
]

// ── Composant principal ───────────────────────────────────
export default function ImolocApp() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, logout } = useAuthStore()
  const [agence, setAgence] = useState(null)
  const [stats, setStats] = useState({biens:0,proprietaires:0,locataires:0,baux:0,retards:0,revenus:0})
  const [expanded, setExpanded] = useState({biens:true,locataires:false,baux:false,paiements:false})
  const [checking, setChecking] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchVal, setSearchVal] = useState("")
  const profileRef = useRef(null)

  useEffect(() => { checkAccess() }, [])

  useEffect(() => {
    const h = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const checkAccess = async () => {
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { navigate("/login"); return }
      const { data:agList } = await supabase.from("agences").select("*")
      const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
      setAgence(ag)
      if (ag?.id) {
        const [b,pr,l,bx,ret,rev] = await Promise.all([
          supabase.from("biens").select("id",{count:"exact"}).eq("agence_id",ag.id),
          supabase.from("proprietaires").select("id",{count:"exact"}),
          supabase.from("locataires").select("id",{count:"exact"}).eq("agence_id",ag.id),
          supabase.from("baux").select("id",{count:"exact"}).eq("agence_id",ag.id).eq("statut","actif"),
          supabase.from("paiements").select("id",{count:"exact"}).eq("agence_id",ag.id).eq("statut","en_retard"),
          supabase.from("paiements").select("montant").eq("agence_id",ag.id).eq("statut","paye"),
        ])
        const total = (rev.data||[]).reduce((acc,p)=>acc+(p.montant||0),0)
        setStats({biens:b.count||0,proprietaires:pr.count||0,locataires:l.count||0,baux:bx.count||0,retards:ret.count||0,revenus:total})
      }
    } catch(e) { console.error(e) }
    finally { setChecking(false) }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate("/login")
    toast.success("Deconnexion reussie")
  }

  const toggle = (id,e) => {
    e.preventDefault(); e.stopPropagation()
    setExpanded(p=>({...p,[id]:!p[id]}))
  }

  if (checking) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0d1117",color:"rgba(255,255,255,0.4)",fontSize:14,gap:10}}>
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{animation:"spin 0.8s linear infinite"}}><path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3"/></svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Chargement Centre Imoloc...
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{width:100%;height:100%}
        .im-root{display:flex;flex-direction:column;width:100vw;height:100vh;background:#0d1117;font-family:Inter,-apple-system,sans-serif;color:#e6edf3;overflow:hidden}

        /* ── HEADER ── */
        .im-header{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:rgba(13,17,23,0.95);border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0;gap:12px;backdrop-filter:blur(20px);position:relative;z-index:200}
        .im-header-left{display:flex;align-items:center;gap:10px}
        .im-waffle{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.5);padding:6px;border-radius:5px;display:flex;transition:all 0.15s}
        .im-waffle:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .im-brand{display:flex;align-items:center;gap:8px}
        .im-brand-icon{width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,rgba(0,200,150,0.25),rgba(0,120,212,0.2));border:1px solid rgba(0,200,150,0.35);display:flex;align-items:center;justify-content:center;font-size:14px}
        .im-brand-name{font-size:15px;font-weight:700;letter-spacing:-0.02em;background:linear-gradient(135deg,#00c896,#0078d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .im-brand-sep{width:1px;height:18px;background:rgba(255,255,255,0.1)}
        .im-brand-sub{font-size:12px;color:rgba(255,255,255,0.35);font-weight:500}
        .im-header-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:6px 12px;min-width:280px;transition:border-color 0.15s}
        .im-header-search:focus-within{border-color:rgba(0,200,150,0.35)}
        .im-header-search input{background:none;border:none;outline:none;font-family:Inter,sans-serif;font-size:13px;color:#e6edf3;width:100%}
        .im-header-search input::placeholder{color:rgba(255,255,255,0.25)}
        .im-header-right{display:flex;align-items:center;gap:6px}
        .im-hbtn{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.5);padding:6px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;position:relative}
        .im-hbtn:hover{background:rgba(255,255,255,0.07);color:#e6edf3}
        .im-hbtn-loci{background:linear-gradient(135deg,rgba(108,99,255,0.15),rgba(0,200,150,0.1));border:1px solid rgba(108,99,255,0.25);color:#a78bfa;padding:5px 12px;border-radius:6px;font-size:12.5px;font-weight:600;gap:6px}
        .im-hbtn-loci:hover{background:linear-gradient(135deg,rgba(108,99,255,0.25),rgba(0,200,150,0.18));color:#c4b5fd}
        .im-badge{position:absolute;top:1px;right:1px;width:7px;height:7px;border-radius:50%;background:#ef4444;border:2px solid #0d1117}
        .im-profile-btn{display:flex;align-items:center;gap:8px;padding:4px 10px 4px 4px;border-radius:7px;cursor:pointer;background:none;border:1px solid transparent;transition:all 0.15s;font-family:Inter,sans-serif}
        .im-profile-btn:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.1)}
        .im-av{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#00c896,#0078d4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
        .im-profile-name{font-size:12.5px;color:rgba(255,255,255,0.7);font-weight:500;white-space:nowrap}
        .im-profile-drop{position:absolute;top:calc(100% + 8px);right:0;width:260px;background:#1c2434;border:1px solid rgba(255,255,255,0.1);border-radius:10px;box-shadow:0 16px 40px rgba(0,0,0,0.6);z-index:300;overflow:hidden;animation:im-drop 0.18s ease}
        @keyframes im-drop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .im-drop-head{padding:16px 16px 12px;border-bottom:1px solid rgba(255,255,255,0.07)}
        .im-drop-name{font-size:14px;font-weight:700;color:#e6edf3;margin-bottom:2px}
        .im-drop-email{font-size:12px;color:rgba(255,255,255,0.4)}
        .im-drop-agence{display:inline-flex;align-items:center;gap:5px;margin-top:8px;padding:3px 9px;border-radius:100px;background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.2);font-size:11.5px;color:#00c896;font-weight:600}
        .im-drop-item{display:flex;align-items:center;gap:10px;padding:10px 16px;font-size:13px;color:rgba(255,255,255,0.6);cursor:pointer;transition:background 0.1s;border:none;background:none;font-family:Inter,sans-serif;width:100%;text-align:left}
        .im-drop-item:hover{background:rgba(255,255,255,0.05);color:#e6edf3}
        .im-drop-item.red:hover{background:rgba(239,68,68,0.07);color:#ef4444}
        .im-drop-sep{height:1px;background:rgba(255,255,255,0.07)}

        /* ── LAYOUT ── */
        .im-body{display:flex;flex:1;overflow:hidden}

        /* ── SIDEBAR ── */
        .im-sidebar{width:220px;flex-shrink:0;background:rgba(0,0,0,0.2);border-right:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;overflow-y:auto}
        .im-sidebar::-webkit-scrollbar{width:3px}
        .im-sidebar::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
        .im-nav{flex:1;padding:10px 8px}
        .im-nav-sect{font-size:10px;font-weight:700;color:rgba(255,255,255,0.2);text-transform:uppercase;letter-spacing:0.09em;padding:10px 8px 5px;margin-top:4px}
        .im-nav-item{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:6px;font-size:13px;font-weight:500;color:rgba(255,255,255,0.5);text-decoration:none;transition:all 0.15s;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;width:100%;text-align:left}
        .im-nav-item:hover{background:rgba(255,255,255,0.05);color:#e6edf3}
        .im-nav-item.active{background:rgba(0,200,150,0.1);color:#00c896;border-left:2px solid #00c896;border-radius:0 6px 6px 0;padding-left:8px}
        .im-nav-item.loci-item{background:linear-gradient(135deg,rgba(108,99,255,0.08),rgba(0,200,150,0.06));color:#a78bfa;border-left:2px solid transparent}
        .im-nav-item.loci-item:hover{background:linear-gradient(135deg,rgba(108,99,255,0.15),rgba(0,200,150,0.1));color:#c4b5fd}
        .im-nav-item.loci-item.active{border-left-color:#6c63ff;color:#c4b5fd;background:linear-gradient(135deg,rgba(108,99,255,0.15),rgba(0,200,150,0.1))}
        .im-nav-left{display:flex;align-items:center;gap:9px}
        .im-nav-arrow{transition:transform 0.2s;color:rgba(255,255,255,0.2)}
        .im-nav-arrow.open{transform:rotate(180deg)}
        .im-nav-sub{padding-left:32px;display:flex;flex-direction:column;gap:1px;margin-bottom:3px}
        .im-nav-sub-item{padding:5px 10px;border-radius:5px;font-size:12.5px;color:rgba(255,255,255,0.38);text-decoration:none;transition:all 0.12s;display:block;border-left:1px solid rgba(255,255,255,0.07)}
        .im-nav-sub-item:hover{color:#e6edf3;background:rgba(255,255,255,0.04)}
        .im-nav-sub-item.active{color:#00c896;border-left-color:#00c896;background:rgba(0,200,150,0.05)}
        .im-sidebar-bottom{padding:12px 14px;border-top:1px solid rgba(255,255,255,0.06)}
        .im-mini-stat{display:flex;align-items:center;justify-content:space-between;padding:4px 0;font-size:12px}
        .im-mini-lbl{color:rgba(255,255,255,0.3)}
        .im-mini-val{font-weight:700}
        .im-back-link{display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:6px;font-size:12.5px;color:rgba(255,255,255,0.35);cursor:pointer;transition:all 0.15s;background:none;border:none;font-family:Inter,sans-serif;width:100%;text-align:left;margin-top:6px}
        .im-back-link:hover{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.7)}

        /* ── CONTENT ── */
        .im-content{flex:1;overflow-y:auto;padding:28px 32px;background:rgba(255,255,255,0.008)}
        .im-content::-webkit-scrollbar{width:6px}
        .im-content::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px}

        @media(max-width:768px){
          .im-sidebar{display:none}
          .im-header-search{display:none}
          .im-content{padding:18px 16px}
        }
      `}</style>

      <div className="im-root">
        {/* ── HEADER ── */}
        <header className="im-header">
          <div className="im-header-left">
            {/* Waffle */}
            <button className="im-waffle">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="2" width="4" height="4" rx="1"/><rect x="10" y="2" width="4" height="4" rx="1"/><rect x="18" y="2" width="4" height="4" rx="1"/>
                <rect x="2" y="10" width="4" height="4" rx="1"/><rect x="10" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/>
                <rect x="2" y="18" width="4" height="4" rx="1"/><rect x="10" y="18" width="4" height="4" rx="1"/><rect x="18" y="18" width="4" height="4" rx="1"/>
              </svg>
            </button>
            {/* Brand */}
            <div className="im-brand">
              <div className="im-brand-icon">🏢</div>
              <span className="im-brand-name">Imoloc</span>
              <div className="im-brand-sep"/>
              <span className="im-brand-sub">Gestion Immobiliere</span>
            </div>
          </div>

          {/* Recherche */}
          <div className="im-header-search">
            <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
            <input value={searchVal} onChange={e=>setSearchVal(e.target.value)} placeholder="Rechercher un bien, locataire, bail..."/>
          </div>

          {/* Droite */}
          <div className="im-header-right">
            {/* Bouton Loci */}
            <button className="im-hbtn im-hbtn-loci" onClick={()=>navigate("/imoloc/loci")}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
              Loci IA
            </button>

            {/* Notifications */}
            <button className="im-hbtn">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>
              {stats.retards > 0 && <span className="im-badge"/>}
            </button>

            {/* Lien Admin Center */}
            <button className="im-hbtn" title="Admin Center" onClick={()=>window.open("/agence","_blank")}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
            </button>

            {/* Profil */}
            <div style={{position:"relative"}} ref={profileRef}>
              <button className="im-profile-btn" onClick={()=>setProfileOpen(o=>!o)}>
                <div className="im-av">{profile?.prenom?.[0]?.toUpperCase()||"U"}</div>
                <span className="im-profile-name">{profile?.prenom} {profile?.nom}</span>
                <svg width="12" height="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
              </button>
              {profileOpen && (
                <div className="im-profile-drop">
                  <div className="im-drop-head">
                    <div className="im-drop-name">{profile?.prenom} {profile?.nom}</div>
                    <div className="im-drop-email">{profile?.email}</div>
                    <div className="im-drop-agence">🏢 {agence?.nom || "Mon agence"}</div>
                  </div>
                  <button className="im-drop-item" onClick={()=>{navigate("/imoloc/profil");setProfileOpen(false)}}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Mon profil
                  </button>
                  <button className="im-drop-item" onClick={()=>{window.open("/agence","_blank");setProfileOpen(false)}}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                    Admin Center
                  </button>
                  <div className="im-drop-sep"/>
                  <button className="im-drop-item red" onClick={handleLogout}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
                    Deconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── BODY ── */}
        <div className="im-body">
          {/* Sidebar */}
          <div className="im-sidebar">
            <nav className="im-nav">
              <div className="im-nav-sect">Navigation</div>
              {NAV.map(item => {
                const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
                const hasChildren = item.children?.length > 0
                const isExpanded = expanded[item.id]
                return (
                  <div key={item.id}>
                    {hasChildren ? (
                      <>
                        <button className={`im-nav-item ${isActive?"active":""}`}
                          onClick={(e)=>{ navigate(item.path); toggle(item.id,e) }}>
                          <span className="im-nav-left">
                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d={item.icon}/></svg>
                            {item.label}
                          </span>
                          <svg className={`im-nav-arrow ${isExpanded?"open":""}`} width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
                        </button>
                        {isExpanded && (
                          <div className="im-nav-sub">
                            {item.children.map(child=>(
                              <NavLink key={child.path} to={child.path} end className={({isActive})=>`im-nav-sub-item ${isActive?"active":""}`}>{child.label}</NavLink>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <NavLink to={item.path} end={item.exact}
                        className={({isActive})=>`im-nav-item ${item.loci?"loci-item":""} ${isActive?"active":""}`}>
                        <span className="im-nav-left">
                          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d={item.icon}/></svg>
                          {item.label}
                        </span>
                        {item.loci && <span style={{fontSize:9,padding:"1px 6px",borderRadius:"100px",background:"rgba(108,99,255,0.2)",color:"#a78bfa",fontWeight:700}}>IA</span>}
                      </NavLink>
                    )}
                  </div>
                )
              })}
            </nav>

            {/* Stats rapides */}
            <div className="im-sidebar-bottom">
              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.2)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Apercu</div>
              {[
                {lbl:"Biens", val:stats.biens, col:"#0078d4"},
                {lbl:"Locataires", val:stats.locataires, col:"#6c63ff"},
                {lbl:"Baux actifs", val:stats.baux, col:"#00c896"},
                {lbl:"Retards", val:stats.retards, col:stats.retards>0?"#f59e0b":"rgba(255,255,255,0.3)"},
              ].map((s,i)=>(
                <div key={i} className="im-mini-stat">
                  <span className="im-mini-lbl">{s.lbl}</span>
                  <span className="im-mini-val" style={{color:s.col}}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contenu */}
          <div className="im-content">
            <Routes>
              <Route index element={<ImolocDashboard agence={agence} stats={stats} navigate={navigate}/>} />
              <Route path="proprietaires/*" element={<Proprietaires />} />
              <Route path="biens/*" element={<Biens />} />
              <Route path="locataires/*" element={<Locataires />} />
              <Route path="baux/*" element={<Baux />} />
              <Route path="paiements/*" element={<Paiements />} />
              <Route path="loci/*" element={<Soon title="Loci IA" icon="✨"/>} />
              <Route path="maintenance/*" element={<Maintenance />} />
              <Route path="etats-lieux/*" element={<EtatsDesLieux />} />
              <Route path="rapports/*" element={<Rapports />} />} />
            </Routes>
          </div>
        </div>
      </div>
    </>
  )
}
