import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import { supabase } from '../../../lib/supabase'

const NAV = [
  { section: 'Principal' },
  { path: '/agence', icon: 'M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z', label: 'Vue d\'ensemble', exact: true },
  { path: '/agence/biens', icon: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z', label: 'Biens' },
  { path: '/agence/locataires', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', label: 'Locataires' },
  { path: '/agence/paiements', icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75', label: 'Paiements' },
  { path: '/agence/baux', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z', label: 'Baux' },
  { path: '/agence/rapports', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z', label: 'Rapports' },
  { section: 'Administration' },
  { path: '/agence/utilisateurs', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z', label: 'Utilisateurs' },
  { path: '/agence/organisation', icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21', label: 'Organisation' },
  { path: '/agence/abonnement', icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z', label: 'Abonnement' },
  { path: '/agence/securite', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z', label: 'Sécurité' },
  { path: '/agence/parametres', icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z', label: 'Paramètres' },
  { path: '/agence/integrations', icon: 'M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z', label: 'Intégrations' },
]

export default function Sidebar({ open, mobileOpen, onClose }) {
  const location = useLocation()
  const { profile, logout } = useAuthStore()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
  }

  const isActive = (path, exact) => exact ? location.pathname === path : location.pathname.startsWith(path) && path !== '/agence' || location.pathname === path

  return (
    <>
      <style>{`
        .sb{width:240px;min-height:100vh;background:#0d1117;border-right:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;transition:width 0.25s ease;flex-shrink:0;position:relative;z-index:100}
        .sb.collapsed{width:64px}
        .sb-logo{display:flex;align-items:center;gap:10px;padding:0 16px;height:60px;border-bottom:1px solid rgba(255,255,255,0.06);text-decoration:none;overflow:hidden;flex-shrink:0}
        .sb-logo-icon{width:32px;height:32px;border-radius:8px;background:#0078d4;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .sb-logo-name{font-size:16px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;letter-spacing:-0.02em}
        .sb-nav{flex:1;overflow-y:auto;padding:12px 8px;display:flex;flex-direction:column;gap:2px}
        .sb-nav::-webkit-scrollbar{width:4px}
        .sb-nav::-webkit-scrollbar-track{background:transparent}
        .sb-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .sb-section{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.2);padding:12px 8px 6px;white-space:nowrap;overflow:hidden}
        .sb-link{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:7px;text-decoration:none;color:rgba(255,255,255,0.45);transition:all 0.15s;font-size:13.5px;font-weight:500;overflow:hidden;white-space:nowrap;position:relative}
        .sb-link:hover{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.85)}
        .sb-link.active{background:rgba(0,120,212,0.15);color:#4da6ff}
        .sb-link.active::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:60%;background:#0078d4;border-radius:0 2px 2px 0}
        .sb-icon{flex-shrink:0;width:18px;height:18px}
        .sb-lbl{overflow:hidden;text-overflow:ellipsis}
        .sb-footer{padding:12px 8px;border-top:1px solid rgba(255,255,255,0.06)}
        .sb-user{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:7px;overflow:hidden}
        .sb-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#0078d4,#6c63ff);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#fff;flex-shrink:0}
        .sb-user-info{overflow:hidden;flex:1}
        .sb-user-name{font-size:13px;font-weight:600;color:#e6edf3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sb-user-role{font-size:11px;color:rgba(255,255,255,0.3);white-space:nowrap}
        .sb-logout{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.25);padding:4px;border-radius:5px;transition:all 0.15s;flex-shrink:0;display:flex}
        .sb-logout:hover{color:#ef4444;background:rgba(239,68,68,0.1)}
        @media(max-width:768px){
          .sb{position:fixed;left:0;top:0;bottom:0;transform:translateX(-100%);transition:transform 0.25s ease;z-index:100;width:240px !important}
          .sb.mobile-open{transform:translateX(0)}
        }
      `}</style>
      <aside className={`sb ${!open ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <a href="/agence" className="sb-logo">
          <div className="sb-logo-icon">
            <svg width="17" height="17" fill="none" stroke="#fff" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"/>
            </svg>
          </div>
          <span className="sb-logo-name">Imoloc</span>
        </a>

        <nav className="sb-nav">
          {NAV.map((item, i) => {
            if (item.section) return (
              <div key={i} className="sb-section">{open ? item.section : '—'}</div>
            )
            const active = item.exact ? location.pathname === item.path : location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <Link key={i} to={item.path} className={`sb-link ${active ? 'active' : ''}`} onClick={onClose}>
                <svg className="sb-icon" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon}/>
                </svg>
                <span className="sb-lbl">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="sb-footer">
          <div className="sb-user">
            <div className="sb-avatar">
              {profile?.prenom?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="sb-user-info">
              <div className="sb-user-name">{profile?.prenom ? `${profile.prenom} ${profile.nom || ''}` : 'Agence'}</div>
              <div className="sb-user-role">Administrateur</div>
            </div>
            <button className="sb-logout" onClick={handleLogout} title="Déconnexion">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
