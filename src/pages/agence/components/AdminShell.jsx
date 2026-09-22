import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Grid3x3, Home, Users, Sparkles, Bot, UsersRound, ShoppingBag, CreditCard,
  Settings, SlidersHorizontal, Shield, Fingerprint, Cloud, Mail, FolderKanban,
  MessageSquare, LayoutGrid, Pencil, Search, Bell, HelpCircle, ChevronDown,
  ChevronRight, Contact2, UserPlus, Trash2, Camera, FileText, Sun,
} from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

// Reproduction fidèle du Centre d'administration Microsoft 365 — chrome
// partagé (barre violette + navigation) pour les pages "Imoloc Admin".
// Les entrées sans équivalent réel dans imoloc (Copilot, Agents, Azure,
// Exchange, SharePoint, Teams admin, Marketplace, Setup...) affichent
// "Bientôt disponible" au clic plutôt que de sembler fonctionner.

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
  { key:'copilot', label:'Copilot', icon:Sparkles, soon:true },
  { key:'agents', label:'Agents', icon:Bot, soon:true },
  { key:'teams-groupes', label:'Teams et groupes', icon:UsersRound, soon:true },
  { key:'marketplace', label:'Marketplace', icon:ShoppingBag, soon:true },
  { key:'facturation', label:'Facturation', icon:CreditCard, path:'/agence/abonnement' },
  { key:'parametres', label:'Paramètres', icon:Settings, path:'/agence/parametres' },
  { key:'setup', label:'Setup', icon:SlidersHorizontal, soon:true },
]

const NAV_CENTRES = [
  { key:'securite', label:'Sécurité', icon:Shield, path:'/agence/securite' },
  { key:'identite', label:'Identité', icon:Fingerprint, soon:true },
  { key:'azure', label:'Azure', icon:Cloud, soon:true },
  { key:'exchange', label:'Exchange', icon:Mail, soon:true },
  { key:'sharepoint', label:'SharePoint', icon:FolderKanban, soon:true },
  { key:'teams', label:'Teams', icon:MessageSquare, soon:true },
  { key:'tous', label:'Tous les centres d’administration', icon:LayoutGrid, soon:true },
  { key:'personnaliser', label:'Personnaliser la navigation', icon:Pencil, soon:true },
]

function NavItem({ item, activeKey, collapsed, navigate }) {
  const isActive = item.key === activeKey || item.children?.some(c => c.key === activeKey)
  const [open, setOpen] = useState(isActive)
  const Icon = item.icon
  const go = () => {
    if (item.soon) return toast('Bientôt disponible', { icon: '🔧' })
    if (item.expandable) return setOpen(v => !v)
    if (item.path) navigate(item.path)
  }
  return (
    <div>
      <button className={`as-nav-item ${item.key === activeKey ? 'active' : ''}`} onClick={go}>
        <Icon size={17} strokeWidth={1.6} />
        {!collapsed && <span>{item.label}</span>}
        {!collapsed && item.expandable && (open ? <ChevronDown size={14} className="as-chev" /> : <ChevronRight size={14} className="as-chev" />)}
      </button>
      {!collapsed && item.expandable && open && (
        <div className="as-nav-children">
          {item.children.map(c => (
            <button key={c.key} className={`as-nav-item child ${c.key === activeKey ? 'active' : ''}`} onClick={() => item.soon ? toast('Bientôt disponible', { icon: '🔧' }) : navigate(c.path)}>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
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

  const initiale = (profile?.prenom?.[0] || profile?.email?.[0] || '?').toUpperCase()

  return (
    <div className="as-root">
      <style>{`
        .as-root{position:fixed;inset:0;z-index:1000;overflow-y:auto;background:#0d1117;font-family:'Inter',-apple-system,'Segoe UI',sans-serif;color:#e6edf3}
        .as-topbar{height:48px;background:#3d3766;display:flex;align-items:center;gap:14px;padding:0 12px;position:sticky;top:0;z-index:200;border-bottom:1px solid rgba(255,255,255,0.08)}
        .as-icon-btn{background:none;border:none;color:#fff;cursor:pointer;padding:7px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:background 0.12s}
        .as-icon-btn:hover{background:rgba(255,255,255,0.12)}
        .as-brand{display:flex;align-items:center;gap:9px;color:#fff;font-size:15px;font-weight:600;white-space:nowrap}
        .as-search{flex:1;max-width:680px;margin:0 auto;position:relative}
        .as-search input{width:100%;height:32px;border-radius:4px;border:none;background:rgba(255,255,255,0.12);color:#fff;padding:0 36px 0 34px;font-size:13.5px;font-family:'Inter',sans-serif;outline:none}
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
        .as-profile-dd{position:absolute;right:12px;top:46px;background:#1c2434;border:1px solid rgba(255,255,255,0.1);border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,0.55);min-width:200px;z-index:250;overflow:hidden}
        .as-profile-dd-head{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.08)}
        .as-profile-dd-name{font-size:13.5px;font-weight:600;color:#e6edf3}
        .as-profile-dd-email{font-size:12px;color:rgba(255,255,255,0.4);margin-top:2px}
        .as-profile-dd-item{display:block;width:100%;text-align:left;padding:10px 16px;font-size:13px;color:#e6edf3;background:none;border:none;cursor:pointer}
        .as-profile-dd-item:hover{background:rgba(255,255,255,0.05)}

        .as-body{display:flex;align-items:stretch}
        .as-sidebar{width:${collapsed ? '52px' : '236px'};flex-shrink:0;background:#161b22;border-right:1px solid rgba(255,255,255,0.07);padding:10px 8px;height:calc(100vh - 48px);position:sticky;top:48px;overflow-y:auto;transition:width 0.15s}
        .as-nav-item{display:flex;align-items:center;gap:12px;width:100%;padding:7px 10px;border-radius:4px;background:none;border:none;cursor:pointer;font-size:13.5px;color:rgba(255,255,255,0.65);text-align:left;font-family:'Inter',sans-serif;white-space:nowrap;overflow:hidden}
        .as-nav-item:hover{background:rgba(255,255,255,0.05)}
        .as-nav-item.active{background:rgba(0,120,212,0.12);color:#4da6ff;font-weight:600;box-shadow:inset 3px 0 0 #0078d4}
        .as-nav-item span{flex:1;overflow:hidden;text-overflow:ellipsis}
        .as-chev{flex-shrink:0}
        .as-nav-children{padding-left:29px}
        .as-nav-children .as-nav-item{font-size:13px;padding:6px 10px}
        .as-nav-section-lbl{font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);letter-spacing:0.03em;text-transform:uppercase;padding:16px 10px 6px}
        .as-sidebar-divider{height:1px;background:rgba(255,255,255,0.07);margin:8px 4px}

        .as-content{flex:1;min-width:0;padding:24px 32px 60px}
        .as-breadcrumb{font-size:12.5px;color:rgba(255,255,255,0.4);margin-bottom:6px;display:flex;align-items:center;gap:6px}
        .as-breadcrumb a{color:rgba(255,255,255,0.4);text-decoration:none}
        .as-breadcrumb a:hover{text-decoration:underline;color:#4da6ff}
        .as-h1{font-size:26px;font-weight:600;color:#e6edf3;margin:0 0 20px;letter-spacing:-0.01em}

        @media(max-width:900px){.as-sidebar{position:fixed;left:${collapsed ? '-236px' : '0'};z-index:150;box-shadow:${collapsed ? 'none' : '4px 0 18px rgba(0,0,0,0.4)'}}.as-content{padding:18px 16px 60px}}
      `}</style>

      <div className="as-topbar">
        <button className="as-icon-btn" onClick={() => setCollapsed(v => !v)}><Grid3x3 size={18} /></button>
        <div className="as-brand"><Home size={16} /> Imoloc centre d'administration</div>
        <div className="as-search">
          <Search size={14} />
          <input placeholder="Rechercher" onFocus={e => { toast('Recherche — bientôt disponible', { icon: '🔧' }); e.target.blur() }} readOnly />
          <span className="as-kbd">Alt+S</span>
        </div>
        <div className="as-top-right">
          <button className="as-icon-btn as-copilot" onClick={() => toast('Bientôt disponible', { icon: '🔧' })}><Sparkles size={16} /> Copilot</button>
          <button className="as-icon-btn" onClick={() => toast('Bientôt disponible', { icon: '🔧' })}><Camera size={16} /></button>
          <button className="as-icon-btn" onClick={() => toast('Bientôt disponible', { icon: '🔧' })}><FileText size={16} /></button>
          <button className="as-icon-btn" onClick={() => toast('Bientôt disponible', { icon: '🔧' })}><Sun size={16} /></button>
          <button className="as-icon-btn as-badge-dot" onClick={() => toast('Bientôt disponible', { icon: '🔧' })}><Bell size={17} /></button>
          <button className="as-icon-btn" onClick={() => navigate('/agence/parametres')}><Settings size={17} /></button>
          <button className="as-icon-btn" onClick={() => toast('Bientôt disponible', { icon: '🔧' })}><HelpCircle size={17} /></button>
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
        <div className="as-sidebar">
          {NAV_MAIN.map(item => <NavItem key={item.key} item={item} activeKey={activeKey} collapsed={collapsed} navigate={navigate} />)}
          <div className="as-sidebar-divider" />
          {!collapsed && <div className="as-nav-section-lbl">Centres d'administration</div>}
          {NAV_CENTRES.map(item => <NavItem key={item.key} item={item} activeKey={activeKey} collapsed={collapsed} navigate={navigate} />)}
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
  )
}
