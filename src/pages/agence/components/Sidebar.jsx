import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'

const NAV = [
  { id:'home', label:'Accueil', path:'/agence', exact:true, icon:'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
  { id:'nouveautes', label:'Nouveautés', path:'/agence/nouveautes', exact:true, icon:'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z' },

  { id:'users', label:'Utilisateurs', icon:'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    children:[
      { label:'Utilisateurs actifs', path:'/agence/utilisateurs' },
      { label:'Contacts', path:'/agence/utilisateurs/contacts' },
      { label:'Utilisateurs invités', path:'/agence/utilisateurs/invites' },
      { label:'Utilisateurs supprimés', path:'/agence/utilisateurs/supprimes' },
    ]
  },
  { id:'biens', label:'Biens immobiliers', icon:'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z',
    children:[
      { label:'Tous les biens', path:'/agence/biens' },
      { label:'Biens libres', path:'/agence/biens/libres' },
      { label:'Biens occupés', path:'/agence/biens/occupes' },
      { label:'En maintenance', path:'/agence/biens/maintenance' },
    ]
  },
  { id:'locataires', label:'Locataires', icon:'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
    children:[
      { label:'Locataires actifs', path:'/agence/locataires' },
      { label:'Historique', path:'/agence/locataires/historique' },
      { label:'Dossiers', path:'/agence/locataires/dossiers' },
    ]
  },
  { id:'facturation', label:'Facturation', icon:'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
    children:[
      { label:'Factures et paiements', path:'/agence/abonnement' },
      
      { label:'Modes de paiement', path:'/agence/abonnement/modes' },
    ]
  },
  { id:'parametres', label:'Paramètres', icon:'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    children:[
      { label:"Paramètres de l'organisation", path:'/agence/organisation' },
      { label:'Sécurité', path:'/agence/securite' },
      { label:'Applications intégrées', path:'/agence/integrations' },
      { label:'Notifications', path:'/agence/parametres' },
    ]
  },
]

const ADMIN_CENTERS = [
  { label:'Centre Imoloc', path:'/agence/imoloc', icon:'🏢' },
  { label:'Baux', path:'/agence/baux', icon:'📄' },
  { label:'Rapports', path:'/agence/rapports', icon:'📊' },
  { label:'Maintenance', path:'/agence/maintenance', icon:'🔧' },
  { label:'Tous les centres', path:'/agence', icon:'⊞' },
  { label:'Personnaliser la navigation', path:'/agence/parametres', icon:'✏️' },
]

export default function Sidebar({ collapsed, mobileOpen, onClose }) {
  const location = useLocation()
  const { profile, logout } = useAuthStore()
  const [expanded, setExpanded] = useState({ users:true, biens:false, locataires:false, facturation:false, parametres:false })

  const toggle = (id) => setExpanded(p=>({...p,[id]:!p[id]}))
  const isActive = (path, exact) => exact ? location.pathname===path : location.pathname===path||location.pathname.startsWith(path+'/')

  const handleLogout = async () => { await supabase.auth.signOut(); logout() }

  return (
    <>
      <style>{`
        .sb3{width:${collapsed?'48px':'220px'};min-height:100vh;background:#161b22;border-right:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;transition:width 0.2s ease;flex-shrink:0;overflow:hidden}
        .sb3-nav{flex:1;overflow-y:auto;padding:8px 0}
        .sb3-nav::-webkit-scrollbar{width:3px}
        .sb3-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .sb3-item{display:flex;align-items:center;gap:10px;padding:7px ${collapsed?'14px':'14px'};cursor:pointer;transition:background 0.1s;position:relative;border:none;background:none;width:100%;text-align:left;font-family:'Inter',sans-serif;color:rgba(255,255,255,0.5);font-size:13px;font-weight:400;white-space:nowrap;overflow:hidden;text-decoration:none}
        .sb3-item:hover{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.85)}
        .sb3-item.active{background:rgba(0,120,212,0.12);color:#4da6ff}
        .sb3-item.active::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:#0078d4}
        .sb3-loci{display:flex;align-items:center;gap:10px;padding:7px 14px;cursor:pointer;transition:all 0.15s;position:relative;border:none;width:100%;text-align:left;font-family:'Inter',sans-serif;font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-decoration:none;background:linear-gradient(135deg,rgba(108,99,255,0.08),rgba(0,200,150,0.08));border-left:2px solid transparent;color:rgba(255,255,255,0.7)}
        .sb3-loci:hover{background:linear-gradient(135deg,rgba(108,99,255,0.15),rgba(0,200,150,0.15));color:#e6edf3}
        .sb3-loci.active{border-left-color:#6c63ff;color:#a78bfa}
        .sb3-loci-icon{width:16px;height:16px;flex-shrink:0;background:linear-gradient(135deg,#6c63ff,#00c896);border-radius:50%;display:flex;align-items:center;justify-content:center}
        .sb3-icon{width:16px;height:16px;flex-shrink:0}
        .sb3-lbl{flex:1;overflow:hidden;text-overflow:ellipsis}
        .sb3-chevron{width:14px;height:14px;flex-shrink:0;transition:transform 0.2s;opacity:0.4}
        .sb3-chevron.open{transform:rotate(90deg)}
        .sb3-sub{padding-left:${collapsed?'0':'30px'}}
        .sb3-sub-item{display:flex;align-items:center;padding:5px 14px;cursor:pointer;font-size:12.5px;color:rgba(255,255,255,0.4);transition:all 0.1s;text-decoration:none;white-space:nowrap;overflow:hidden;border-left:1px solid rgba(255,255,255,0.06)}
        .sb3-sub-item:hover{color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.04)}
        .sb3-sub-item.active{color:#4da6ff;border-left-color:#0078d4}
        .sb3-sep{height:1px;background:rgba(255,255,255,0.06);margin:6px 0}
        .sb3-section{font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.2);padding:8px 14px 4px;white-space:nowrap;overflow:hidden}
        .sb3-admin{display:flex;align-items:center;gap:8px;padding:6px 14px;cursor:pointer;font-size:12.5px;color:rgba(255,255,255,0.4);transition:all 0.1s;text-decoration:none;white-space:nowrap;overflow:hidden;border:none;background:none;font-family:'Inter',sans-serif;width:100%;text-align:left}
        .sb3-admin:hover{color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.04)}
        .sb3-admin.active{color:#4da6ff}
        .sb3-footer{padding:8px;border-top:1px solid rgba(255,255,255,0.06)}
        .sb3-user{display:flex;align-items:center;gap:10px;padding:8px;border-radius:6px;overflow:hidden;cursor:pointer;transition:background 0.1s}
        .sb3-user:hover{background:rgba(255,255,255,0.04)}
        .sb3-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#0078d4,#6c63ff);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#fff;flex-shrink:0}
        .sb3-user-name{font-size:12.5px;font-weight:500;color:rgba(255,255,255,0.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sb3-logout{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.2);padding:4px;border-radius:4px;flex-shrink:0;display:flex;transition:all 0.1s}
        .sb3-logout:hover{color:#ef4444;background:rgba(239,68,68,0.1)}
        @media(max-width:768px){
          .sb3{position:fixed;left:0;top:0;bottom:0;transform:translateX(-100%);transition:transform 0.25s ease;width:220px!important;z-index:100}
          .sb3.mobile-open{transform:translateX(0)}
        }
      `}</style>

      <aside className={`sb3 ${mobileOpen?'mobile-open':''}`}>
        <nav className="sb3-nav">
          {/* Accueil */}
          <Link to="/agence" className={`sb3-item ${isActive('/agence',true)?'active':''}`} onClick={onClose}>
            <svg className="sb3-icon" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={NAV[0].icon}/>
            </svg>
            {!collapsed && <span className="sb3-lbl">Accueil</span>}
          </Link>

          {/* Sections expandables */}
          {/* Loci AI */}
          <Link to="/agence/loci" className={`sb3-loci ${location.pathname.startsWith('/agence/loci') ? 'active' : ''}`} onClick={onClose} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div className="sb3-loci-icon">
              <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
            </div>
            {!collapsed && (
              <>
                <span style={{background:'linear-gradient(135deg,#a78bfa,#34d399)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',fontWeight:600}}>
                  Loci
                </span>
                <span style={{fontSize:10,padding:'1px 6px',borderRadius:'100px',background:'linear-gradient(135deg,rgba(108,99,255,0.2),rgba(0,200,150,0.2))',color:'#a78bfa',marginLeft:'auto',flexShrink:0,WebkitTextFillColor:'#a78bfa'}}>IA</span>
              </>
            )}
                  <svg width='12' height='12' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24' style={{marginRight:4,flexShrink:0,transition:'transform 0.2s',transform:location.pathname.startsWith('/agence/loci')?'rotate(180deg)':'rotate(0deg)'}}><path strokeLinecap='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/></svg>
                </Link>
          {/* Sous-menu Loci */}
          {!collapsed && location.pathname.startsWith('/agence/loci') && (
            <div style={{paddingLeft:30}}>
              <Link to="/agence/loci" className="sb3-sub-item" onClick={onClose}
                style={{display:'flex',alignItems:'center',padding:'5px 14px',cursor:'pointer',fontSize:12.5,color:location.pathname==='/agence/loci'?'#a78bfa':'rgba(255,255,255,0.4)',transition:'all 0.1s',textDecoration:'none',borderLeft:'1px solid rgba(108,99,255,0.2)'}}>
                📊 Tableau de bord
              </Link>
              <Link to="/agence/loci/chat" className="sb3-sub-item" onClick={onClose}
                style={{display:'flex',alignItems:'center',padding:'5px 14px',cursor:'pointer',fontSize:12.5,color:location.pathname==='/agence/loci/chat'?'#a78bfa':'rgba(255,255,255,0.4)',transition:'all 0.1s',textDecoration:'none',borderLeft:'1px solid rgba(108,99,255,0.2)'}}>
                💬 Loci Chat
              </Link>
              <Link to="/agence/loci/outils" className="sb3-sub-item" onClick={onClose}
                style={{display:'flex',alignItems:'center',padding:'5px 14px',cursor:'pointer',fontSize:12.5,color:location.pathname==='/agence/loci/outils'?'#a78bfa':'rgba(255,255,255,0.4)',transition:'all 0.1s',textDecoration:'none',borderLeft:'1px solid rgba(108,99,255,0.2)'}}>
                🛠️ Outils BI
              </Link>
            </div>
          )}

          {NAV.slice(1).map(item => (
            <div key={item.id}>
              <button className={`sb3-item ${item.children?.some(c=>isActive(c.path))?'active':''}`} onClick={()=>toggle(item.id)}>
                <svg className="sb3-icon" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon}/>
                </svg>
                {!collapsed && (
                  <>
                    <span className="sb3-lbl">{item.label}</span>
                    <svg className={`sb3-chevron ${expanded[item.id]?'open':''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                    </svg>
                  </>
                )}
              </button>
              {!collapsed && expanded[item.id] && (
                <div className="sb3-sub">
                  {item.children.map((child,i) => (
                    <Link key={i} to={child.path} className={`sb3-sub-item ${isActive(child.path)?'active':''}`} onClick={onClose}>
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="sb3-sep"/>
          {!collapsed && <div className="sb3-section">Centres d'administration</div>}

          {ADMIN_CENTERS.map((c,i) => (
            <Link key={i} to={c.path} className={`sb3-admin ${isActive(c.path)?'active':''}`} onClick={onClose}>
              <span style={{fontSize:14,flexShrink:0}}>{c.icon}</span>
              {!collapsed && c.label}
            </Link>
          ))}
        </nav>

        <div className="sb3-footer">
          <div className="sb3-user">
            <div className="sb3-avatar">{profile?.prenom?.[0]?.toUpperCase()||'A'}</div>
            {!collapsed && <span className="sb3-user-name">{profile?.prenom} {profile?.nom}</span>}
            {!collapsed && (
              <button className="sb3-logout" onClick={handleLogout} title="Déconnexion">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
