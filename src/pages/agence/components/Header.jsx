import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import { supabase } from '../../../lib/supabase'

const APPS = [
  { icon:'🏠', name:'Accueil', path:'/agence', color:'rgba(0,120,212,0.15)' },
  { icon:'🏢', name:'Biens', path:'/agence/biens', color:'rgba(108,99,255,0.15)' },
  { icon:'👥', name:'Locataires', path:'/agence/locataires', color:'rgba(0,200,150,0.15)' },
  { icon:'💳', name:'Paiements', path:'/agence/paiements', color:'rgba(245,158,11,0.15)' },
  { icon:'📄', name:'Baux', path:'/agence/baux', color:'rgba(239,68,68,0.15)' },
  { icon:'📊', name:'Rapports', path:'/agence/rapports', color:'rgba(0,120,212,0.15)' },
  { icon:'🔐', name:'Sécurité', path:'/agence/securite', color:'rgba(108,99,255,0.15)' },
  { icon:'⚙️', name:'Paramètres', path:'/agence/parametres', color:'rgba(255,255,255,0.06)' },
  { icon:'🔌', name:'Intégrations', path:'/agence/integrations', color:'rgba(0,200,150,0.15)' },
]

const NOTIFS = [
  { title:'3 loyers en retard ce mois', time:'Il y a 2h', dot:'#ef4444', read:false },
  { title:'Bail expirant dans 30 jours — Apt 12', time:'Il y a 5h', dot:'#f59e0b', read:false },
  { title:'Nouveau paiement reçu — 75 000 FCFA', time:'Hier', dot:'#00c896', read:true },
  { title:'Plainte soumise par M. Adjovi', time:'Il y a 2 jours', dot:'#6c63ff', read:true },
]

const NOUVEAUTES = [
  { tag:'NOUVEAU', title:'Signature électronique des baux', desc:'Signez vos contrats directement depuis Imoloc sans impression.', date:'Mars 2026' },
  { tag:'AMÉLIORATION', title:'Tableau de bord personnalisable', desc:'Choisissez les widgets à afficher sur votre accueil.', date:'Mars 2026' },
  { tag:'NOUVEAU', title:'Paiements Mobile Money automatiques', desc:'Intégration MTN MoMo et Moov Money pour les loyers récurrents.', date:'Fév 2026' },
  { tag:'BIENTÔT', title:'Application mobile locataires', desc:'Vos locataires pourront payer et soumettre des plaintes depuis leur téléphone.', date:'Avril 2026' },
]

export default function Header({ onMenuClick, onToggleSidebar }) {
  const { profile, logout } = useAuthStore()
  const [waffleOpen, setWaffleOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [agenceId, setAgenceId] = useState(null)

  useEffect(() => {
    const loadAgence = async () => {
      const { data:{ user } } = await supabase.auth.getUser()
      if (user) {
        const { data:agList } = await supabase.from('agences').select('id').limit(1)
        if (agList?.[0]) setAgenceId(agList[0].id)
        // Compter les nouveautés non vues
        const { data:toutes } = await supabase.from('nouveautes').select('id').eq('publie', true)
        const { data:vues } = await supabase.from('nouveautes_vues').select('nouveaute_id').eq('user_id', user.id)
        const vuesIds = (vues||[]).map(v=>v.nouveaute_id)
        const nonVues = (toutes||[]).filter(n=>!vuesIds.includes(n.id))
        setUnreadNouveautes(nonVues.length)
      }
    }
    loadAgence()
  }, [])
  const [nouveautesOpen, setNouveautesOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [theme, setTheme] = useState('sombre')
  const searchRef = useRef(null)

  const closeAll = () => {
    setWaffleOpen(false); setNotifOpen(false)
    setSettingsOpen(false); setProfileOpen(false); setNouveautesOpen(false)
  }

  useEffect(() => {
    const handleKey = (e) => {
      if (e.altKey && e.key === 's') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'Escape') closeAll()
    }
    const handleClick = (e) => {
      if (!e.target.closest('.hd3-dropdown-zone')) closeAll()
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('mousedown', handleClick)
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('mousedown', handleClick) }
  }, [])

  const handleLogout = async () => { await supabase.auth.signOut(); logout() }
  const unreadCount = NOTIFS.filter(n => !n.read).length

  return (
    <>
      <style>{`
        .hd3{height:48px;background:#1c2434;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;padding:0;position:sticky;top:0;z-index:200;flex-shrink:0}

        /* Gauche : juste waffle + brand */
        .hd3-left{display:flex;align-items:center;gap:0;padding:0 4px;flex-shrink:0}
        .hd3-waffle{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:4px;cursor:pointer;border:none;background:none;color:rgba(255,255,255,0.5);transition:all 0.1s;flex-shrink:0}
        .hd3-waffle:hover{background:rgba(255,255,255,0.08);color:#e6edf3}
        .hd3-brand{display:flex;align-items:center;gap:8px;padding:0 10px 0 4px;cursor:pointer;text-decoration:none;flex-shrink:0}
        .hd3-brand-icon{width:20px;height:20px;border-radius:4px;background:#0078d4;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .hd3-brand-name{font-size:13px;font-weight:600;color:rgba(255,255,255,0.85);white-space:nowrap;letter-spacing:-0.01em}

        /* Centre : recherche prend tout l'espace */
        .hd3-center{flex:1;display:flex;align-items:center;justify-content:center;padding:0 16px}
        .hd3-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-radius:4px;padding:7px 14px;width:100%;max-width:600px;transition:all 0.15s}
        .hd3-search:focus-within{border-color:rgba(0,120,212,0.5);background:rgba(255,255,255,0.09)}
        .hd3-search input{background:none;border:none;outline:none;font-family:'Inter',sans-serif;font-size:13px;color:#e6edf3;width:100%}
        .hd3-search input::placeholder{color:rgba(255,255,255,0.25)}
        .hd3-search-hint{font-size:11px;color:rgba(255,255,255,0.2);flex-shrink:0;white-space:nowrap}

        /* Droite */
        .hd3-right{display:flex;align-items:center;gap:2px;padding:0 8px;flex-shrink:0}
        .hd3-icon-btn{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:4px;cursor:pointer;border:none;background:none;color:rgba(255,255,255,0.5);transition:all 0.1s;position:relative;flex-shrink:0;text-decoration:none}
        .hd3-icon-btn:hover{background:rgba(255,255,255,0.08);color:#e6edf3}
        .hd3-badge{position:absolute;top:5px;right:5px;min-width:15px;height:15px;border-radius:100px;background:#ef4444;border:1.5px solid #1c2434;font-size:9px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;padding:0 2px}
        .hd3-avatar{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#0078d4,#6c63ff);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;cursor:pointer;border:1.5px solid transparent;transition:border-color 0.15s;flex-shrink:0;margin-left:2px}
        .hd3-avatar:hover{border-color:rgba(0,120,212,0.6)}

        /* Dropdowns */
        .hd3-drop{position:absolute;background:#1c2434;border:1px solid rgba(255,255,255,0.09);box-shadow:0 8px 32px rgba(0,0,0,0.6);z-index:300;border-radius:6px;overflow:hidden}

        /* Waffle */
        .hd3-waffle-menu{width:320px;top:calc(100% + 4px);left:0}
        .hd3-waffle-head{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.07);font-size:13px;font-weight:600;color:rgba(255,255,255,0.5)}
        .hd3-waffle-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:12px}
        .hd3-waffle-item{display:flex;flex-direction:column;align-items:center;gap:7px;padding:14px 8px;border-radius:6px;cursor:pointer;transition:background 0.1s;text-decoration:none;border:1px solid transparent}
        .hd3-waffle-item:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.08)}
        .hd3-waffle-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px}
        .hd3-waffle-name{font-size:12px;color:rgba(255,255,255,0.6);text-align:center;font-weight:500}

        /* Notifs */
        .hd3-notif-menu{width:340px;top:calc(100% + 4px);right:0}
        .hd3-notif-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.07)}
        .hd3-notif-item{display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:background 0.1s}
        .hd3-notif-item:hover{background:rgba(255,255,255,0.03)}
        .hd3-notif-item.unread{background:rgba(0,120,212,0.04)}
        .hd3-notif-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:5px}

        /* Settings */
        .hd3-settings-menu{width:280px;top:calc(100% + 4px);right:0}
        .hd3-settings-item{display:flex;align-items:center;justify-content:space-between;padding:9px 16px;cursor:pointer;transition:background 0.1s;text-decoration:none}
        .hd3-settings-item:hover{background:rgba(255,255,255,0.04)}
        .hd3-settings-left{display:flex;align-items:center;gap:10px;font-size:13.5px;color:rgba(255,255,255,0.65)}
        .hd3-theme-btns{display:flex;gap:4px}
        .hd3-theme-btn{padding:5px 10px;border-radius:5px;font-size:11.5px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.45);font-family:'Inter',sans-serif;transition:all 0.15s}
        .hd3-theme-btn.active{background:rgba(0,120,212,0.2);border-color:rgba(0,120,212,0.4);color:#4da6ff}

        /* Nouveautés */
        .hd3-news-menu{width:360px;top:calc(100% + 4px);right:0}
        .hd3-news-item{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:background 0.1s}
        .hd3-news-item:hover{background:rgba(255,255,255,0.03)}
        .hd3-news-tag{display:inline-block;padding:2px 8px;border-radius:100px;font-size:10px;font-weight:700;letter-spacing:0.06em;margin-bottom:6px}
        .hd3-news-tag.nouveau{background:rgba(0,120,212,0.15);color:#4da6ff}
        .hd3-news-tag.amelioration{background:rgba(0,200,150,0.15);color:#00c896}
        .hd3-news-tag.bientot{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.4)}

        /* Profile */
        .hd3-profile-menu{width:260px;top:calc(100% + 4px);right:0}
        .hd3-profile-head{padding:16px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;gap:12px}
        .hd3-profile-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#0078d4,#6c63ff);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0}
        .hd3-profile-item{display:flex;align-items:center;gap:10px;padding:10px 16px;font-size:13.5px;color:rgba(255,255,255,0.55);cursor:pointer;transition:all 0.1s;text-decoration:none;border:none;background:none;width:100%;text-align:left;font-family:'Inter',sans-serif}
        .hd3-profile-item:hover{background:rgba(255,255,255,0.04);color:#e6edf3}
        .hd3-profile-sep{height:1px;background:rgba(255,255,255,0.06);margin:4px 0}
        .hd3-profile-danger:hover{background:rgba(239,68,68,0.07)!important;color:#ef4444!important}

        @media(max-width:900px){.hd3-brand-name{font-size:11px}}
        @media(max-width:768px){.hd3-search-hint{display:none}}
      `}</style>

      <header className="hd3">
        {/* ── GAUCHE ── */}
        <div className="hd3-left">
          {/* Mobile toggle */}
          <button className="hd3-icon-btn" onClick={onMenuClick} style={{display:'none'}} id="hd3-mob">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
          </button>
          <style>{`@media(max-width:768px){#hd3-mob{display:flex!important}}`}</style>

          {/* Waffle 9 points */}
          <div className="hd3-dropdown-zone" style={{position:'relative'}}>
            <button className="hd3-waffle" onClick={() => { closeAll(); setWaffleOpen(v=>!v) }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <rect x="0" y="0" width="5" height="5" rx="1"/>
                <rect x="6.5" y="0" width="5" height="5" rx="1"/>
                <rect x="13" y="0" width="5" height="5" rx="1"/>
                <rect x="0" y="6.5" width="5" height="5" rx="1"/>
                <rect x="6.5" y="6.5" width="5" height="5" rx="1"/>
                <rect x="13" y="6.5" width="5" height="5" rx="1"/>
                <rect x="0" y="13" width="5" height="5" rx="1"/>
                <rect x="6.5" y="13" width="5" height="5" rx="1"/>
                <rect x="13" y="13" width="5" height="5" rx="1"/>
              </svg>
            </button>
            {waffleOpen && (
              <div className="hd3-drop hd3-waffle-menu" style={{position:'absolute'}}>
                <div className="hd3-waffle-head">Applications Imoloc</div>
                <div className="hd3-waffle-grid">
                  {APPS.map((app,i) => (
                    <Link key={i} to={app.path} className="hd3-waffle-item" onClick={closeAll}>
                      <div className="hd3-waffle-icon" style={{background:app.color}}>{app.icon}</div>
                      <span className="hd3-waffle-name">{app.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Brand — prend tout l'espace disponible à gauche */}
          <Link to="/agence" className="hd3-brand" onClick={closeAll}>
            <div className="hd3-brand-icon">
              <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"/>
              </svg>
            </div>
            <span className="hd3-brand-name">Imoloc centre d'administration</span>
          </Link>
        </div>

        {/* ── CENTRE : Recherche ── */}
        <div className="hd3-center">
          <div className="hd3-search">
            <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/>
            </svg>
            <input ref={searchRef} placeholder="Rechercher" value={search} onChange={e=>setSearch(e.target.value)}/>
            <span className="hd3-search-hint">Alt+S</span>
          </div>
        </div>

        {/* ── DROITE ── */}
        <div className="hd3-right">

          {/* Nouveautés */}
          <div className="hd3-dropdown-zone" style={{position:'relative'}}>
            <button className="hd3-icon-btn" title="Nouveautés" onClick={()=>{navigate('/agence/nouveautes')}} style={{position:'relative'}}>
              {unreadNouveautes>0&&(
                <span style={{position:'absolute',top:0,right:0,width:8,height:8,borderRadius:'50%',background:'#0078d4',border:'2px solid #0d1117'}}/>
              )}
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>
              </svg>
              <span className="hd3-badge">2</span>
            </button>
            {nouveautesOpen && (
              <div className="hd3-drop hd3-news-menu" style={{position:'absolute'}}>
                <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#e6edf3',marginBottom:2}}>Nouveautés Imoloc</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>Dernières fonctionnalités et améliorations</div>
                </div>
                <div style={{maxHeight:360,overflowY:'auto'}}>
                  {NOUVEAUTES.map((n,i) => (
                    <div key={i} className="hd3-news-item">
                      <div className={`hd3-news-tag ${n.tag==='NOUVEAU'?'nouveau':n.tag==='AMÉLIORATION'?'amelioration':'bientot'}`}>{n.tag}</div>
                      <div style={{fontSize:13.5,fontWeight:600,color:'#e6edf3',marginBottom:4}}>{n.title}</div>
                      <div style={{fontSize:12.5,color:'rgba(255,255,255,0.4)',lineHeight:1.5,marginBottom:4}}>{n.desc}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.2)'}}>{n.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="hd3-dropdown-zone" style={{position:'relative'}}>
            <button className="hd3-icon-btn" title="Notifications" onClick={()=>{closeAll();setNotifOpen(v=>!v)}}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
              </svg>
              {unreadCount>0 && <span className="hd3-badge">{unreadCount}</span>}
            </button>
            {notifOpen && (
              <div className="hd3-drop hd3-notif-menu" style={{position:'absolute'}}>
                <div className="hd3-notif-head">
                  <span style={{fontSize:14,fontWeight:600,color:'#e6edf3'}}>Notifications</span>
                  <button style={{fontSize:12,color:'#4da6ff',background:'none',border:'none',cursor:'pointer',fontFamily:'Inter'}}>Tout marquer comme lu</button>
                </div>
                <div style={{maxHeight:300,overflowY:'auto'}}>
                  {NOTIFS.map((n,i) => (
                    <div key={i} className={`hd3-notif-item ${!n.read?'unread':''}`}>
                      <div className="hd3-notif-dot" style={{background:n.dot}}/>
                      <div>
                        <div style={{fontSize:13,color:'#e6edf3',fontWeight:500,marginBottom:3}}>{n.title}</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{padding:'10px 16px',borderTop:'1px solid rgba(255,255,255,0.06)',textAlign:'center'}}>
                  <span style={{fontSize:13,color:'#4da6ff',cursor:'pointer'}}>Afficher toutes les notifications</span>
                </div>
              </div>
            )}
          </div>

          {/* Paramètres */}
          <div className="hd3-dropdown-zone" style={{position:'relative'}}>
            <button className="hd3-icon-btn" title="Paramètres" onClick={()=>{closeAll();setSettingsOpen(v=>!v)}}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </button>
            {settingsOpen && (
              <div className="hd3-drop hd3-settings-menu" style={{position:'absolute'}}>
                <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',fontSize:14,fontWeight:600,color:'#e6edf3'}}>Paramètres</div>
                <div style={{padding:'8px 16px 4px',fontSize:11,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)'}}>Affichage</div>
                <div className="hd3-settings-item">
                  <span className="hd3-settings-left">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>
                    Thème
                  </span>
                  <div className="hd3-theme-btns">
                    {['Clair','Sombre','Auto'].map(t => (
                      <button key={t} className={`hd3-theme-btn ${theme===t.toLowerCase()?'active':''}`} onClick={()=>setTheme(t.toLowerCase())}>{t}</button>
                    ))}
                  </div>
                </div>
                <div style={{padding:'8px 16px 4px',fontSize:11,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)'}}>Organisation</div>
                <Link to="/agence/organisation" className="hd3-settings-item" onClick={closeAll} style={{display:'flex',alignItems:'center',justifyContent:'space-between',textDecoration:'none',color:'inherit'}}>
                  <span className="hd3-settings-left"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/></svg>Paramètres de l'organisation</span>
                </Link>
                <Link to="/agence/securite" className="hd3-settings-item" onClick={closeAll} style={{display:'flex',alignItems:'center',justifyContent:'space-between',textDecoration:'none',color:'inherit'}}>
                  <span className="hd3-settings-left"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>Sécurité & confidentialité</span>
                </Link>
              </div>
            )}
          </div>

          {/* Aide */}
          <button className="hd3-icon-btn" title="Aide">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
            </svg>
          </button>

          {/* Profil */}
          <div className="hd3-dropdown-zone" style={{position:'relative'}}>
            <div className="hd3-avatar" onClick={()=>{closeAll();setProfileOpen(v=>!v)}}>
              {profile?.prenom?.[0]?.toUpperCase()||'A'}
            </div>
            {profileOpen && (
              <div className="hd3-drop hd3-profile-menu" style={{position:'absolute'}}>
                <div className="hd3-profile-head">
                  <div className="hd3-profile-avatar">{profile?.prenom?.[0]?.toUpperCase()||'A'}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:'#e6edf3'}}>{profile?.prenom} {profile?.nom}</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:2}}>Administrateur · Imoloc</div>
                  </div>
                </div>
                <Link to="/agence/organisation" className="hd3-profile-item" onClick={closeAll}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                  Mon compte
                </Link>
                <Link to="/agence/abonnement" className="hd3-profile-item" onClick={closeAll}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>
                  Abonnement & Facturation
                </Link>
                <div className="hd3-profile-sep"/>
                <button className="hd3-profile-item hd3-profile-danger" onClick={handleLogout} style={{color:'rgba(239,68,68,0.7)'}}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
