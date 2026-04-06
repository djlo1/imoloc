import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const ComingSoon = ({ title, icon }) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,gap:16,opacity:0.5}}>
    <div style={{fontSize:48}}>{icon}</div>
    <div style={{fontSize:20,fontWeight:600,color:"rgba(255,255,255,0.6)"}}>{title}</div>
    <div style={{fontSize:14,color:"rgba(255,255,255,0.3)"}}>Module en cours de developpement</div>
  </div>
)

const NAV = [
  { id:"dashboard", label:"Tableau de bord", path:"/imoloc", exact:true, icon:"M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
  { id:"proprietaires", label:"Proprietaires", path:"/imoloc/proprietaires", icon:"M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
  { id:"biens", label:"Biens immobiliers", path:"/imoloc/biens", icon:"M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z",
    children:[
      {label:"Tous les biens", path:"/imoloc/biens"},
      {label:"Biens libres", path:"/imoloc/biens/libres"},
      {label:"Biens occupes", path:"/imoloc/biens/occupes"},
      {label:"En maintenance", path:"/imoloc/biens/maintenance"},
    ]
  },
  { id:"locataires", label:"Locataires", path:"/imoloc/locataires", icon:"M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197",
    children:[
      {label:"Locataires actifs", path:"/imoloc/locataires"},
      {label:"Historique", path:"/imoloc/locataires/historique"},
    ]
  },
  { id:"baux", label:"Baux et Contrats", path:"/imoloc/baux", icon:"M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z",
    children:[
      {label:"Baux actifs", path:"/imoloc/baux"},
      {label:"Expiration proche", path:"/imoloc/baux/expiration"},
    ]
  },
  { id:"paiements", label:"Paiements", path:"/imoloc/paiements", icon:"M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
    children:[
      {label:"Tous les paiements", path:"/imoloc/paiements"},
      {label:"En retard", path:"/imoloc/paiements/retard"},
    ]
  },
  { id:"maintenance", label:"Maintenance", path:"/imoloc/maintenance", icon:"M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" },
  { id:"rapports", label:"Rapports", path:"/imoloc/rapports", icon:"M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
]

export default function ImolocApp() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, logout } = useAuthStore()
  const [agence, setAgence] = useState(null)
  const [stats, setStats] = useState({biens:0,locataires:0,baux:0,retards:0})
  const [expanded, setExpanded] = useState({biens:true,locataires:false,baux:false,paiements:false})
  const [checking, setChecking] = useState(true)

  useEffect(() => { checkAccess() }, [])

  const checkAccess = async () => {
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { navigate("/login-imoloc"); return }
      const { data:agList } = await supabase.from("agences").select("*")
      const ag = agList?.find(a=>a.profile_id===user.id) || agList?.[0]
      setAgence(ag)
      if (ag?.id) {
        const [b,l,bx,pr] = await Promise.all([
          supabase.from("biens").select("id",{count:"exact"}).eq("agence_id",ag.id),
          supabase.from("locataires").select("id",{count:"exact"}).eq("agence_id",ag.id),
          supabase.from("baux").select("id",{count:"exact"}).eq("agence_id",ag.id).eq("statut","actif"),
          supabase.from("paiements").select("id",{count:"exact"}).eq("agence_id",ag.id).eq("statut","en_retard"),
        ])
        setStats({biens:b.count||0,locataires:l.count||0,baux:bx.count||0,retards:pr.count||0})
      }
    } catch(e) { navigate("/login-imoloc") }
    finally { setChecking(false) }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate("/login-imoloc")
    toast.success("Deconnexion reussie")
  }

  const toggle = (id,e) => {
    e.preventDefault(); e.stopPropagation()
    setExpanded(p=>({...p,[id]:!p[id]}))
  }

  if (checking) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0d1117",color:"rgba(255,255,255,0.4)",fontSize:14}}>
      Chargement...
    </div>
  )

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{width:100%;height:100%}
        .im-root{display:flex;flex-direction:column;width:100vw;height:100vh;background:#0d1117;font-family:Inter,-apple-system,sans-serif;color:#e6edf3}
        .im-topbar{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:rgba(0,0,0,0.3);border-bottom:1px solid rgba(0,200,150,0.15);flex-shrink:0}
        .im-topbar-left{display:flex;align-items:center;gap:14px}
        .im-logo{display:flex;align-items:center;gap:9px;text-decoration:none}
        .im-logo-icon{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,rgba(0,200,150,0.2),rgba(0,120,212,0.15));border:1px solid rgba(0,200,150,0.3);display:flex;align-items:center;justify-content:center;font-size:15px}
        .im-logo-name{font-size:15px;font-weight:700;background:linear-gradient(135deg,#00c896,#0078d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .im-logo-sep{width:1px;height:20px;background:rgba(255,255,255,0.1)}
        .im-logo-sub{font-size:12px;color:rgba(255,255,255,0.35);font-weight:500}
        .im-topbar-right{display:flex;align-items:center;gap:10px}
        .im-topbar-agence{font-size:12.5px;color:rgba(255,255,255,0.45);padding:4px 10px;border-radius:100px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08)}
        .im-topbar-user{display:flex;align-items:center;gap:8px;font-size:12.5px;color:rgba(255,255,255,0.55)}
        .im-topbar-av{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#00c896,#0078d4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff}
        .im-back-btn{display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:5px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);font-size:12px;cursor:pointer;font-family:Inter,sans-serif;transition:all 0.15s}
        .im-back-btn:hover{background:rgba(255,255,255,0.09);color:#e6edf3}
        .im-logout{display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:5px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);color:rgba(239,68,68,0.8);font-size:12px;cursor:pointer;font-family:Inter,sans-serif;transition:all 0.15s}
        .im-logout:hover{background:rgba(239,68,68,0.14)}
        .im-body{display:flex;flex:1;overflow:hidden}
        .im-sidebar{width:230px;flex-shrink:0;background:rgba(0,0,0,0.2);border-right:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;overflow-y:auto}
        .im-sidebar::-webkit-scrollbar{width:3px}
        .im-sidebar::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .im-nav{flex:1;padding:10px 8px}
        .im-nav-item{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:6px;font-size:13px;font-weight:500;color:rgba(255,255,255,0.5);text-decoration:none;transition:all 0.15s;cursor:pointer;border:none;background:none;font-family:Inter,sans-serif;width:100%;text-align:left}
        .im-nav-item:hover{background:rgba(255,255,255,0.06);color:#e6edf3}
        .im-nav-item.active{background:rgba(0,200,150,0.1);color:#00c896;border-left:2px solid #00c896;border-radius:0 6px 6px 0;padding-left:8px}
        .im-nav-left{display:flex;align-items:center;gap:9px}
        .im-nav-arrow{transition:transform 0.2s;color:rgba(255,255,255,0.25)}
        .im-nav-arrow.open{transform:rotate(180deg)}
        .im-nav-sub{padding-left:33px;display:flex;flex-direction:column;gap:1px;margin-bottom:4px}
        .im-nav-sub-item{padding:6px 10px;border-radius:5px;font-size:12.5px;color:rgba(255,255,255,0.4);text-decoration:none;transition:all 0.15s;display:block;border-left:1px solid rgba(255,255,255,0.08)}
        .im-nav-sub-item:hover{color:#e6edf3;background:rgba(255,255,255,0.04)}
        .im-nav-sub-item.active{color:#00c896;border-left-color:#00c896;background:rgba(0,200,150,0.05)}
        .im-sidebar-stats{padding:12px 14px;border-top:1px solid rgba(255,255,255,0.06)}
        .im-stat-row{display:flex;align-items:center;justify-content:space-between;padding:4px 0;font-size:12px}
        .im-stat-lbl{color:rgba(255,255,255,0.35)}
        .im-stat-val{font-weight:700}
        .im-content{flex:1;overflow-y:auto;padding:28px 32px}
        .im-content::-webkit-scrollbar{width:6px}
        .im-content::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
      `}</style>

      <div className="im-root">
        {/* Topbar */}
        <div className="im-topbar">
          <div className="im-topbar-left">
            <div className="im-logo">
              <div className="im-logo-icon">🏢</div>
              <span className="im-logo-name">Imoloc</span>
            </div>
            <div className="im-logo-sep"/>
            <span className="im-logo-sub">Gestion Immobiliere</span>
          </div>
          <div className="im-topbar-right">
            <span className="im-topbar-agence">{agence?.nom || "Mon agence"}</span>
            <div className="im-topbar-user">
              <div className="im-topbar-av">{profile?.prenom?.[0]?.toUpperCase()||"U"}</div>
              {profile?.prenom} {profile?.nom}
            </div>
            <button className="im-back-btn" onClick={()=>window.open("/agence","_blank")}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
              Admin Center
            </button>
            <button className="im-logout" onClick={handleLogout}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
              Deconnexion
            </button>
          </div>
        </div>

        <div className="im-body">
          {/* Sidebar */}
          <div className="im-sidebar">
            <nav className="im-nav">
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
                          <svg className={`im-nav-arrow ${isExpanded?"open":""}`} width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
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
                      <NavLink to={item.path} end={item.exact} className={({isActive})=>`im-nav-item ${isActive?"active":""}`}>
                        <span className="im-nav-left">
                          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d={item.icon}/></svg>
                          {item.label}
                        </span>
                      </NavLink>
                    )}
                  </div>
                )
              })}
            </nav>
            <div className="im-sidebar-stats">
              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.2)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Apercu</div>
              {[
                {lbl:"Biens", val:stats.biens, col:"#0078d4"},
                {lbl:"Locataires", val:stats.locataires, col:"#6c63ff"},
                {lbl:"Baux actifs", val:stats.baux, col:"#00c896"},
                {lbl:"Retards", val:stats.retards, col:stats.retards>0?"#f59e0b":"rgba(255,255,255,0.35)"},
              ].map((s,i)=>(
                <div key={i} className="im-stat-row">
                  <span className="im-stat-lbl">{s.lbl}</span>
                  <span className="im-stat-val" style={{color:s.col}}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contenu */}
          <div className="im-content">
            <Routes>
              <Route index element={<ComingSoon title="Tableau de bord Imoloc" icon="🏢"/>} />
              <Route path="proprietaires/*" element={<ComingSoon title="Proprietaires" icon="👤"/>} />
              <Route path="biens/*" element={<ComingSoon title="Biens immobiliers" icon="🏢"/>} />
              <Route path="locataires/*" element={<ComingSoon title="Locataires" icon="👥"/>} />
              <Route path="baux/*" element={<ComingSoon title="Baux et Contrats" icon="📄"/>} />
              <Route path="paiements/*" element={<ComingSoon title="Paiements" icon="💰"/>} />
              <Route path="maintenance/*" element={<ComingSoon title="Maintenance" icon="🔧"/>} />
              <Route path="rapports/*" element={<ComingSoon title="Rapports" icon="📊"/>} />
            </Routes>
          </div>
        </div>
      </div>
    </>
  )
}
