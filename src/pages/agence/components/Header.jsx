import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import { supabase } from '../../../lib/supabase'

const PAGE_TITLES = {
  '/agence': { title: 'Vue d\'ensemble', sub: 'Tableau de bord de votre agence' },
  '/agence/biens': { title: 'Biens', sub: 'Gérez vos biens immobiliers' },
  '/agence/locataires': { title: 'Locataires', sub: 'Gérez vos locataires' },
  '/agence/paiements': { title: 'Paiements', sub: 'Suivi des loyers et transactions' },
  '/agence/baux': { title: 'Baux', sub: 'Contrats et signatures électroniques' },
  '/agence/rapports': { title: 'Rapports', sub: 'Statistiques et analyses' },
  '/agence/utilisateurs': { title: 'Utilisateurs', sub: 'Gestion des membres de l\'équipe' },
  '/agence/organisation': { title: 'Organisation', sub: 'Informations et paramètres agence' },
  '/agence/abonnement': { title: 'Abonnement', sub: 'Plan et facturation Imoloc' },
  '/agence/securite': { title: 'Sécurité', sub: 'Accès et protection du compte' },
  '/agence/parametres': { title: 'Paramètres', sub: 'Configuration générale' },
  '/agence/integrations': { title: 'Intégrations', sub: 'Connexions et API' },
}

export default function Header({ onMenuClick, onToggleSidebar, sidebarOpen }) {
  const location = useLocation()
  const { profile, logout } = useAuthStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const page = PAGE_TITLES[location.pathname] || { title: 'Imoloc', sub: '' }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
  }

  return (
    <>
      <style>{`
        .hd{height:60px;background:#0d1117;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;padding:0 24px;gap:16px;position:sticky;top:0;z-index:50;flex-shrink:0}
        .hd-toggle{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:6px;border-radius:6px;transition:all 0.15s;display:flex;align-items:center;justify-content:center}
        .hd-toggle:hover{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.8)}
        .hd-menu{display:none;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:6px;border-radius:6px;transition:all 0.15s}
        .hd-menu:hover{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.8)}
        .hd-title{flex:1}
        .hd-title-main{font-size:16px;font-weight:600;color:#e6edf3;letter-spacing:-0.01em}
        .hd-title-sub{font-size:12px;color:rgba(255,255,255,0.3);margin-top:1px}
        .hd-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:7px 14px;width:260px;transition:all 0.15s}
        .hd-search:focus-within{border-color:rgba(0,120,212,0.4);background:rgba(255,255,255,0.06)}
        .hd-search input{background:none;border:none;outline:none;font-family:'Inter',sans-serif;font-size:13.5px;color:#e6edf3;width:100%}
        .hd-search input::placeholder{color:rgba(255,255,255,0.22)}
        .hd-actions{display:flex;align-items:center;gap:6px}
        .hd-btn{position:relative;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);padding:8px;border-radius:8px;transition:all 0.15s;display:flex;align-items:center;justify-content:center}
        .hd-btn:hover{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.8)}
        .hd-badge{position:absolute;top:4px;right:4px;width:8px;height:8px;border-radius:50%;background:#ef4444;border:1.5px solid #0d1117}
        .hd-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#0078d4,#6c63ff);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#fff;cursor:pointer;border:2px solid transparent;transition:border-color 0.15s}
        .hd-avatar:hover{border-color:rgba(0,120,212,0.5)}
        .hd-dropdown{position:absolute;top:calc(100% + 8px);right:0;background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:10px;min-width:220px;box-shadow:0 16px 40px rgba(0,0,0,0.6);z-index:200;overflow:hidden}
        .hd-dropdown-head{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .hd-dd-name{font-size:14px;font-weight:600;color:#e6edf3}
        .hd-dd-email{font-size:12px;color:rgba(255,255,255,0.3);margin-top:2px}
        .hd-dd-item{display:flex;align-items:center;gap:10px;padding:10px 16px;font-size:13.5px;color:rgba(255,255,255,0.55);cursor:pointer;transition:all 0.15s;text-decoration:none;border:none;background:none;width:100%;text-align:left;font-family:'Inter',sans-serif}
        .hd-dd-item:hover{background:rgba(255,255,255,0.04);color:#e6edf3}
        .hd-dd-item.danger{color:rgba(239,68,68,0.7)}
        .hd-dd-item.danger:hover{background:rgba(239,68,68,0.08);color:#ef4444}
        .hd-dd-sep{height:1px;background:rgba(255,255,255,0.06);margin:4px 0}
        .hd-notif-list{max-height:320px;overflow-y:auto}
        .hd-notif-item{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:background 0.15s}
        .hd-notif-item:hover{background:rgba(255,255,255,0.03)}
        .hd-notif-dot{width:8px;height:8px;border-radius:50%;background:#0078d4;flex-shrink:0;margin-top:4px}
        .hd-notif-title{font-size:13px;color:#e6edf3;font-weight:500;margin-bottom:2px}
        .hd-notif-time{font-size:11px;color:rgba(255,255,255,0.25)}
        @media(max-width:768px){
          .hd-menu{display:flex}
          .hd-toggle{display:none}
          .hd-search{display:none}
        }
      `}</style>
      <header className="hd">
        <button className="hd-menu" onClick={onMenuClick}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
          </svg>
        </button>
        <button className="hd-toggle" onClick={onToggleSidebar}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" d={sidebarOpen ? "M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" : "M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5"}/>
          </svg>
        </button>
        <div className="hd-title">
          <div className="hd-title-main">{page.title}</div>
          {page.sub && <div className="hd-title-sub">{page.sub}</div>}
        </div>
        <div className="hd-search">
          <svg width="15" height="15" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/>
          </svg>
          <input placeholder="Rechercher..." />
        </div>
        <div className="hd-actions">
          <div style={{position:'relative'}}>
            <button className="hd-btn" onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
              </svg>
              <span className="hd-badge"/>
            </button>
            {notifOpen && (
              <div className="hd-dropdown" style={{minWidth:300}}>
                <div className="hd-dropdown-head" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:14,fontWeight:600,color:'#e6edf3'}}>Notifications</span>
                  <span style={{fontSize:12,color:'#0078d4',cursor:'pointer'}}>Tout lire</span>
                </div>
                <div className="hd-notif-list">
                  {[
                    { title: '3 loyers en retard ce mois', time: 'Il y a 2h' },
                    { title: 'Bail expirant dans 30 jours — Apt 12', time: 'Il y a 5h' },
                    { title: 'Nouveau paiement reçu — 75 000 FCFA', time: 'Hier' },
                    { title: 'Plainte soumise par M. Adjovi', time: 'Il y a 2 jours' },
                  ].map((n, i) => (
                    <div key={i} className="hd-notif-item" style={{display:'flex',gap:10}}>
                      <div className="hd-notif-dot"/>
                      <div>
                        <div className="hd-notif-title">{n.title}</div>
                        <div className="hd-notif-time">{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{position:'relative'}}>
            <div className="hd-avatar" onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}>
              {profile?.prenom?.[0]?.toUpperCase() || 'A'}
            </div>
            {profileOpen && (
              <div className="hd-dropdown">
                <div className="hd-dropdown-head">
                  <div className="hd-dd-name">{profile?.prenom} {profile?.nom}</div>
                  <div className="hd-dd-email">Administrateur</div>
                </div>
                <Link to="/agence/organisation" className="hd-dd-item" onClick={() => setProfileOpen(false)}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                  Mon profil
                </Link>
                <Link to="/agence/parametres" className="hd-dd-item" onClick={() => setProfileOpen(false)}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Paramètres
                </Link>
                <div className="hd-dd-sep"/>
                <button className="hd-dd-item danger" onClick={handleLogout}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
