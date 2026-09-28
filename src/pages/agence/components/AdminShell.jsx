import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import {
  Menu, Grid3x3, Home, Users, Sparkles, CreditCard,
  Settings, Shield, Fingerprint, FolderOpen, MessageSquare,
  LifeBuoy, HardHat, Plug, BarChart3, Search, Bell, HelpCircle, ChevronDown,
  ChevronRight, Contact2, UserPlus, Trash2, Camera, FileText, Sun,
} from 'lucide-react'
import { FluentProvider, webDarkTheme, Tooltip } from '@fluentui/react-components'
import { useAuthStore } from '../../../store/authStore'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

// Reprend la mise en page du Centre d'administration Microsoft 365 (barre
// violette + navigation à deux sections) mais avec les VRAIES fonctionnalités
// d'Imoloc — pas les produits Microsoft (pas de Teams/Azure/SharePoint/Copilot
// chez nous). Chaque entrée pointe soit vers une page réelle existante, soit
// est marquée "Bientôt disponible" parce que c'est un vrai chantier Imoloc à
// venir (ex. ImoDrive, ImoConnect), jamais pour imiter un produit Microsoft.

const NAV_MAIN = [
  { key:'accueil', label:'Accueil', icon:Home, path:'/agence' },
  {
    key:'utilisateurs', label:'Utilisateurs', icon:Users, expandable:true,
    children:[
      { key:'utilisateurs-actifs', label:'Utilisateurs actifs', path:'/agence/utilisateurs' },
      { key:'contacts', label:'Contacts', path:'/agence/utilisateurs/contacts', icon:Contact2 },
      { key:'utilisateurs-invites', label:'Utilisateurs invités', path:'/agence/utilisateurs/invites', icon:UserPlus },
      { key:'utilisateurs-supprimes', label:'Utilisateurs supprimés', path:'/agence/utilisateurs/supprimes', icon:Trash2 },
    ],
  },
  { key:'loci', label:'Loci AI', icon:Sparkles, path:'/agence/loci' },
  { key:'facturation', label:'Facturation', icon:CreditCard, path:'/agence/abonnement' },
  { key:'parametres', label:'Paramètres', icon:Settings, path:'/agence/parametres' },
]

// Les autres applications réelles de la suite Imoloc (table `applications`,
// domaine C) — équivalent imoloc des "centres d'administration" Microsoft.
const NAV_CENTRES = [
  { key:'securite', label:'Sécurité', icon:Shield, path:'/agence/securite' },
  { key:'insights', label:'Imoloc Insights', icon:BarChart3, path:'/agence/rapports' },
  { key:'assist', label:'Imo Assist', icon:LifeBuoy, path:'/agence/tickets' },
  { key:'hub', label:'Imoloc Hub', icon:Plug, path:'/agence/integrations' },
  { key:'imoloc-id', label:'Imoloc ID', icon:Fingerprint, soon:true },
  { key:'imodrive', label:'ImoDrive', icon:FolderOpen, soon:true },
  { key:'imoconnect', label:'ImoConnect', icon:MessageSquare, soon:true },
  { key:'imofield', label:'ImoField', icon:HardHat, soon:true },
]

function NavItem({ item, activeKey, collapsed, navigate, onNavigate }) {
  const isActive = item.key === activeKey || item.children?.some(c => c.key === activeKey)
  const [open, setOpen] = useState(isActive)
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const [flyoutPos, setFlyoutPos] = useState(null)
  const btnRef = useRef(null)
  const closeTimer = useRef(null)
  const Icon = item.icon

  const go = () => {
    if (item.soon) return toast('Bientôt disponible', { icon: '🔧' })
    if (item.expandable) return setOpen(v => !v)
    if (item.path) { navigate(item.path); onNavigate?.() }
  }

  const clearCloseTimer = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null } }
  // Délai de grâce : laisse le temps à la souris de traverser le vide entre
  // l'icône et le panneau (rendu ailleurs dans le DOM via portail) sans
  // fermer le flyout par erreur.
  const scheduleClose = () => { clearCloseTimer(); closeTimer.current = setTimeout(() => setFlyoutOpen(false), 150) }

  const openFlyout = () => {
    if (!collapsed || !item.expandable || !btnRef.current) return
    clearCloseTimer()
    const r = btnRef.current.getBoundingClientRect()
    setFlyoutPos({ top: r.top, left: r.right + 8 })
    setFlyoutOpen(true)
  }

  useEffect(() => {
    if (!flyoutOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setFlyoutOpen(false) }
    const onDocClick = (e) => { if (!btnRef.current?.contains(e.target)) setFlyoutOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDocClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDocClick) }
  }, [flyoutOpen])

  useEffect(() => () => clearCloseTimer(), [])

  const iconBtn = (
    <button
      ref={btnRef}
      className={`as-nav-item ${item.key === activeKey ? 'active' : ''}`}
      onClick={go}
      onMouseEnter={openFlyout}
      onMouseLeave={scheduleClose}
      onFocus={openFlyout}
      onBlur={scheduleClose}
    >
      <Icon size={17} strokeWidth={1.6} />
      {!collapsed && <span>{item.label}</span>}
      {!collapsed && item.expandable && (open ? <ChevronDown size={14} className="as-chev" /> : <ChevronRight size={14} className="as-chev" />)}
    </button>
  )

  return (
    <div className="as-nav-item-wrap">
      {/* Repliée + entrée simple : vraie bulle Fluent — apparaît/disparaît toute seule,
          jamais affichée en même temps qu'un flyout (les entrées dépliables n'ont pas
          de Tooltip, leur libellé est le titre du flyout lui-même). */}
      {collapsed && !item.expandable ? (
        <Tooltip content={item.label} relationship="label" positioning="after" withArrow>
          {iconBtn}
        </Tooltip>
      ) : iconBtn}

      {!collapsed && item.expandable && open && (
        <div className="as-nav-children">
          {item.children.map(c => (
            <button key={c.key} className={`as-nav-item child ${c.key === activeKey ? 'active' : ''}`} onClick={() => { if (item.soon) return toast('Bientôt disponible', { icon: '🔧' }); navigate(c.path); onNavigate?.() }}>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Portail vers document.body : ne peut jamais être coupé par l'overflow-y:auto
          de la sidebar, ni recouvert par un contexte d'empilement de la page. */}
      {collapsed && item.expandable && flyoutOpen && flyoutPos && createPortal(
        <div
          className="as-flyout"
          style={{ top: flyoutPos.top, left: flyoutPos.left }}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
        >
          <div className="as-flyout-title">{item.label}</div>
          {item.children.map(c => (
            <button
              key={c.key}
              className={`as-flyout-item ${c.key === activeKey ? 'active' : ''}`}
              onClick={() => { setFlyoutOpen(false); if (item.soon) return toast('Bientôt disponible', { icon: '🔧' }); navigate(c.path); onNavigate?.() }}
            >
              {c.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export default function AdminShell({ activeKey, breadcrumb, children }) {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)
  useEffect(() => {
    const onClick = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Sous 900px, la sidebar n'est plus une colonne dans le flux mais un tiroir
  // hors-champ par-dessus le contenu (mobileOpen) — distinct de "collapsed"
  // (mode icônes seules, un choix de confort sur grand écran). Piloté par la
  // largeur réelle de l'écran, pas par une mesure locale d'un composant, pour
  // que ça reste cohérent avec le reste de l'app.
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 900)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const onChange = (e) => { setIsNarrow(e.matches); if (!e.matches) setMobileOpen(false) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggleMenu = () => isNarrow ? setMobileOpen(v => !v) : setCollapsed(v => !v)
  const closeMobileMenu = () => { if (isNarrow) setMobileOpen(false) }

  const initiale = (profile?.prenom?.[0] || profile?.email?.[0] || '?').toUpperCase()

  return (
    <FluentProvider theme={webDarkTheme} style={{ display: 'contents' }}>
    <div className="as-root">
      <style>{`
        .as-root{position:fixed;inset:0;z-index:1000;overflow-y:auto;background:#1b1b1b;font-family:'Segoe UI','Inter',-apple-system,sans-serif;color:#e6edf3}
        /* Les portails Fluent (Tooltip, Popover...) s'ajoutent comme frères de .as-root
           directement sous <body>, sans z-index propre (auto) — .as-root (1000) les
           recouvrait sinon. Les place au-dessus de tout le chrome de l'admin. */
        body > .fui-FluentProvider{position:relative;z-index:1150}
        .as-topbar{height:48px;background:#3d3766;display:flex;align-items:center;gap:14px;padding:0 12px;position:sticky;top:0;z-index:200;border-bottom:1px solid rgba(255,255,255,0.08)}
        .as-icon-btn{background:none;border:none;color:#fff;cursor:pointer;padding:7px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:background 0.12s}
        .as-icon-btn:hover{background:rgba(255,255,255,0.12)}
        .as-brand{display:flex;align-items:center;gap:9px;color:#fff;font-size:15px;font-weight:600;white-space:nowrap}
        .as-search{flex:1;min-width:0;max-width:680px;margin:0 auto;position:relative}
        .as-search input{width:100%;height:32px;border-radius:4px;border:none;background:rgba(255,255,255,0.12);color:#fff;padding:0 36px 0 34px;font-size:13.5px;font-family:'Segoe UI','Inter',sans-serif;outline:none}
        .as-search input::placeholder{color:rgba(255,255,255,0.55)}
        .as-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.55)}
        .as-search .as-kbd{position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:11px;color:rgba(255,255,255,0.4)}
        .as-top-right{display:flex;align-items:center;gap:2px;margin-left:auto}
        .as-copilot{display:flex;align-items:center;gap:6px;color:#fff;font-size:13px;font-weight:500;padding:6px 10px;border-radius:4px;cursor:pointer}
        .as-copilot:hover{background:rgba(255,255,255,0.12)}
        .as-badge-dot{position:relative}
        .as-badge-dot::after{content:'';position:absolute;top:5px;right:5px;width:7px;height:7px;border-radius:50%;background:#ef4444;border:1.5px solid #3d3766}
        .as-org{color:#fff;font-size:13px;padding:0 8px;white-space:nowrap}
        .as-avatar{width:28px;height:28px;border-radius:50%;background:#0078d4;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;cursor:pointer;flex-shrink:0}
        .as-profile-dd{position:absolute;right:12px;top:46px;background:#1b1b1b;border:1px solid rgba(255,255,255,0.1);border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,0.55);min-width:200px;z-index:250;overflow:hidden}
        .as-profile-dd-head{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.08)}
        .as-profile-dd-name{font-size:13.5px;font-weight:600;color:#e6edf3}
        .as-profile-dd-email{font-size:12px;color:rgba(255,255,255,0.4);margin-top:2px}
        .as-profile-dd-item{display:block;width:100%;text-align:left;padding:10px 16px;font-size:13px;color:#e6edf3;background:none;border:none;cursor:pointer}
        .as-profile-dd-item:hover{background:rgba(255,255,255,0.05)}

        .as-body{display:flex;align-items:stretch}
        .as-sidebar{width:${collapsed ? '52px' : '236px'};flex-shrink:0;background:#1b1b1b;border-right:1px solid rgba(255,255,255,0.07);padding:10px 8px;height:calc(100vh - 48px);position:sticky;top:48px;overflow-y:auto;transition:width 0.15s}
        .as-menu-toggle{display:flex;align-items:center;width:100%;padding:9px 10px;margin-bottom:6px;border-radius:4px;background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;transition:background 0.12s}
        .as-menu-toggle:hover{background:rgba(255,255,255,0.06);color:#e6edf3}
        .as-nav-item{display:flex;align-items:center;gap:12px;width:100%;padding:7px 10px;border-radius:4px;background:none;border:none;cursor:pointer;font-size:13.5px;color:rgba(255,255,255,0.65);text-align:left;font-family:'Segoe UI','Inter',sans-serif;white-space:nowrap;overflow:hidden}
        .as-nav-item:hover{background:rgba(255,255,255,0.05)}
        .as-nav-item.active{background:rgba(0,120,212,0.12);color:#2c85dd;font-weight:600;box-shadow:inset 3px 0 0 #0078d4}
        .as-nav-item span{flex:1;overflow:hidden;text-overflow:ellipsis}
        .as-chev{flex-shrink:0}
        .as-nav-children{padding-left:29px}
        .as-nav-children .as-nav-item{font-size:13px;padding:6px 10px}
        .as-flyout{position:fixed;min-width:210px;background:${webDarkTheme.colorNeutralBackground1};border:1px solid ${webDarkTheme.colorNeutralStroke1};border-radius:${webDarkTheme.borderRadiusMedium};box-shadow:${webDarkTheme.shadow16};z-index:1100;padding:6px 0;font-family:'Segoe UI','Inter',-apple-system,sans-serif;isolation:isolate}
        .as-flyout-title{font-size:13px;font-weight:600;color:#e6edf3;padding:8px 14px 6px}
        .as-flyout-item{display:block;width:100%;text-align:left;padding:8px 14px;font-size:13px;color:rgba(255,255,255,0.65);background:none;border:none;cursor:pointer;white-space:nowrap}
        .as-flyout-item:hover{background:rgba(255,255,255,0.06)}
        .as-flyout-item.active{color:#2c85dd;font-weight:600}
        .as-nav-section-lbl{font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);letter-spacing:0.03em;text-transform:uppercase;padding:16px 10px 6px}
        .as-sidebar-divider{height:1px;background:rgba(255,255,255,0.07);margin:8px 4px}

        .as-content{flex:1;min-width:0;padding:24px 32px 60px}
        .as-breadcrumb{font-size:12.5px;color:rgba(255,255,255,0.4);margin-bottom:6px;display:flex;align-items:center;gap:6px}
        .as-breadcrumb a{color:rgba(255,255,255,0.4);text-decoration:none}
        .as-breadcrumb a:hover{text-decoration:underline;color:#2c85dd}
        .as-h1{font-size:26px;font-weight:600;color:#e6edf3;margin:0 0 20px;letter-spacing:-0.01em}

        .as-scrim{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:140}
        @media(max-width:900px){.as-sidebar{position:fixed;top:48px;width:236px;left:${mobileOpen ? '0' : '-236px'};z-index:150;box-shadow:${mobileOpen ? '4px 0 18px rgba(0,0,0,0.4)' : 'none'};transition:left 0.18s}.as-content{padding:18px 16px 60px}}
        /* Entête mobile : au-delà d'une largeur de tablette, le nom de la marque
           n'apporte rien (le waffle + le fil d'ariane suffisent à situer l'app) —
           on le retire pour laisser la place à la recherche, comme le reste de
           l'appli qui privilégie le contenu utile au texte décoratif. */
        @media(max-width:768px){.as-brand{display:none}.as-search .as-kbd{display:none}.as-topbar{gap:6px;padding:0 8px}}
        /* Sous ~téléphone : les icônes purement décoratives ("bientôt disponible")
           et le libellé texte de Loci cèdent la place aux actions réelles
           (recherche, notifications, paramètres, profil). */
        @media(max-width:480px){.as-icon-optional{display:none}.as-copilot-label{display:none}.as-copilot{padding:6px}.as-top-right{gap:0}}
      `}</style>

      <div className="as-topbar">
        {isNarrow && <button className="as-icon-btn" title={mobileOpen?'Fermer le menu':'Ouvrir le menu'} onClick={toggleMenu}><Menu size={20} /></button>}
        <button className="as-icon-btn" onClick={() => toast('Bientôt disponible', { icon: '🔧' })}><Grid3x3 size={20} /></button>
        <div className="as-brand">Imoloc centre d'administration</div>
        <div className="as-search">
          <Search size={14} />
          <input placeholder="Rechercher" onFocus={e => { toast('Recherche — bientôt disponible', { icon: '🔧' }); e.target.blur() }} readOnly />
          <span className="as-kbd">Alt+S</span>
        </div>
        <div className="as-top-right">
          <button className="as-icon-btn as-copilot" onClick={() => navigate('/agence/loci')}><Sparkles size={16} /> <span className="as-copilot-label">Loci</span></button>
          <button className="as-icon-btn as-icon-optional" onClick={() => toast('Bientôt disponible', { icon: '🔧' })}><Camera size={16} /></button>
          <button className="as-icon-btn as-icon-optional" onClick={() => toast('Bientôt disponible', { icon: '🔧' })}><FileText size={16} /></button>
          <button className="as-icon-btn as-icon-optional" onClick={() => toast('Bientôt disponible', { icon: '🔧' })}><Sun size={16} /></button>
          <button className="as-icon-btn as-badge-dot" onClick={() => toast('Bientôt disponible', { icon: '🔧' })}><Bell size={17} /></button>
          <button className="as-icon-btn" onClick={() => navigate('/agence/parametres')}><Settings size={17} /></button>
          <button className="as-icon-btn as-icon-optional" onClick={() => toast('Bientôt disponible', { icon: '🔧' })}><HelpCircle size={17} /></button>
          <div style={{ position: 'relative' }} ref={profileRef}>
            <div className="as-avatar" onClick={() => setProfileOpen(v => !v)}>{initiale}</div>
            {profileOpen && (
              <div className="as-profile-dd">
                <div className="as-profile-dd-head">
                  <div className="as-profile-dd-name">{profile?.prenom} {profile?.nom}</div>
                  <div className="as-profile-dd-email">{profile?.email}</div>
                </div>
                <button className="as-profile-dd-item" onClick={() => navigate('/agence/parametres')}>Mon profil</button>
                <button className="as-profile-dd-item" onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}>Se déconnecter</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="as-body">
        {isNarrow && mobileOpen && <div className="as-scrim" onClick={() => setMobileOpen(false)} />}
        <div className="as-sidebar">
          {!isNarrow && <button className="as-menu-toggle" title={collapsed?'Déplier le menu':'Replier le menu'} onClick={toggleMenu}><Menu size={18} /></button>}
          {NAV_MAIN.map(item => <NavItem key={item.key} item={item} activeKey={activeKey} collapsed={!isNarrow && collapsed} navigate={navigate} onNavigate={closeMobileMenu} />)}
          <div className="as-sidebar-divider" />
          {!(!isNarrow && collapsed) && <div className="as-nav-section-lbl">Applications Imoloc</div>}
          {NAV_CENTRES.map(item => <NavItem key={item.key} item={item} activeKey={activeKey} collapsed={!isNarrow && collapsed} navigate={navigate} onNavigate={closeMobileMenu} />)}
        </div>
        <div className="as-content">
          {breadcrumb && (
            <div className="as-breadcrumb">
              {breadcrumb.map((b, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {i > 0 && <ChevronRight size={11} />}
                  {b.path ? <Link to={b.path}>{b.label}</Link> : <span>{b.label}</span>}
                </span>
              ))}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
    </FluentProvider>
  )
}
